// Offline tests: the Spicrawl client gets a stub `fetch`, so nothing touches the network or spends credits.
// The stub mirrors the real wire format (see node_modules/@spicrawl/sdk/dist/index.js):
//   POST /v1/scrape                 -> body as served, target status in the X-Target-Status header
//   POST /v1/batch                  -> the job object
//   GET  /v1/batch/{id}             -> the job object, polled until status is terminal
//   GET  /v1/batch/{id}/results     -> JSON Lines, next page cursor in the X-Next-Cursor header
//   GET  /v1/batch/{id}/tasks/{seq}/content -> one item's payload as a JSON string
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { Spicrawl } from "@spicrawl/sdk";
import { discover, generate, main, parseSitemap } from "./llms-txt.mjs";

const SITE = "https://example.com";
const urlset = (...locs) => `<?xml version="1.0"?><urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;

// What the target site serves for each file the tool may request.
const FILES = {
  [`${SITE}/sitemap.xml`]: `<?xml version="1.0"?><sitemapindex><sitemap><loc>${SITE}/sitemap-a.xml</loc></sitemap><sitemap><loc>${SITE}/sitemap-b.xml</loc></sitemap></sitemapindex>`,
  [`${SITE}/sitemap-a.xml`]: urlset(`${SITE}/`, `${SITE}/pricing`, `${SITE}/docs/intro`, `${SITE}/docs/intro#top`, "https://other.com/x", `${SITE}/logo.png`),
  [`${SITE}/sitemap-b.xml`]: urlset(`${SITE}/docs/api?a=1&amp;b=2`, `${SITE}/blog/hello`, `${SITE}/blog/secret`, `${SITE}/blog/broken`, `${SITE}/docs/big`),
};

// What the batch worker returns for each page (markdown, already converted server side).
const PAGES = {
  [`${SITE}/`]: { md: "# Example Co\n\nExample Co builds widgets for people who like widgets. Founded in 2020.\n\n## Features\n\n- fast\n" },
  [`${SITE}/pricing`]: { md: "## Pricing\n\nPlans start free and scale with you. Cancel any time.\n" },
  [`${SITE}/docs/intro`]: { md: "# Introduction\n\n![logo](/logo.png)\n\nStart here to learn the basics. The rest of this paragraph is ignored.\n" },
  [`${SITE}/docs/api?a=1&b=2`]: { md: "# API Reference\n\n```\ncurl https://example.com\n```\n\nEvery endpoint takes JSON and returns JSON, and this sentence is deliberately long enough that it has to be trimmed to about one hundred and twenty characters.\n" },
  [`${SITE}/blog/hello`]: { md: "Welcome to the blog. More soon.\n\nSecond paragraph." }, // no heading: title comes from the URL
  [`${SITE}/blog/secret`]: { http: 403, md: "Access denied" }, // block page, must be skipped
  [`${SITE}/blog/broken`]: { fail: true }, // item failed, must be skipped
  [`${SITE}/docs/big`]: { omitted: true, md: "# Big page\n\nThis one was too large to inline, so it is fetched on its own." },
};

