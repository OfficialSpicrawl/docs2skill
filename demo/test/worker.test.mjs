// Offline tests for the demo Worker: env and fetch are stubbed, so no network and no credits.
// The stub speaks the same wire format as the CLI tests (see ../../llms-txt.test.mjs).
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { readFile } from "node:fs/promises";
import { limitKey, limits, parseTarget, skillName } from "../src/guards.mjs";
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

const DAY = 864e5;
const GOOD_TOKEN = "turnstile-good-token";
const TS = { TURNSTILE_SITE_KEY: "0xSITEKEY", TURNSTILE_SECRET: "0xSECRET" };

// Stubs api.spicrawl.com (and Turnstile's siteverify). Options: remainingMicro / unlimited / elapsed (the usage summary:
// a 1000-credit allowance whose 30-day month is `elapsed` over; `allowance` replaces the whole object), batchStatus 402
// (quota error), stuck (the job never completes), blocked (every page answers 403), summaryStatus, verifyStatus.
function stubApi({ remainingMicro = 900e6, unlimited = false, elapsed = 0.5, allowance, batchStatus = 200, stuck = false, blocked = false, summaryStatus = 200, verifyStatus = 200 } = {}) {
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
      const month = {
        limit_micro: unlimited ? 0 : 1000e6, remaining_micro: remainingMicro, limit_credits: 1000, unlimited,
        window_start: new Date(Date.now() - elapsed * 30 * DAY).toISOString(), resets_at: new Date(Date.now() + (1 - elapsed) * 30 * DAY).toISOString(),
      };
      return summaryStatus === 200 ? json({ allowance: allowance === undefined ? month : allowance }) : json({ code: "ERR::AUTH::INVALID_KEY", status: summaryStatus }, summaryStatus);
    }
    if (route === "POST /turnstile/v0/siteverify") {
      return verifyStatus === 200 ? json({ success: body.response === GOOD_TOKEN && body.secret === TS.TURNSTILE_SECRET }) : json({ success: true }, verifyStatus);
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
const post = (body, env, headers = {}) =>
  worker.fetch(
    new Request("https://docs2skill.spicrawl.com/api/generate", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { "content-type": "application/json", "CF-Connecting-IP": "203.0.113.7", ...headers },
    }),
    env,
    ctx,
  );

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
    "http://printer.local", "http://db.internal", "http://intranet",
    "http://127.0.0.1./", "http://127.0.0.1../", "http://127.0.0.1......./x", "http://localhost./", "http://localhost../", "http://metadata.google.internal../", "http://169.254.169.254../", "http://[::1]../", "http://user:pass@docs.example.com", "", "   ", "https://" + "a".repeat(2050) + ".com",
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
  assert.deepEqual(parseTarget("https://docs.example.com../a"), { site: SITE, host: "docs.example.com" }); // dots dropped, host kept
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
  stubApi({ remainingMicro: 99.9e6, elapsed: 1 }); // end of the month, so only the 100-credit floor can refuse
  let { env, events } = makeEnv();
  let res = await post({ url: SITE }, env);
  assert.equal(res.status, 503);
  let data = await res.json();
  assert.match(data.error, /The demo has used its credits for this month/);
  assert.ok(data.error.includes("run it yourself") || data.error.includes("Run it yourself"));
  assert.ok(data.commands.some((c) => c.startsWith("node llms-txt.mjs ")));
  assert.ok(!calls.some((c) => c.path === "/v1/batch" || c.path === "/v1/scrape"));
  assert.equal(events[0].blobs[1], "no_credits");

  stubApi({ remainingMicro: 100e6, elapsed: 1 });
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

