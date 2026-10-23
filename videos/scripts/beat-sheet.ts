import { CAPTIONS, END, FILES, FPS, INSTALL_BEATS, RUN, SCENES, TOTAL } from "../src/docs2skill/cues";

/** Prints the beat sheet (markdown) from cues.ts. Paste into docs2skill-prompt.md after any timing change. */
const f = (s: number) => `${s.toFixed(2)} s (frame ${Math.round(s * FPS)})`;
const rows: string[] = [];
const clip = SCENES.map((s, i) => `| ${f(s.clipStart)} - ${f(s.clipEnd).split(" ")[0]} s | Narration + caption ${i + 1} | "${CAPTIONS[i]}" |`);
rows.push(...clip);
const at = (scene: number, local: number) => f(SCENES[scene].start + local);
rows.push(
  `| ${at(0, RUN.typeFrom)} - ${at(0, RUN.typeEnd).split(" (")[0]} | Scene 1: command typed | node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs |`,
  `| ${at(0, RUN.discover)} | Scene 1: discovery | Discovering pages on https://docs.spicrawl.com/ ... |`,
  `| ${at(0, RUN.fetch)} | Scene 1: plan | Fetching 8 pages, about 8 credits (1 per page). |`,
  `| ${at(0, RUN.p0)} / ${at(0, RUN.p8)} | Scene 1: progress | 0/8 pages done, then 8/8 pages done |`,
  `| ${at(0, RUN.wrote)} - ${at(0, RUN.codex).split(" (")[0]} | Scene 1: files written + install hint | the tool's five closing lines |`,
  `| ${at(0, RUN.prompt)} | Scene 1: prompt returns | $ |`,
  `| ${at(1, FILES.treeCmdFrom)} | Scene 2: tree | tree --noreport out, rows stream in (${f(SCENES[1].start + FILES.treeRows).split(" (")[0]}) |`,
  `| ${at(1, FILES.cutToFile)} | Scene 2: cut to SKILL.md | frontmatter name + description lit |`,
  `| ${at(1, FILES.scrollFrom)} - ${at(1, FILES.scrollFrom + FILES.scrollLen).split(" (")[0]} | Scene 2: scroll to the Reference list | ### Pages + 7 entries |`,
  `| ${at(2, INSTALL_BEATS.first)} | Scene 3: cp for Claude Code | cp -r out/spicrawl-docs ~/.claude/skills/ |`,
  `| ${at(2, INSTALL_BEATS.second)} | Scene 3: cp for Codex | cp -r out/spicrawl-docs .agents/skills/ |`,
  `| ${f(SCENES[3].start + END.mark)} - ${f(SCENES[3].start + END.site).split(" (")[0]} | End card | mark, docs2skill, github.com/OfficialSpicrawl/docs2skill, docs2skill.spicrawl.com |`,
);
console.log("| Time | Beat | Content |\n|---|---|---|");
console.log(rows.join("\n"));
console.log(`\nScenes: ${SCENES.map((s) => `${s.id} ${s.start.toFixed(2)}-${s.end.toFixed(2)}`).join(", ")}; total ${TOTAL.toFixed(2)} s = ${Math.round(TOTAL * FPS)} frames at ${FPS} fps.`);
