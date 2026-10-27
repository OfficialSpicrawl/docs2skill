# docs2skill site: design notes

The brief, the concept and the system behind `src/page.mjs`. Read this before changing the page.

## Brief

- **Subject:** docs2skill turns a docs site into `SKILL.md`, `llms.txt`, `llms-full.txt` and `AGENTS.md`, from the CLI or from this page (up to 5 pages).
- **Audience:** developers who use a coding agent (Claude Code, Codex, Cursor) and want it to know a library's docs.
- **Job of the page:** (1) run the tool right here and see the output at first paint, (2) give the real command and the skill install, (3) send people to GitHub, the Spicrawl docs and a free Spicrawl key.
- **Direction from the owner:** closer to firecrawl.dev (a centered, confident hero with one input as the star, crisp mono details, an ASCII texture), clean (few elements per screen, whitespace, one accent, no boxes in boxes, no competing buttons, no decoration without a job), and low on text: the H1 at most 6 words, a one-line sub, 2 to 3 word labels, **120 words or fewer of copy on the page** (a test counts them).
- **Constraints:** keep the stack and the deploy (Cloudflare Worker, one HTML string, `wrangler deploy`). Facts come from the README and from the real run in `videos/src/docs2skill/real.ts`. No Spicrawl engine names anywhere.
- **Why the old page failed:** two identical cards and a third for results, one typeface, no accent, an empty first screen (the output appeared only after a 10 to 40 second wait), and output that did not look like a skill.

## Stack

Unchanged: a Worker serving one HTML string with inline CSS and a small inline script. Two additions, both built or served by the same `wrangler deploy`:

- `public/` is a Workers static-assets folder: self-hosted Geist, Geist Mono and the 3 KB box-drawing cut from ascii.rest (all woff2), `og.png`, `robots.txt`, `sitemap.xml`, `_headers`, and `island.js` (generated, gitignored).
- `island/main.jsx` bundles the effects into `public/island.js` with esbuild, run by wrangler's `build.command` (`build.mjs`): three React islands (border beam, thinking orb, bot avatar; those libraries are React-only) and two ascii.rest pieces (vanilla `mount()`, no React). They read `<html data-run>`. The page, the form and the demo logic stay vanilla; if the island fails to load, the page is complete. It loads after `load`, on idle.
- Next.js or Astro would replace the Worker and its guards. Not worth it for one page.

## Concept

**The page is the folder it makes.** A docs site folded into one skill, with the skill shown as what it is: a file tree and a file, and two labels (`always loaded`, `on demand`) that say what a skill is. Considered and dropped: a stack of page cards folding into one file (a funnel, common), and a converter with stdin and stdout panes (portable to any tool).

```
Idea:        Docs in, agent skill out. The product's real output is the hero.
Metaphor:    A skill folder read by an agent: frontmatter always in context, references opened on demand.
Signature:   The pane. Full at first paint (a real run of docs.spicrawl.com); a live run writes its own
             files into it line by line while a bot works and an orb names the step.
Emotion:     Quiet, exact, a little pleased.
Motion verb: "write". Lines arrive like lines written to a file (6 px rise, 180 ms). Primary buttons answer
             with a line feed: the label rolls up and the next copy rolls in, and the fill floods with the accent.
Screenshot:  Hero at 1440: one line of Geist, the field, the tree and SKILL.md under a dotted ASCII ripple.
```

Idle state: the bot at the left of the pane's status line looks around and blinks, the `file-tree` piece in "How it works" opens folder by folder while it is on screen, and a lime reading cursor steps down the page list in SKILL.md. Everything stops under reduced motion. On phones the bot holds a still pose until a run starts. The ASCII ripple behind the hero is one still frame (see Effects).

## System

**Palette** (spicrawl.com: near-black ground, white, one lime).

| Role | Value | Use |
|---|---|---|
| ground | `#16181B` | page |
| paper | `#1E2124` | the pane, the field, command blocks |
| line | `#2E3135` | borders, tree guides |
| ink | `#F9F9F9` | headings, the filled buttons |
| code | `#D3D5D8` | file text |
| muted | `#A9ADB2` | secondary text (7.6:1 on ground) |
| faint | `#91969D` | punctuation, notes (5.4:1 on paper) |
| lime | `#4AA74D` | `oklch(65% .155 144)`: "Agent skill" in the H1, the two labels, the selected file, step numbers, focus ring, the fill on a hovered button (5.8:1 on ground) |

**Type.** Geist (variable, 600 for headings at -0.03em, 400 for body) and Geist Mono for files, commands and labels, both OFL, self-hosted, latin. Box-drawing glyphs, which the latin subset lacks, come from a 3 KB cut of JetBrains Mono (OFL) that ascii.rest publishes, listed after Geist Mono with a `unicode-range`. H1 `clamp(2.5rem, 1rem + 6.4vw, 4.5rem)`; body 16 px at 1.5; labels 13 px.

**Grid.** One centered column, `max-width: 1120px`, 24 px gutters (16 px at 390). The pane spans the column; everything else is centered inside it. Sections are separated by 120 px of space, not lines.

**Shape.** One radius, 10 px (999 px for the example chips and the phone file chips). Hairlines are `line`. No shadows, no gradients.

**Motion language.** Ease `cubic-bezier(.2, .7, .2, 1)`. Lines rise 6 px and fade over 180 ms (900 ms at most for a file). Filled buttons roll their label and flood to lime on hover and focus; chips lift 1 px; text buttons underline. Page motion is CSS; the libraries run their own loops, pause off screen and hold a still pose under reduced motion.

**Effects, one per area** (libraries.dev rules; ascii.rest pieces cap at 2).