test("CSRF: only a same-site request with Content-Type application/json can start a run", async () => {
  const keys = [];
  const limited = () => makeEnv({ LIMITER: { limit: async ({ key }) => (keys.push(key), { success: true }) } });
  // What a cross-site form or no-cors fetch can send. A string body gets text/plain unless a header says otherwise.
  const forged = (headers) => new Request("https://docs2skill.spicrawl.com/api/generate", { method: "POST", body: JSON.stringify({ url: SITE }), headers });
  const bare = forged({});
  bare.headers.delete("content-type");
  for (const req of [forged({}), forged({ "content-type": "application/x-www-form-urlencoded" }), forged({ "content-type": "multipart/form-data; boundary=x" }), forged({ "content-type": "application/jsonp" }), bare]) {
    stubApi();
    const { env, events } = limited();
    const res = await worker.fetch(req, env, ctx);
    assert.equal(res.status, 415, req.headers.get("content-type") ?? "no content type");
    assert.equal(calls.length, 0);
    assert.equal(events[0].blobs[1], "invalid");
  }

  stubApi();
  const { env, events } = limited();
  const res = await post({ url: SITE }, env, { "sec-fetch-site": "cross-site" }); // even with a JSON content type
  assert.equal(res.status, 403);
  assert.equal(calls.length, 0);
  assert.equal(events[0].blobs[1], "blocked");
  assert.deepEqual(keys, []); // refused before the rate limiter, so it never used up the visitor's runs

  for (const headers of [{}, { "content-type": "application/json; charset=utf-8" }, { "content-type": "Application/JSON" }, { "sec-fetch-site": "same-origin" }, { "sec-fetch-site": "none" }, { "sec-fetch-site": "same-site" }]) {
    stubApi();
    assert.equal((await post({ url: SITE }, makeEnv().env, headers)).status, 200, JSON.stringify(headers));
  }
});

test("limitKey keys an IPv6 visitor on its /64, however the address is written", () => {
  const sameNet = ["2001:db8:1:2::1", "2001:DB8:1:2:aaaa:bbbb:cccc:dddd", "2001:db8:1:2:0:0:0:5", "2001:0db8:0001:0002:ffff:ffff:ffff:ffff", "2001:db8:1:2::"];
  assert.equal(new Set(sameNet.map(limitKey)).size, 1);
  assert.equal(limitKey(sameNet[0]), "2001:db8:1:2");
  // Zeros inside the prefix: a plain split(":") keeps host bits for "2001:db8::1:2:3:4" and "2001:db8::5:6:7:8".
  assert.equal(limitKey("2001:db8::1:2:3:4"), limitKey("2001:db8::5:6:7:8"));
  assert.equal(limitKey("2001:db8::1:2:3:4"), limitKey("2001:db8:0:0:dead:beef:1:2"));
  assert.notEqual(limitKey("2001:db8:0:1::1"), limitKey("2001:db8::1"));
  assert.notEqual(limitKey("2001:db8:1:3::1"), limitKey(sameNet[0]));
  for (const v4 of ["203.0.113.7", "unknown", "::ffff:203.0.113.7"]) assert.equal(limitKey(v4), v4);
  assert.notEqual(limitKey("::ffff:203.0.113.7"), limitKey("::ffff:203.0.113.8"));
});

test("the rate limiter is keyed on the /64 of an IPv6 visitor", async () => {
  stubApi();
  const keys = [];
  const { env } = makeEnv({ LIMITER: { limit: async ({ key }) => (keys.push(key), { success: true }) } });
  for (const ip of ["2001:db8:1:2::1", "2001:db8:1:2:9:8:7:6", "203.0.113.7"]) await post({ url: "not a url" }, env, { "CF-Connecting-IP": ip });
  assert.deepEqual(keys, ["2001:db8:1:2", "2001:db8:1:2", "203.0.113.7"]);
});

