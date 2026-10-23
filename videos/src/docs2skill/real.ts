/**
 * REAL output of a live run on 2026-10-23:
 *   node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs
 * against docs.spicrawl.com (8 pages, ~8 credits). Copied verbatim; nothing here is invented.
 * The log lines are the ones llms-txt.mjs prints (see log(...) in main() and generate()).
 */

export const CMD = "node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs";

export const LOG = {
  discover: "Discovering pages on https://docs.spicrawl.com/ ...",
  fetch: "Fetching 8 pages, about 8 credits (1 per page).",
  p0: "  0/8 pages done",
  p8: "  8/8 pages done",
  wrote: "Wrote out/llms.txt and out/llms-full.txt",
  pages: "8 pages; skipped 0 failed, 0 blocked (HTTP 4xx/5xx), 0 empty.",
  skill: "Wrote skill out/spicrawl-docs/ (SKILL.md + 8 reference files) and out/AGENTS.md",
  install: "Install: copy the folder into your agent's skills directory, e.g. cp -r out/spicrawl-docs ~/.claude/skills/",
  codex: "Codex-style repos read skills from .agents/skills/; AGENTS.md is a compact index to drop into a repo root.",
} as const;

/** `tree --noreport out` of the run's output directory (C-locale order). */
export type TreeNode = { name: string; children?: TreeNode[] };
export const TREE: TreeNode = {
  name: "out",
  children: [
    { name: "AGENTS.md" },
    { name: "llms-full.txt" },
    { name: "llms.txt" },
    {
      name: "spicrawl-docs",
      children: [
        { name: "SKILL.md" },
        {
          name: "references",
          children: [
            "agents-app-builders.md",
            "authentication.md",
            "credits.md",
            "errors.md",
            "index.md",
            "quickstart.md",
            "rate-limits.md",
            "response-headers.md",
          ].map((name) => ({ name })),
        },
      ],
    },
  ],
};

/** out/spicrawl-docs/SKILL.md, whole file. */
export const SKILL_MD = String.raw`---
name: spicrawl-docs
description: "Use when working with Spicrawl: Spicrawl is a web data API for agents: fetch, render and extract any URL as markdown, HTML or structured JSON with one request."
---

# Spicrawl

Spicrawl is a web data API for agents: fetch, render and extract any URL as markdown, HTML or structured JSON with one request.

## Reference

### Pages

- [Spicrawl](references/index.md): Spicrawl is a web data API for agents: fetch, render and extract any URL as markdown, HTML or structured JSON with on...
- [Authentication](references/authentication.md): Authenticate Spicrawl API calls with a Bearer API key, choose live or test keys, and grant the scopes each route needs.
- [Credits](references/credits.md): What each Spicrawl request costs by rendering tier, what is free, and how to cap spend with max\_cost and batch budgets.
- [Errors](references/errors.md): Every Spicrawl error code with its HTTP status, whether to retry, what it means and which parameter to change.
- [Quickstart](references/quickstart.md): Get a Spicrawl API key, scrape your first page as markdown with curl, Python, TypeScript or the CLI, and read the res...
- [Rate limits](references/rate-limits.md): How Spicrawl limits request rate, concurrency, live sessions and monthly credits, the headers that report each limit,...
- [Response headers](references/response-headers.md): Every header Spicrawl returns on /v1/scrape: request id, credits, rendering tier, target status, proxy, cache state,...

### Agents

- [AI app builders](references/agents-app-builders.md): Connect Spicrawl's hosted MCP server to Replit Agent, v0, Lovable and Bolt so the builder can read web pages, and cal...

## How to use

Open only the reference files you need for the task, not all of them. Each file is one page as markdown, with its source URL on the second line.
`;

/** The copy commands from the README's "Turn docs into an agent skill" section, with this run's folder name. */
export const INSTALL = [
  { cmd: "cp -r out/spicrawl-docs ~/.claude/skills/", note: "# Claude Code" },
  { cmd: "cp -r out/spicrawl-docs .agents/skills/", note: "# Codex-style repo" },
] as const;

/** Comments line up one column after the longer command. */
export const INSTALL_PAD = Math.max(...INSTALL.map((l) => l.cmd.length)) + 2;
