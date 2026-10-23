# docs2skill live demo

A Cloudflare Worker at <https://docs2skill.spicrawl.com>. A visitor pastes a docs URL, the Worker finds pages in the sitemap, reads at most 5 of them with one Spicrawl batch job and returns `llms.txt`, `SKILL.md` and `AGENTS.md`. The page shows the three files in tabs with Copy and per-file Download (a Blob in the browser, no zip), plus pages fetched, skipped and credits used.

The Worker does not reimplement anything: it imports `generate` and `buildSkill` from [`../llms-txt.mjs`](../llms-txt.mjs), the same code the CLI runs, and adds the guards below. The page says so too: the demo reads up to 5 pages, the CLI does the whole site.

```
demo/
  wrangler.jsonc        name, route, bindings, vars
  src/worker.mjs        GET /  ->  HTML      POST /api/generate  ->  JSON
  src/guards.mjs        limits and the target check (a Worker entry may only export handlers, so they live here)
  src/page.mjs          the page as one string: inline CSS and a small inline script, no framework
  test/worker.test.mjs  node:test with a stubbed env and a stubbed fetch (run by `npm test` in the repo root)
```

## Run it locally

From the repo root, after `npm install`:

```sh
# the demo's own key; never commit it (.dev.vars is gitignored)
printf 'SPICRAWL_API_KEY=%s\n' "spicrawl_live_..." > demo/.dev.vars
npm run demo:dev        # same as: cd demo && npx wrangler dev   ->  http://localhost:8787
curl -s localhost:8787/api/generate -d '{"url":"https://docs.spicrawl.com"}' | head -c 600
```

A real run costs about 6 credits (one sitemap request, five pages). No login is needed for `wrangler dev`; the rate limit and Analytics Engine bindings run locally.

## Deploy

Each demo gets its own Spicrawl organization and API key, so the credit guard below measures this demo's allowance and nothing else.

```sh
cd demo
npx wrangler secret put SPICRAWL_API_KEY     # paste the demo org's key
npm run demo:deploy                           # from the repo root; or: npx wrangler deploy
```

`wrangler.jsonc` routes the custom domain `docs2skill.spicrawl.com` (the zone must be on the account in `account_id`). To turn on Cloudflare Web Analytics, put the site token in `vars.BEACON_TOKEN`; with it empty the page ships no beacon.

## API

`POST /api/generate` with `{"url": "https://docs.example.com"}`. A bare host works too (`https://` is assumed). Only the site's origin is used. Any `max` above 5 is ignored; a lower one is honoured.

```jsonc
// 200
{
  "llmsTxt": "# Example Docs\n\n> ...",
  "skillMd": "---\nname: docs-example-com\ndescription: \"Use when working with ...\"\n---\n...",
  "agentsMd": "# Example Docs\n...",
  "stats": { "pages": 5, "skipped": 0, "credits": 6, "host": "docs.example.com", "skillName": "docs-example-com", "durationMs": 21000 }
  // plus "message" when the job outlived the wait
}
// errors: { "error": "...", "commands": [...] }   commands only on the out-of-credits refusal
```

| Status | When |
|---|---|
| 400 | not JSON or over 4 KiB, or an invalid target (see guards) |
| 422 | no page could be read (blocked, empty, or built in the browser) |
| 429 | more than 2 runs a minute from one IP (`Retry-After: 60`) |
| 503 | the demo is out of credits, not configured, or Spicrawl is unavailable |
| 502, 504 | Spicrawl could not read the site, or timed out |

SDK errors are turned into short messages; the API key is never returned or logged (only the error code is).

The skill name is the hostname in kebab case (`docs.example.com` becomes `docs-example-com`; a leading `www.` is dropped; 64 characters at most). `SKILL.md` links to a `references/` file per page that the demo does not return: the CLI writes that folder (`--skill`), and the page says so.

## Guards

- **Target.** `http` or `https` only, at most 2048 characters, no username or password. Refused: every IP literal (so `127.*`, `10.*`, `192.168.*`, `172.16-31.*` and `::1` among them, in any spelling the URL parser normalises, such as `2130706433`), `localhost`, `*.local`, `*.internal`, `*.localdomain`, `*.lan`, `*.home.arpa` and hostnames without a dot. Spicrawl blocks private targets itself (`ERR::SECURITY::SSRF_BLOCKED`, 0 credits) as a second layer. A public name that resolves to a private address is that second layer's job.
- **Rate limit.** `LIMITER` (`ratelimits` binding, 2 per 60 seconds), keyed by `CF-Connecting-IP`. Checked first, so a rejected request costs nothing.
- **Credits.** Before each run: `GET https://api.spicrawl.com/v1/usage/summary`. Below 100 credits left (`allowance.remaining_micro / 1e6`, unless `allowance.unlimited`) the Worker refuses with "The demo has used its credits for this month. Run it yourself with a free key" and the clone, install and run commands. The summary is cached for 60 seconds with `caches.default`, so a burst of visitors makes one call. If the summary cannot be read, the run is refused (fail closed). `caches.default` does nothing on `*.workers.dev`; on the custom domain it caches.
- **Batch wait.** The job is polled every 2 seconds for at most 60 seconds. If it is still running, the Worker cancels it, returns the pages that finished and says so in `stats.message`.
- **Page.** A per-request CSP nonce; fetched content is only ever inserted with `textContent`.

## Analytics

Each `/api/generate` call writes one data point to the `spicrawl_demo_events` dataset (binding `EVENTS`):

| Field | Value |
|---|---|
| `index1` | `docs2skill` |
| `blob1` | `docs2skill` |
| `blob2` | outcome: `generated`, `partial`, `no_pages`, `error`, `rate_limited`, `no_credits` or `invalid` |
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
