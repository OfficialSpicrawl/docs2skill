# Reddit

Subreddit: r/ClaudeAI (agent skills are on topic there). Read the sidebar first: use the project or showcase flair if it has one, and check the self-promotion rule.
Alternative if r/ClaudeAI removes it: r/LocalLLaMA, with the llms-full.txt angle (one file to feed a local model's context) as the lead.

Repo: https://github.com/OfficialSpicrawl/docs2skill
Demo: https://docs2skill.spicrawl.com

## Title

```
I made a CLI that turns a docs site into a Claude Code skill (open source)
```

## Body

```
I kept pasting library docs into Claude Code by hand, so I wrote a small CLI for it. You give it a docs URL:

node llms-txt.mjs https://docs.example.com --skill example-docs

and it writes a skill folder (SKILL.md plus one references/*.md file per page), llms.txt, llms-full.txt and an AGENTS.md. Copy the folder into ~/.claude/skills/ and Claude opens only the reference files a task needs, instead of loading the whole site.

How it works: it reads the site's sitemap, fetches the pages as markdown through the Spicrawl API (which I work on), drops nav and footers, and writes the files. No model is involved in generating them, so the output is just the docs, reorganized.

Limits: about 1 credit per page, the free key gives 1,000 credits a month, and failed requests cost 0. It follows sitemap order with no ranking (use --include /docs on big sites), and there is no crawler, so a site with no sitemap only gets its homepage links.

Repo: https://github.com/OfficialSpicrawl/docs2skill
Browser demo (5 pages, no install): https://docs2skill.spicrawl.com
There is a short demo video in the repo under videos/out.

If you have used skills built from docs, I'd like to know whether one file per page is the right split or whether you would group them differently.
```
