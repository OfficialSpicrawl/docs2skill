#!/usr/bin/env node
// llms.txt generator: turns a website into llms.txt (index) and llms-full.txt
// (every page as markdown) using the Spicrawl API. Convention: https://llmstxt.org
import { realpathSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Spicrawl, isSpicrawlError, InsufficientCreditsError, AuthenticationError, APITimeoutError } from "@spicrawl/sdk";

const USAGE = "Usage: node llms-txt.mjs <site-url> [--max 50] [--out ./out] [--include /docs] [--js] [--skill <kebab-name>]";
const NOT_A_PAGE = /\.(png|jpe?g|gif|svg|webp|ico|css|js|json|xml|pdf|zip|gz|mp[34]|woff2?)$/i;
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Docs-UI buttons that leak into the extracted text as a line of their own (compared lowercase, whole line).
// ponytail: exact match on whole lines, also inside code fences; add a string when a site shows a new one, no per-site rules.
const UI_NOISE = new Set(["copy page", "copy pageopen", "open in chatgpt", "open in claude", "edit on github"]);
function stripNoise(md) {
  const lines = md.split("\n");
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (!UI_NOISE.has(lines[i].trim().toLowerCase())) kept.push(lines[i]);
    else if (!lines[i + 1]?.trim()) i++; // a dropped line takes the blank line after it along
  }
  return kept.join("\n");
}

// ---------------------------------------------------------------- small text helpers

const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const clip = (s, n) => (s.length > n ? s.slice(0, n - 3).trimEnd() + "..." : s);
const firstSentence = (s) => s.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? s;