function stubApi({ files = FILES, links = [], pages = PAGES, batchError = false } = {}) {
  const calls = [];
  let polls = 0;
  const reply = (body, headers = {}, status = 200) => new Response(body, { status, headers });
  const json = (body, status = 200) => reply(JSON.stringify(body), { "content-type": "application/json" }, status);
  let submitted = [];
  const line = (url, seq) => {
    const p = pages[url];
    const base = { seq, url, attempts: 1, credits_micro: 1e6, bytes: 100, duration_ms: 50 };
    if (p.fail) return { ...base, status: "failed", credits_micro: 0, error: { code: "ERR::UPSTREAM::TIMEOUT", retryable: true } };
    const result = p.omitted ? { bytes: 5000, omitted: true } : { content: p.md, bytes: p.md.length };
    return { ...base, status: "succeeded", http_status: p.http ?? 200, result };
  };

  const fetch = async (input, init) => {
    const url = new URL(input);
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method, path: url.pathname, query: url.searchParams, body });
    const route = `${init.method} ${url.pathname}`;

    if (route === "POST /v1/scrape") {
      if (body.links) return json({ status: 200, url: body.url, content: "", links, credits: 1 });
      const text = files[body.url];
      const headers = { "content-type": "text/html; charset=utf-8", "x-engine": "fetch", "x-target-status": text ? "200" : "404" };
      return reply(text ?? "Not found", headers);
    }
    if (route === "POST /v1/batch") {
      if (batchError) {
        return reply(
          JSON.stringify({ type: "x", title: "Quota", status: 402, code: "ERR::LIMIT::QUOTA_EXCEEDED", detail: "Monthly credits used up.", retryable: false, doc_url: "x", target_status: null, diagnostics: { hint: "Resets on the 1st." } }),
          { "content-type": "application/problem+json" },
          402,
        );
      }
      submitted = body.urls;
      return json({ id: "JOB1", status: "queued", total_items: submitted.length, progress: { total: submitted.length, completed: 0 } }, 202);
    }
    if (route === "GET /v1/batch/JOB1") {
      const done = ++polls > 1; // first poll: running, second: completed
      return json({ id: "JOB1", status: done ? "completed" : "running", progress: { total: submitted.length, completed: done ? submitted.length : 2 } });
    }
    if (route === "GET /v1/batch/JOB1/results") {
      const lines = submitted.map(line);
      const from = Number(url.searchParams.get("cursor")?.slice(1) ?? 0); // cursor "c3" = start at item 3
      const to = from + 5; // pretend pages hold 5 items
      const headers = { "content-type": "application/x-ndjson" };
      if (to < lines.length) headers["x-next-cursor"] = `c${to}`;
      return reply(lines.slice(from, to).map((l) => JSON.stringify(l)).join("\n") + "\n", headers);
    }
    const task = route.match(/^GET \/v1\/batch\/JOB1\/tasks\/(\d+)\/content$/);
    if (task) return json(pages[submitted[Number(task[1])]].md); // a JSON string literal
    return json({ code: "ERR::REQUEST::NOT_FOUND", status: 404, detail: `unexpected ${route}` }, 404);
  };

  const spicrawl = new Spicrawl({ apiKey: "spicrawl_test_stub", fetch, maxRetries: 0 });
  return { spicrawl, calls };
}

test("parseSitemap tells a sitemap index from a urlset and decodes entities", () => {
  assert.deepEqual(parseSitemap(FILES[`${SITE}/sitemap.xml`]).sitemaps, [`${SITE}/sitemap-a.xml`, `${SITE}/sitemap-b.xml`]);
  const { urls, sitemaps } = parseSitemap("<urlset><url><loc> <![CDATA[https://a.com/x?p=1&amp;q=2]]> </loc></url></urlset>");
  assert.deepEqual(urls, ["https://a.com/x?p=1&q=2"]);
  assert.deepEqual(sitemaps, []);
});

test("discover follows a sitemap index into its child sitemaps", async () => {
  const { spicrawl, calls } = stubApi();
  const urls = await discover(spicrawl, SITE);
  assert.deepEqual(urls, [
    `${SITE}/`, `${SITE}/pricing`, `${SITE}/docs/intro`, // sitemap-a: fragment dropped, other.com and .png ignored
    `${SITE}/docs/api?a=1&b=2`, `${SITE}/blog/hello`, `${SITE}/blog/secret`, `${SITE}/blog/broken`, `${SITE}/docs/big`, // sitemap-b
  ]);
  const requested = calls.map((c) => c.body.url);
  assert.deepEqual(requested, [`${SITE}/sitemap.xml`, `${SITE}/sitemap-a.xml`, `${SITE}/sitemap-b.xml`]);
  assert.equal(calls[0].body.response_format, "html"); // the document as retrieved, not extracted text

  const docs = await discover(stubApi().spicrawl, SITE, { include: "/docs", max: 2 });
  assert.deepEqual(docs, [`${SITE}/docs/intro`, `${SITE}/docs/api?a=1&b=2`]);
});

