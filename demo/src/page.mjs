// The demo page as one HTML string: inline CSS, a small inline script, no framework. See ../DESIGN.md.
// Three effect slots (#slot-beam, #slot-orb, #slot-bot) are filled by the React island /island.js (island/main.jsx),
// which reads <html data-run> and nothing else. The page is complete without it.
// The script is String.raw so its backslashes survive, and it uses no template literals.
import { buildLlmsTxt, buildSkill } from "../../llms-txt.mjs";

const REPO = "https://github.com/OfficialSpicrawl/docs2skill";
const KEY_URL = "https://app.spicrawl.com";
const DOCS_URL = "https://docs.spicrawl.com";
const SITE_URL = "https://docs2skill.spicrawl.com";
export const SKILL_URL = "https://raw.githubusercontent.com/OfficialSpicrawl/docs2skill/main/SKILL.md";
const INSTALL = "npx skills add OfficialSpicrawl/docs2skill";
// The example chips. docs.spicrawl.com is the baked sample (instant); the others run live. Each one's sitemap lists
// real pages that answer 200 with server-rendered HTML.
const CHIPS = ["docs.spicrawl.com", "fastapi.tiangolo.com", "www.mkdocs.org"];
// A star count under this is not shown: "3" does not help anyone.
const MIN_STARS_SHOWN = 10;

// ---------------------------------------------------------------- the sample in the pane

// The pages of a real run on 2026-10-23: node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs
// (recorded in videos/src/docs2skill/real.ts; a test checks that the SKILL.md below is that file, byte for byte).
// The three files are built by the CLI's own functions, so they are what the tool writes for these pages.
// A page's markdown was not recorded, so its reference file shows the two lines the tool writes first.
export const SAMPLE = (() => {
  const d = "https://docs.spicrawl.com";
  const title = "Spicrawl";
  const summary = "Spicrawl is a web data API for agents: fetch, render and extract any URL as markdown, HTML or structured JSON with one request.";
  const pages = [
    ["/", "Spicrawl", "Spicrawl is a web data API for agents: fetch, render and extract any URL as markdown, HTML or structured JSON with on..."],
    ["/authentication", "Authentication", "Authenticate Spicrawl API calls with a Bearer API key, choose live or test keys, and grant the scopes each route needs."],
    ["/credits", "Credits", "What each Spicrawl request costs by rendering tier, what is free, and how to cap spend with max\\_cost and batch budgets."],
    ["/errors", "Errors", "Every Spicrawl error code with its HTTP status, whether to retry, what it means and which parameter to change."],
    ["/quickstart", "Quickstart", "Get a Spicrawl API key, scrape your first page as markdown with curl, Python, TypeScript or the CLI, and read the res..."],
    ["/rate-limits", "Rate limits", "How Spicrawl limits request rate, concurrency, live sessions and monthly credits, the headers that report each limit,..."],
    ["/response-headers", "Response headers", "Every header Spicrawl returns on /v1/scrape: request id, credits, rendering tier, target status, proxy, cache state,..."],
    ["/agents/app-builders", "AI app builders", "Connect Spicrawl's hosted MCP server to Replit Agent, v0, Lovable and Bolt so the builder can read web pages, and cal..."],
  ].map(([path, t, description]) => ({ url: d + path, title: t, description, markdown: "" }));
  const files = buildSkill({ name: "spicrawl-docs", title, summary, pages });
  const refs = files
    .filter((f) => f.path.includes("/references/"))
    .map((f) => ({ name: f.path.split("/").pop(), content: f.content.split("\n").slice(0, 2).join("\n") + "\n" }));
  return {
    name: "spicrawl-docs",
    host: "docs.spicrawl.com",
    titles: pages.map((p) => p.title),
    count: pages.length,
    skillMd: files.find((f) => f.path.endsWith("SKILL.md")).content,
    llmsTxt: buildLlmsTxt({ title, summary, pages }),
    agentsMd: files.find((f) => f.path === "AGENTS.md").content,
    refs,
  };
})();

// What the CLI printed for that run, verbatim (the same strings as LOG in videos/src/docs2skill/real.ts; a test compares them).
export const RUN = {
  cmd: "node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs",
  log: [
    "Discovering pages on https://docs.spicrawl.com/ ...",
    "Fetching 8 pages, about 8 credits (1 per page).",
    "  8/8 pages done",
    "Wrote out/llms.txt and out/llms-full.txt",
    "8 pages; skipped 0 failed, 0 blocked (HTTP 4xx/5xx), 0 empty.",
    "Wrote skill out/spicrawl-docs/ (SKILL.md + 8 reference files) and out/AGENTS.md",
  ],
  progress: "  0/8 pages done", // the same line before the batch finished
};
// The commands the terminal types, which Copy copies.
export const RUN_LINES = ["git clone https://github.com/OfficialSpicrawl/docs2skill && cd docs2skill && npm install", "export SPICRAWL_API_KEY=spicrawl_live_...", RUN.cmd];
// The paths of the sample site's pages, as the sitemap gave them.
export const PATHS = ["/", "/authentication", "/credits", "/errors", "/quickstart", "/rate-limits", "/response-headers", "/agents/app-builders"];

// This site's own llms.txt, served at /llms.txt.
export const LLMS_TXT = `# docs2skill

> Turn any docs site into an agent skill (SKILL.md), llms.txt, llms-full.txt and AGENTS.md. Built on the Spicrawl API. Apache-2.0.

## Use it

- [Live demo](${SITE_URL}/): Paste a docs URL and get the files for up to 5 pages.
- [Repository](${REPO}): The CLI, the agent skill and this demo.
- [README](${REPO}#readme): Options, output format and credits.
- [Agent skill](${SITE_URL}/SKILL.md): How an agent runs docs2skill for a user.

## Spicrawl

- [Spicrawl docs](${DOCS_URL}): The web data API docs.
- [Free API key](${KEY_URL}): 1,000 credits a month.
`;

// ---------------------------------------------------------------- markdown to grey steps of luminance

