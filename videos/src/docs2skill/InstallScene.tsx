import React from "react";
import { useTime } from "../kit/time";
import { INSTALL_BEATS } from "./cues";
import { INSTALL, INSTALL_PAD } from "./real";
import { Row, Screen, Seg, Window } from "./Terminal";

const line = (i: number): Seg[] => {
  const [cp, flag, from, to] = INSTALL[i].cmd.split(" ");
  return [
    [cp, "keyword"],
    [` ${flag}`, "flag"],
    [` ${from}`, "string"],
    [` ${to}`, "string"],
    [" ".repeat(INSTALL_PAD - INSTALL[i].cmd.length), "fg85"],
    [INSTALL[i].note, "note"],
  ];
};

const ROWS: Row[] = [
  { at: 0, prompt: true, segs: line(0), type: { from: INSTALL_BEATS.first, cps: INSTALL_BEATS.cps }, testId: "cp1" },
  { at: INSTALL_BEATS.second, prompt: true, segs: line(1), type: { from: INSTALL_BEATS.second, cps: INSTALL_BEATS.cps }, testId: "cp2" },
  { at: INSTALL_BEATS.prompt, prompt: true, segs: [] },
];

export const InstallScene: React.FC = () => {
  const t = useTime();
  return (
    <Window title="docs2skill">
      <Screen t={t} rows={ROWS} />
    </Window>
  );
};