test("discover falls back to robots.txt, then to the links on the homepage", async () => {
  const robots = { [`${SITE}/robots.txt`]: `User-agent: *\nSitemap: ${SITE}/maps/all.xml\n`, [`${SITE}/maps/all.xml`]: urlset(`${SITE}/a`, `${SITE}/b`) };
  const viaRobots = stubApi({ files: robots });
  assert.deepEqual(await discover(viaRobots.spicrawl, SITE), [`${SITE}/a`, `${SITE}/b`]);
  assert.deepEqual(viaRobots.calls.map((c) => c.body.url), [`${SITE}/sitemap.xml`, `${SITE}/robots.txt`, `${SITE}/maps/all.xml`]);

  const viaLinks = stubApi({ files: {}, links: [`${SITE}/about`, `${SITE}/about#team`, "https://twitter.com/x", "mailto:hi@example.com", `${SITE}/guide/start`] });
  assert.deepEqual(await discover(viaLinks.spicrawl, SITE), [`${SITE}/about`, `${SITE}/guide/start`]);
  assert.equal(viaLinks.calls.at(-1).body.links, true);
});

test("generate runs the batch flow: create, poll, page through results, skip bad items", async () => {
  const { spicrawl, calls } = stubApi();
  const logs = [];
  const { llms, full, stats } = await generate(spicrawl, { site: SITE, pollIntervalMs: 1, log: (m) => logs.push(m) });

  const create = calls.find((c) => c.path === "/v1/batch" && c.method === "POST").body;
  assert.equal(create.urls.length, 8);
  assert.equal(create.urls[0], `${SITE}/`); // homepage first
  assert.equal(create.response_format, "markdown");
  assert.equal(create.main_content_only, true);
  assert.equal(create.js_render, false);
  assert.match(logs.find((m) => m.startsWith("Fetching")), /8 pages, about 8 credits/);

  assert.equal(calls.filter((c) => c.path === "/v1/batch/JOB1").length, 2); // running, then completed
  const resultPages = calls.filter((c) => c.path === "/v1/batch/JOB1/results");
  assert.equal(resultPages.length, 2); // followed X-Next-Cursor
  assert.equal(resultPages[1].query.get("cursor"), "c5");
  const task = calls.filter((c) => c.path.includes("/tasks/"));
  assert.deepEqual(task.map((c) => c.path), ["/v1/batch/JOB1/tasks/7/content"]); // the omitted item, fetched on its own

  assert.deepEqual(stats, { failed: 1, blocked: 1, empty: 0, pages: 6 });
  assert.ok(!llms.includes("secret") && !llms.includes("broken")); // 403 and failed items are gone
  assert.ok(!full.includes("Access denied"));

  assert.equal(
    llms,
    [
      "# Example Co",
      "> Example Co builds widgets for people who like widgets. Founded in 2020.",
      "## Pages",
      `- [Example Co](${SITE}/): Example Co builds widgets for people who like widgets.\n- [Pricing](${SITE}/pricing): Plans start free and scale with you.`,
      "## Docs",
      [
        `- [Introduction](${SITE}/docs/intro): Start here to learn the basics.`,
        `- [API Reference](${SITE}/docs/api?a=1&b=2): Every endpoint takes JSON and returns JSON, and this sentence is deliberately long enough that it has to be trimmed t...`,
        `- [Big page](${SITE}/docs/big): This one was too large to inline, so it is fetched on its own.`,
      ].join("\n"),
      "## Blog",
      `- [hello](${SITE}/blog/hello): Welcome to the blog.`,
    ].join("\n\n") + "\n",
  );

  const blocks = full.split("\n\n---\n\n");
  assert.equal(blocks.length, 6);
  // The page's own first heading repeats the title, so it is dropped (any level: "## Pricing" too).
  assert.equal(blocks[0], `# Example Co\nSource: ${SITE}/\n\nExample Co builds widgets for people who like widgets. Founded in 2020.\n\n## Features\n\n- fast`);
  assert.equal(blocks[1], `# Pricing\nSource: ${SITE}/pricing\n\nPlans start free and scale with you. Cancel any time.`);
  assert.equal(blocks[4], `# hello\nSource: ${SITE}/blog/hello\n\n${PAGES[`${SITE}/blog/hello`].md.trim()}`);
});

