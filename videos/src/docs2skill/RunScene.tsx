import React from "react";
import { useTime } from "../kit/time";
import { RUN } from "./cues";
import { CMD, LOG } from "./real";
import { Row, Screen, Seg, Window } from "./Terminal";

/** `node llms-txt.mjs https://docs.spicrawl.com --max 8 --skill spicrawl-docs`, as luminance steps (no hue). */
export const CMD_SEGS: Seg[] = [
  ["node", "keyword"],
  [" llms-txt.mjs", "fg85"],
  [" https://docs.spicrawl.com", "string"],
  [" --max", "flag"],
  [" ", "fg85"],
  ["8", "number"],
  [" --skill", "flag"],
  [" spicrawl-docs", "string"],
];
if (CMD_SEGS.map(([s]) => s).join("") !== CMD) throw new Error("command segments drifted from real.ts");

const ROWS: Row[] = [
  { at: 0, prompt: true, segs: CMD_SEGS, type: { from: RUN.typeFrom, cps: RUN.cps }, testId: "cmd" },
  { at: RUN.discover, segs: [[LOG.discover, "muted"]] },
  { at: RUN.fetch, segs: [[LOG.fetch, "muted"]] },
  { at: RUN.p0, segs: [[LOG.p0, "muted"]] },
  { at: RUN.p8, segs: [[LOG.p8, "fg"]] },
  { at: RUN.wrote, segs: [[LOG.wrote, "fg"]], testId: "wrote" },
  { at: RUN.pages, segs: [[LOG.pages, "fg85"]] },
  { at: RUN.skill, segs: [[LOG.skill, "fg"]], testId: "skill" },
  { at: RUN.install, segs: [[LOG.install, "muted"]], testId: "install" },
  { at: RUN.codex, segs: [[LOG.codex, "muted"]], testId: "codex" },
  { at: RUN.prompt, prompt: true, segs: [] },
];

export const RunScene: React.FC = () => {
  const t = useTime();
  return (
    <Window title="docs2skill">
      <Screen t={t} rows={ROWS} />
    </Window>
  );
};