// One entry per line: { ref?: true for a link line, anno?: a note for the margin, t: [[class, text], ...] }.
// It runs on the server (the sample) and in the page (a run's files), so it is written to survive
// Function.prototype.toString: no outside references. With annotate, a SKILL.md gets its two margin notes.
function tokens(text, annotate) {
  var front = 0, noted = false;
  var out = [];
  text.replace(/\n$/, "").split("\n").forEach(function (line) {
    var m;
    if (/^---\s*$/.test(line)) {
      front++;
      out.push({ t: [["p", line]] });
      if (annotate && front === 2) out.push({ anno: "always loaded" });
    } else if (/^#{1,6}\s/.test(line)) out.push({ t: [["h", line]] });
    else if (/^>/.test(line)) out.push({ t: [["d", line]] });
    else if (front === 1 && (m = line.match(/^(\w+)(:\s*)(.*)$/))) out.push({ t: [["d", m[1]], ["p", m[2]], ["t", m[3]]] });
    else if ((m = line.match(/^(\s*[-*]\s)\[(.*?)\]\((.*?)\)(:\s)?(.*)$/))) {
      out.push({ ref: true, t: [["p", m[1] + "["], ["t", m[2]], ["p", "](" + m[3] + ")" + (m[4] || "")], ["d", m[5]]] });
      if (annotate && !noted && /^references\//.test(m[3])) { noted = true; out.push({ anno: "on demand" }); }
    } else if (/^Source:/.test(line)) out.push({ t: [["d", line]] });
    else out.push({ t: [["t", line]] });
  });
  return out;
}


// The output folder as rows of a tree drawn in characters: { p: the guide, k: "dir" or "file", id, l: the name }.
// Like tokens(), it runs on the server (the sample) and in the page (a run), so it takes everything as arguments.
function rows(name, refs) {
  var out = [{ p: "", k: "dir", l: "out/" }];
  var top = [
    { k: "file", id: "agents", l: "AGENTS.md" },
    { k: "file", id: "llms", l: "llms.txt" },
    { k: "dir", l: name + "/", kids: [
      { k: "file", id: "skill", l: "SKILL.md" },
      { k: "dir", l: "references/", kids: refs.map(function (r) { return { k: "file", id: "ref:" + r.name, l: r.name }; }) }
    ] }
  ];
  (function walk(nodes, pre) {
    nodes.forEach(function (n, i) {
      var last = i === nodes.length - 1;
      out.push({ p: pre + (last ? "\u2514\u2500 " : "\u251c\u2500 "), k: n.k, id: n.id, l: n.l });
      if (n.kids) walk(n.kids, pre + (last ? "   " : "\u2502  "));
    });
  })(top, "");
  return out;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const codeHtml = (text, annotate) => {
  let k = 0;
  return tokens(text, annotate)
    .map((ln) =>
      ln.anno
        ? `<span class="anno">&uarr; ${esc(ln.anno)}</span>`
        : `<span class="ln${ln.ref ? " ref" : ""}"${ln.ref ? ` style="--k:${k++}"` : ""}>${ln.t.map(([c, s]) => `<span class="${c}">${esc(s)}</span>`).join("")}</span>`,
    )
    .join("");
};

// ---------------------------------------------------------------- CSS


const CSS = String.raw`
@font-face { font-family: Geist; src: url(/fonts/geist-latin-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }
@font-face { font-family: "Geist Mono"; src: url(/fonts/geist-mono-latin-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: swap; }
/* The box-drawing glyphs of the tree and the pieces: a 3 KB cut of JetBrains Mono (OFL) from ascii.rest. */
@font-face { font-family: "ascii.rest mono"; src: url(/fonts/ascii-rest-mono.woff2) format("woff2"); unicode-range: U+00B0, U+00B7, U+2022, U+2500-259F, U+25CF; }
:root {
  --ground: #16181B; --paper: #1E2124; --line: #2E3135; --ink: #F9F9F9; --code: #D3D5D8; --muted: #A9ADB2; --faint: #91969D;
  --lime: #4AA74D; /* oklch(65% .155 144), the spicrawl.com accent: 5.8:1 on the ground */
  --radius: 10px; --gut: 24px;
  --ease: cubic-bezier(.2, .7, .2, 1);
  --ui: Geist, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "Geist Mono", "ascii.rest mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
body { margin: 0; background: var(--ground); color: var(--ink); font: 400 16px/1.5 var(--ui); -webkit-font-smoothing: antialiased; }
[hidden] { display: none !important; }
::selection { background: var(--lime); color: var(--ground); }
a { color: var(--ink); text-decoration-color: var(--line); text-underline-offset: 4px; }
a:hover { text-decoration-color: var(--ink); }
:focus-visible { outline: 2px solid var(--lime); outline-offset: 3px; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 var(--gut); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.skip { position: absolute; left: var(--gut); top: -80px; z-index: 10; padding: 10px 14px; background: var(--ink); color: var(--ground); border-radius: var(--radius); font: 500 14px var(--ui); }
.skip:focus { top: 12px; }
.acc { color: var(--lime); }
.nw { white-space: nowrap; }
h1, h2, h3 { font-weight: 600; letter-spacing: -.03em; text-wrap: balance; }

/* ---- buttons: the label rolls up like a line feed; a filled one floods with the accent ---- */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px;
  background: transparent; color: var(--ink); border: 1px solid var(--line); border-radius: var(--radius);
  font: 500 14px/1 var(--ui); text-decoration: none; cursor: pointer; white-space: nowrap;
}
.btn:hover { border-color: var(--muted); }
.btn.primary { background: var(--ink); color: var(--ground); border-color: var(--ink); font-weight: 600; }
.btn.primary:hover, .btn.primary:focus-visible { background: var(--lime); border-color: var(--lime); color: #0C1A0D; }
.btn.lg { min-height: 52px; padding: 0 26px; font-size: 16px; }
.btn[disabled] { opacity: .8; cursor: progress; }
.tbtn { padding: 6px 8px; background: none; border: 0; border-radius: 6px; color: var(--muted); font: 500 13px var(--ui); cursor: pointer; }
.tbtn:hover { color: var(--ink); text-decoration: underline; text-underline-offset: 4px; }
.roll { display: inline-block; height: 1.3em; overflow: hidden; }
.roll .r { display: flex; align-items: center; gap: 8px; height: 1.3em; line-height: 1.3em; }
.arr { flex: none; }
.dup::before { content: attr(data-t); }
@media (prefers-reduced-motion: no-preference) {
  .roll .r { transition: transform .24s var(--ease); }
  a:hover .r, button:hover:not([disabled]) .r, a:focus-visible .r, button:focus-visible .r { transform: translateY(-100%); }
  .btn, .f, .tbtn, .chip, footer a { transition: color .15s, background-color .15s, border-color .15s, text-decoration-color .15s; }
  .chip { transition: transform .15s var(--ease), color .15s, border-color .15s; }
  .chip:hover { transform: translateY(-1px); }
}

/* ---- header ---- */
.top .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 72px; }
.brand { display: flex; align-items: baseline; gap: 8px; font-size: 17px; font-weight: 600; letter-spacing: -.02em; }
.brand a { display: inline-flex; align-items: center; min-height: 32px; margin: -6px 0; color: var(--muted); font-size: 14px; font-weight: 400; letter-spacing: 0; text-decoration: underline; text-decoration-color: transparent; }
.brand a:hover { color: var(--ink); text-decoration-color: var(--ink); }
.star { min-height: 36px; padding: 0; font-size: 13px; gap: 0; }
.star .lbl { display: inline-flex; align-items: center; gap: 8px; padding: 0 14px; }
.star .cnt { display: inline-flex; align-items: center; gap: 5px; align-self: stretch; padding: 0 12px; border-left: 1px solid var(--line); color: var(--muted); font: 500 13px var(--mono); }
.star svg { flex: none; }

/* ---- hero ---- */
.hero { position: relative; overflow: hidden; padding: 56px 0 0; text-align: center; }
/* The background tells the product: the pages of the sample site drift in from both edges and dissolve before they reach
   the text, as if being folded into one file. Spans, transform and opacity only; it never sits under text or a control. */
.drift { display: none; position: absolute; left: 0; right: 0; top: 0; z-index: 0; height: 540px; margin: 0; overflow: hidden; pointer-events: none; color: var(--faint); font: 400 12px/1 var(--mono); }
.drift span { position: absolute; top: var(--y); opacity: 0; white-space: pre; }
.drift .l { left: 24px; }
.drift .r { right: 24px; text-align: right; }
@media (min-width: 1200px) { .drift { display: block; } }
@keyframes d2s-in-l { 0% { opacity: 0; transform: translateX(0); } 20% { opacity: .5; } 70% { opacity: .35; } 100% { opacity: 0; transform: translateX(var(--travel)); } }
@keyframes d2s-in-r { 0% { opacity: 0; transform: translateX(0); } 20% { opacity: .5; } 70% { opacity: .35; } 100% { opacity: 0; transform: translateX(calc(var(--travel) * -1)); } }
@media (prefers-reduced-motion: no-preference) {
  .drift .l { animation: d2s-in-l var(--dur) linear infinite; animation-delay: var(--dl); }
  .drift .r { animation: d2s-in-r var(--dur) linear infinite; animation-delay: var(--dl); }
}
@media (prefers-reduced-motion: reduce) {
  .drift span { opacity: .3; }
  .drift .l { transform: translateX(calc(var(--travel) * .4)); }
  .drift .r { transform: translateX(calc(var(--travel) * -.4)); }
}
.hero > .wrap { position: relative; z-index: 1; }
h1 { max-width: 13em; margin: 0 auto 20px; font-size: clamp(2.5rem, 1rem + 5.6vw, 4.5rem); line-height: 1.04; }
.hero { --travel: max(40px, calc((100vw - 1148px) / 2)); }
.sub { margin: 0 auto 40px; color: var(--muted); font-size: 17px; }
.ask { max-width: 720px; margin: 0 auto; }
.field { position: relative; }
.inwrap { position: relative; }
.inwrap input {
  display: block; width: 100%; height: 56px; padding: 0 150px 0 112px; background: var(--paper); color: var(--ink);
  border: 1px solid var(--line); border-radius: var(--radius); font: 400 15px var(--mono); text-align: left;
}
.inwrap input::placeholder { color: var(--faint); }
.inwrap input:focus-visible { outline-offset: 2px; border-color: var(--lime); }
.prefix { position: absolute; left: 16px; top: 0; bottom: 0; display: flex; align-items: center; color: var(--faint); font: 400 13px var(--mono); pointer-events: none; }
#slot-beam { position: absolute; inset: 0; border-radius: var(--radius); pointer-events: none; }
#go { position: absolute; right: 6px; top: 6px; min-height: 44px; padding: 0 22px; }
.chips { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 10px; margin: 18px 0 0; padding: 0; list-style: none; }
.chip { min-height: 32px; padding: 0 12px; background: transparent; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; font: 400 13px var(--mono); cursor: pointer; }
.chip:hover { border-color: var(--muted); color: var(--ink); }
#error { margin: 16px 0 0; padding: 12px 16px; background: var(--paper); border: 1px solid var(--muted); border-radius: var(--radius); font-size: 14px; text-align: left; }
#error p { margin: 0; }
#error pre { margin: 12px 0 0; }
.get { display: flex; justify-content: center; margin-top: 40px; }

/* ---- the pane: a file tree and a preview, one surface, one hairline between them ---- */
.pane-wrap { margin-top: 72px; scroll-margin-top: 84px; text-align: left; }
.pane { background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); }
.pane-bar { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; justify-content: space-between; min-height: 52px; padding: 8px 12px 8px 20px; border-bottom: 1px solid var(--line); }
.stat { display: flex; align-items: center; gap: 10px; min-width: 0; color: var(--muted); font: 400 13px var(--mono); }
.actions { display: flex; gap: 4px; }
.pane-body { display: grid; grid-template-columns: 300px minmax(0, 1fr); height: 460px; }
.files { padding: 16px 12px 16px 20px; border-right: 1px solid var(--line); overflow: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.view { min-width: 0; overflow: auto; scrollbar-width: thin; scrollbar-color: var(--line) transparent; }
.view:focus-visible { outline-offset: -3px; }
.tree { margin: 0; padding: 0; list-style: none; font: 400 13px/28px var(--mono); }
.tree li { display: flex; align-items: center; white-space: pre; }
.tree .g { color: var(--line); }
.tree .dir { color: var(--faint); }
.f { display: block; min-height: 28px; padding: 0 8px; background: transparent; border: 0; border-radius: 6px; color: var(--muted); font: inherit; line-height: 28px; text-align: left; cursor: pointer; }
.f:hover { background: rgba(249, 249, 249, .05); color: var(--ink); }
.f[aria-current=true] { background: rgba(74, 167, 77, .14); color: var(--ink); }
.f:focus-visible { outline-offset: -2px; }
.code { margin: 0; padding: 20px 24px; font: 400 13px/1.7 var(--mono); tab-size: 2; overflow-wrap: anywhere; white-space: pre-wrap; }
.code code { font: inherit; color: var(--code); }
.pane[data-run=crawl] .view { opacity: .4; }
.ln { display: block; min-height: 1.7em; margin: 0 -8px; padding: 0 8px; border-radius: 4px; }
.anno { display: block; margin: 2px 0 8px; color: var(--lime); font: 400 12px/1.5 var(--mono); user-select: none; }
.cut { display: block; margin-top: 4px; color: var(--faint); }
.h { color: var(--ink); font-weight: 500; }
.t { color: var(--code); }
.d { color: var(--muted); }
.p { color: var(--faint); }
#slot-orb { display: flex; align-items: center; flex: none; width: 20px; height: 20px; }
#slot-orb:empty { display: none; }
#status { margin: 0; min-width: 0; }
#elapsed { color: var(--faint); }
#msg { margin: 0; padding: 10px 20px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 13px; }
#slot-bot { display: block; flex: none; width: 36px; height: 36px; margin: 0 2px 0 -6px; }
@keyframes d2s-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes d2s-pick { 0%, 11% { background: rgba(74, 167, 77, .09); } 12.5%, 100% { background: transparent; } }
@media (prefers-reduced-motion: no-preference) {
  .ln.in, .anno.in { animation: d2s-in .18s var(--ease) both; }
  /* Idle: a reading cursor steps down the page list, one entry at a time. The agent opens only what it needs. */
  .pane:not([data-run=crawl]):not([data-run=write]) .ref { animation: d2s-pick 14.4s linear infinite; animation-delay: calc(var(--k) * 1.8s); }
  .pane[data-run=done] .ref.in { animation: d2s-in .18s var(--ease) both, d2s-pick 14.4s linear infinite; }
}

/* ---- a command ---- */
.cmd { display: flex; align-items: center; gap: 12px; padding: 8px 8px 8px 18px; background: var(--paper); border: 1px solid var(--line); border-radius: var(--radius); text-align: left; }
.cmd pre { flex: 1; min-width: 0; margin: 6px 0; font: 400 14px/1.7 var(--mono); white-space: pre-wrap; overflow-wrap: break-word; color: var(--code); }
.cmd code { font: inherit; }
.cmd .tbtn { flex: none; align-self: flex-start; margin-top: 4px; }
.get .cmd { width: 100%; max-width: 520px; align-items: center; }
.get .cmd .tbtn { align-self: center; margin: 0; }

/* ---- sections: whitespace, not lines ---- */
.sec { padding: 120px 0 0; text-align: center; }
h2 { margin: 0 0 56px; font-size: clamp(1.75rem, 1.1rem + 1.6vw, 2.25rem); line-height: 1.1; }
.how { display: grid; grid-template-columns: minmax(0, 400px) minmax(0, 300px); gap: 64px; justify-content: center; align-items: center; text-align: left; }
/* The flow: the sample's pages found, read and written, lit in turn with the steps beside it. A <pre> of spans, aria-hidden. */
.flow { margin: 0; color: var(--muted); font: 400 14px/26px var(--mono); white-space: pre; transition: opacity .5s; }
.flow.fade { opacity: 0; }
.fl { display: block; height: 26px; }
.fl .g { color: var(--line); }
.fl .nm { display: inline-block; min-width: 21ch; color: var(--code); }
.fl .bar { display: inline-block; min-width: 8ch; color: var(--lime); }
.fl .ck { display: inline-block; width: 2ch; margin-left: 1ch; color: var(--lime); }
.fl.out + .fl:not(.out) { margin-top: 0; }
.fl.gap { margin-top: 14px; }
.steps { margin: 0; padding: 0; list-style: none; display: grid; gap: 28px; counter-reset: s; }
.steps li { display: grid; grid-template-columns: 28px 1fr; gap: 0 16px; align-items: baseline; }
.steps li::before { counter-increment: s; content: counter(s); color: var(--lime); font: 500 13px var(--mono); }
.steps h3 { margin: 0; font: 600 22px/1.2 var(--ui); letter-spacing: -.02em; }
.steps p { grid-column: 2; margin: 4px 0 0; color: var(--muted); font: 400 13px var(--mono); }
.js .steps li { opacity: .4; transition: opacity .3s; }
.js .steps li.on { opacity: 1; }
.js .flow .page, .js .flow .out { opacity: 0; transform: translateX(-6px); }
.js .flow .page.show, .js .flow .out.show { opacity: 1; transform: none; transition: opacity .25s, transform .25s var(--ease); }
.js .flow .ck { opacity: 0; }
.js .flow .page.read .ck { opacity: 1; }
.js .flow .page .bar { transition: opacity .4s; }
.js .flow .page.read .bar { opacity: .5; }
/* A terminal: the commands type in, the CLI's real output follows. The text is in the page whole; the script only reveals it. */
.run { max-width: 880px; margin: 0 auto; }
.term pre { min-height: 0; }
.term .tl { display: inline; }
.term .rs { visibility: hidden; }
.term .pr { color: var(--faint); }
.term .o { color: var(--muted); }
.term .k { color: var(--lime); font-weight: 600; }
.term.anim .o, .term.anim .k { opacity: 0; }
.term.anim .o.on, .term.anim .k.on { opacity: 1; transition: opacity .2s; }
.term.anim pre { transition: opacity .5s; }
.term.anim.fade pre { opacity: 0; }
.caret { color: var(--lime); }
@media (prefers-reduced-motion: no-preference) { .caret { animation: d2s-blink 1s steps(2, start) infinite; } }
@keyframes d2s-blink { to { visibility: hidden; } }
.cta { padding: 136px 0 120px; text-align: center; }
.cta h2 { max-width: 12em; margin: 0 auto 40px; font-size: clamp(2.25rem, 1rem + 4.4vw, 3.75rem); line-height: 1.04; }
.cta .row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
.fine { margin: 16px 0 0; color: var(--muted); font-size: 14px; }

footer { padding: 0 0 48px; color: var(--muted); font-size: 13px; }
footer .wrap { display: flex; flex-wrap: wrap; gap: 8px 32px; justify-content: space-between; padding-top: 28px; border-top: 1px solid var(--line); }
footer p { margin: 0; }
footer nav { display: flex; flex-wrap: wrap; gap: 0 20px; }
footer a { display: inline-block; padding: 5px 0; color: var(--muted); text-decoration-color: transparent; }
footer a:hover { color: var(--ink); text-decoration-color: var(--ink); }

@media (max-width: 820px) {
  .pane-body { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); height: 540px; }
  .files { padding: 8px; border-right: 0; border-bottom: 1px solid var(--line); overflow-x: auto; }
  /* The tree becomes one row of file chips, scrolling sideways. */
  .tree { display: flex; gap: 6px; line-height: 1; }
  .tree .g, .tree .dir { display: none; }
  .f { white-space: nowrap; min-height: 32px; padding: 0 12px; border: 1px solid var(--line); border-radius: 999px; line-height: 30px; }
  .f[aria-current=true] { border-color: var(--lime); }
  .how { grid-template-columns: minmax(0, 1fr); gap: 40px; justify-items: center; }
  .steps { justify-self: stretch; max-width: 360px; width: 100%; margin: 0 auto; }
  .sec { padding-top: 112px; }
}
@media (max-width: 560px) {
  :root { --gut: 16px; }
  .top .wrap { min-height: 64px; }
  .star .lg { display: none; }
  .star .dup::before { content: "Star"; }
  .hero { padding-top: 32px; }
  .sub { margin-bottom: 32px; }
  .inwrap input { height: 52px; padding: 0 12px 0 104px; }
  #go { position: static; width: 100%; min-height: 52px; margin-top: 12px; }
  .get { margin-top: 32px; }
  .pane-wrap { margin-top: 64px; }
  .pane-body { height: 480px; }
  .code { padding: 16px 14px; font-size: 12.5px; }
  .cmd { padding-left: 14px; }
  .cmd pre { font-size: 12.5px; }
  .actions { margin-left: auto; }
  .stat { flex: 1 1 100%; }
  .sec { padding-top: 88px; }
  h2 { margin-bottom: 40px; }
  .cta { padding: 112px 0 96px; }
  .cta .btn.lg, .cta .star { width: 100%; }
  .cta .star { justify-content: center; }
  footer .wrap { flex-direction: column; }
  footer p { line-height: 1.5; }
}
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
`;

// ---------------------------------------------------------------- script

// wrangler's bundler (esbuild with keep_names) wraps named functions in __name(...), which tokens() and rows() carry
// into the page through toString(); this stand-in keeps them working there.
const JS =
  "var __name = function (f) { return f; };\nvar tokens = " + tokens.toString() + ";\nvar rows = " + rows.toString() + ";\nvar MIN_STARS = " + MIN_STARS_SHOWN + ";\n" +
  String.raw`
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  var nonce = document.currentScript && document.currentScript.nonce;
  var form = $("f"), input = $("url"), go = $("go"), statusEl = $("status"), errorEl = $("error"), pane = $("pane"), view = $("view");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var sample = JSON.parse($("sample").textContent), state = sample, cur = "skill", sampleNote = statusEl.textContent, ticker = null, running = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // The island (React and the ascii pieces, see island/main.jsx) reads data-run on <html>: idle, crawl, write, done or error.
  function setRun(v) {
    root.dataset.run = v; pane.dataset.run = v;
    document.dispatchEvent(new Event("d2s:run"));
  }
  setRun("idle");

  // The files of the current state, by id: skill, llms, agents, ref:<file name>.
  function text(id) {
    if (id === "skill") return state.skillMd;
    if (id === "llms") return state.llmsTxt;
    if (id === "agents") return state.agentsMd;
    var r = state.refs.filter(function (x) { return "ref:" + x.name === id; })[0];
    return r ? r.content : "";
  }
  function fileName(id) { return id.indexOf("ref:") === 0 ? id.slice(4) : { skill: "SKILL.md", llms: "llms.txt", agents: "AGENTS.md" }[id]; }

  // Text goes in with textContent only, never as HTML. With animate, the lines are written one after another.
  function paint(id, animate) {
    var code = view; code.textContent = "";
    var lines = tokens(text(id), id === "skill"), step = Math.min(16, 900 / lines.length), k = 0;
    lines.forEach(function (ln, i) {
      var row;
      if (ln.anno) row = el("span", "anno", "↑ " + ln.anno);
      else {
        row = el("span", "ln" + (ln.ref ? " ref" : ""));
        if (ln.ref) row.style.setProperty("--k", k++);
        ln.t.forEach(function (p) { row.appendChild(el("span", p[0], p[1])); });
      }
      if (animate) { row.classList.add("in"); row.style.animationDelay = Math.round(i * step) + "ms"; }
      code.appendChild(row);
    });
    if (id.indexOf("ref:") === 0) code.appendChild(el("span", "cut", "The CLI writes the whole page."));
    return Math.round(lines.length * step) + 180;
  }

  function open(id, animate) {
    cur = id;
    Array.prototype.forEach.call(document.querySelectorAll("#tree .f"), function (b) { b.setAttribute("aria-current", b.dataset.f === id ? "true" : "false"); });
    view.parentNode.scrollTop = 0;
    return paint(id, animate);
  }

  // The tree is rebuilt from a state: out/, AGENTS.md, llms.txt, <name>/ with SKILL.md and references/.
  function tree() {
    var ul = $("tree"); ul.textContent = "";
    rows(state.name, state.refs).forEach(function (r) {
      var li = el("li");
      if (r.p) li.appendChild(el("span", "g", r.p));
      if (r.k === "dir") li.appendChild(el("span", "dir", r.l));
      else {
        var b = el("button", "f", r.l);
        b.type = "button"; b.dataset.f = r.id; b.setAttribute("aria-current", "false");
        b.addEventListener("click", function () { open(r.id); });
        li.appendChild(b);
      }
      ul.appendChild(li);
    });
  }

  function flash(btn, label) {
    var was = btn.dataset.label || (btn.dataset.label = btn.textContent);
    btn.textContent = label;
    setTimeout(function () { btn.textContent = was; }, 1800);
  }

  function copy(value, btn, node) {
    var done = function () { flash(btn, "Copied"); };
    var fallback = function () {
      var sel = window.getSelection(), r = document.createRange();
      r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
      flash(btn, "Press Ctrl+C");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(done, fallback);
    else fallback();
  }

  $("copy").addEventListener("click", function () { copy(text(cur), this, view); });
  $("download").addEventListener("click", function () {
    var url = URL.createObjectURL(new Blob([text(cur)], { type: "text/plain;charset=utf-8" }));
    var a = el("a"); a.href = url; a.download = fileName(cur);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  // A command block copies its plain commands (data-text): no prompt, no output, and the whole text even mid-typing.
  Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (btn) {
    btn.addEventListener("click", function () {
      var pre = btn.closest(".cmd").querySelector("pre");
      copy(btn.dataset.text != null ? btn.dataset.text : pre.textContent.replace(/\s+$/, ""), btn, pre);
    });
  });

  // The button label is two stacked lines (it rolls on hover); the second is generated from data-t.
  function label(btn, value) {
    btn.querySelector(".r").textContent = value;
    btn.querySelector(".dup").setAttribute("data-t", value);
  }

  function token() {
    var t = form.querySelector("[name='cf-turnstile-response']");
    return t ? t.value : "";
  }

  function busy(on) {
    running = on; go.disabled = on;
    label(go, on ? "Generating" : "Generate");
    clearInterval(ticker);
    $("elapsed").textContent = "";
    if (on) {
      var t0 = Date.now();
      setRun("crawl");
      statusEl.textContent = "Crawling docs";
      ticker = setInterval(function () { $("elapsed").textContent = Math.round((Date.now() - t0) / 1000) + "s"; }, 1000);
    }
  }

  function fail(data) {
    errorEl.textContent = "";
    errorEl.appendChild(el("p", "", data.error || "Something went wrong. Try again."));
    if (data.commands) errorEl.appendChild(el("pre", "code", data.commands.join("\n")));
    errorEl.hidden = false;
    setRun("error");
    statusEl.textContent = pane.dataset.note || sampleNote;
  }

  function show(d) {
    var s = d.stats;
    state = { name: s.skillName, skillMd: d.skillMd, llmsTxt: d.llmsTxt, agentsMd: d.agentsMd, refs: d.references || [] };
    tree();
    var wait = open("skill", !reduce);
    $("msg").hidden = !s.message;
    $("msg").textContent = s.message || "";
    setRun("write");
    statusEl.textContent = "Writing SKILL.md";
    var note = s.host + " · " + s.pages + " page" + (s.pages === 1 ? "" : "s") + " · " + Math.round(s.durationMs / 100) / 10 + " s";
    pane.dataset.note = note;
    setTimeout(function () { setRun("done"); statusEl.textContent = note; }, reduce ? 0 : wait);
    $("pane-h").focus({ preventScroll: true });
  }

  function showSample() {
    state = sample; tree(); open("skill"); setRun("idle");
    $("msg").hidden = true; errorEl.hidden = true;
    statusEl.textContent = sampleNote; delete pane.dataset.note;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (running) return;
    errorEl.hidden = true;
    busy(true);
    if (window.matchMedia("(max-width: 820px)").matches) $("pane-wrap").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 100000);
    fetch("/api/generate", {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ url: input.value.trim(), max: 5, turnstile: token() })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        busy(false);
        if (res.ok) show(data);
        else fail(res.status === 429 ? { error: data.error || "Too many runs. Try again in a minute." } : data);
      });
    }).catch(function (err) {
      busy(false);
      fail({ error: err && err.name === "AbortError" ? "That took too long. Try again, or run the CLI on the whole site." : "Network error. Check your connection and try again." });
    }).then(function () {
      clearTimeout(timer);
      if (window.turnstile) window.turnstile.reset(); // a token works once
    });
  });

  // Example chips: the baked sample answers at once, any other site runs live.
  Array.prototype.forEach.call(document.querySelectorAll(".chip"), function (c) {
    c.addEventListener("click", function () {
      if (running) return;
      input.value = "https://" + c.dataset.host;
      if (c.dataset.host === sample.host) { showSample(); input.focus(); }
      else form.requestSubmit();
    });
  });

  tree(); open("skill");

  // The GitHub star count: cached for 6 hours, never blocks, and the button has no count segment until there is one.
  // A count under MIN is left out: "3 stars" does not help anyone. The number always comes from the API.
  (function () {
    var KEY = "d2s:stars", TTL = 6 * 3600 * 1000;
    var fmt = function (n) { return n >= 1000 ? (Math.round(n / 100) / 10) + "k" : String(n); };
    var put = function (n) {
      if (n < MIN_STARS) return;
      Array.prototype.forEach.call(document.querySelectorAll("[data-stars]"), function (c) { c.textContent = fmt(n); c.parentNode.hidden = false; });
    };
    var cached = null;
    try { cached = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (cached && Number.isInteger(cached.n)) { put(cached.n); if (Date.now() - cached.t < TTL) return; }
    fetch("https://api.github.com/repos/OfficialSpicrawl/docs2skill", { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !Number.isInteger(j.stargazers_count)) return;
        put(j.stargazers_count);
        try { localStorage.setItem(KEY, JSON.stringify({ n: j.stargazers_count, t: Date.now() })); } catch (e) {}
      })
      .catch(function () {});
  })();


  // Two small scenes, the "how it works" flow and the terminal, share one 50 ms timer that runs only while one of them is
  // on screen. Their final state is in the page (what a crawler, a reader without script or a reader who prefers reduced
  // motion gets); the script resets them to the start when they come near the screen and plays them in a loop.
  var scenes = [], timer = null;
  function sync() {
    var any = scenes.some(function (s) { return s.on; });
    if (any && !timer) timer = setInterval(function () {
      var now = Date.now();
      scenes.forEach(function (s) { if (s.on) s.step(now - s.t0); });
    }, 50);
    else if (!any && timer) { clearInterval(timer); timer = null; }
  }
  function watch(el, s) {
    if (reduce || !("IntersectionObserver" in window)) return;
    scenes.push(s);
    new IntersectionObserver(function (es) {
      var on = es[es.length - 1].isIntersecting;
      if (on && !s.on) { s.t0 = Date.now(); s.reset(); }
      s.on = on; sync();
    }, { rootMargin: "120px" }).observe(el);
  }
  if (!reduce) root.classList.add("js");

  // The flow: Find (the pages appear), Read (each gets a bar that fills), Write (the output folder appears).
  (function () {
    var flow = $("flow"); if (!flow) return;
    var rows = [].slice.call(flow.querySelectorAll(".page")), outs = [].slice.call(flow.querySelectorAll(".out"));
    var bars = rows.map(function (r) { return r.querySelector(".bar"); });
    var steps = [].slice.call(document.querySelectorAll("#steps li"));
    var EIGHTHS = ["", "\u258f", "\u258e", "\u258d", "\u258c", "\u258b", "\u258a", "\u2589"];
    function bar(f) {
      var full = Math.floor(f * 8), part = Math.floor((f * 8 - full) * 8), s = "", i;
      for (i = 0; i < full; i++) s += "\u2588";
      if (full < 8) { s += EIGHTHS[part]; for (i = full + (part ? 1 : 0); i < 8; i++) s += "\u2591"; }
      return s;
    }
    var LOOP = 9800, last = {};
    function put(el, key, cls, on) { if (last[key] !== on) { last[key] = on; el.classList.toggle(cls, on); } }
    function reset() { last = {}; rows.forEach(function (r, i) { r.classList.remove("show", "read"); bars[i].textContent = bar(0); }); outs.forEach(function (o) { o.classList.remove("show"); }); flow.classList.remove("fade"); }
    function step(ms) {
      var t = ms % LOOP, phase = t < 1900 ? 0 : t < 5000 ? 1 : 2;
      steps.forEach(function (li, i) { put(li, "s" + i, "on", i === phase); });
      rows.forEach(function (r, i) {
        put(r, "r" + i, "show", t >= 150 + i * 130);
        var f = Math.max(0, Math.min(1, (t - 2100 - i * 280) / 720)), q = Math.round(f * 24);
        if (last["b" + i] !== q) { last["b" + i] = q; bars[i].textContent = bar(f); }
        put(r, "k" + i, "read", f >= 1);
      });
      outs.forEach(function (o, j) { put(o, "o" + j, "show", t >= 5200 + j * 300); });
      put(flow, "fade", "fade", t >= 9100);
    }
    watch(flow, { on: false, t0: 0, reset: reset, step: step });
  })();

  // The terminal: the commands type in, then the output the CLI really printed, then a tick.
  (function () {
    var term = $("term"); if (!term) return;
    var nid = 0;
    var cmds = [].slice.call(term.querySelectorAll(".c")).map(function (c) {
      var toks = [].slice.call(c.querySelectorAll(":scope > span:not(.pr)")).map(function (t) { return { id: nid++, ty: t.querySelector(".ty"), rs: t.querySelector(".rs"), full: t.textContent }; });
      return { el: c, toks: toks, len: toks.reduce(function (n, t) { return n + t.full.length; }, 0) };
    });
    var outs = [].slice.call(term.querySelectorAll(".o")), tick = term.querySelector(".k"), caret = document.createElement("span");
    caret.className = "caret"; caret.textContent = "\u258c";
    var CPS = 70, GAP = 280, at = [], t0 = 0;
    cmds.forEach(function (c) { at.push(t0); t0 += c.len * 1000 / CPS + GAP; });
    var out0 = t0 + 400, OUT = [0, 600, 1000, 2300, 2700, 3100], tickAt = out0 + 3900, LOOP = tickAt + 4200, last = {};
    // Shows the first n characters of a command; returns the token the caret belongs after.
    function typeTo(c, n) {
      var used = 0, at = c.toks[0];
      c.toks.forEach(function (t) {
        var take = Math.max(0, Math.min(t.full.length, n - used));
        if (take > 0 || used === 0) at = t;
        used += t.full.length;
        if (last["t" + t.id] !== take) { last["t" + t.id] = take; t.ty.textContent = t.full.slice(0, take); t.rs.textContent = t.full.slice(take); }
      });
      return at;
    }
    function put(el, key, on) { if (last[key] !== on) { last[key] = on; el.classList.toggle("on", on); } }
    function reset() { last = {}; term.classList.add("anim"); term.classList.remove("fade"); cmds.forEach(function (c) { typeTo(c, 0); }); outs.forEach(function (o, i) { o.classList.remove("on"); if (o.dataset.a) o.textContent = o.dataset.a; }); tick.classList.remove("on"); }
    function step(ms) {
      var t = ms % LOOP, active = null;
      cmds.forEach(function (c, i) {
        var n = Math.max(0, Math.min(c.len, Math.floor((t - at[i]) * CPS / 1000)));
        var tok = typeTo(c, t < at[i] ? 0 : n);
        if (t >= at[i] && n < c.len) active = tok;
      });
      if (active) active.ty.parentNode.insertBefore(caret, active.ty.nextSibling); else if (caret.parentNode) caret.parentNode.removeChild(caret);
      outs.forEach(function (o, i) {
        var shown = t >= out0 + OUT[i];
        put(o, "o" + i, shown);
        if (o.dataset.a) { var done = t >= out0 + 1700; if (last.swap !== done) { last.swap = done; o.textContent = done ? o.dataset.b : o.dataset.a; } }
      });
      put(tick, "k", t >= tickAt);
      var fade = t >= LOOP - 700;
      if (last.fade !== fade) { last.fade = fade; term.classList.toggle("fade", fade); }
    }
    watch(term, { on: false, t0: 0, reset: reset, step: step });
  })();

  // The effects (React, one island) load after the page has painted.
  window.addEventListener("load", function () {
    (window.requestIdleCallback || function (f) { setTimeout(f, 200); })(function () {
      var s = document.createElement("script");
      s.type = "module"; s.src = "/island.js"; if (nonce) s.nonce = nonce;
      document.head.appendChild(s);
    });
  });
})();
`;

// ---------------------------------------------------------------- markup

const ARROW = `<svg class="arr" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const GITHUB = `<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>`;
const STAR = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false"><path d="M8 1.6l1.9 4.2 4.6.5-3.4 3.1 1 4.5L8 11.6l-4.1 2.3 1-4.5L1.5 6.3l4.6-.5z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>`;

// The second line is generated content (data-t), so the label is in the page once and a reader or a check sees it once.
const roll = (html, plain, arrow = false) =>
  `<span class="roll"><span class="r">${html}${arrow ? ARROW : ""}</span><span class="r dup" aria-hidden="true" data-t="${esc(plain)}">${arrow ? ARROW : ""}</span></span>`;

// The count segment is hidden until the GitHub API has answered with a number worth showing (see MIN_STARS_SHOWN).
const starButton = () =>
  `<a class="btn star" href="${REPO}" aria-label="Star on GitHub"><span class="lbl">${GITHUB}${roll('<span>Star<span class="lg"> on GitHub</span></span>', "Star on GitHub")}</span><span class="cnt" hidden>${STAR}<span data-stars></span></span></a>`;

// A command block: [class, text] spans per line. h = the command, t = its arguments, d = values, p = punctuation or comments.
const cmd = (lines, aria, text) =>
  `<div class="cmd"><pre><code>${lines.map((l) => l.map(([c, s]) => `<span class="${c}">${esc(s)}</span>`).join("")).join("\n")}</code></pre><button class="tbtn" type="button" data-copy data-text="${esc(text).replace(/\n/g, "&#10;")}" aria-label="Copy ${esc(aria)}">Copy</button></div>`;

// The hero background: the sample site's pages (left) and their titles (right), drifting in from the edges.
const drift = () => {
  const row = (t, side, i, off) => `<span class="${side}" style="--y:${50 + i * 64 + (side === "r" ? 30 : 0)}px;--dur:${11 + ((i * 7 + off) % 5)}s;--dl:-${(i * 2.1 + off).toFixed(1)}s">${esc(t)}</span>`;
  return `<pre class="drift" aria-hidden="true">${PATHS.slice(1).map((t, i) => row(t, "l", i, 0)).join("")}${SAMPLE.titles.map((t, i) => row("# " + t, "r", i, 5)).join("")}</pre>`;
};

// The "how it works" flow, in its final state (the script resets it and plays it): the pages, a bar and a tick each, the output.
const flow = () => {
  const page = (p, i) => `<span class="fl page show read"><span class="g">${i === PATHS.length - 1 ? "\u2514\u2500" : "\u251c\u2500"} </span><span class="nm">${esc(p)}</span><span class="bar">\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</span><span class="ck">\u2713</span></span>`;
  const out = [["out/", ""], ["AGENTS.md", "\u251c\u2500 "], ["llms.txt", "\u251c\u2500 "], ["spicrawl-docs/SKILL.md", "\u2514\u2500 "]]
    .map(([t, g], i) => `<span class="fl out show${i === 0 ? " gap" : ""}">${g ? `<span class="g">${g}</span>` : ""}<span class="nm">${esc(t)}</span></span>`)
    .join("");
  return `<pre class="flow" id="flow" aria-hidden="true"><span class="fl root">${esc(SAMPLE.host)}/</span>${PATHS.map(page).join("")}${out}</pre>`;
};

// The terminal, in its final state: the three commands (typed by the script), the CLI's real output, a tick.
const terminal = () => {
  const tok = ([c, t]) => `<span class="${c}"><span class="ty">${esc(t)}</span><span class="rs"></span></span>`;
  const cmds = [
    [["h", "git"], ["t", " clone"], ["d", " https://github.com/OfficialSpicrawl/docs2skill"], ["p", " && "], ["h", "cd"], ["d", " docs2skill"], ["p", " && "], ["h", "npm"], ["t", " install"]],
    [["h", "export"], ["t", " SPICRAWL_API_KEY"], ["p", "="], ["d", "spicrawl_live_..."]],
    [["h", "node"], ["t", " llms-txt.mjs"], ["d", " https://docs.spicrawl.com"], ["p", " --max"], ["d", " 8"], ["p", " --skill"], ["d", " spicrawl-docs"]],
  ];
  const c = cmds.map((l) => `<span class="tl c"><span class="pr">$ </span>${l.map(tok).join("")}</span>`);
  const o = RUN.log.map((l, i) => `<span class="tl o"${i === 2 ? ` data-a="${esc(RUN.progress)}" data-b="${esc(l)}"` : ""}>${esc(l)}</span>`);
  return `<div class="cmd term" id="term"><pre><code>${c.join("\n")}\n${o.join("\n")}\n<span class="tl k">\u2713</span></code></pre><button class="tbtn" type="button" data-copy data-text="${esc(RUN_LINES.join("\n")).replace(/\n/g, "&#10;")}" aria-label="Copy the commands">Copy</button></div>`;
};

// The sample's tree, server side (the page script rebuilds it from a run's result).
const treeHtml = () =>
  `<ul class="tree" id="tree">${rows(SAMPLE.name, SAMPLE.refs)
    .map(
      (r) =>
        `<li>${r.p ? `<span class="g">${esc(r.p)}</span>` : ""}${r.k === "dir" ? `<span class="dir">${esc(r.l)}</span>` : `<button class="f" type="button" data-f="${esc(r.id)}" aria-current="${r.id === "skill"}">${esc(r.l)}</button>`}</li>`,
    )
    .join("")}</ul>`;

export function renderPage({ beaconToken = "", nonce = "", turnstileSiteKey = "", analytics = "" } = {}) {
  // Cloudflare Web Analytics beacon, only when a token is configured (tokens are hex; anything else is dropped).
  const beacon = /^[\w-]+$/.test(beaconToken)
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${beaconToken}"}'></script>`
    : "";
  // Cloudflare Turnstile, only when a site key is configured. The widget adds a hidden "cf-turnstile-response"
  // field to the form; the script below sends its value with the request.
  const widget = turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileSiteKey)}" data-theme="dark"></div>` : "";
  const challenge = turnstileSiteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : "";
  const n = nonce ? ` nonce="${esc(nonce)}"` : "";
  const title = "docs2skill: any docs site as an agent skill";
  const desc = "Paste a docs URL and get SKILL.md, llms.txt and AGENTS.md for Claude Code, Codex and any agent. Free and open source, built on the Spicrawl API.";
  const ld = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "docs2skill",
    description: desc,
    url: SITE_URL,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Any",
    license: "https://www.apache.org/licenses/LICENSE-2.0",
    codeRepository: REPO,
    author: { "@type": "Organization", name: "Spicrawl", url: "https://spicrawl.com" },
  };
  // The sample for the script. "<" is escaped so the data can never close its own script tag.
  const sample = JSON.stringify({ name: SAMPLE.name, host: SAMPLE.host, skillMd: SAMPLE.skillMd, llmsTxt: SAMPLE.llmsTxt, agentsMd: SAMPLE.agentsMd, refs: SAMPLE.refs }).replace(/</g, "\\u003c");
  const sampleNote = `${SAMPLE.host} \u00b7 ${SAMPLE.count} pages`;
  const chips = CHIPS.map((h) => `<li><button class="chip" type="button" data-host="${esc(h)}">${esc(h)}</button></li>`).join("");
  const limit = "The demo reads up to 5 pages; the CLI does the whole site.";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#16181B">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE_URL}/">
<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE_URL}/">
<meta property="og:image" content="${SITE_URL}/og.png">
<meta property="og:image:width" content="1280">
<meta property="og:image:height" content="640">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2316181B'/%3E%3Cpath d='M10 11h12M10 16h12M10 21h7' stroke='%23F9F9F9' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/geist-mono-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>
<style>${CSS}</style>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="top">
  <div class="wrap">
    <div class="brand">docs2skill <a href="https://spicrawl.com">by Spicrawl</a></div>
    ${starButton()}
  </div>
