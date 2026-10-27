# docs2skill site: design notes

The brief, the concept and the system behind `src/page.mjs`. Read this before changing the page.

## Brief

- **Subject:** docs2skill turns a docs site into `SKILL.md`, `llms.txt`, `llms-full.txt` and `AGENTS.md`, from the CLI or from this page (up to 5 pages).
- **Audience:** developers who use a coding agent (Claude Code, Codex, Cursor) and want it to know a library's docs.
- **Job of the page:** (1) run the tool right here and see the output at first paint, (2) give the real command and the skill install, (3) send people to GitHub, the Spicrawl docs and a free Spicrawl key.
- **Direction from the owner:** closer to firecrawl.dev (a centered, confident hero with one input as the star, crisp mono details, an ASCII texture), clean (few elements per screen, whitespace, one accent, no boxes in boxes, no competing buttons, no decoration without a job), and low on text: a plain H1 ("Turn any docs site into an agent skill."), a one-line sub, 2 to 3 word labels, **120 words or fewer of copy on the page** (a test counts them). Where a thing can be shown, show it: the sections are an explorer, a live flow and a live terminal.
- **Constraints:** keep the stack and the deploy (Cloudflare Worker, one HTML string, `wrangler deploy`). Facts come from the README and from the real run in `videos/src/docs2skill/real.ts`. No Spicrawl engine names anywhere.
- **Why the old page failed:** two identical cards and a third for results, one typeface, no accent, an empty first screen (the output appeared only after a 10 to 40 second wait), and output that did not look like a skill.

## Stack

Unchanged: a Worker serving one HTML string with inline CSS and a small inline script. Two additions, both built or served by the same `wrangler deploy`:

- `public/` is a Workers static-assets folder: self-hosted Geist, Geist Mono and the 3 KB box-drawing cut from ascii.rest (all woff2), `og.png`, `robots.txt`, `sitemap.xml`, `_headers`, and `island.js` (generated, gitignored).
- `island/main.jsx` bundles three React islands (border beam, thinking orb, bot avatar; those libraries are React-only) into `public/island.js` with esbuild, run by wrangler's `build.command` (`build.mjs`). They read `<html data-run>`. The page, the form, the demo logic and the two animated scenes stay vanilla; if the island fails to load, the page is complete. It loads after `load`, on idle, from a content-hashed file name served with an immutable cache header.
- The scenes ("How it works", "Run it yourself") are DOM text moved by one 50 ms timer that runs only while one of them is within 120 px of the screen. Their final state is in the HTML (crawlers, no-script and reduced-motion readers get it); the script resets them and plays them in a loop. ascii.rest's pieces own their clocks and cannot be stepped from outside, so the scenes reproduce their vocabulary (box-drawing tree, eighth-block progress bars, a typewriter) in plain DOM instead of mounting them.
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

Idle state: pages of the sample site drift in from both edges of the hero and dissolve before they reach the text; the bot at the left of the pane's status line looks around and blinks; a lime reading cursor steps down the page list in SKILL.md; "How it works" and "Run it yourself" loop while on screen. Everything stops under reduced motion (the final frame shows). On phones the drift is not shown and the bot holds a still pose until a run starts.

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

**Effects, one per area** (libraries.dev rules: a wait over 3 s gets an orb and a beam; never two effects on one element).

| Area | Effect | State |
|---|---|---|
| Hero background, the two bands beside the headline | 14 text lines, CSS `transform` and `opacity` only: the sample's page paths (left) and their titles (right) drift 140 px inward over 11 to 15 s and dissolve before the text. Never under text or a control | runs; a still faint frame under reduced motion; not shown under 1200 px |
| The URL field | `border-beam` `line`, mono | active while a run is in flight |
| The pane bar | `bot-avatars` droid (light grey, 36 px, crisp shading), then `thinking-orbs` 20 px beside the status label | bot `working` while the run is in flight; orb `searching` + "Crawling docs", then `composing` + "Writing SKILL.md" |
| How it works | DOM flow in a `<pre>`: Find (the 8 pages appear), Read (each gets an eighth-block bar that fills, then a tick), Write (the output folder appears); the three steps beside it light in turn | loops every 9.8 s while on screen |
| Run it yourself | DOM terminal: the three commands type in with a caret, then the CLI's recorded output lines appear, then a tick | loops every 12 s while on screen; Copy always copies the plain commands |
| h1 | none | Liquid metal is WebGL, and the h1 is the LCP element and real text |

Everything the scenes show is real: the pages and titles are the sample run's, the terminal output is the CLI's recorded log (a test compares it with `videos/src/docs2skill/real.ts`), and the status text is honest: the Worker answers once, so the page can only say "Crawling docs" while it waits and "Writing SKILL.md" while the returned files are written into the pane.

