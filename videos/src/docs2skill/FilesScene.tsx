import React from "react";
import { useTime, progress } from "../kit/time";
import { FILES } from "./cues";
import { SKILL_MD, TREE, TreeNode } from "./real";
import { BODY_ROWS, C, COL, FONT, LH, MONO, PAD_X, PAD_Y, WIN } from "./tokens";
import { Row, Screen, Seg, Spans, TONE, Tone, Window } from "./Terminal";

// ---------------------------------------------------------------- tree

type Flat = { name: string; dir: boolean; guides: boolean[]; branch: "mid" | "last" | null };

/** `tree` layout: one guide cell per ancestor ("│" while that ancestor has later siblings), then "├── " or "└── ". */
function flatten(node: TreeNode, guides: boolean[] = [], branch: Flat["branch"] = null, out: Flat[] = []) {
  out.push({ name: node.name, dir: !!node.children, guides, branch });
  const kids = node.children ?? [];
  kids.forEach((kid, i) => {
    const last = i === kids.length - 1;
    flatten(kid, branch === null ? [] : [...guides, branch === "mid"], last ? "last" : "mid", out);
  });
  return out;
}
const TREE_ROWS = flatten(TREE);
const BRIGHT = new Set(["AGENTS.md", "llms.txt", "SKILL.md"]); // the three files the caption names
const toneOf = (n: Flat): Tone => (n.name === "out" || BRIGHT.has(n.name) ? "fg" : n.dir || n.name === "llms-full.txt" ? "fg85" : "muted");

const CELL = 4 * COL;
const GUIDE = { x: COL / 2 - 1, w: 2, end: 3.2 * COL };

const TreeLine: React.FC<{ row: Flat }> = ({ row }) => (
  <div style={{ display: "flex", height: LH, whiteSpace: "pre" }}>
    {row.guides.map((more, i) => (
      <div key={i} style={{ position: "relative", width: CELL, height: LH }}>
        {more ? <div style={{ position: "absolute", left: GUIDE.x, top: 0, width: GUIDE.w, height: LH, background: C.guide }} /> : null}
      </div>
    ))}
    {row.branch ? (
      <div style={{ position: "relative", width: CELL, height: LH }}>
        <div style={{ position: "absolute", left: GUIDE.x, top: 0, width: GUIDE.w, height: row.branch === "mid" ? LH : LH / 2, background: C.guide }} />
        <div style={{ position: "absolute", left: GUIDE.x, top: LH / 2 - 1, width: GUIDE.end - GUIDE.x, height: 2, background: C.guide }} />
      </div>
    ) : null}
    <span style={{ color: TONE[toneOf(row)] }}>{row.name}</span>
  </div>
);

const TREE_CMD: Seg[] = [
  ["tree", "keyword"],
  [" --noreport", "flag"],
  [" out", "string"],
];
const CMD_ROW: Row = { at: 0, prompt: true, segs: TREE_CMD, type: { from: FILES.treeCmdFrom, cps: FILES.cps } };

// ---------------------------------------------------------------- SKILL.md

const GUTTER = 5 * COL;
const COLS = Math.floor((WIN.w - 2 - 2 * PAD_X - GUTTER) / COL);

function toneLine(line: string): Seg[] {
  let m: RegExpMatchArray | null;
  if (line === "---") return [[line, "comment"]];
  if ((m = line.match(/^(name:)( .*)$/)) || (m = line.match(/^(description:)( .*)$/))) return [[m[1], "flag"], [m[2], "string"]];
  if (/^#{1,6} /.test(line)) return [[line, "keyword"]];
  if ((m = line.match(/^(- )(\[[^\]]*\])(\([^)]*\))(: )(.*)$/))) {
    return [[m[1], "comment"], [m[2], "keyword"], [m[3], "number"], [m[4], "comment"], [m[5], "muted"]];
  }
  return [[line, "fg85"]];
}

type VRow = { n?: number; segs: Seg[]; line: number };