</header>

<main id="main">
  <section class="hero" aria-labelledby="h1">
    ${drift()}
    <div class="wrap">
      <h1 id="h1">Turn any docs site into an <span class="nw"><span class="acc">agent skill</span>.</span></h1>
      <p class="sub">Paste a docs URL. Get files Claude Code, Codex and Cursor can use.</p>

      <form id="f" class="ask" novalidate>
        <div class="field">
          <div class="inwrap">
            <span class="prefix" aria-hidden="true">docs2skill</span>
            <input id="url" name="url" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2048" required placeholder="https://docs.acme.dev" aria-label="Docs site URL" aria-describedby="limit">
            <span id="slot-beam" aria-hidden="true"></span>
          </div>
          <button id="go" class="btn primary" type="submit" title="${esc(limit)}">${roll("Generate", "Generate")}</button>
        </div>
        <p id="limit" class="sr">${limit}</p>
        <ul class="chips" aria-label="Examples">${chips}</ul>
        ${widget}
        <noscript><p class="fine">The demo needs JavaScript.</p></noscript>
        <div id="error" role="alert" hidden></div>
      </form>

      <div class="get">${cmd([[["p", "$ "], ["h", "npx"], ["t", " skills add"], ["d", " OfficialSpicrawl/docs2skill"]]], "the skill install command", "npx skills add OfficialSpicrawl/docs2skill")}</div>

      <div class="pane-wrap" id="pane-wrap">
                <div class="pane" id="pane" role="group" aria-labelledby="pane-h">
          <div class="pane-bar">
            <h2 class="sr" id="pane-h" tabindex="-1">Generated files</h2>
            <div class="stat"><span id="slot-bot"></span><span id="slot-orb" aria-hidden="true"></span><p id="status" role="status">${esc(sampleNote)}</p><span id="elapsed" aria-hidden="true"></span></div>
            <div class="actions">
              <button id="copy" class="tbtn" type="button">Copy</button>
              <button id="download" class="tbtn" type="button">Download</button>
            </div>
          </div>
          <p id="msg" hidden></p>
          <div class="pane-body">
            <nav class="files" aria-label="Files">${treeHtml()}</nav>
            <div class="view" tabindex="0" role="region" aria-label="File preview"><pre class="code"><code id="view">${codeHtml(SAMPLE.skillMd, true)}</code></pre></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="how-h">
    <div class="wrap">
      <h2 id="how-h">How it works</h2>
      <div class="how">
        ${flow()}
        <ol class="steps" id="steps">
          <li class="on"><h3>Find</h3><p>sitemap or links</p></li>
          <li class="on"><h3>Read</h3><p>pages as markdown</p></li>
          <li class="on"><h3>Write</h3><p>files, no model</p></li>
        </ol>
      </div>
    </div>
  </section>

  <section class="sec" aria-labelledby="run-h">
    <div class="wrap">
      <h2 id="run-h">Run it yourself</h2>
      <div class="run">${terminal()}</div>
    </div>
  </section>

  <section class="cta" aria-labelledby="cta-h">
    <div class="wrap">
      <h2 id="cta-h">Give your agent the docs.</h2>
      <div class="row">
        <a class="btn primary lg" href="${KEY_URL}">${roll("Try Spicrawl free", "Try Spicrawl free", true)}</a>
        ${starButton()}
      </div>
      <p class="fine">Free key. 1,000 credits a month.</p>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">
    <p>Built on <a href="https://spicrawl.com">Spicrawl</a>. Free key at <a href="${KEY_URL}">app.spicrawl.com</a>.</p>
    <nav aria-label="Footer"><a href="${DOCS_URL}">Docs</a><a href="${REPO}">GitHub</a><a href="/llms.txt">llms.txt</a><a href="${REPO}/blob/main/LICENSE">Apache-2.0</a><a href="https://ascii.rest">ascii.rest (MIT)</a></nav>
  </div>
</footer>
<script type="application/json" id="sample">${sample}</script>
<script${n}>${JS}</script>
${beacon}
${analytics}
${challenge}
</body>
</html>
`;
}

// A visitor who follows a dead link lands here (the worker answers JSON for anything that is not asking for HTML).
export function renderNotFound() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="robots" content="noindex">
<title>Not found: docs2skill</title>
<link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"><div class="brand">docs2skill <a href="https://spicrawl.com">by Spicrawl</a></div></div></header>
<main id="main" class="wrap" style="padding-top: 120px; padding-bottom: 200px; text-align: center">
  <h1>Not found.</h1>
  <p class="sub">The tool is on the home page.</p>
  <a class="btn primary lg" href="/">${roll("Back to docs2skill", "Back to docs2skill", true)}</a>
</main>
</body>
</html>
`;
}
