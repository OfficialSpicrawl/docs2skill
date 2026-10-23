import React from "react";
import { C, FONT, LH, MONO, PAD_X, PAD_Y, TITLE_H, WIN, BODY_H } from "./tokens";

export type Tone = "fg" | "fg85" | "muted" | "keyword" | "string" | "number" | "flag" | "comment" | "note";
export type Seg = readonly [text: string, tone: Tone];

export const TONE: Record<Tone, string> = {
  fg: C.fg,
  fg85: C.fg85,
  muted: C.muted,
  keyword: C.keyword,
  string: C.string,
  number: C.number,
  flag: C.flag,
  comment: C.comment,
  note: C.comment, // a shell comment: the comment tone, in italics (the product's highlighter does the same)
};

/**
 * The product's terminal card (webora-ui HeroTerminal / CodePanel `TerminalFrame`) at 2x: 1px border, card
 * ground, a title bar tinted by the page ground with only a mono title (no traffic lights), radius 10.
 */
export const Window: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div
    data-target="window"
    style={{
      position: "absolute",
      left: WIN.x,
      top: WIN.y,
      width: WIN.w,
      height: WIN.h,
      boxSizing: "border-box",
      overflow: "hidden",
      borderRadius: 10,
      border: `1px solid ${C.border}`,
      background: C.card,
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
    }}
  >
    <div
      style={{
        height: TITLE_H,
        boxSizing: "border-box",
        display: "flex",
        alignItems: "center",
        padding: "0 32px",
        background: C.titlebar,
        borderBottom: `1px solid ${C.titlebarLine}`,
        fontFamily: MONO,
        fontSize: 22,
        letterSpacing: "0.02em",
        color: C.muted,
      }}
    >
      {title}
    </div>
    <div style={{ position: "relative", height: BODY_H, overflow: "hidden", fontFamily: MONO, fontSize: FONT, lineHeight: `${LH}px` }}>
      {children}
    </div>
  </div>
);

/** First n characters of a segment list. */
export function take(segs: readonly Seg[], n: number): Seg[] {
  const out: Seg[] = [];
  for (const [text, tone] of segs) {
    if (n <= 0) break;
    out.push([text.slice(0, n), tone]);
    n -= text.length;
  }
  return out;
}

export const length = (segs: readonly Seg[]) => segs.reduce((n, [text]) => n + text.length, 0);

export const Spans: React.FC<{ segs: readonly Seg[] }> = ({ segs }) => (
  <>
    {segs.map(([text, tone], i) => (
      <span key={i} style={{ color: TONE[tone], fontStyle: tone === "note" ? "italic" : undefined }}>
        {text}
      </span>
    ))}
  </>
);

/** A block cursor: solid while typing, blinking at rest (frame-driven: a pure function of t). */
export const Cursor: React.FC<{ t: number; typing: boolean }> = ({ t, typing }) => {
  const on = typing || Math.floor(t / 0.53) % 2 === 0;
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 30,
        marginLeft: 1,
        verticalAlign: -7,
        background: C.fg,
        opacity: on ? 1 : 0,
      }}
    />
  );
};

export type Row = {
  at: number; // seconds: the row appears
  segs: readonly Seg[]; // the text (typed when `type` is set)
  prompt?: boolean; // starts with the "$ " prompt; the cursor sits at the end of the last visible prompt row
  type?: { from: number; cps: number };
  testId?: string;
};

/** A screen of rows: each shows from its `at`; typed rows reveal one character per 1/cps seconds. */
export const Screen: React.FC<{ t: number; rows: readonly Row[]; cursorUntil?: number }> = ({ t, rows, cursorUntil = Infinity }) => {
  const visible = rows.filter((r) => t >= r.at);
  const last = visible[visible.length - 1];
  return (
    <div style={{ padding: `${PAD_Y}px ${PAD_X}px` }}>
      {visible.map((r, i) => {
        const total = length(r.segs);
        const shown = r.type ? Math.max(0, Math.min(total, Math.floor((t - r.type.from) * r.type.cps))) : total;
        const typing = !!r.type && shown < total && t >= r.type.from;
        const withCursor = r === last && r.prompt && t < cursorUntil;
        return (
          <div key={i} style={{ height: LH, whiteSpace: "pre", fontFeatureSettings: '"liga" 0, "calt" 0' }}>
            <span data-target={r.testId}>
              {r.prompt ? <span style={{ color: C.fg }}>{"$ "}</span> : null}
              <Spans segs={take(r.segs, shown)} />
            </span>
            {withCursor ? <Cursor t={t} typing={typing} /> : null}
          </div>
        );
      })}
    </div>
  );
};
