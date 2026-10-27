// docs2skill live demo: GET / serves the page, POST /api/generate runs the CLI's pipeline on up to 5 pages.
// The pipeline is the CLI's own code (../../llms-txt.mjs); this file only adds the guards around it.
import { randomUUID } from "node:crypto";
import { Spicrawl, isSpicrawlError, AuthenticationError, InsufficientCreditsError, RateLimitError, APITimeoutError, APIConnectionError } from "@spicrawl/sdk";
import { buildSkill, generate } from "../../llms-txt.mjs";
import { limitKey, limits, MAX_PAGES, MIN_CREDITS, parseTarget, referenceHead, skillName } from "./guards.mjs";
import { LLMS_TXT, renderNotFound, renderPage, SKILL_URL } from "./page.mjs";
import { openpanelCsp, openpanelTag } from "./openpanel.mjs";

const API = "https://api.spicrawl.com";
const CREDITS_CACHE_KEY = "https://docs2skill.spicrawl.com/__budget"; // synthetic, only ever a cache key
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const NO_CREDITS =
  "The demo has used its credits for this month. Run it yourself with a free key (https://app.spicrawl.com):";
const PACED =
  "The demo has reached today's share of its credits. Try again tomorrow, or run it yourself with a free key (https://app.spicrawl.com):";
const PACE_SLACK = 0.05; // of the allowance, on top of the calendar share
const COMMANDS = [
  "git clone https://github.com/OfficialSpicrawl/docs2skill",
  "cd docs2skill && npm install",
  "export SPICRAWL_API_KEY=spicrawl_live_...",
  "node llms-txt.mjs https://docs.example.com --skill example-docs",
];

const headers = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" };
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...headers, "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

// ---------------------------------------------------------------- credit guard

// What the demo key may still spend, cached for 60 s so a burst of visitors makes one usage call:
//   left  credits left; Infinity when the allowance is unlimited; NaN when the summary is malformed.
//   ahead true when usage has run ahead of the calendar: more than the elapsed share of the allowance month
//         plus PACE_SLACK of it. This keeps the month's credits from going to the first few hours of traffic.
// Callers refuse unless `left >= MIN_CREDITS` and `!ahead`; both come out refusing on anything malformed.
// Throws when the usage call fails (fail closed).
async function budget(env, ctx) {
  const cache = globalThis.caches?.default;
  const key = new Request(CREDITS_CACHE_KEY);
  try {
    const hit = await cache?.match(key);
    if (hit) {
      const c = await hit.json();
      return { left: c.unlimited ? Infinity : (c.left ?? NaN), ahead: c.ahead !== false }; // JSON has no NaN or Infinity
    }
  } catch {} // a broken cache only costs one extra usage call

  const res = await fetch(`${API}/v1/usage/summary`, { headers: { Authorization: `Bearer ${env.SPICRAWL_API_KEY}` } });
  if (!res.ok) throw new Error(`usage summary HTTP ${res.status}`);
  const { allowance: a } = await res.json();
  const unlimited = a.unlimited === true;
  const left = unlimited ? Infinity : Math.floor(a.remaining_micro / 1e6);
  const start = Date.parse(a.window_start);
  const elapsed = Math.min(1, Math.max(0, (Date.now() - start) / (Date.parse(a.resets_at) - start)));
  // Written so that a NaN anywhere makes `ahead` true.
  const ahead = !unlimited && !(a.limit_micro - a.remaining_micro <= a.limit_micro * (elapsed + PACE_SLACK));
  if (cache) {
    const body = JSON.stringify({ left: Number.isFinite(left) ? left : null, unlimited, ahead });
    ctx.waitUntil(cache.put(key, new Response(body, { headers: { "cache-control": "max-age=60" } })).catch(() => {}));
  }
  return { left, ahead };
}

// Optional Cloudflare Turnstile: with TURNSTILE_SITE_KEY and TURNSTILE_SECRET set, a run needs a token the widget
// on the page produced. Anything but a clean "success" (no token, rejected, siteverify down) refuses.
async function isHuman(env, token, ip) {
  if (!env.TURNSTILE_SITE_KEY || !env.TURNSTILE_SECRET) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const res = await fetch(TURNSTILE_VERIFY, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token, ...(ip !== "unknown" && { remoteip: ip }) }),
    });
    return res.ok && (await res.json()).success === true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- SDK errors, in words a visitor can use

