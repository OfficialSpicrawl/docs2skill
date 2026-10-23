/**
 * The beat sheet as data. Pure TypeScript (no React), so scripts/mix.ts and scripts/beat-sheet.ts import it too.
 * Narration clip lengths are measured (scripts/narrate.sh -> narration.json); every beat below is derived
 * from them or sits on a fixed offset inside its scene. Scene code never holds a literal frame number.
 */
import narration from "./narration.json";
import { CMD, INSTALL, INSTALL_PAD } from "./real";

export const FPS = 30;

export const CAPTIONS = [
  "Turn any docs site into an agent skill.",
  "SKILL.md, llms.txt and AGENTS.md, in seconds.",
  "Drop it into Claude Code or Codex.",
  "Free and open source. Built on Spicrawl.",
] as const;

const dur = narration.durations;

/** Scenes cut cleanly, back to back. `lead` is where the narration clip starts inside the scene. */
const plan = [
  { id: "run", len: 5.3, lead: 0.25 },
  { id: "files", len: 6.0, lead: 0.15 },
  { id: "install", len: 3.6, lead: 0.15 },
  { id: "end", len: 4.2, lead: 0.3 },
] as const;

let cursor = 0;
export const SCENES = plan.map((s, i) => {
  const start = cursor;
  cursor += s.len;
  const clipStart = start + s.lead;
  return { ...s, start, end: cursor, clipStart, clipEnd: clipStart + dur[i] };
});
export const TOTAL = cursor;
export const TOTAL_FRAMES = Math.round(TOTAL * FPS);

/** Beats inside each scene, in seconds from the scene's own start. */
export const RUN = {
  typeFrom: 0.3,
  cps: 44,
  get typeEnd() {
    return this.typeFrom + CMD.length / this.cps;
  },
  discover: 2.25,
  fetch: 2.65,
  p0: 2.8,
  p8: 3.6, // the real tool prints a progress line only when the count changes: 0/8, then 8/8
  wrote: 3.8,
  pages: 3.9,
  skill: 4.0,
  install: 4.1,
  codex: 4.2,
  prompt: 4.35,
};

export const FILES = {
  treeCmdFrom: 0.05,
  treeCmd: "tree --noreport out",
  cps: 40,
  treeRows: 0.6, // first tree row; one more every treeStep
  treeStep: 0.04,
  cutToFile: 1.9, // tree -> SKILL.md (a clean cut)
  scrollFrom: 3.9,
  scrollLen: 0.7,
};

export const INSTALL_BEATS = (() => {
  const cps = 56;
  const full = INSTALL.map((l) => l.cmd.padEnd(INSTALL_PAD) + l.note);
  const first = 0.2;
  const second = first + full[0].length / cps + 0.25;
  const prompt = second + full[1].length / cps + 0.15;
  return { cps, first, second, prompt };
})();

export const END = { mark: 0.1, name: 0.3, github: 0.5, site: 0.65, rise: 0.32 };