/** Soft-wrap each logical line at COLS on spaces; bullets continue under their text. */
function layout(text: string): VRow[] {
  const rows: VRow[] = [];
  text.replace(/\n$/, "").split("\n").forEach((line, li) => {
    const chars = toneLine(line).flatMap(([s, tone]) => [...s].map((ch) => ({ ch, tone })));
    const indent = line.startsWith("- ") ? 2 : 0;
    let first = true;
    let rest = chars;
    do {
      const width = COLS - (first ? 0 : indent);
      let cut = rest.length;
      if (rest.length > width) {
        cut = width;
        for (let k = width; k > 0; k--) if (rest[k].ch === " ") { cut = k; break; }
      }
      const piece = rest.slice(0, cut);
      rest = rest.slice(cut);
      if (rest[0]?.ch === " ") rest = rest.slice(1); // the space we broke on
      const segs: Seg[] = [];
      if (!first && indent) segs.push([" ".repeat(indent), "fg85"]);
      for (const { ch, tone } of piece) {
        const prev = segs[segs.length - 1];
        if (prev && prev[1] === tone) segs[segs.length - 1] = [prev[0] + ch, tone];
        else segs.push([ch, tone]);
      }
      rows.push({ n: first ? li + 1 : undefined, segs, line: li });
      first = false;
    } while (rest.length);
  });
  return rows;
}
export const SKILL_ROWS = layout(SKILL_MD);
const rowOfLine = (text: string) => SKILL_ROWS.findIndex((r) => r.segs.map(([s]) => s).join("").startsWith(text));
// Scroll until "### Pages" is the top row: its heading and all seven bullets (two rows each) then fit the window.
export const SCROLL_ROWS = rowOfLine("### Pages");

const ease = (p: number) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2);

const LIT = "rgba(249,249,249,0.07)"; // the product's `lit` row: foreground at 7% with a 2px bar

const SkillFile: React.FC<{ t: number }> = ({ t }) => {
  const scroll = SCROLL_ROWS * LH * ease(progress(t, FILES.scrollFrom, FILES.scrollLen));
  const litFrontmatter = progress(t, FILES.cutToFile + 0.25, 0.2) * (1 - progress(t, FILES.scrollFrom - 0.1, 0.2));
  // The viewport is a whole number of rows, so the scrolled text always starts and ends on a row edge.
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: PAD_Y, height: BODY_ROWS * LH, overflow: "hidden" }}>
      <div style={{ transform: `translateY(${-scroll}px)` }}>
        {SKILL_ROWS.map((r, i) => {
          // name and description: the two fields an agent reads first
          const lit = r.line === 1 || r.line === 2 ? litFrontmatter : 0;
          return (
            <div key={i} style={{ position: "relative", height: LH, whiteSpace: "pre", padding: `0 ${PAD_X}px`, fontFeatureSettings: '"liga" 0, "calt" 0' }}>
              {lit > 0 ? <div style={{ position: "absolute", inset: 0, opacity: lit, background: LIT, boxShadow: `inset 2px 0 0 ${C.fg}` }} /> : null}
              <span style={{ display: "inline-block", width: GUTTER, color: C.comment, position: "relative" }}>
                {r.n !== undefined ? String(r.n).padStart(3, " ") : ""}
              </span>
              <span style={{ position: "relative" }}>
                <Spans segs={r.segs} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FilesScene: React.FC = () => {
  const t = useTime();
  if (t >= FILES.cutToFile) {
    return (
      <Window title="out/spicrawl-docs/SKILL.md">
        <SkillFile t={t} />
      </Window>
    );
  }
  return (
    <Window title="docs2skill">
      <Screen t={t} rows={[CMD_ROW]} cursorUntil={FILES.treeRows} />
      <div style={{ position: "absolute", left: PAD_X, top: PAD_Y + LH, fontFamily: MONO, fontSize: FONT }}>
        {TREE_ROWS.map((row, i) =>
          t >= FILES.treeRows + i * FILES.treeStep ? <TreeLine key={i} row={row} /> : <div key={i} style={{ height: LH }} />,
        )}
      </div>
    </Window>
  );
};
