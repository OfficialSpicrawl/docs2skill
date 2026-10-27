# docs2skill live demo

A Cloudflare Worker at <https://docs2skill.spicrawl.com>. A visitor pastes a docs URL, the Worker finds pages in the sitemap, reads at most 5 of them with one Spicrawl batch job and returns `llms.txt`, `SKILL.md`, `AGENTS.md` and the first lines of each reference file. The page shows them as an output folder (a file tree and a preview) with Copy and per-file Download (a Blob in the browser, no zip). It is populated at first paint with a real run of docs.spicrawl.com, so the output is on screen before anyone types.

The Worker does not reimplement anything: it imports `generate` and `buildSkill` from [`../llms-txt.mjs`](../llms-txt.mjs), the same code the CLI runs, and adds the guards below. The page says so too: the demo reads up to 5 pages, the CLI does the whole site.

```
demo/
  wrangler.jsonc        name, route, bindings, vars, the island build and the static assets
  src/worker.mjs        GET /  ->  HTML    GET /llms.txt    GET /SKILL.md  ->  302    POST /api/generate  ->  JSON    404 page
  src/guards.mjs        limits, the target check, the rate-limit key and the reference cut (a Worker entry may only export handlers, so they live here)
  src/page.mjs          the page as one string: inline CSS and a small inline script, no framework; also the /llms.txt text and the 404 page
  island/main.jsx       three React islands (border beam, thinking orb, bot avatar), mounted into empty slots of the page
  build.mjs             bundles the island into public/island.<hash>.js (esbuild) and writes its name to src/island-url.mjs; wrangler runs it before `dev` and `deploy`, `npm test` before the tests (pretest)
  public/               static assets: fonts (Geist, Geist Mono, Righteous for the H1, a 3 KB box-drawing cut published by ascii.rest), og.png, robots.txt, sitemap.xml, _headers (fonts and the island are immutable for a year); island.<hash>.js and src/island-url.mjs are generated and gitignored
  DESIGN.md             the brief, the concept and the design system of the page
  test/worker.test.mjs  node:test with a stubbed env and a stubbed fetch (run by `npm test` in the repo root)
```