function explain(err) {
  if (err instanceof InsufficientCreditsError || err?.code === "ERR::LIMIT::QUOTA_EXCEEDED") return { outcome: "no_credits", status: 503, error: NO_CREDITS, commands: COMMANDS };
  if (!isSpicrawlError(err)) return { outcome: "error", status: 500, error: "Something went wrong on our side. Try again in a minute." };
  if (err instanceof AuthenticationError) return { outcome: "error", status: 503, error: "The demo is temporarily unavailable. Run it yourself with a free key at https://app.spicrawl.com." };
  if (err instanceof RateLimitError) return { outcome: "error", status: 503, error: "Spicrawl is busy right now. Try again in a few seconds." };
  if (err instanceof APITimeoutError || err instanceof APIConnectionError) return { outcome: "error", status: 504, error: "Could not reach Spicrawl in time. Try again in a moment." };
  if (err.code === "ERR::SECURITY::SSRF_BLOCKED") return { outcome: "invalid", status: 400, error: "That address is not allowed. Use a public docs site hostname." };
  return { outcome: "error", status: 502, error: `Spicrawl could not read that site (${err.code}). Try another docs site.` };
}

// ---------------------------------------------------------------- POST /api/generate

async function handleGenerate(request, env, ctx) {
  const started = Date.now();
  let host = "";
  let credits = 0;
  let pages = 0;
  // One exit for every path, so every request leaves exactly one analytics data point.
  const finish = (outcome, status, body, extra) => {
    try {
      env.EVENTS?.writeDataPoint({
        blobs: ["docs2skill", outcome, host, request.cf?.country || ""],
        doubles: [credits, Date.now() - started, pages],
        indexes: ["docs2skill"],
      });
    } catch {} // analytics must never break a request
    return json(body, status, extra);
  };

  // CSRF. A page on another site can make the visitor's browser POST here with a simple content type (a form or a
  // no-cors fetch) but not with application/json, which needs a preflight this Worker never answers. Both
  // checks run before the rate limiter so that such requests do not use up the visitor's runs.
  if (request.headers.get("sec-fetch-site") === "cross-site") return finish("blocked", 403, { error: "Cross-site requests are not allowed." });
  if (!/^application\/json\s*(;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return finish("invalid", 415, { error: "Send Content-Type: application/json." });
  }

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.LIMITER && !(await env.LIMITER.limit({ key: limitKey(ip) })).success) {
    return finish("rate_limited", 429, { error: "Too many runs. The demo allows 2 a minute; try again in a minute." }, { "retry-after": "60" });
  }

  let input;
  try {
    const text = await request.text();
    if (text.length > 4096) throw new Error("too large");
    input = JSON.parse(text);
  } catch {
    return finish("invalid", 400, { error: "Send a JSON body like {\"url\": \"https://docs.example.com\"}." });
  }
  const target = parseTarget(input?.url);
  if (target.error) return finish("invalid", 400, { error: target.error });
  host = target.host;

  if (!env.SPICRAWL_API_KEY) return finish("error", 503, { error: "The demo is not configured yet." });
  if (!(await isHuman(env, input.turnstile, ip))) {
    return finish("blocked", 403, { error: "Could not verify the check. Reload the page and try again." });
  }

  try {
    let room;
    try {
      room = await budget(env, ctx);
    } catch (err) {
      console.error("credit check failed:", err.message);
      return finish("error", 503, { error: "Could not check the demo's credits. Try again in a minute." });
    }
    if (!(room.left >= MIN_CREDITS)) return finish("no_credits", 503, { error: NO_CREDITS, commands: COMMANDS });
    if (room.ahead) return finish("no_credits", 503, { error: PACED, commands: COMMANDS });

    // Finding pages is billed per request on the scrape endpoint; count it from the response header.
    let discoveryCredits = 0;
    const spicrawl = new Spicrawl({
      apiKey: env.SPICRAWL_API_KEY,
      timeoutMs: 30_000,
      maxRetries: 1,
      // A wrapper, not fetch itself: the runtime throws "Illegal invocation" for a bare fetch called as a method.
      fetch: async (resource, init) => {
        const res = await fetch(resource, init);
        if (new URL(typeof resource === "string" ? resource : resource.url).pathname === "/v1/scrape") {
          discoveryCredits += Number(res.headers.get("x-credits-charged")) || 0;
        }
        return res;
      },
    });

    // Clamp what the client asked for; the page never sends more than 5 and anything higher is ignored.
    const max = Math.min(MAX_PAGES, Math.max(1, Math.floor(Number(input.max)) || MAX_PAGES));
    const run = await generate(spicrawl, { site: target.site, max, maxSitemaps: 3, ...limits });
    credits = Math.round((discoveryCredits + run.creditsMicro / 1e6) * 100) / 100;
    pages = run.stats.pages;

    if (!pages) {
      return finish("no_pages", 422, { error: `No pages could be read from ${host}. It may block automated fetches or build its pages in the browser.` });
    }
    const name = skillName(host);
    const files = buildSkill({ name, title: run.title, summary: run.summary, pages: run.pages });
    const stats = {
      pages,
      skipped: run.stats.failed + run.stats.blocked + run.stats.empty,
      credits,
      host,
      skillName: name,
      durationMs: Date.now() - started,
      ...(run.timedOut && { message: `The job was still running after ${limits.timeoutMs / 1000} seconds, so this is the ${pages} page${pages === 1 ? "" : "s"} that finished.` }),
    };
    return finish(run.timedOut ? "partial" : "generated", 200, {
      llmsTxt: run.llms,
      skillMd: files.find((f) => f.path.endsWith("SKILL.md")).content,
      agentsMd: files.find((f) => f.path === "AGENTS.md").content,
      references: files.filter((f) => f.path.includes("/references/")).map((f) => ({ name: f.path.split("/").pop(), content: referenceHead(f.content) })),
      stats,
    });
  } catch (err) {
    const { outcome, status, ...body } = explain(err);
    console.error("generate failed:", err?.code ?? err?.name, err?.status ?? "");
    return finish(outcome, status, body);
  }
}

