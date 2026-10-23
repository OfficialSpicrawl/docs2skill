# Show HN

Repo: https://github.com/OfficialSpicrawl/docs2skill
Demo: https://docs2skill.spicrawl.com

## Title

```
Show HN: docs2skill, a CLI that turns a docs site into an agent skill
```

URL field: https://github.com/OfficialSpicrawl/docs2skill

## First comment (post it right after submitting)

```
Hi HN, I'm the maker. docs2skill takes a docs site and writes the files an agent can use instead of you pasting pages into a prompt: a skill folder (SKILL.md with name and description, plus one references/*.md per page), llms.txt, llms-full.txt, and an AGENTS.md with a compact index. Claude Code, Codex and other tools that read the Agent Skills format can load the folder and open only the reference files a task needs. It is one Node file, no build step: node llms-txt.mjs https://docs.example.com --skill example-docs. There is a browser demo that runs the same code on up to 5 pages (https://docs2skill.spicrawl.com) and a short demo video in the repo (videos/out).

How it works: I work on Spicrawl, the scraping API this runs on. Spicrawl has no crawl endpoint yet, so the tool reads /sitemap.xml (following sitemap indexes, then the Sitemap lines in robots.txt), falling back to the homepage links. It submits all pages as one Spicrawl batch job, polls it, and reads back markdown with navigation and footers removed. Pages that answer 4xx/5xx are skipped and counted, and docs-UI lines like "Copy page" are stripped. Nothing is written by a model: every line in the output comes from the scraped pages, so the same site gives the same files.

Limits, so you do not find them by surprise: it costs about 1 credit per page (3 with --js), the free plan is 1,000 credits a month, and failed requests cost 0. Pages come in sitemap order with no ranking, so on a large site use --include /docs. At most 10 sitemap files are followed, gzipped sitemaps are skipped, and a site without a sitemap only yields the pages linked from its homepage. Spicrawl itself has no crawl, search or AI extraction yet, so this does not summarize or rank anything. Feedback on the skill layout is what I'd most like: the repo is https://github.com/OfficialSpicrawl/docs2skill.
```