The page needs no framework: the demo (form, file tree, preview, Copy, Download, star count) and the two animated scenes (the "How it works" flow and the terminal, which prints the CLI's recorded output) are plain script in `page.mjs`. Only the three libraries.dev effects (`border-beam`, `thinking-orbs`, `bot-avatars`) are React, so they are bundled apart. They read `<html data-run="idle|crawl|write|done|error">`, which the page script sets, and nothing else; without `island.js` the page is complete. The page keeps to 120 words of copy and a test counts them: add words, and `npm test` says so. `DESIGN.md` has the rest of the rules.

## Run it locally

From the repo root, after `npm install` (`npm run demo:dev` bundles the island first, through wrangler's `build.command`):

```sh
# the demo's own key; never commit it (.dev.vars is gitignored)
printf 'SPICRAWL_API_KEY=%s\n' "spicrawl_live_..." > demo/.dev.vars
npm run demo:dev        # same as: cd demo && npx wrangler dev   ->  http://localhost:8787
curl -s localhost:8787/api/generate -d '{"url":"https://docs.spicrawl.com"}' | head -c 600
```

A real run costs 6 credits when the site has a sitemap (one sitemap request, five pages) and up to 13 in the worst case, when discovery has to try everything before the five pages: up to three sitemap files, `robots.txt`, up to three more sitemap files from it, and the homepage links (8 requests). No login is needed for `wrangler dev`; the rate limit and Analytics Engine bindings run locally.

## Deploy

Each demo gets its own Spicrawl organization and API key, so the credit guard below measures this demo's allowance and nothing else.

```sh
cd demo
npx wrangler secret put SPICRAWL_API_KEY     # paste the demo org's key
npm run demo:deploy                           # from the repo root; or: npx wrangler deploy
```

`npm run demo:deploy` bundles the island (`build.mjs` writes `public/island.js`) and uploads `public/` as static assets together with the Worker, so it needs the dev dependencies (`npm ci`, not `npm ci --omit=dev`). `wrangler.jsonc` routes the custom domain `docs2skill.spicrawl.com` (the zone must be on the account in `account_id`) and sets `workers_dev: false` and `preview_urls: false`, so that domain is the only public address of the Worker. To turn on Cloudflare Web Analytics, put the site token in `vars.BEACON_TOKEN`; with it empty the page ships no beacon.

### Optional: Cloudflare Turnstile

The demo spends a paid key's credits, so a public deployment should have a bot check in front of it. It is off by default and costs nothing to leave off.

1. In the Cloudflare dashboard open Turnstile, add a widget for `docs2skill.spicrawl.com` (Managed mode) and copy its site key and secret.
2. Put the site key in `vars.TURNSTILE_SITE_KEY` in `wrangler.jsonc` (it is public) and store the secret: `npx wrangler secret put TURNSTILE_SECRET`.
3. Deploy. The page now shows the widget and sends its token with every run; the Worker verifies the token at `https://challenges.cloudflare.com/turnstile/v0/siteverify` before it checks credits or calls Spicrawl.

Both values must be set; with either one missing the check is off. Locally, Cloudflare's published dummy keys work in `demo/.dev.vars`: site key `1x00000000000000000000AA` (in `vars`) and secret `1x0000000000000000000000000000000AA` (always passes). After enabling it on the real domain, load the page once with the browser console open and confirm there is no Content-Security-Policy error.

## API

`POST /api/generate` with `Content-Type: application/json` and `{"url": "https://docs.example.com"}`. A bare host works too (`https://` is assumed). Only the site's origin is used. Any `max` above 5 is ignored; a lower one is honoured. With Turnstile on, the body also carries the widget's token as `"turnstile"`.

Other routes: `GET /api/stars` answers `{"stars": 1234}` (or `null`) from one GitHub API call an hour, cached with the Cache API, so a visitor never calls api.github.com and the page needs no `connect-src` for it; the page render inlines the count when the cache already has it (and it is at least 10), so the button does not move. `GET /llms.txt` is this site's own index (`LLMS_TXT` in `src/page.mjs`), `GET /SKILL.md` redirects to the skill in the repo's `main`, and any other `GET` answers 404 as a page with a way back (JSON for `/api/*` and for `Accept: application/json`).

```jsonc
// 200
{
  "llmsTxt": "# Example Docs\n\n> ...",
  "skillMd": "---\nname: docs-example-com\ndescription: \"Use when working with ...\"\n---\n...",
  "agentsMd": "# Example Docs\n...",
  "references": [{ "name": "index.md", "content": "# Example Docs\nSource: https://docs.example.com/\n\n..." }], // first 40 lines (3,000 characters) of each reference file
  "stats": { "pages": 5, "skipped": 0, "credits": 6, "host": "docs.example.com", "skillName": "docs-example-com", "durationMs": 21000 }
  // plus "message" when the job outlived the wait
}
// errors: { "error": "...", "commands": [...] }   commands only on the out-of-credits refusal
```

| Status | When |
|---|---|
| 400 | not JSON or over 4 KiB, or an invalid target (see guards) |
| 403 | a cross-site request, or the Turnstile check failed (only when Turnstile is on) |
| 415 | the `Content-Type` is not `application/json` |
| 422 | no page could be read (blocked, empty, or built in the browser) |
| 429 | more than 2 runs a minute from one IP (`Retry-After: 60`) |
| 503 | the demo is out of credits, not configured, or Spicrawl is unavailable |
| 502, 504 | Spicrawl could not read the site, or timed out |

`references` has one entry per page the skill links to, in the order of `SKILL.md`; the CLI writes each page in full, the demo returns its first lines so the page can show what the file looks like. SDK errors are turned into short messages; the API key is never returned or logged (only the error code is).

The skill name is the hostname in kebab case (`docs.example.com` becomes `docs-example-com`; a leading `www.` is dropped; 64 characters at most). `SKILL.md` links to a `references/` file per page that the demo does not return: the CLI writes that folder (`--skill`), and the page says so.

## Guards

- **Request.** `POST /api/generate` answers 415 unless `Content-Type` is `application/json` (checked before the body is read) and 403 when `Sec-Fetch-Site` is `cross-site`. A page on another site can make a visitor's browser send a form or a no-cors `fetch`, but only with a simple content type such as `text/plain`, and a JSON request from another origin needs a CORS preflight that this Worker never answers. Both checks run before the rate limiter, so a forged request does not use up the visitor's runs.
- **Target.** `http` or `https` only, at most 2048 characters, no username or password. Refused: every IP literal (so `127.*`, `10.*`, `192.168.*`, `172.16-31.*` and `::1` among them, in any spelling the URL parser normalises, such as `2130706433`), `localhost`, `*.local`, `*.internal`, `*.localdomain`, `*.lan`, `*.home.arpa` and hostnames without a dot. Trailing dots are dropped before those checks, so `127.0.0.1..` and `localhost..` are refused like their dotless forms. Spicrawl blocks private targets itself (`ERR::SECURITY::SSRF_BLOCKED`, 0 credits) as a second layer. A public name that resolves to a private address is that second layer's job.
- **Sitemaps.** The sitemap, the child sitemaps of a sitemap index and the `Sitemap:` lines of `robots.txt` are followed only when they are on the site being read: same host (`www.` ignored) and same port, over http or https. The first 1 MB of each file is parsed and the parsers run in linear time, so a hostile file cannot burn CPU.
- **Rate limit.** `LIMITER` (`ratelimits` binding, 2 per 60 seconds), keyed by `CF-Connecting-IP`; an IPv6 visitor is keyed on its /64, because one customer controls every address in it. Checked right after the request checks above, so a rejected request costs nothing.
- **Human check.** Optional Cloudflare Turnstile (see Deploy). The token is verified before the credit check; a missing, forged or expired token, or a verifier that cannot be reached, refuses the run.
- **Credits.** Before each run: `GET https://api.spicrawl.com/v1/usage/summary`, then two refusals, both answered with the clone, install and run commands.
  - *Floor.* Below 100 credits left (`allowance.remaining_micro / 1e6`, unless `allowance.unlimited`): "The demo has used its credits for this month. Run it yourself with a free key".
  - *Pace.* The month's credits cannot all go in the first hours. The run is refused when `used > limit * elapsed + 5% of limit`, where `used = limit_micro - remaining_micro` and `elapsed` is the share of the allowance month that has passed (`window_start` to `resets_at`, between 0 and 1). Half way through a 1,000-credit month that is 550 credits. Message: "The demo has reached today's share of its credits. Try again tomorrow, or run it yourself". An unlimited allowance is not paced.

  The summary is cached for 60 seconds with `caches.default`, so a burst of visitors makes one call. If the summary cannot be read, or any number in it is missing or malformed, the run is refused (fail closed), also when the answer comes from the cache. `caches.default` does nothing on `*.workers.dev`; on the custom domain it caches.
- **Batch wait.** The job is polled every 2 seconds for at most 60 seconds. If it is still running, the Worker cancels it, returns the pages that finished and says so in `stats.message`. Any other failure while waiting cancels the job too.
- **Page.** A per-request CSP nonce; fetched content is only ever inserted with `textContent`. Fonts, `island.js` and images are same-origin (static assets), the page calls no other host (`connect-src 'self'`, plus the analytics hosts when configured), and styles are inline (the effect libraries add `<style>` elements at run time). With Turnstile on, the CSP also allows `challenges.cloudflare.com` for scripts and frames.

## Analytics

Each `/api/generate` call writes one data point to the `spicrawl_demo_events` dataset (binding `EVENTS`):

| Field | Value |
|---|---|
| `index1` | `docs2skill` |
| `blob1` | `docs2skill` |
| `blob2` | outcome: `generated`, `partial`, `no_pages`, `error`, `rate_limited`, `no_credits` (out of credits, or over the pace), `blocked` (cross-site request or failed Turnstile check) or `invalid` |
| `blob3` | target host (empty when the request never got that far) |
| `blob4` | visitor country (`request.cf.country`) |
| `double1` | credits used |
| `double2` | duration in ms |
| `double3` | pages fetched |

Example query, runs and credits per outcome over the last 7 days (Analytics Engine samples, so weight by `_sample_interval`):

```sh
curl "https://api.cloudflare.com/client/v4/accounts/036bd64d65479473f0effc8c4fb126ff/analytics_engine/sql" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --data "
SELECT
  blob2 AS outcome,
  SUM(_sample_interval) AS runs,
  SUM(_sample_interval * double1) AS credits,
  ROUND(AVG(double2)) AS avg_ms
FROM spicrawl_demo_events
WHERE index1 = 'docs2skill' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY outcome
ORDER BY runs DESC"
```

The token needs the `Account Analytics: Read` permission. Swap `blob2` for `blob3` to see which sites people try.

## Notes

- On Workers Free the CPU limit is 10 ms per request; turning five markdown pages into three files may exceed it. Waiting on Spicrawl does not count as CPU time. If runs fail with a CPU-limit error, use the Paid plan.
- A single run makes about 40 subrequests at most (polling every 2 seconds for 60 seconds, plus a handful of calls), which stays under the Free plan's 50.