// Markdown inline syntax -> plain one-line text. Page text is untrusted, so these patterns must stay linear:
// the classes exclude brackets and parentheses (one nesting level allowed), so a failed match stops at the
// next one instead of scanning to the end of the text and then trying again from every later "[".
const LABEL = String.raw`\[((?:[^\[\]]|\[[^\[\]]*\])*)\]\((?:[^()]|\([^()]*\))*\)`;
const IMAGE = new RegExp(`!${LABEL}`, "g");
const LINK = new RegExp(LABEL, "g");
const clean = (s) => s.replace(IMAGE, "").replace(LINK, "$1").replace(/[*`\[\]]/g, "").replace(/\s+/g, " ").trim();

// First block of prose: not a heading, list, quote, table, image or HTML, and long enough to be a sentence.
function firstParagraph(md) {
  for (const block of md.replace(/```[\s\S]*?```/g, "").split(/\n\s*\n/)) {
    const text = clean(block);
    if (!/^\s*(#|[-*+>|!<]|\d+\.)/.test(block) && text.length >= 20) return text;
  }
  return "";
}

function titleFromUrl(url) {
  const u = new URL(url);
  const last = u.pathname.split("/").filter(Boolean).pop();
  return last ? decode(last).replace(/\.\w+$/, "").replace(/[-_]+/g, " ") : u.hostname;
}

// /docs/intro -> "Docs"; top-level pages (/pricing, /) -> "Pages".
function sectionOf(url) {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  if (segments.length < 2) return "Pages";
  return decode(segments[0]).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------- discovery

const host = (url) => new URL(url).hostname.replace(/^www\./, "");

// Resolve against the site and return the URL when it is http(s) on the site itself: same host (www. ignored)
// and port. Pages and sitemaps both go through this, so a listing can never send the tool to another host.
function onSite(raw, origin) {
  try {
    const u = new URL(raw, origin);
    return /^https?:$/.test(u.protocol) && host(u.href) === host(origin) && u.port === new URL(origin).port ? u : null;
  } catch {
    return null;
  }
}

// A page on the site, without its #fragment; null for anything else.
function normalize(raw, origin) {
  const u = onSite(raw, origin);
  if (!u || NOT_A_PAGE.test(u.pathname)) return null;
  u.hash = "";
  return u.href;
}

// <urlset> -> page URLs, <sitemapindex> -> child sitemap URLs. Linear in the input: no pattern here has
// adjacent open-ended groups, because the XML comes from the site being read.
export function parseSitemap(xml) {
  const locs = [...xml.replace(/<!\[CDATA\[|\]\]>/g, "").matchAll(/<loc>([^<]*)<\/loc>/gi)].map((m) => m[1].trim().replace(/&amp;/g, "&"));
  return /<sitemapindex[\s>]/i.test(xml) ? { urls: [], sitemaps: locs } : { urls: locs, sitemaps: [] };
}

// Fetch a text file (sitemap, robots.txt) as served. "html" means "the document as retrieved":
// response_format "text" would run the page-to-text extractor and strip the <loc> tags.
// A missing file is normal, so only auth and credit problems are fatal here. Only the first MAX_FILE
// characters are parsed: real sitemaps are split at 50,000 URLs, and a bigger body is not worth the CPU.
const MAX_FILE = 1_000_000;
async function fetchFile(spicrawl, url) {
  try {
    const r = await spicrawl.scrapeRaw({ url, response_format: "html" });
    return r.targetStatus >= 400 || typeof r.body !== "string" ? "" : r.body.slice(0, MAX_FILE);
  } catch (err) {
    if (err instanceof AuthenticationError || err instanceof InsufficientCreditsError) throw err;
    return "";
  }
}

// Returns up to `max` same-site page URLs under the `include` path prefix.
export async function discover(spicrawl, site, { include = "", max = 50, maxSitemaps = 10 } = {}) {
  const origin = new URL(site).origin;
  const accept = (raw) => {
    const url = normalize(raw, origin);
    return url && new URL(url).pathname.startsWith(include) ? url : null;
  };
  // Child sitemaps and robots.txt "Sitemap:" lines are followed only on the site itself.
  const sitemapUrl = (raw) => {
    const u = onSite(raw, origin);
    return u && !/\.gz$/i.test(u.pathname) ? u.href : null; // ponytail: gzipped sitemaps are skipped
  };

  // Breadth-first through sitemaps and sitemap indexes. The cap bounds credits spent on huge sites.
  const walk = async (queue) => {
    const found = new Set();
    for (let followed = 0; queue.length && followed < maxSitemaps && found.size < max; followed++) {
      const { urls, sitemaps } = parseSitemap(await fetchFile(spicrawl, queue.shift()));
      urls.map(accept).filter(Boolean).forEach((u) => found.add(u));
      for (const s of sitemaps.map(sitemapUrl)) if (s) queue.push(s); // no spread: a 1 MB index can list ~90k
    }
    return [...found].slice(0, max);
  };

  let urls = await walk([`${origin}/sitemap.xml`]);
  if (!urls.length) {
    const robots = await fetchFile(spicrawl, `${origin}/robots.txt`);
    const listed = [...robots.matchAll(/^[ \t]*sitemap:[ \t]*(\S+)/gim)].map((m) => sitemapUrl(m[1])).filter(Boolean);
    urls = await walk(listed.filter((s) => s !== `${origin}/sitemap.xml`));
  }
  if (!urls.length) {
    // No sitemap anywhere: use the links on the homepage.
    const home = await spicrawl.scrape({ url: `${origin}/`, links: true });
    urls = (home.links ?? []).map(accept).filter(Boolean);
  }
  return [...new Set(urls)].slice(0, max); // the links fallback can repeat a URL
}

// ---------------------------------------------------------------- fetching

// One batch job for all pages. Returns [{ url, markdown, title, description }] plus skip counts and the
// batch credits (micro). With timeoutMs, a job still running at the deadline is cancelled and whatever
// finished is returned with timedOut: true; without it the tool waits as long as the job takes.
export async function fetchPages(spicrawl, urls, { js = false, pollIntervalMs, timeoutMs, log = () => {} } = {}) {
  const job = await spicrawl.batch.create({
    name: "llms-txt",
    urls,
    response_format: "markdown",
    main_content_only: true,
    js_render: js,
  });

  let last = "";
  let timedOut = false;
  try {
    const done = await spicrawl.batch.waitForCompletion(job.id, {
      pollIntervalMs,
      timeoutMs,
      onProgress: (j) => {
        const line = `  ${j.progress.completed}/${j.progress.total} pages done`;
        if (line !== last) log((last = line));
      },
    });
    if (done.status !== "completed") log(`Job ${done.status}${done.error_message ? `: ${done.error_message}` : ""}`);
  } catch (err) {
    // Whatever went wrong while waiting, the job may still be running: stop it spending on the rest. Best effort.
    await spicrawl.batch.cancel(job.id).catch(() => {});
    if (timeoutMs === undefined || !(err instanceof APITimeoutError)) throw err;
    timedOut = true;
    log(`Job still running after ${timeoutMs / 1000}s; using the pages that finished.`);
  }

  const pages = [];
  const stats = { failed: 0, blocked: 0, empty: 0 };
  let creditsMicro = 0;
  // limit keeps each results page well under the 2 MiB inline-content budget.
  for await (const line of spicrawl.batch.results(job.id, { limit: 10 })) {
    creditsMicro += line.credits_micro ?? 0;
    if (line.status !== "succeeded") { stats.failed++; continue; }
    if (line.http_status >= 400) { stats.blocked++; continue; } // block page, 404, ...
    const markdown = stripNoise(line.result?.content || (await taskContent(spicrawl, job.id, line.seq))).trim();
    if (!markdown) { stats.empty++; continue; }
    pages.push({ url: line.url, markdown, ...describe(markdown, line.url) });
  }
  return { pages, stats, timedOut, creditsMicro };
}

// Fallback for items whose content was not inlined in the results page.
async function taskContent(spicrawl, jobId, seq) {
  try {
    const { content } = await spicrawl.batch.taskContent(jobId, seq);
    return typeof content === "string" ? content : "";
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------- llms.txt

// Entry title = first heading (else last path segment); description = first sentence, ~120 chars.
export function describe(markdown, url) {
  const heading = markdown.match(/^#{1,6}[ \t]+(.+)$/m)?.[1];
  return {
    title: (heading && clean(heading)) || titleFromUrl(url),
    description: clip(firstSentence(firstParagraph(markdown)), 120),
  };
}

// "## Section" blocks, one bullet per page, pages grouped by section in first-seen order.
function sectionBlocks(pages, href, level = "##") {
  const sections = new Map();
  for (const page of pages) {
    const name = sectionOf(page.url);
    sections.set(name, [...(sections.get(name) ?? []), page]);
  }
  return [...sections].map(([name, list]) => {
    const entries = list.map((p) => `- [${p.title}](${href(p)})${p.description ? `: ${p.description}` : ""}`);
    return `${level} ${name}\n\n${entries.join("\n")}`;
  });
}

export function buildLlmsTxt({ title, summary, pages }) {
  return [`# ${title}`, ...(summary ? [`> ${summary}`] : []), ...sectionBlocks(pages, (p) => p.url)].join("\n\n") + "\n";
}

// One page as `# Title`, a Source line and the markdown. The markdown loses its own first line when
// that is a heading repeating the title.
function renderPage(p) {
  const m = p.markdown.match(/^#{1,6}[ \t]+(.+)(?:\r?\n|$)/);
  const body = m && clean(m[1]) === p.title ? p.markdown.slice(m[0].length).trimStart() : p.markdown;
  return `# ${p.title}\nSource: ${p.url}\n\n${body}`;
}

export function buildLlmsFullTxt(pages) {
  return pages.map(renderPage).join("\n\n---\n\n") + "\n";
}

// ---------------------------------------------------------------- agent skill

// /docs/api?a=1 -> "docs-api-a-1"; the homepage -> "index".
const slugOf = (url) => {
  const u = new URL(url);
  return decode(u.pathname + u.search).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 100).replace(/^-|-$/g, "") || "index";
};

// A skill folder and an AGENTS.md from the scraped pages. No LLM: every word comes from the pages.
// Returns [{ path, content }] relative to the output directory.
export function buildSkill({ name, title, summary, pages }) {
  const used = new Set();
  const withSlug = pages.map((p) => {
    let slug = slugOf(p.url);
    for (let n = 2; used.has(slug); n++) slug = `${slugOf(p.url)}-${n}`;
    used.add(slug);
    return { ...p, slug };
  });

  // Agent Skills frontmatter. The description is a JSON string, which is also a valid YAML string.
  const about = firstSentence(summary).replace(/[.!?]$/, "");
  const description = `Use when working with ${title}${about ? `: ${about}` : ""}.`;
  // ponytail: no cap on the page list; SKILL.md passes ~200 lines at roughly 150 pages, so keep --max below that.
  const skill = [
    `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---`,
    `# ${title}`,
    summary || `Pages from ${title}.`,
    `## Reference\n\n${sectionBlocks(withSlug, (p) => `references/${p.slug}.md`, "###").join("\n\n")}`,
    "## How to use\n\nOpen only the reference files you need for the task, not all of them. Each file is one page as markdown, with its source URL on the second line.",
  ].join("\n\n") + "\n";

  const agents = [
    `# ${title}`,
    ...(summary ? [`> ${summary}`] : []),
    `Index of the ${title} docs. Fetch the page you need instead of guessing.`,
    ...sectionBlocks(pages, (p) => p.url),
  ].join("\n\n") + "\n";

  return [
    { path: "AGENTS.md", content: agents },
    { path: join(name, "SKILL.md"), content: skill },
    ...withSlug.map((p) => ({ path: join(name, "references", `${p.slug}.md`), content: renderPage(p) + "\n" })),
  ];
}

// ---------------------------------------------------------------- pipeline

// Discover -> fetch -> build. Returns the two files' text, the pages they were built from, and the counts.
// timedOut / creditsMicro come from fetchPages (batch credits only; finding pages is billed separately).
export async function generate(spicrawl, { site, max = 50, include = "", js = false, pollIntervalMs, timeoutMs, maxSitemaps, log = () => {} }) {
  const home = `${new URL(site).origin}/`;
  log(`Discovering pages on ${home} ...`);
  const found = await discover(spicrawl, site, { include, max, maxSitemaps });

  // The homepage is always fetched: it supplies the site title and summary.
  const urls = [...new Set([home, ...found])].slice(0, max);
  const perPage = js ? 3 : 1;
  log(`Fetching ${urls.length} pages, about ${urls.length * perPage} credits (${perPage} per page${js ? " with --js" : ""}).`);
  const { pages, stats, timedOut, creditsMicro } = await fetchPages(spicrawl, urls, { js, pollIntervalMs, timeoutMs, log });

  const homePage = pages.find((p) => p.url === home);
  const h1 = homePage?.markdown.match(/^#[ \t]+(.+)$/m)?.[1];
  const listed = pages.filter((p) => new URL(p.url).pathname.startsWith(include));
  const title = (h1 && clean(h1)) || new URL(home).hostname;
  const summary = homePage ? clip(firstParagraph(homePage.markdown), 300) : "";
  return {
    llms: buildLlmsTxt({ title, summary, pages: listed }),
    full: buildLlmsFullTxt(listed),
    title,
    summary,
    pages: listed,
    stats: { ...stats, pages: listed.length },
    timedOut,
    creditsMicro,
  };
}

// ---------------------------------------------------------------- CLI

function explain(err) {
  if (!isSpicrawlError(err)) return err.message;
  if (err instanceof AuthenticationError || err.code === "ERR::AUTH::MISSING_KEY") {
    return `${err.message}\nGet a free API key (1,000 credits/month) at https://app.spicrawl.com, then: export SPICRAWL_API_KEY=...`;
  }
  const hint = err.diagnostics?.hint ? `\nHint: ${err.diagnostics.hint}` : "";
  if (err instanceof InsufficientCreditsError) return `Out of credits: ${err.message}${hint}\nCheck your plan at https://app.spicrawl.com`;
  return `${err.code}: ${err.message}${hint}`;
}

// Returns the process exit code. The client, poll interval and output are injectable for tests.
export async function main(argv = process.argv.slice(2), { spicrawl, pollIntervalMs, log = console.log, error = console.error } = {}) {
  try {
    const { values, positionals } = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        max: { type: "string", default: "50" },
        out: { type: "string", default: "./out" },
        include: { type: "string", default: "" },
        js: { type: "boolean", default: false },
        skill: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
    });
    if (values.help || positionals.length !== 1) {
      (values.help ? log : error)(USAGE);
      return values.help ? 0 : 1;
    }
    const max = Number(values.max);
    if (!Number.isInteger(max) || max < 1) throw new Error("--max must be a positive integer");
    if (values.skill !== undefined && (!KEBAB.test(values.skill) || values.skill.length > 64)) {
      throw new Error("--skill must be a kebab-case name of at most 64 characters, e.g. example-docs");
    }
    const site = /^https?:\/\//i.test(positionals[0]) ? positionals[0] : `https://${positionals[0]}`;
    const include = values.include && !values.include.startsWith("/") ? `/${values.include}` : values.include;

    spicrawl ??= new Spicrawl(); // reads SPICRAWL_API_KEY; throws a clear error when it is missing
    const { llms, full, stats, ...built } = await generate(spicrawl, { site, max, include, js: values.js, pollIntervalMs, log });
    if (!stats.pages) throw new Error("No pages could be fetched, so nothing was written.");

    await mkdir(values.out, { recursive: true });
    await writeFile(join(values.out, "llms.txt"), llms);
    await writeFile(join(values.out, "llms-full.txt"), full);
    log(`Wrote ${join(values.out, "llms.txt")} and ${join(values.out, "llms-full.txt")}`);
    log(`${stats.pages} pages; skipped ${stats.failed} failed, ${stats.blocked} blocked (HTTP 4xx/5xx), ${stats.empty} empty.`);

    if (values.skill) {
      const files = buildSkill({ name: values.skill, ...built });
      for (const f of files) {
        await mkdir(dirname(join(values.out, f.path)), { recursive: true });
        await writeFile(join(values.out, f.path), f.content);
      }
      log(`Wrote skill ${join(values.out, values.skill)}/ (SKILL.md + ${files.length - 2} reference files) and ${join(values.out, "AGENTS.md")}`);
      log(`Install: copy the folder into your agent's skills directory, e.g. cp -r ${join(values.out, values.skill)} ~/.claude/skills/`);
      log("Codex-style repos read skills from .agents/skills/; AGENTS.md is a compact index to drop into a repo root.");
    }
    return 0;
  } catch (err) {
    error(explain(err));
    return 1;
  }
}

// Run only when executed directly (also through the npm bin symlink), not when imported by tests.
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