// ---------------------------------------------------------------- routes

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    if (pathname === "/") {
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed." }, 405, { allow: "GET, HEAD" });
      const nonce = btoa(randomUUID());
      const turnstileSiteKey = env.TURNSTILE_SITE_KEY && env.TURNSTILE_SECRET ? env.TURNSTILE_SITE_KEY : "";
      const challenge = turnstileSiteKey ? " https://challenges.cloudflare.com" : ""; // Turnstile's script and its iframe
      const op = openpanelCsp(env);
      const csp = [
        "default-src 'none'",
        `script-src 'nonce-${nonce}' https://static.cloudflareinsights.com${challenge}${op.script}`,
        "style-src 'unsafe-inline'", // the effect libraries add <style> elements at run time
        "font-src 'self'",
        "img-src 'self' data:",
        `connect-src 'self' https://api.github.com https://cloudflareinsights.com${op.connect}`, // api.github.com: the star count
        ...(turnstileSiteKey ? [`frame-src${challenge}`] : []),
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; ");
      return new Response(request.method === "HEAD" ? null : renderPage({ beaconToken: env.BEACON_TOKEN, nonce, turnstileSiteKey, analytics: openpanelTag(env, nonce, "docs2skill") }), {
        headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "content-security-policy": csp },
      });
    }
    if (pathname === "/llms.txt") {
      if (request.method !== "GET" && request.method !== "HEAD") return json({ error: "Method not allowed." }, 405, { allow: "GET, HEAD" });
      return new Response(request.method === "HEAD" ? null : LLMS_TXT, { headers: { ...headers, "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
    }
    // The agent skill of this repo, read from GitHub so it is always the file in main.
    if (pathname === "/SKILL.md") return Response.redirect(SKILL_URL, 302);
    if (pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "Use POST." }, 405, { allow: "POST" });
      return handleGenerate(request, env, ctx);
    }
    if (request.method === "GET" && !pathname.startsWith("/api/") && !(request.headers.get("accept") ?? "").includes("application/json")) {
      return new Response(renderNotFound(), {
        status: 404,
        headers: { ...headers, "content-type": "text/html; charset=utf-8", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" },
      });
    }
    return json({ error: "Not found." }, 404);
  },
};
