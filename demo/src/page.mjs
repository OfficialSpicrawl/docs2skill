// The demo page as one HTML string: inline CSS, a small inline script, no framework, no build step.
// The script is String.raw so its backslashes survive, and it uses no template literals.

const REPO = "https://github.com/OfficialSpicrawl/docs2skill";
const KEY_URL = "https://app.spicrawl.com";

const CSS = String.raw`
:root {
  --ground: #16181B; --card: #1E2124; --border: #2E3135; --text: #F9F9F9; --muted: #A9ADB2;
  /* Code is grey on grey: four steps of luminance, brightest for headings, dimmest for punctuation and URLs. */
  --c1: #F9F9F9; --c2: #D3D5D8; --c3: #A9ADB2; --c4: #8A8F96;
  --radius: 10px;
  --ui: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color-scheme: dark;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--ground); color: var(--text); font: 400 16px/1.6 var(--ui); }
[hidden] { display: none !important; }
a { color: var(--text); text-decoration-color: var(--border); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--text); }
:focus-visible { outline: 2px solid var(--text); outline-offset: 2px; }
.wrap { max-width: 880px; margin: 0 auto; padding: 0 16px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

header { border-bottom: 1px solid var(--border); }
header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 60px; }
.brand { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.brand a { text-decoration: none; }
.wordmark { font: 400 22px/1 Righteous, var(--ui); letter-spacing: .01em; }
.brand .dot { color: var(--muted); }
.brand .name { font-weight: 500; }
.gh { font-size: 14px; font-weight: 500; }

main.wrap { padding-top: 48px; padding-bottom: 24px; }
h1 { margin: 0 0 12px; font: 600 clamp(28px, 6vw, 40px)/1.15 var(--ui); letter-spacing: -.02em; }
h2 { margin: 0 0 12px; font: 600 20px/1.3 var(--ui); letter-spacing: -.01em; }
.lede { margin: 0 0 28px; max-width: 60ch; color: var(--muted); font-size: 17px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
.card + .card, .card + section, section + .card { margin-top: 24px; }

label { display: block; margin-bottom: 8px; font-size: 14px; font-weight: 500; }
.row { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.row + .row { margin-top: 14px; }
input[type=text] {
  flex: 1 1 240px; min-width: 0; height: 44px; padding: 0 14px; background: var(--ground); color: var(--text);
  border: 1px solid var(--border); border-radius: var(--radius); font: 400 15px var(--mono);
}
input[type=text]::placeholder { color: var(--c4); }
input[type=text]:focus-visible { outline-offset: 0; border-color: var(--text); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px; padding: 0 18px;
  background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: var(--radius);
  font: 500 14px var(--ui); text-decoration: none; cursor: pointer;
}
.btn:hover { border-color: var(--muted); }
.btn.primary { background: #fff; color: var(--ground); border-color: #fff; font-weight: 600; }
.btn.primary:hover { background: var(--text); }
.btn.small { min-height: 36px; padding: 0 12px; font-size: 13px; }
.btn[disabled] { opacity: .55; cursor: not-allowed; }
.btn.primary:focus-visible { outline-offset: 3px; }
.note { margin: 0; color: var(--muted); font-size: 14px; }

#status { margin: 0; color: var(--muted); font-size: 14px; }
#status:not(:empty) { margin-top: 16px; }
#error { margin-top: 16px; border-color: var(--muted); }
#error p { margin: 0; }
#error pre { margin-top: 12px; }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 0 0 16px; }
.stat { background: var(--ground); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; min-width: 0; }
.stat dt { color: var(--muted); font-size: 13px; }
.stat dd { margin: 0; font: 600 26px/1.2 var(--ui); font-variant-numeric: tabular-nums; }
#msg { margin: 0 0 16px; padding: 10px 14px; border: 1px solid var(--muted); border-radius: var(--radius); font-size: 14px; }

.bar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; justify-content: space-between; margin-bottom: 12px; }
[role=tablist] { display: flex; gap: 4px; padding: 4px; background: var(--ground); border: 1px solid var(--border); border-radius: var(--radius); }
[role=tab] {
  min-height: 36px; padding: 0 14px; background: transparent; color: var(--muted); border: 0; border-radius: 7px;
  font: 500 13px var(--mono); cursor: pointer;
}
[role=tab]:hover { color: var(--text); }
[role=tab][aria-selected=true] { background: var(--border); color: var(--text); }
.actions { display: flex; gap: 8px; }
.code { margin: 0; padding: 16px; background: var(--ground); border: 1px solid var(--border); border-radius: var(--radius); overflow: auto; font: 400 13px/1.65 var(--mono); tab-size: 2; }
.code code { font: inherit; color: var(--c2); }
[role=tabpanel] { border-radius: var(--radius); }
[role=tabpanel] .code { max-height: 28rem; }
.h { color: var(--c1); font-weight: 500; }
.t { color: var(--c2); }
.d { color: var(--c3); }
.p { color: var(--c4); }
.fine { margin: 14px 0 0; color: var(--muted); font-size: 13px; }

#cli .code { margin: 12px 0 16px; }
#cli p { margin: 0 0 4px; color: var(--muted); }
#cli .links { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
footer { padding: 24px 0 48px; color: var(--muted); font-size: 13px; }
footer a { color: var(--muted); }

@media (max-width: 480px) {
  main.wrap { padding-top: 32px; }
  .card { padding: 16px; }
  .stat dd { font-size: 22px; }
  .stat { padding: 10px 12px; }
  .actions { width: 100%; }
  .actions .btn { flex: 1; }
  [role=tablist] { width: 100%; }
  [role=tab] { flex: 1; padding: 0 6px; }
}
@media (prefers-reduced-motion: no-preference) {
  .btn, [role=tab], a, input { transition: color .15s, background-color .15s, border-color .15s; }
}
`;