Performance, measured in a software-rendered browser: a masked canvas repainting 24 times a second took scrolling from 60 to 17 fps and the plastic bot from 60 to 34, so there is no canvas loop and the bot uses the crisp rim (59 fps scrolling, 48 fps with a 4x CPU throttle; on a throttled phone 52 to 60). The scenes touch a few spans every 50 ms and only while on screen. Phones also hold the bot's pose until a run starts.

## Composition

```
HEADER   docs2skill by Spicrawl                                       [GitHub Star on GitHub]
HERO         Turn any docs site into an agent skill.      (Geist 600, "agent skill" in lime)
 /credits      Paste a docs URL. Get files Claude Code, Codex and Cursor can use.     # Credits
   /errors   (paths drift in from the edges)                                        # Errors
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
         docs.spicrawl.com/ (pages, bars)      1 Find  2 Read  3 Write
                        Run it yourself
              a terminal: 3 commands typed, the CLI's output, a tick   Copy
                  Give your agent the docs.
                [Try Spicrawl free ->] [Star on GitHub]
                      Free key. 1,000 credits a month.
FOOTER   Built on Spicrawl. Free key at app.spicrawl.com.        Docs GitHub llms.txt Apache-2.0 ascii.rest
```

The page is about 2,400 px tall at 1440 and 2,800 px at 390. The headline fits on two lines at 1440 and three at 390.

## Genericness test

A generic model asked for "a landing page for a docs-to-skill tool" would write a hero over a gradient, three feature cards, a stats row and a purple glow. This page has no gradient, no cards, no stat tiles, no eyebrow labels, and its hero is the product's real output as a file tree and a file. Cut after the test: a folder section, a feature row, an options tab, an agent-prompt tab, section rules, the pane's shadow, the markdown marks on headings, and an ASCII ripple behind the hero ("not intuitive": it told no story, so the background now shows the pages being folded in).

## Agent-native

- The primary actions are the real commands, each with Copy: the skill install (hero and CLI block), the clone and run lines (the CLI prints the install command for the folder it writes).
- `GET /llms.txt` serves this site's own index in the format the tool writes; `GET /SKILL.md` redirects to the skill in the repo; the footer links `llms.txt` and the page declares it with `rel="alternate"`.
- JSON-LD (`SoftwareApplication`), one `h1`, real text everywhere, a designed 404 for browsers and JSON errors for API clients.
- The agent on the page is a bot whose state is the demo's state, and the pane explains what a skill is in two labels.

## Rules held

AA contrast, one `h1`, visible focus ring (lime, 2 px) on every control, skip link, reduced motion, 390 px composed, tap targets 24 px or more, no em or en dashes, no filler words, no engine names (a test checks the rendered page), copy under 120 words (a test counts it).

## The star count

The worker serves `GET /api/stars` from one GitHub API call an hour (Cache API; a failure is cached as `null` for a minute), so the unauthenticated rate limit never reaches a visitor and there is no 403 in anyone's console. The page render inlines the count when the cache has it, so the button does not move; otherwise the script asks `/api/stars` and caches the answer in `localStorage` for 6 hours. A count segment appears only from `MIN_STARS_SHOWN` (10) up. Until then, and whenever there is no number, the button is just "Star on GitHub". The number is never typed in.

## Motion limits (WCAG 2.2.2)

Nothing moves on its own for long. The two scenes play twice, then rest on their final frame (scrolling them away and back plays them again); the hero drift makes two passes, then the lines are gone; the bot holds its pose after 20 s idle until a click or a run; under reduced motion all of it is a still, finished frame. Every effect that is state (the beam, the orb, the bot at work) is on only while a run is in flight.

## Sources and licences

| Piece | From | Licence |
|---|---|---|
| ascii.rest (the 3 KB box-drawing font cut below, and the vocabulary of its tree, progress-bar and typewriter pieces, reproduced in plain DOM) | https://ascii.rest, MIT. No ascii.rest code is bundled; its pieces were tried and rejected because they cannot be driven from outside | credited in the footer |
| `bot-avatars`, `thinking-orbs`, `border-beam` | libraries.dev (npm), bundled into `island.js` | MIT |
| `react`, `react-dom` | npm, bundled into `island.js` | MIT |
| Geist, Geist Mono (variable, latin) | `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | SIL OFL 1.1 |
| `ascii-rest-mono.woff2` (3 KB cut of JetBrains Mono) | https://ascii.rest/fonts/ascii-rest-mono.woff2 | SIL OFL 1.1 |
| GitHub mark | Octicons `mark-github` | MIT |
| `og.png` | `launch/social-preview.png` | the project's own asset |
| affectui.com, kobra.systems, uiarc.dev, evilcharts.com, transitions.dev, beui.dev, bencho.dev | looked at, none used | none states a licence on its page, except beUI (MIT), which needs React 19, Tailwind 4 and Motion. The tree is plain CSS and characters drawn from the real `tree` output |
