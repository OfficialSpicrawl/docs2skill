# docs2skill video kit

The look, rules, assets and code for the docs2skill film. The film prompt ([docs2skill-prompt.md](docs2skill-prompt.md)) only adds the story.
Sources: `/home/roy/Documents/OfficialSpicrawl/FILM-BRIEF.md` (the interview, already done), webora-ui `landing/src/styles/globals.css` (`.spicrawl-theme`), `landing/src/components/spicrawl/HeroTerminal.tsx` and `CodePanel.tsx` (terminal chrome), `../llms-txt.mjs` and `../README.md` (what the tool really does and prints). When this file and the repo's rules files disagree, the repo wins.

## The brief (from the interview)
- Plays: GitHub README + X/LinkedIn. Format 16:9, 1920x1080, 30 fps. Length 15 to 20 s (this cut: 19.10 s).
- Music: none. Narration: Kokoro TTS, voice `af_heart`, one clip per caption, about -16 LUFS.
- Must show: the real `docs2skill` run (`llms-txt.mjs`), its output tree, the generated `SKILL.md`, the copy-into-your-agent command.
- Ingredients chosen: UI = a terminal running the tool and the output file · words = one short caption per beat + a Spicrawl end card · transitions = clean cuts · extras = frame-driven typing and a blinking block cursor. No music, no mascot, no punchlines, no fake agent UI.
- Ending: Spicrawl mark + `docs2skill` + `github.com/OfficialSpicrawl/docs2skill` + `docs2skill.spicrawl.com`. Narration: "Free and open source. Built on Spicrawl."