test("pace guard: spending may not run ahead of the calendar by more than 5% of the allowance", async () => {
  const run = async (opts) => {
    stubApi(opts);
    const { env, events } = makeEnv();
    const res = await post({ url: SITE }, env);
    return { res, events, spent: calls.some((c) => c.path === "/v1/batch") };
  };
  // Half way through the month the allowance may be 55% spent: 540 credits is fine, 560 is not.
  assert.equal((await run({ elapsed: 0.5, remainingMicro: 460e6 })).res.status, 200);
  const ahead = await run({ elapsed: 0.5, remainingMicro: 440e6 });
  assert.equal(ahead.res.status, 503);
  const data = await ahead.res.json();
  assert.match(data.error, /reached today's share of its credits/);
  assert.match(data.error, /Try again tomorrow, or run it yourself/);
  assert.ok(data.commands.some((c) => c.startsWith("node llms-txt.mjs ")));
  assert.equal(ahead.spent, false);
  assert.ok(!calls.some((c) => c.path === "/v1/scrape"));
  assert.equal(ahead.events[0].blobs[1], "no_credits");

  // Early in the month (1% elapsed) 6% of the allowance may be spent: 70 credits used is over, 40 is not.
  assert.equal((await run({ elapsed: 0.01, remainingMicro: 960e6 })).res.status, 200);
  assert.equal((await run({ elapsed: 0.01, remainingMicro: 930e6 })).res.status, 503);
  assert.equal((await run({ elapsed: 0, remainingMicro: 950e6 })).res.status, 200);
  assert.equal((await run({ elapsed: 1, remainingMicro: 150e6 })).res.status, 200); // end of the month: all of it
  assert.equal((await run({ unlimited: true, remainingMicro: 0, elapsed: 0.1 })).res.status, 200); // no limit, no pace
  // The 100-credit floor still comes first, with its own message.
  const broke = await run({ elapsed: 1, remainingMicro: 50e6 });
  assert.match((await broke.res.json()).error, /used its credits for this month/);
});

test("a malformed usage summary fails closed, also from the cache", async () => {
  const store = new Map();
  const cache = { match: async (req) => store.get(req.url)?.clone(), put: async (req, res) => void store.set(req.url, res) };
  const month = { limit_micro: 1000e6, remaining_micro: 900e6, unlimited: false, window_start: new Date(Date.now() - 15 * DAY).toISOString(), resets_at: new Date(Date.now() + 15 * DAY).toISOString() };
  const bad = [
    { ...month, remaining_micro: "lots" }, { ...month, remaining_micro: undefined }, { ...month, remaining_micro: null }, { ...month, limit_micro: undefined },
    { ...month, window_start: "yesterday-ish" }, { ...month, resets_at: undefined }, { unlimited: "yes", remaining_micro: 900e6 }, {}, null,
  ];
  for (const allowance of bad) {
    for (const cached of [false, true]) {
      store.clear();
      globalThis.caches = cached ? { default: cache } : undefined;
      stubApi({ allowance });
      for (const attempt of cached ? [1, 2] : [1]) { // the second attempt is served from the cache
        const { env, events } = makeEnv();
        const res = await post({ url: SITE }, env);
        assert.notEqual(res.status, 200, `${JSON.stringify(allowance)} cached=${cached} attempt ${attempt}`);
        assert.equal(res.status, 503);
        assert.ok(!calls.some((c) => c.path === "/v1/batch" || c.path === "/v1/scrape"));
        assert.ok(["no_credits", "error"].includes(events[0].blobs[1]));
      }
    }
  }
  // An unlimited allowance is cached as unlimited, not as "no number".
  store.clear();
  globalThis.caches = { default: cache };
  stubApi({ unlimited: true, remainingMicro: 0 });
  assert.equal((await post({ url: SITE }, makeEnv().env)).status, 200);
  assert.equal((await post({ url: SITE }, makeEnv().env)).status, 200);
  assert.equal(calls.filter((c) => c.path === "/v1/usage/summary").length, 1);
});

test("Turnstile is off unless both the site key and the secret are set", async () => {
  for (const env of [{}, { TURNSTILE_SITE_KEY: "0xSITEKEY" }, { TURNSTILE_SECRET: "0xSECRET" }, { TURNSTILE_SITE_KEY: "", TURNSTILE_SECRET: "0xSECRET" }]) {
    stubApi();
    const page = await worker.fetch(new Request("https://docs2skill.spicrawl.com/"), makeEnv(env).env, ctx);
    const html = await page.text();
    assert.ok(!html.includes("challenges.cloudflare.com") && !html.includes('class="cf-turnstile"'));
    assert.ok(!page.headers.get("content-security-policy").includes("challenges.cloudflare.com"));
    assert.equal((await post({ url: SITE }, makeEnv(env).env)).status, 200);
    assert.ok(!calls.some((c) => c.path === "/turnstile/v0/siteverify"));
  }
});

test("Turnstile on: the page carries the widget, the CSP allows it, and a run needs a verified token", async () => {
  stubApi();
  const page = await worker.fetch(new Request("https://docs2skill.spicrawl.com/"), makeEnv(TS).env, ctx);
  const html = await page.text();
  const csp = page.headers.get("content-security-policy");
  assert.ok(html.includes('<div class="cf-turnstile" data-sitekey="0xSITEKEY"'));
  assert.ok(html.includes('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>'));
  assert.ok(html.includes("turnstile: token()") && !html.includes("0xSECRET"));
  assert.match(csp, /script-src 'nonce-[^']+' https:\/\/static\.cloudflareinsights\.com https:\/\/challenges\.cloudflare\.com;/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com;/);
  const evil = await (await worker.fetch(new Request("https://x.test/"), makeEnv({ TURNSTILE_SITE_KEY: '"><script>x</script>', TURNSTILE_SECRET: "s" }).env, ctx)).text();
  assert.ok(!evil.includes("<script>x</script>"));

  for (const [body, name] of [[{ url: SITE }, "no token"], [{ url: SITE, turnstile: "" }, "empty"], [{ url: SITE, turnstile: 7 }, "not a string"], [{ url: SITE, turnstile: "x".repeat(3000) }, "too long"], [{ url: SITE, turnstile: "forged" }, "rejected"]]) {
    stubApi();
    const { env, events } = makeEnv(TS);
    const res = await post(body, env);
    const text = await res.text();
    assert.equal(res.status, 403, name);
    assert.ok(!text.includes("0xSECRET") && !text.includes(KEY));
    assert.ok(!calls.some((c) => c.path === "/v1/batch" || c.path === "/v1/scrape" || c.path === "/v1/usage/summary"), name); // nothing spent
    assert.equal(events[0].blobs[1], "blocked");
  }

  stubApi({ verifyStatus: 500 }); // the verifier is down: fail closed
  assert.equal((await post({ url: SITE, turnstile: GOOD_TOKEN }, makeEnv(TS).env)).status, 403);
  const failing = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).includes("siteverify")) throw new TypeError("network");
    return failing(input, init);
  };
  assert.equal((await post({ url: SITE, turnstile: GOOD_TOKEN }, makeEnv(TS).env)).status, 403);

  stubApi();
  const res = await post({ url: SITE, turnstile: GOOD_TOKEN }, makeEnv(TS).env);
  assert.equal(res.status, 200);
  const verify = calls.find((c) => c.path === "/turnstile/v0/siteverify");
  assert.deepEqual(verify.body, { secret: "0xSECRET", response: GOOD_TOKEN, remoteip: "203.0.113.7" });
  assert.ok(calls.findIndex((c) => c === verify) < calls.findIndex((c) => c.path === "/v1/batch")); // verified before any credits
  assert.ok(!(await res.text()).includes("0xSECRET"));
});

test("wrangler.jsonc keeps workers.dev and preview URLs off", async () => {
  const config = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(config, /^\s*"workers_dev":\s*false,/m);
  assert.match(config, /^\s*"preview_urls":\s*false,/m);
});
