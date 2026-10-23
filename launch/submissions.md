# docs2skill: where to submit (researched 2026-10-23, nothing posted)

Rules were read from each list's CONTRIBUTING and star counts from the GitHub API today. Ordered by expected traffic / effort. Gate = what must be true before you submit.

Before any of them: (1) `https://docs2skill.spicrawl.com` does not resolve yet, so deploy first (lists check links). (2) Tag v0.1.0. `package.json` is `"private": true`, so there is no npm page; every list below links the GitHub repo. (3) Submit by hand as DibbayajyotiRoy, not the suspended Spicrawl account, and say you maintain the tool. Several lists ban agent-opened PRs/issues, so this file is drafts only.

| # | Target | Size | Gate / rule | Effort |
|---|---|---|---|---|
| 1 | [AnswerDotAI/llms-txt](https://github.com/AnswerDotAI/llms-txt) "Integrations" (source of llmstxt.org) | 2.7k stars | No star rule. Edit only `nbs/index.qmd` (README is generated; PRs #72, #92 did the same). 32 PRs open, last integration merged Nov 2025, so slow | 10 min |
| 2 | skills.sh and SkillsMP | vercel-labs/skills 36k | No submission. skills.sh ranks by anonymous `npx skills add` installs; SkillsMP auto-indexes public SKILL.md (a third-party review says 2-star minimum, unverified). Put `npx skills add OfficialSpicrawl/docs2skill` in the README and test it on a clean machine | 5 min |
| 3 | [VoltAgent/awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills) | 36.2k, merges daily | PR. "No brand-new skills; community-adopted". Recent merges were repos with 11-791 stars; API-backed skills (x-twitter-scraper, fish-audio) are listed. Wait for about 50 stars (my estimate) | 5 min |
| 4 | [heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills) | 6.3k, weekly triage | At least 20 stars, repo over 14 days old, root SKILL.md with name+description, one appended line, disclose AI help. "SaaS sign-up pages" are refused; say it is OSS with a free key | 5 min |
| 5 | [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 56.3k | Web issue form only, human only (gh CLI blocked). Over 14 days with ongoing commits, or 100 stars. One open recommendation at a time. Needing signup is a blocker without adoption signals | 10 min |
| 6 | Anthropic plugin directory (feeds [claude-plugins-community](https://github.com/anthropics/claude-plugins-community)) | 4.8k mirror | claude.ai/directory/manage, Submit new, Plugin bundle. Needs `.claude-plugin/plugin.json` (none yet), `claude plugin validate`, security scan, data-handling answers, a plan that allows submitting. `name` is an immutable slug. Best as one `spicrawl-skills` bundle for all three tools | 1-2 h |
| 7 | Console.dev | newsletter | Email hello@console.dev. 2-3 dev tools a week; pre-1.0 counts as a "beta" listing; CLI and self-serve try-out are plus points | 10 min |
| 8 | [milisp/awesome-codex-cli](https://github.com/milisp/awesome-codex-cli) | 124, active | Issue form (PRs disabled). 100 stars, or 14 days plus two quality points. Signup-needed tools count only with outside signals | 10 min |
| 9 | [sickn33/agentic-awesome-skills](https://github.com/sickn33/agentic-awesome-skills) | 48.4k | PR adding `skills/<name>/SKILL.md`, `npm run validate`, upstream link in the PR. Outside PRs merge within a day | 30 min |
| 10 | DevHunt | - | Free listing (nofollow); $19 for a chosen launch week with a dofollow link. GitHub login | 15 min |

## Paste: #1 llms-txt (append to the libraries/plugins list under Integrations)

```markdown
- [`docs2skill`](https://github.com/OfficialSpicrawl/docs2skill) - CLI that turns a docs site into llms.txt, llms-full.txt, an AGENTS.md and an agent skill (SKILL.md plus references)
```
Title: `Add docs2skill to Integrations`
Body: `Adds docs2skill (Apache-2.0, Node CLI). It reads a site's sitemap and writes llms.txt, llms-full.txt, AGENTS.md and a skill folder; output is the scraped pages only, no model-written text. Fetching uses the Spicrawl API (free key). I maintain it. Only nbs/index.qmd changes.`

## Paste: #3 VoltAgent (end of Community Skills > Context Engineering; description is capped at 10 words)

```markdown
- **[OfficialSpicrawl/docs2skill](https://github.com/OfficialSpicrawl/docs2skill)** - Turn any docs site into SKILL.md, llms.txt and AGENTS.md
```
Title: `Add skill: OfficialSpicrawl/docs2skill`. Body: `Root SKILL.md, README, Apache-2.0. Needs a free Spicrawl API key. I am the author.`

## Paste: #4 heilcheng (end of Community Skills > Context Engineering, inside its `<details>`; do not edit anything else)

```markdown
- [OfficialSpicrawl/docs2skill](https://github.com/OfficialSpicrawl/docs2skill) - Docs site to SKILL.md, references, llms.txt and AGENTS.md; free Spicrawl key needed
```
Title: `Add OfficialSpicrawl/docs2skill to Context Engineering`. Fill their checklist honestly (author: yes; AI-assisted: say so if true).

## Paste: #5 awesome-claude-code form (rewrite the description in your own words; the list requires a human-made recommendation)

Display Name: `docs2skill`. Category: `Documentation, Knowledge & Learning`. Link: `https://github.com/OfficialSpicrawl/docs2skill`. Author: `OfficialSpicrawl`, `https://github.com/OfficialSpicrawl`.
Description: `Node CLI that reads a docs site's sitemap and writes a Claude Code / Codex skill folder (SKILL.md plus one references file per page), llms.txt, llms-full.txt and AGENTS.md. The output is the scraped pages reorganized, with no model-generated text. Fetching goes through the Spicrawl API, which needs a free API key.`

## Paste: #8 awesome-codex-cli form

Display Name `docs2skill`; Section `Agent Skills > Domain-Specific`; Link as above; Description: `Node CLI that turns a docs site into a skill folder (SKILL.md plus references) for .agents/skills/, plus llms.txt, llms-full.txt and AGENTS.md. Needs a free Spicrawl API key.`

## Paste: #7 Console.dev email

Subject: `docs2skill: docs site to agent skill and llms.txt (open source, v0.1)`
```
Hi, I maintain docs2skill, an Apache-2.0 Node CLI: point it at a docs URL and it writes a skill folder for Claude Code/Codex (SKILL.md plus one reference file per page), llms.txt, llms-full.txt and AGENTS.md. No model writes the output; every line is a scraped page. It runs on the Spicrawl scraping API (I work on it); a free key gives 1,000 credits/month, about 1 credit per page. v0.1, so early. Repo: https://github.com/OfficialSpicrawl/docs2skill  Demo (5 pages, no install): https://docs2skill.spicrawl.com
```

## Paste: #6 Anthropic directory and #10 DevHunt

Tagline (51 chars): `Turn any docs site into an agent skill and llms.txt`
Description (231 chars): `Open-source CLI that reads a docs site's sitemap and writes a Claude Code / Codex skill (SKILL.md plus references), llms.txt, llms-full.txt and AGENTS.md. Only scraped pages, no model-written text. Uses the Spicrawl API (free key).`
Data handling for the directory form: sends the docs site's page URLs to api.spicrawl.com with the user's own `SPICRAWL_API_KEY`; writes files locally only; no telemetry. [Fill in: Spicrawl's retention period.]

## Will not accept it (do not submit)

- awesome-selfhosted (329k): needs self-hostable software with no dependence on a proprietary SaaS, and it bans LLM-written submissions. I drafted nothing.
- lorien/awesome-web-scraping (8.2k): excludes remote APIs and anything about AI agents or MCP, and repos under a month old.
- travisvn/awesome-claude-skills (15.5k): "SaaS wrappers" refused, 10-star minimum, AI-assisted PRs closed unread.
- ComposioHQ/awesome-claude-skills (77.7k): 1,704 open PRs, none merged since 2026-08-01. Skip.
- anthropics/skills (183k): a "demonstration" repo; no outside submission process documented. awesome-nodejs (67k): 100 stars, and SaaS SDKs refused.
- awesome-cli-apps (20.6k): needs 3 months of age, 20 stars, and a human-written PR. Revisit about 2027-01-25.
- llmstxt.site, directory.llmstxt.cloud (3,840 sites), llmstxthub.com list sites that publish llms.txt, not tools. Use them only for `https://docs.spicrawl.com/llms.txt` (returns 200), which is a separate task.
- There's An AI For That: third-party reports say free only via a monthly X thread, otherwise about $49. Poor fit for a CLI.

## Top 5 by traffic / effort

1. llms-txt Integrations PR (canonical audience, no gate, 10 min). 2. skills.sh / SkillsMP (zero effort once `npx skills add` works). 3. VoltAgent list at about 50 stars. 4. Anthropic plugin directory (highest trust, needs plugin.json). 5. awesome-claude-code (biggest list; slow and selective). Console.dev email is the best non-list option.
