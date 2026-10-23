// Offline tests for the demo Worker: env and fetch are stubbed, so no network and no credits.
// The stub speaks the same wire format as the CLI tests (see ../../llms-txt.test.mjs).
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { limits, parseTarget, skillName } from "../src/guards.mjs";
import worker from "../src/worker.mjs";

const KEY = "spicrawl_live_SECRET_KEY_FOR_TESTS";
const SITE = "https://docs.example.com";
const urlset = (...locs) => `<?xml version="1.0"?><urlset>${locs.map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`;
const PATHS = ["/", ...Array.from({ length: 11 }, (_, i) => `/guide/page-${i + 1}`)];
const FILES = { [`${SITE}/sitemap.xml`]: urlset(...PATHS.map((p) => SITE + p)) };
const pageMd = (url) => `# ${new URL(url).pathname === "/" ? "Example Docs" : "Page " + new URL(url).pathname.split("-").pop()}\n\nThis is the first paragraph of ${url}, long enough to be a summary.\n`;

const realFetch = globalThis.fetch;
const realCaches = globalThis.caches;
let calls; // every request the Worker made to the API: { method, path, auth, body }

// Stubs api.spicrawl.com. Options: remainingMicro / unlimited (usage summary), batchStatus 402 (quota error),
// stuck (the job never completes), blocked (every page answers 403), summaryStatus.
function stubApi({ remainingMicro = 900e6, unlimited = false, batchStatus = 200, stuck = false, blocked = false, summaryStatus = 200 } = {}) {
  calls = [];
  let submitted = [];
  const reply = (body, headers = {}, status = 200) => new Response(body, { status, headers });
  const json = (body, status = 200) => reply(JSON.stringify(body), { "content-type": "application/json" }, status);
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ method: init.method ?? "GET", path: url.pathname, auth: new Headers(init.headers).get("authorization"), body });
    const route = `${init.method ?? "GET"} ${url.pathname}`;
    if (route === "GET /v1/usage/summary") {
      return summaryStatus === 200 ? json({ allowance: { remaining_micro: remainingMicro, limit_credits: 1000, unlimited } }) : json({ code: "ERR::AUTH::INVALID_KEY", status: summaryStatus }, summaryStatus);
    }
    if (route === "POST /v1/scrape") {
      const text = FILES[body.url];
      return reply(text ?? "Not found", { "content-type": "text/html", "x-engine": "fetch", "x-target-status": text ? "200" : "404", "x-credits-charged": "1" });
    }
    if (route === "POST /v1/batch") {
      if (batchStatus === 402) return json({ code: "ERR::LIMIT::QUOTA_EXCEEDED", status: 402, detail: "Monthly credits used up.", retryable: false }, 402);
      submitted = body.urls;
      return json({ id: "JOB1", status: "queued", progress: { total: submitted.length, completed: 0 } }, 202);
    }
    if (route === "GET /v1/batch/JOB1") return json({ id: "JOB1", status: stuck ? "running" : "completed", progress: { total: submitted.length, completed: stuck ? 1 : submitted.length } });
    if (route === "POST /v1/batch/JOB1/cancel") return json({ id: "JOB1", status: "cancelling" });
    if (route === "GET /v1/batch/JOB1/results") {
      // A stuck job has finished only its first item.
      const lines = (stuck ? submitted.slice(0, 1) : submitted).map((u, seq) => ({
        seq, url: u, status: "succeeded", http_status: blocked ? 403 : 200, credits_micro: blocked ? 0 : 1e6, result: { content: blocked ? "Access denied" : pageMd(u) },
      }));
      return reply(lines.map((l) => JSON.stringify(l)).join("\n") + "\n", { "content-type": "application/x-ndjson" });
    }
    return json({ code: "ERR::REQUEST::NOT_FOUND", status: 404, detail: `unexpected ${route}` }, 404);
  };
}

function makeEnv(extra = {}) {
  const events = [];
  return { env: { SPICRAWL_API_KEY: KEY, BEACON_TOKEN: "", EVENTS: { writeDataPoint: (p) => events.push(p) }, LIMITER: { limit: async () => ({ success: true }) }, ...extra }, events };
}

const ctx = { waitUntil: (p) => p };
const post = (body, env) =>
  worker.fetch(new Request("https://docs2skill.spicrawl.com/api/generate", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "CF-Connecting-IP": "203.0.113.7" } }), env, ctx);

beforeEach(() => {
  calls = [];
  limits.pollIntervalMs = 1;
  limits.timeoutMs = 60_000;
  globalThis.caches = undefined; // no edge cache in Node; the credit-cache test installs one
});
afterEach(() => {
  globalThis.fetch = realFetch;
  globalThis.caches = realCaches;
});