const JS = String.raw`
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var form = $("f"), input = $("url"), go = $("go"), statusEl = $("status"), errorEl = $("error"), result = $("result");
  var TABS = [["llms", "llmsTxt", "llms.txt"], ["skill", "skillMd", "SKILL.md"], ["agents", "agentsMd", "AGENTS.md"]];
  var files = {}, active = 0, ticker = null;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // Markdown to grey steps of luminance. Text goes in with textContent only, never as HTML.
  function paint(code, text) {
    code.textContent = "";
    var front = 0;
    text.replace(/\n$/, "").split("\n").forEach(function (line, i) {
      if (i) code.appendChild(document.createTextNode("\n"));
      var m;
      if (/^---\s*$/.test(line)) { front++; code.appendChild(el("span", "p", line)); }
      else if (/^#{1,6}\s/.test(line)) code.appendChild(el("span", "h", line));
      else if (/^>/.test(line)) code.appendChild(el("span", "d", line));
      else if (front === 1 && (m = line.match(/^(\w+)(:\s*)(.*)$/))) {
        code.appendChild(el("span", "d", m[1])); code.appendChild(el("span", "p", m[2])); code.appendChild(el("span", "t", m[3]));
      } else if ((m = line.match(/^(\s*[-*]\s)\[(.*?)\]\((.*?)\)(:\s)?(.*)$/))) {
        code.appendChild(el("span", "p", m[1] + "["));
        code.appendChild(el("span", "t", m[2]));
        code.appendChild(el("span", "p", "](" + m[3] + ")" + (m[4] || "")));
        code.appendChild(el("span", "d", m[5]));
      } else code.appendChild(el("span", "t", line));
    });
  }

  function select(i, focus) {
    active = i;
    TABS.forEach(function (t, n) {
      var on = n === i, tab = $("tab-" + t[0]);
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      $("panel-" + t[0]).hidden = !on;
      if (on && focus) tab.focus();
    });
  }

  $("tabs").addEventListener("keydown", function (e) {
    var next = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select((next + TABS.length) % TABS.length, true);
  });
  TABS.forEach(function (t, n) { $("tab-" + t[0]).addEventListener("click", function () { select(n); }); });

  function flash(btn, text) {
    var was = btn.dataset.label || (btn.dataset.label = btn.textContent);
    btn.textContent = text;
    setTimeout(function () { btn.textContent = was; }, 1800);
  }

  function copy(text, btn, node) {
    var done = function () { flash(btn, "Copied"); };
    var fallback = function () {
      var sel = window.getSelection(), r = document.createRange();
      r.selectNodeContents(node); sel.removeAllRanges(); sel.addRange(r);
      flash(btn, "Selected: press Ctrl+C");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  $("copy").addEventListener("click", function () {
    var t = TABS[active];
    copy(files[t[1]], this, $("panel-" + t[0]).querySelector("code"));
  });
  $("download").addEventListener("click", function () {
    var t = TABS[active];
    var url = URL.createObjectURL(new Blob([files[t[1]]], { type: "text/plain;charset=utf-8" }));
    var a = el("a"); a.href = url; a.download = t[2];
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $("copy-cmd").addEventListener("click", function () { copy($("cmds").textContent, this, $("cmds")); });

  $("example").addEventListener("click", function () { input.value = "https://docs.spicrawl.com"; input.focus(); });

  function token() {
    var t = form.querySelector("[name='cf-turnstile-response']");
    return t ? t.value : "";
  }

  function busy(on) {
    go.disabled = on;
    go.textContent = on ? "Generating..." : "Generate";
    clearInterval(ticker);
    if (on) {
      var t0 = Date.now();
      var tick = function () { statusEl.textContent = "Finding pages and reading up to 5. This usually takes 10 to 40 seconds (" + Math.round((Date.now() - t0) / 1000) + "s)."; };
      tick(); ticker = setInterval(tick, 1000);
    } else statusEl.textContent = "";
  }

  function fail(data) {
    errorEl.textContent = "";
    errorEl.appendChild(el("p", "", data.error || "Something went wrong. Try again."));
    if (data.commands) errorEl.appendChild(el("pre", "code", data.commands.join("\n")));
    errorEl.hidden = false;
  }

  function show(d) {
    TABS.forEach(function (t) { files[t[1]] = d[t[1]]; paint($("panel-" + t[0]).querySelector("code"), d[t[1]]); });
    var s = d.stats;
    $("n-pages").textContent = s.pages;
    $("n-skipped").textContent = s.skipped;
    $("n-credits").textContent = Number(s.credits).toLocaleString(undefined, { maximumFractionDigits: 2 });
    $("msg").hidden = !s.message;
    $("msg").textContent = s.message || "";
    result.hidden = false;
    select(0);
    result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    $("result-h").focus({ preventScroll: true });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (go.disabled) return;
    errorEl.hidden = true; result.hidden = true;
    busy(true);
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, 100000);
    fetch("/api/generate", {
      method: "POST", headers: { "content-type": "application/json" }, signal: ctl.signal,
      body: JSON.stringify({ url: input.value.trim(), max: 5, turnstile: token() })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.ok) show(data);
        else fail(res.status === 429 ? { error: data.error || "Too many runs. Try again in a minute." } : data);
      });
    }).catch(function (err) {
      fail({ error: err && err.name === "AbortError" ? "That took too long. Try again, or run the CLI on the whole site." : "Network error. Check your connection and try again." });
    }).then(function () {
      clearTimeout(timer); busy(false);
      if (window.turnstile) window.turnstile.reset(); // a token works once
    });
  });
})();
`;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

