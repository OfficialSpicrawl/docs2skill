# X

Repo: https://github.com/OfficialSpicrawl/docs2skill
Demo: https://docs2skill.spicrawl.com
Attach the demo video (videos/out, MP4) to post 1 as native video. Upload the file; do not link it.

## Single post

```
docs2skill: point it at a docs site, get an agent skill (SKILL.md plus a reference file per page), llms.txt, llms-full.txt and AGENTS.md. No model in the loop.

https://github.com/OfficialSpicrawl/docs2skill
Try 5 pages: https://docs2skill.spicrawl.com
```

## Thread (replies to the single post)

```
1/ docs2skill turns a docs site into a skill folder for Claude Code, Codex and other agents that read the Agent Skills format.

node llms-txt.mjs https://docs.example.com --skill example-docs

One Node file, one dependency.
```

```
2/ It reads sitemap.xml (then robots.txt), sends the pages to Spicrawl as one batch job, gets markdown back with nav and footers dropped, and writes SKILL.md, references/*.md and llms.txt.

Install: cp -r out/example-docs ~/.claude/skills/
```

```
3/ Limits: ~1 credit per page, free plan is 1,000 credits a month, failed requests cost 0. Sitemap order, no ranking: use --include /docs on big sites. No crawler yet.

demo video: https://github.com/OfficialSpicrawl/docs2skill/tree/main/videos/out
```