test("GET / serves the page; the beacon only appears with a token", async () => {
  const { env } = makeEnv();
  const res = await worker.fetch(new Request("https://docs2skill.spicrawl.com/"), env, ctx);
  assert.equal(res.status, 200);
  assert.match(res.headers.get("content-type"), /text\/html/);
  const html = await res.text();
  assert.ok(html.includes("The demo reads up to 5 pages; the CLI does the whole site."));
  assert.ok(html.includes("Run it on your whole site") && html.includes("https://app.spicrawl.com"));
  assert.ok(html.includes('role="tablist"') && html.includes("docs.spicrawl.com"));
  assert.ok(!html.includes("cloudflareinsights"));
  const nonce = res.headers.get("content-security-policy").match(/'nonce-([^']+)'/)[1];
  assert.ok(html.includes(`<script nonce="${nonce}">`));

  const beacon = await (await worker.fetch(new Request("https://x.test/"), { ...env, BEACON_TOKEN: "abc123" }, ctx)).text();
  assert.ok(beacon.includes(`<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "abc123"}'></script>`));
  const junk = await (await worker.fetch(new Request("https://x.test/"), { ...env, BEACON_TOKEN: `x'"><script>` }, ctx)).text();
  assert.ok(!junk.includes("cloudflareinsights"));

  assert.equal((await worker.fetch(new Request("https://x.test/nope"), env, ctx)).status, 404);
  assert.equal((await worker.fetch(new Request("https://x.test/api/generate"), env, ctx)).status, 405);
});