// analytics: the OpenPanel tag (openpanel.mjs), already built with the nonce; empty means none.
export function renderPage({ beaconToken = "", nonce = "", turnstileSiteKey = "", analytics = "" } = {}) {
  // Cloudflare Web Analytics beacon, only when a token is configured (tokens are hex; anything else is dropped).
  const beacon = /^[\w-]+$/.test(beaconToken)
    ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${beaconToken}"}'></script>`
    : "";
  // Cloudflare Turnstile, only when a site key is configured. The widget adds a hidden "cf-turnstile-response"
  // field to the form; the script below sends its value with the request.
  const widget = turnstileSiteKey ? `<div class="cf-turnstile" data-sitekey="${esc(turnstileSiteKey)}" data-theme="dark"></div>` : "";
  const challenge = turnstileSiteKey ? `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>` : "";
  const tab = (id, label, selected) =>
    `<button role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${selected}" tabindex="${selected ? 0 : -1}" type="button">${label}</button>`;
  const panel = (id, hidden) =>
    `<div role="tabpanel" id="panel-${id}" aria-labelledby="tab-${id}" tabindex="0"${hidden ? " hidden" : ""}><pre class="code"><code></code></pre></div>`;
  const desc = "Paste a docs site URL and get llms.txt, SKILL.md and AGENTS.md for your agent. Built on the Spicrawl API.";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>docs2skill by Spicrawl</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="docs2skill: turn any docs site into an agent skill">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="https://docs2skill.spicrawl.com">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2316181B'/%3E%3Cpath d='M10 11h12M10 16h12M10 21h7' stroke='%23F9F9F9' stroke-width='2.4' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Righteous&text=Spicrawl&display=swap">
<style>${CSS}</style>
</head>
<body>
<header>
  <div class="wrap">
    <div class="brand">
      <a href="https://spicrawl.com" class="wordmark">Spicrawl</a>
      <span class="dot" aria-hidden="true">&middot;</span>
      <span class="name">docs2skill</span>
    </div>
    <a class="gh" href="${REPO}">GitHub</a>
  </div>
</header>

<main class="wrap">
  <h1>Turn any docs site into an agent skill</h1>
  <p class="lede">Paste a docs URL. Spicrawl reads the pages and writes an llms.txt, a SKILL.md and an AGENTS.md for Claude Code, Codex and any agent that reads them.</p>

  <form id="f" class="card" novalidate>
    <label for="url">Docs site URL</label>
    <div class="row">
      <input id="url" name="url" type="text" inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="2048" required placeholder="https://docs.example.com" aria-describedby="limit">
      <button id="go" class="btn primary" type="submit">Generate</button>
    </div>
    <div class="row">
      <button id="example" class="btn small" type="button">Example: docs.spicrawl.com</button>
      <p id="limit" class="note">The demo reads up to 5 pages; the CLI does the whole site.</p>
    </div>
    ${widget}
    <noscript><p class="note">The demo needs JavaScript. The CLI below does not.</p></noscript>
    <p id="status" role="status" aria-live="polite"></p>
    <div id="error" class="card" role="alert" hidden></div>
  </form>

  <section id="result" class="card" aria-labelledby="result-h" hidden>
    <h2 id="result-h" tabindex="-1">Your files</h2>
    <dl class="stats">
      <div class="stat"><dt>Pages fetched</dt><dd id="n-pages">0</dd></div>
      <div class="stat"><dt>Skipped</dt><dd id="n-skipped">0</dd></div>
      <div class="stat"><dt>Credits</dt><dd id="n-credits">0</dd></div>
    </dl>
    <p id="msg" hidden></p>
    <div class="bar">
      <div id="tabs" role="tablist" aria-label="Generated files">
        ${tab("llms", "llms.txt", true)}${tab("skill", "SKILL.md", false)}${tab("agents", "AGENTS.md", false)}
      </div>
      <div class="actions">
        <button id="copy" class="btn small" type="button">Copy</button>
        <button id="download" class="btn small" type="button">Download</button>
      </div>
    </div>
    ${panel("llms", false)}${panel("skill", true)}${panel("agents", true)}
    <p class="fine">SKILL.md links to a references/ folder with one markdown file per page. The CLI writes that folder too; the demo shows the three index files.</p>
  </section>

  <section id="cli" class="card" aria-labelledby="cli-h">
    <h2 id="cli-h">Run it on your whole site</h2>
    <p>Free key, 1,000 credits a month. Node 18 or newer.</p>
    <pre class="code"><code id="cmds"><span class="h">git</span> <span class="t">clone</span> <span class="d">${REPO}</span>
<span class="h">cd</span> <span class="d">docs2skill</span>
<span class="h">npm</span> <span class="t">install</span>
<span class="h">export</span> <span class="t">SPICRAWL_API_KEY</span><span class="p">=</span><span class="d">spicrawl_live_...</span>
<span class="h">node</span> <span class="t">llms-txt.mjs</span> <span class="d">https://docs.example.com</span> <span class="p">--skill</span> <span class="d">example-docs</span></code></pre>
    <div class="links">
      <button id="copy-cmd" class="btn small" type="button">Copy</button>
      <a class="btn small" href="${REPO}">GitHub repo</a>
      <a class="btn small" href="${KEY_URL}">Get a free key</a>
    </div>
  </section>
</main>

<footer>
  <div class="wrap">Built on the <a href="https://spicrawl.com">Spicrawl</a> web scraping API. <a href="https://docs.spicrawl.com">Docs</a></div>
</footer>
<script${nonce ? ` nonce="${esc(nonce)}"` : ""}>${JS}</script>
${beacon}
${analytics}
${challenge}
</body>
</html>
`;
}
