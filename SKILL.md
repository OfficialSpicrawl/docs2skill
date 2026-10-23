---
name: spicrawl-docs2skill
description: "Use when the user wants an agent skill, llms.txt, llms-full.txt or AGENTS.md generated from a documentation website (for example a library's docs they want their coding agent to know). Runs llms-txt.mjs, which reads the site's sitemap and batch-scrapes the pages to Markdown with the Spicrawl API."
---

# Spicrawl docs2skill

`llms-txt.mjs` discovers a site's pages from its sitemap (or the homepage links), batch-scrapes them to clean Markdown with the Spicrawl API, and writes `llms.txt` and `llms-full.txt`. With `--skill <name>` it also writes an agent skill folder (`SKILL.md` + `references/*.md`) and `AGENTS.md`.

## Setup

1. Needs Node >= 18 and a Spicrawl API key in `SPICRAWL_API_KEY` (free key at https://app.spicrawl.com, 1,000 credits/month). If the variable is not set, ask the user to export it. Do not ask them to paste the key into chat.
2. Run `npm install` once in this directory (the folder that holds `llms-txt.mjs`).

## Run

Run from this directory:

```sh
node llms-txt.mjs https://docs.example.com                          # llms.txt + llms-full.txt in ./out
node llms-txt.mjs https://docs.example.com --skill example-docs     # also out/example-docs/SKILL.md, references/, out/AGENTS.md
node llms-txt.mjs https://example.com --include /docs --max 100     # only pages under /docs, at most 100
node llms-txt.mjs https://app.example.com --js                      # render JavaScript (costs more per page)
```

- `--max` caps the pages fetched (default 50). The tool prints the estimated credit cost before it starts.
- `--skill` takes a kebab-case name (lowercase letters, digits, hyphens). An invalid name is rejected before any API call.
- Install the generated skill by copying the folder into the agent's skills directory, for example `cp -r out/example-docs ~/.claude/skills/` (Claude Code) or a repo's `.agents/skills/`.

## Reading the output

- The final summary line reports pages written and how many were skipped as failed, blocked (the site answered HTTP 4xx/5xx) or empty. Skipped pages cost 0 credits.
- Re-running into the same `--out` with fewer pages leaves older reference files in place; delete the folder first for a clean result.

## Cost

About 1 credit per page with a plain fetch; `--js` costs more per page. Start with a small `--max` on the free plan and widen it once the output looks right.

## Guardrails

- Never print, log or commit the API key.
- Respect the site's terms and robots rules; generate skills only for docs the user is allowed to use this way.
- Don't loop it: one run per site is enough until the docs change.