test("POST /api/generate returns the three files and stats, capped at 5 pages whatever the client asks", async () => {
  stubApi();
  const { env, events } = makeEnv();
  const res = await post({ url: "docs.example.com/some/page", max: 500 }, env); // bare host, and a max above the cap
  assert.equal(res.status, 200);
  const data = await res.json();

  const create = calls.find((c) => c.path === "/v1/batch").body;
  assert.equal(create.urls.length, 5);
  assert.equal(create.urls[0], `${SITE}/`);
  assert.equal(create.js_render, false);
  assert.equal(calls.every((c) => c.auth === `Bearer ${KEY}`), true);

  assert.match(data.llmsTxt, /^# Example Docs\n\n> This is the first paragraph/);
  assert.match(data.skillMd, /^---\nname: docs-example-com\ndescription: "Use when working with Example Docs/);
  assert.ok(data.skillMd.includes("](references/guide-page-"));
  assert.match(data.agentsMd, /^# Example Docs\n/);
  assert.ok(data.agentsMd.includes(`](${SITE}/guide/page-1)`));
  assert.equal(data.stats.pages, 5);
  assert.equal(data.stats.skipped, 0);
  assert.equal(data.stats.credits, 6); // 1 sitemap request + 5 pages
  assert.equal(data.stats.skillName, "docs-example-com");
  assert.equal(data.stats.message, undefined);
  assert.ok(!JSON.stringify(data).includes(KEY));

  assert.equal(events.length, 1);
  assert.deepEqual(events[0].blobs, ["docs2skill", "generated", "docs.example.com", ""]);
  assert.deepEqual(events[0].doubles.slice(0, 1).concat(events[0].doubles[2]), [6, 5]);
  assert.deepEqual(events[0].indexes, ["docs2skill"]);
});

test("a max below the cap is honoured", async () => {
  stubApi();
  const res = await post({ url: SITE, max: 2 }, makeEnv().env);
  assert.equal(calls.find((c) => c.path === "/v1/batch").body.urls.length, 2);
  assert.equal((await res.json()).stats.pages, 2);
});

test("invalid input is refused with 400 before any API call", async () => {
  const bad = [
    "file:///etc/passwd", "ftp://docs.example.com", "javascript:alert(1)", "http://localhost", "http://localhost:8787/x", "http://127.0.0.1", "http://127.1",
    "http://2130706433", "http://10.0.0.5/docs", "http://192.168.1.1", "http://172.16.0.1", "http://172.31.255.255", "http://8.8.8.8", "http://[::1]/", "http://[fd00::1]",
    "http://printer.local", "http://db.internal", "http://intranet", "http://user:pass@docs.example.com", "", "   ", "https://" + "a".repeat(2050) + ".com",
  ];
  for (const url of bad) {
    stubApi();
    const { env, events } = makeEnv();
    const res = await post({ url }, env);
    assert.equal(res.status, 400, url.slice(0, 60));
    assert.equal(typeof (await res.json()).error, "string");
    assert.equal(calls.length, 0, `no API call for ${url.slice(0, 60)}`);
    assert.equal(events[0].blobs[1], "invalid");
  }
  for (const body of ["not json", "[]", "null", '{"url": 5}', "x".repeat(5000)]) {
    stubApi();
    assert.equal((await post(body, makeEnv().env)).status, 400);
    assert.equal(calls.length, 0);
  }
  assert.deepEqual(parseTarget("HTTPS://Docs.Example.com./a/b?q=1"), { site: SITE, host: "docs.example.com" });
});

test("rate limit answers 429 and spends nothing", async () => {
  stubApi();
  const keys = [];
  const { env, events } = makeEnv({ LIMITER: { limit: async ({ key }) => (keys.push(key), { success: false }) } });
  const res = await post({ url: SITE }, env);
  assert.equal(res.status, 429);
  assert.equal(res.headers.get("retry-after"), "60");
  assert.deepEqual(keys, ["203.0.113.7"]); // keyed by CF-Connecting-IP
  assert.equal(calls.length, 0);
  assert.equal(events[0].blobs[1], "rate_limited");
});

test("credit guard refuses below 100 credits, passes at 100 and when unlimited", async () => {
  stubApi({ remainingMicro: 99.9e6 });
  let { env, events } = makeEnv();
  let res = await post({ url: SITE }, env);
  assert.equal(res.status, 503);
  let data = await res.json();
  assert.match(data.error, /The demo has used its credits for this month/);
  assert.ok(data.error.includes("run it yourself") || data.error.includes("Run it yourself"));
  assert.ok(data.commands.some((c) => c.startsWith("node llms-txt.mjs ")));
  assert.ok(!calls.some((c) => c.path === "/v1/batch" || c.path === "/v1/scrape"));
  assert.equal(events[0].blobs[1], "no_credits");

  stubApi({ remainingMicro: 100e6 });
  assert.equal((await post({ url: SITE }, makeEnv().env)).status, 200);
  stubApi({ remainingMicro: 0, unlimited: true });
  assert.equal((await post({ url: SITE }, makeEnv().env)).status, 200);

  stubApi({ summaryStatus: 401 }); // cannot check: fail closed, never leak why
  ({ env, events } = makeEnv());
  res = await post({ url: SITE }, env);
  assert.equal(res.status, 503);
  assert.ok(!JSON.stringify(await res.json()).includes(KEY));
  assert.ok(!calls.some((c) => c.path === "/v1/batch"));
});

test("the usage summary is cached through caches.default", async () => {
  const store = new Map();
  globalThis.caches = {
    default: {
      match: async (req) => store.get(req.url)?.clone(),
      put: async (req, res) => void store.set(req.url, res),
    },
  };
  stubApi();
  await post({ url: SITE }, makeEnv().env);
  await post({ url: SITE }, makeEnv().env);
  assert.equal(calls.filter((c) => c.path === "/v1/usage/summary").length, 1);
  const [cached] = store.values();
  assert.equal(cached.headers.get("cache-control"), "max-age=60");
  assert.ok(!(await cached.clone().text()).includes(KEY));
});

test("a job that outlives the wait returns what finished, with a message, and is cancelled", async () => {
  stubApi({ stuck: true });
  limits.timeoutMs = 30;
  const { env, events } = makeEnv();
  const res = await post({ url: SITE }, env);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.stats.pages, 1);
  assert.match(data.stats.message, /still running after 0\.03 seconds, so this is the 1 page that finished/);
  assert.ok(data.llmsTxt.includes("Example Docs"));
  assert.ok(calls.some((c) => c.method === "POST" && c.path === "/v1/batch/JOB1/cancel"));
  assert.equal(events[0].blobs[1], "partial");
});

test("no readable pages is a 422 no_pages", async () => {
  stubApi({ blocked: true });
  const { env, events } = makeEnv();
  const res = await post({ url: SITE }, env);
  assert.equal(res.status, 422);
  assert.match((await res.json()).error, /No pages could be read from docs\.example\.com/);
  assert.equal(events[0].blobs[1], "no_pages");
  assert.equal(events[0].doubles[2], 0);
});

test("SDK errors become friendly messages without the key", async () => {
  stubApi({ batchStatus: 402 });
  let { env, events } = makeEnv();
  let res = await post({ url: SITE }, env);
  assert.equal(res.status, 503);
  assert.match((await res.json()).error, /used its credits for this month/);
  assert.equal(events[0].blobs[1], "no_credits");

  stubApi();
  const failing = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith("/v1/scrape")) return new Response(JSON.stringify({ code: "ERR::AUTH::INVALID_KEY", status: 401, detail: `bad key ${KEY}` }), { status: 401, headers: { "content-type": "application/problem+json" } });
    return failing(input, init);
  };
  ({ env, events } = makeEnv());
  res = await post({ url: SITE }, env);
  const text = await res.text();
  assert.equal(res.status, 503);
  assert.match(text, /temporarily unavailable/);
  assert.ok(!text.includes(KEY));
  assert.equal(events[0].blobs[1], "error");

  ({ env } = makeEnv({ SPICRAWL_API_KEY: "" }));
  assert.equal((await post({ url: SITE }, env)).status, 503);
});

test("skillName is kebab-case from the hostname, at most 64 characters", () => {
  assert.equal(skillName("docs.example.com"), "docs-example-com");
  assert.equal(skillName("www.example.com"), "example-com");
  assert.equal(skillName("xn--bcher-kva.example"), "xn-bcher-kva-example");
  const long = skillName(`${"a".repeat(40)}.${"b".repeat(40)}.com`);
  assert.ok(long.length <= 64 && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(long));
});