## Hard rules
- Casing: sentence case captions, ending in a full stop (the brief's words). Tool name `docs2skill`, brand `Spicrawl`.
- Type: Inter for captions and the tool name, JetBrains Mono for the terminal, file names in captions and the URLs. Righteous is reserved for the "Spicrawl" wordmark and is not used here (the wordmark is not set in text anywhere in this film; the mark SVG is used). (brief)
- Corners: radius 10 px on the terminal card. (brief)
- Surfaces: ground `#16181B`; the terminal card `#1E2124` is the only other surface; its title bar is the ground at 40% over the card. (globals.css, HeroTerminal)
- Borders and shadows: the terminal card has a 1 px `#2E3135` border and the product's soft drop shadow. No other borders, no glows, no gradients, no particles. (HeroTerminal / `TerminalFrame`)
- Color: white is the only accent. Everything else is steps of grey. No hue anywhere. (brief)
- Motion: cuts only. Captions fade in over 0.15 s with a 12 px rise (the product's `spicrawlFadeUp`, ease-out) and out over 0.12 s. Nothing bounces.
- Copy: the words in the terminal are the tool's own output and the repo's own commands, copied verbatim. No dashes in invented copy.
- Claims: see "Claims".

## Frame (1920x1080, 30 fps, dark)
- Framing: full bleed ground. Caption centered at y 66 to 150. Terminal window x 100, y 200, 1720 x 780. Content stays 100 px from the edges.
- Words: Inter 600, 64 px, `#F9F9F9`, letter-spacing -0.015em. File names inside a caption are JetBrains Mono 500 at 0.88 em. A caption is on screen exactly while its Kokoro clip plays.
- Scenes: terminal text is JetBrains Mono 25 px (one column = 15 px), line height 38 px (an integer, so tree guide lines join). The longest real line is 107 columns = 1605 px, which fits the 1640 px inner width.

## Color
| Token | Value | Use |
|---|---|---|
| ground (background) | `#16181B` | the page |
| card | `#1E2124` | the terminal body |
| elevated | `#26292D` | not used |
| border | `#2E3135` | terminal outline |
| title bar | `#1B1D20` / line `#292B2F` | the ground at 40% over the card; the border at 70% |
| foreground | `#F9F9F9` | captions, prompt, cursor, the lines that matter |
| foreground 85% | `#D8D9DA` | terminal body text (the product's `text-foreground/85`) |
| muted foreground | `#A9ADB2` | secondary lines, the second URL, the title bar text |
| code tones | keyword `#FAFAFA`, string `#D4D6D9`, number `#AEB1B5`, flag `#93969B`, comment `#85888D` | steps of luminance, brightest to dimmest |
| tree guide | `#4B4F54` | the `tree` connector lines |
| accent | white (`#F9F9F9`) | cursor, lit-row bar |
| status tones | none | the tool prints no status colors |

Hex only for anything that animates. The `oklch()` values in globals.css convert to slightly darker hex than the hex written in that file's comments (`oklch(0.178 ...)` is `#101113`, the comment says `#16181B`). The brief fixes `#16181B`, so the commented hex is used, and the code tones are the oklch ladder shifted up by the same few steps.

## Type
- Inter variable and JetBrains Mono variable, `latin` subset, copied from `webora-ui/landing/node_modules/@fontsource-variable/*` into `public/fonts/` and loaded with `@remotion/fonts` (`src/docs2skill/fonts.ts`).
- JetBrains Mono's `latin` subset has no box-drawing glyphs, so the `tree` guides are drawn as CSS lines on a 4-column grid. Ligatures are off (`calt`, `liga`) so `->`-style text stays literal.
- Sizes at 1080p: caption 64 px, tool name 132 px, URLs 42 px, terminal 25 px, title bar 22 px.

## Signature elements
| Element | Look | Source | In films |
|---|---|---|---|
| Terminal window | 1 px border, card ground, title bar with a mono title only (no traffic lights), radius 10 | `TerminalFrame` in CodePanel.tsx, scaled 2x | `Window` in `Terminal.tsx` |
| Prompt and cursor | `$ ` in foreground, a block cursor (14 x 30 px) | HeroTerminal | solid while typing, blinks at 0.53 s when idle (a function of t) |
| Lit row | foreground at 7% with a 2 px left bar | `Highlighted` `lit` in CodePanel.tsx | the `name:` and `description:` rows of SKILL.md |
| Shell comment | comment tone, italic | the product's highlighter | `# Claude Code`, `# Codex-style repo` |
| Fade up | opacity + 6 px (12 px at 2x) rise, 320 ms ease-out | `spicrawlFadeUp` in globals.css | caption and end card entrances |

## Logo and brand element
- Logo: `public/brand/spicrawl-mark.svg` (the dark variant of "Spicrawl logo dark.svg"). The mark has black eye cut-outs made for a black ground, so `spicrawl-mark-ground.svg` recolors them to `#16181B` and is the file the end card uses. The lockup and wordmark SVGs are copied for reference and are not used.
- Animation: none beyond the end card's fade up. The mascot (`Spicrawl.tsx`) is not used.
- Never: another hue, a glow behind the mark, the mark on the terminal card.

## Cursors
- None on screen: the terminal types by itself, so there is no pointer. The only cursor is the block text cursor.

## Components
| Need | Component (path) | In films |
|---|---|---|
| Terminal chrome | `TerminalFrame` (webora-ui CodePanel.tsx) | redrawn in `Terminal.tsx`: the product's component is Tailwind + React state, and its copy button and clipboard state run their own clock |
| Syntax tones | `highlightLine` (CodePanel.tsx) | the regex tokenizer is replaced by hand-assigned segments (`Seg[]`), because it would mis-tokenize `llms-txt.mjs` as a flag |
| Output tree | none | drawn here; real `tree --noreport out` layout |

## Motion
- Closed-form only: `kit/spring.ts` `step`/`track` are available; the film itself only needs linear typing at a fixed characters-per-second, an ease-out cubic for fade-ups and an ease-in-out cubic for the one scroll (0.7 s).
- Transitions: clean cuts between the four scenes (`Sequence`s that do not overlap) and one cut inside scene 2 (tree to SKILL.md).

## Claims
- What the film shows: `node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs` and the log it printed in a live run on 2026-10-23 (8 pages, about 8 credits, 1 per page); the real output tree; the real `SKILL.md`; the two copy commands from the README (`~/.claude/skills/` for Claude Code, `.agents/skills/` for Codex-style repos).
- What the film never shows: an agent using the skill (no fake agent UI), search, crawling beyond the sitemap, AI extraction or any model-written text (the tool writes nothing with a model), prices other than "about 8 credits (1 per page)".
- Approved lines: the four captions in `cues.ts` (from the brief). "In seconds" is the brief's wording; the run itself is one batch job of 8 pages.
- Words to avoid: "crawl" as a feature, "AI-generated", "free" without the free-plan context (the narration says "Free and open source", which describes the tool and its Apache-2.0 license, per the brief).

## Workspace
- `videos/` is its own npm package inside the docs2skill repo. `remotion` and every `@remotion/*` are pinned to `4.0.538`; `react` and `react-dom` `18.3.1`. No Tailwind (the terminal is plain inline styles on the tokens above), so no webpack override.
- Scripts: `scripts/narrate.sh` + `say.py` (Kokoro clips), `scripts/mix.ts` (narration track, two-pass loudnorm), `scripts/beat-sheet.ts` (the table in the prompt), `scripts/stills.ts` (review stills, bundle once), `scripts/render.ts` (final render), `scripts/verify.py` (decoded checks).
- 30 fps, not the skill's 60/240 fps motion-blur pipeline: the brief fixes 30 fps and nothing moves fast.
- Kit: only `time.ts`, `spring.ts` and `debug.tsx` are in `src/kit/`; the rest of the skill's kit (camera, cursor, dither, move, punchlines) is not needed here.
- Generated and kept out of git: `node_modules/`, `out/review/`, `frames-tmp/`. The repo-level `.gitignore` also ignores `out/`, which includes `videos/out/`: copy the deliverables out (or `git add -f`) when publishing.
- Preview: `npm run studio`. Review stills: `bun scripts/stills.ts out/review/rN <frame>... --composition Docs2Skill [--debug]` (frames at 30 fps).