| Area | Effect | State |
|---|---|---|
| Behind the hero, in the two bands beside the headline | ascii.rest `wave-interference`, one still frame on a canvas (so the h1 stays the LCP), masked so it never sits behind text or a control | static; not shown on phones |
| The URL field | `border-beam` `line`, mono | active while a run is in flight |
| The pane bar, left | `thinking-orbs` 20 px beside the status label | `searching` + "Crawling docs", then `composing` + "Writing SKILL.md" |
| The pane bar, before the status label | `bot-avatars` droid, light grey, 36 px, crisp shading | `working` while the run is in flight, `default` otherwise |
| "How it works" | ascii.rest `file-tree`, fed the sample site's real pages | opens folder by folder, the "find" step |
| h1 | none | Liquid metal is WebGL, and the h1 is the LCP element and real text |

The status text is honest: the Worker answers once, so the page can only say "Crawling docs" while it waits and "Writing SKILL.md" while the returned files are written into the pane; it invents no per-page progress. Performance, measured in a software-rendered browser: a masked canvas repainting 24 times a second took scrolling from 60 to 17 fps and the plastic bot from 60 to 34, so the ripple is a still frame and the bot uses the crisp rim (59 fps scrolling, 48 fps with a 4x CPU throttle; on a throttled phone 52 to 60). Phones also hold the bot's pose until a run starts.

## Composition

```
HEADER   docs2skill by Spicrawl                                       [GitHub Star on GitHub]
HERO              Docs in. Agent skill out.                (Geist 600, "Agent skill" in lime)
         SKILL.md, llms.txt and AGENTS.md from any docs URL.
         [docs2skill  https://docs.acme.dev                  [Generate]]     (button inside the field)
              (docs.spicrawl.com) (fastapi.tiangolo.com) (www.mkdocs.org)
                   $ npx skills add OfficialSpicrawl/docs2skill   Copy
         +- [bot] docs.spicrawl.com . 8 pages -------------------- Copy  Download -+
         | out/                | ---                                              |
         |  |- AGENTS.md       | name: spicrawl-docs                              |
         |  |- llms.txt        | description: "Use when working with ..."        |
         |  `- spicrawl-docs/  | ---                                              |
         |     |- SKILL.md     | ^ always loaded                                  |
         |     `- references/  | - [Spicrawl](references/index.md): ...           |
         +----------------------------------------------------------------------+
                         How it works
              (ascii file tree)        1 Find  2 Read  3 Write
                        Run it yourself
                  3 lines of code, one Copy
                  Give your agent the docs.
                [Try Spicrawl free ->] [Star on GitHub]
                      Free key. 1,000 credits a month.
FOOTER   Built on Spicrawl. Free key at app.spicrawl.com.        Docs GitHub llms.txt Apache-2.0 ascii.rest (MIT)
```

The page is about 2,400 px tall at 1440 and 2,800 px at 390.

## Genericness test

A generic model asked for "a landing page for a docs-to-skill tool" would write a hero over a gradient, three feature cards, a stats row and a purple glow. This page has no gradient, no cards, no stat tiles, no eyebrow labels, and its hero is the product's real output as a file tree and a file. Cut after the test: a folder section, a feature row, an options tab, an agent-prompt tab, section rules, the pane's shadow and the markdown marks on headings.

## Agent-native

- The primary actions are the real commands, each with Copy: the skill install (hero and CLI block), the clone and run lines (the CLI prints the install command for the folder it writes).
- `GET /llms.txt` serves this site's own index in the format the tool writes; `GET /SKILL.md` redirects to the skill in the repo; the footer links `llms.txt` and the page declares it with `rel="alternate"`.
- JSON-LD (`SoftwareApplication`), one `h1`, real text everywhere, a designed 404 for browsers and JSON errors for API clients.
- The agent on the page is a bot whose state is the demo's state, and the pane explains what a skill is in two labels.

## Rules held

AA contrast, one `h1`, visible focus ring (lime, 2 px) on every control, skip link, reduced motion, 390 px composed, tap targets 24 px or more, no em or en dashes, no filler words, no engine names (a test checks the rendered page), copy under 120 words (a test counts it).

## The star count

The GitHub button fetches `api.github.com/repos/OfficialSpicrawl/docs2skill` after load, caches the number in `localStorage` for 6 hours, and adds a count segment only from `MIN_STARS_SHOWN` (10) up. Until then, and whenever the request fails, the button is just "Star on GitHub". The number is never typed in.

## Sources and licences

| Piece | From | Licence |
|---|---|---|
| `ascii.rest` 0.4.x (`mount`, `wave-interference`, `file-tree`; the box-drawing font cut) | npm, bundled into `island.js` | MIT (credited in the footer) |
| `bot-avatars`, `thinking-orbs`, `border-beam` | libraries.dev (npm), bundled into `island.js` | MIT |
| `react`, `react-dom` | npm, bundled into `island.js` | MIT |
| Geist, Geist Mono (variable, latin) | `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | SIL OFL 1.1 |
| `ascii-rest-mono.woff2` (3 KB cut of JetBrains Mono) | https://ascii.rest/fonts/ascii-rest-mono.woff2 | SIL OFL 1.1 |
| GitHub mark | Octicons `mark-github` | MIT |
| `og.png` | `launch/social-preview.png` | the project's own asset |
| affectui.com, kobra.systems, uiarc.dev, evilcharts.com, transitions.dev, beui.dev, bencho.dev | looked at, none used | none states a licence on its page, except beUI (MIT), which needs React 19, Tailwind 4 and Motion. The tree is plain CSS and characters drawn from the real `tree` output |