test("main writes llms.txt and llms-full.txt and reports counts", async () => {
  const { spicrawl } = stubApi();
  const out = await mkdtemp(join(tmpdir(), "llms-txt-"));
  const logs = [];
  const code = await main([SITE, "--out", out, "--max", "3", "--include", "docs"], { spicrawl, pollIntervalMs: 1, log: (m) => logs.push(m), error: assert.fail });
  assert.equal(code, 0);
  const llms = await readFile(join(out, "llms.txt"), "utf8");
  const full = await readFile(join(out, "llms-full.txt"), "utf8");
  // --max 3 keeps the homepage (title and summary) plus two pages; --include lists only /docs.
  assert.equal(llms.split("\n")[0], "# Example Co");
  assert.match(llms, /## Docs\n\n- \[Introduction\]/);
  assert.ok(!llms.includes("[Pricing]") && !llms.includes("[Example Co]("));
  assert.ok(full.startsWith("# Introduction\nSource: https://example.com/docs/intro\n"));
  assert.match(logs.at(-1), /^2 pages; skipped 0 failed, 0 blocked \(HTTP 4xx\/5xx\), 0 empty/);
  assert.deepEqual((await readdir(out)).sort(), ["llms-full.txt", "llms.txt"]); // no --skill, no skill files
});

test("llms-full.txt drops a repeated title heading and docs-UI noise lines, nothing else", async () => {
  const files = { [`${SITE}/sitemap.xml`]: urlset(`${SITE}/`, `${SITE}/docs/intro`, `${SITE}/guide`) };
  const pages = {
    [`${SITE}/`]: { md: "# Example Co\n\nCopy page\n\nExample Co builds widgets for people who like widgets.\n" },
    [`${SITE}/docs/intro`]: { md: "Copy pageOpen\nOpen in ChatGPT\n\n# Introduction\n\nStart here to learn the basics.\n\nEdit on GitHub\n\n## Next steps\n\nCopy pages are not noise.\n" },
    // The first heading is not the first line, so nothing repeats the title and nothing is dropped.
    [`${SITE}/guide`]: { md: "Some preamble that is long enough to be a paragraph.\n\n# Guide\n\nBody text of the guide page.\n" },
  };
  const { full, llms } = await generate(stubApi({ files, pages }).spicrawl, { site: SITE, pollIntervalMs: 1 });
  assert.deepEqual(full.split("\n\n---\n\n"), [
    `# Example Co\nSource: ${SITE}/\n\nExample Co builds widgets for people who like widgets.`,
    `# Introduction\nSource: ${SITE}/docs/intro\n\nStart here to learn the basics.\n\n## Next steps\n\nCopy pages are not noise.`,
    `# Guide\nSource: ${SITE}/guide\n\nSome preamble that is long enough to be a paragraph.\n\n# Guide\n\nBody text of the guide page.\n`, // the file's final newline
  ]);
  assert.ok(!/Copy page$|ChatGPT|Edit on GitHub/m.test(full));
  assert.ok(llms.includes(`- [Introduction](${SITE}/docs/intro): Start here to learn the basics.`));
});

test("--skill writes SKILL.md, a references file per page and AGENTS.md", async () => {
  const { spicrawl } = stubApi();
  const out = await mkdtemp(join(tmpdir(), "llms-txt-"));
  const logs = [];
  const code = await main([SITE, "--out", out, "--skill", "example-docs"], { spicrawl, pollIntervalMs: 1, log: (m) => logs.push(m), error: assert.fail });
  assert.equal(code, 0);

  const skill = await readFile(join(out, "example-docs", "SKILL.md"), "utf8");
  const [, front, body] = skill.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
  assert.equal(front.match(/^name: (.+)$/m)[1], "example-docs");
  const description = JSON.parse(front.match(/^description: (.+)$/m)[1]);
  assert.equal(description, "Use when working with Example Co: Example Co builds widgets for people who like widgets.");
  assert.ok(body.startsWith("# Example Co\n\nExample Co builds widgets for people who like widgets. Founded in 2020.\n\n## Reference\n\n### Pages\n"));
  assert.ok(body.includes("- [Introduction](references/docs-intro.md): Start here to learn the basics."));
  assert.ok(body.includes("- [API Reference](references/docs-api-a-1-b-2.md): "));
  assert.ok(body.includes("### Docs\n") && body.includes("### Blog\n"));
  assert.match(body, /## How to use\n\nOpen only the reference files you need/);
  assert.ok(skill.split("\n").length < 200);

  const files = (await readdir(join(out, "example-docs", "references"))).sort();
  assert.deepEqual(files, ["blog-hello.md", "docs-api-a-1-b-2.md", "docs-big.md", "docs-intro.md", "index.md", "pricing.md"]);
  const intro = await readFile(join(out, "example-docs", "references", "docs-intro.md"), "utf8");
  assert.ok(intro.startsWith(`# Introduction\nSource: ${SITE}/docs/intro\n\n`));
  assert.ok(intro.includes("![logo](/logo.png)"));

  const agents = await readFile(join(out, "AGENTS.md"), "utf8");
  assert.ok(agents.startsWith("# Example Co\n\n> Example Co builds widgets"));
  assert.ok(agents.includes(`- [Introduction](${SITE}/docs/intro): Start here to learn the basics.`)); // absolute URLs
  assert.ok(!agents.includes("references/"));

  assert.ok(logs.some((m) => m.includes(`cp -r ${join(out, "example-docs")} ~/.claude/skills/`)));
  assert.ok(logs.some((m) => m.includes(".agents/skills/")));
});

test("--skill rejects a name that is not kebab-case before spending any credits", async () => {
  const { spicrawl, calls } = stubApi();
  const errors = [];
  assert.equal(await main([SITE, "--skill", "Example_Docs"], { spicrawl, log() {}, error: (m) => errors.push(m) }), 1);
  assert.match(errors[0], /--skill must be a kebab-case name/);
  assert.equal(calls.length, 0);
});

test("errors are explained: missing key, no credits", async () => {
  const saved = process.env.SPICRAWL_API_KEY;
  delete process.env.SPICRAWL_API_KEY;
  const errors = [];
  try {
    assert.equal(await main([SITE], { log() {}, error: (m) => errors.push(m) }), 1);
  } finally {
    if (saved !== undefined) process.env.SPICRAWL_API_KEY = saved;
  }
  assert.match(errors[0], /https:\/\/app\.spicrawl\.com/);
  assert.match(errors[0], /1,000 credits/);

  errors.length = 0;
  const { spicrawl } = stubApi({ batchError: true });
  assert.equal(await main([SITE, "--out", await mkdtemp(join(tmpdir(), "llms-txt-"))], { spicrawl, pollIntervalMs: 1, log() {}, error: (m) => errors.push(m) }), 1);
  assert.match(errors[0], /Out of credits: Monthly credits used up\./);
  assert.match(errors[0], /Hint: Resets on the 1st\./);
});
