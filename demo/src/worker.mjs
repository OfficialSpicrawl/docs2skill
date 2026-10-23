// docs2skill live demo: GET / serves the page, POST /api/generate runs the CLI's pipeline on up to 5 pages.
// The pipeline is the CLI's own code (../../llms-txt.mjs); this file only adds the guards around it.
import { randomUUID } from "node:crypto";
import { Spicrawl, isSpicrawlError, AuthenticationError, InsufficientCreditsError, RateLimitError, APITimeoutError, APIConnectionError } from "@spicrawl/sdk";
import { buildSkill, generate } from "../../llms-txt.mjs";
import { limits, MAX_PAGES, MIN_CREDITS, parseTarget, skillName } from "./guards.mjs";
import { renderPage } from "./page.mjs";

const API = "https://api.spicrawl.com";
const CREDITS_CACHE_KEY = "https://docs2skill.spicrawl.com/__credits"; // synthetic, only ever a cache key
const NO_CREDITS =
  "The demo has used its credits for this month. Run it yourself with a free key (https://app.spicrawl.com):";
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

// Credits left on the demo key, cached for 60 s so a burst of visitors makes one usage call.
// Infinity when the allowance is unlimited. Throws when the usage call fails (fail closed).
async function creditsLeft(env, ctx) {
  const cache = globalThis.caches?.default;
  const key = new Request(CREDITS_CACHE_KEY);
  try {
    const hit = await cache?.match(key);
    if (hit) return (await hit.json()).remaining ?? Infinity;
  } catch {} // a broken cache only costs one extra usage call

  const res = await fetch(`${API}/v1/usage/summary`, { headers: { Authorization: `Bearer ${env.SPICRAWL_API_KEY}` } });
  if (!res.ok) throw new Error(`usage summary HTTP ${res.status}`);
  const { allowance } = await res.json();
  const remaining = allowance.unlimited ? Infinity : Math.floor(allowance.remaining_micro / 1e6);
  if (cache) {
    const body = JSON.stringify({ remaining: Number.isFinite(remaining) ? remaining : null });
    ctx.waitUntil(cache.put(key, new Response(body, { headers: { "cache-control": "max-age=60" } })).catch(() => {}));
  }
  return remaining;
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

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.LIMITER && !(await env.LIMITER.limit({ key: ip })).success) {
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

  try {
    let left;
    try {
      left = await creditsLeft(env, ctx);
    } catch (err) {
      console.error("credit check failed:", err.message);
      return finish("error", 503, { error: "Could not check the demo's credits. Try again in a minute." });
    }
    if (left < MIN_CREDITS) return finish("no_credits", 503, { error: NO_CREDITS, commands: COMMANDS });

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
      const csp = [
        "default-src 'none'",
        `script-src 'nonce-${nonce}' https://static.cloudflareinsights.com`,
        "style-src 'unsafe-inline' https://fonts.googleapis.com",
        "font-src https://fonts.gstatic.com",
        "img-src data:",
        "connect-src 'self' https://cloudflareinsights.com",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
      ].join("; ");
      return new Response(request.method === "HEAD" ? null : renderPage({ beaconToken: env.BEACON_TOKEN, nonce }), {
        headers: { ...headers, "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", "content-security-policy": csp },
      });
    }
    if (pathname === "/api/generate") {
      if (request.method !== "POST") return json({ error: "Use POST." }, 405, { allow: "POST" });
      return handleGenerate(request, env, ctx);
    }
    return json({ error: "Not found." }, 404);
  },
};
