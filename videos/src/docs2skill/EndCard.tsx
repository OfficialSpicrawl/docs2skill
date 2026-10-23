import React from "react";
import { Img, staticFile } from "remotion";
import { progress, useTime } from "../kit/time";
import { END } from "./cues";
import { C, MONO, SANS } from "./tokens";

/** The product's spicrawlFadeUp (opacity + a short rise, ease-out), driven by t. */
const rise = (t: number, start: number) => {
  const p = progress(t, start, END.rise);
  const e = 1 - (1 - p) ** 3;
  return { opacity: e, transform: `translateY(${(1 - e) * 12}px)` } as const;
};

const line: React.CSSProperties = { position: "absolute", left: 0, right: 0, textAlign: "center", whiteSpace: "nowrap" };

export const EndCard: React.FC = () => {
  const t = useTime();
  return (
    <>
      <div style={{ ...line, top: 266, height: 176, ...rise(t, END.mark) }}>
        <Img data-target="mark" src={staticFile("brand/spicrawl-mark-ground.svg")} style={{ height: 176, width: "auto" }} />
      </div>
      <div
        data-target="name"
        style={{ ...line, top: 470, fontFamily: SANS, fontWeight: 700, fontSize: 132, lineHeight: "150px", letterSpacing: "-0.03em", color: C.fg, ...rise(t, END.name) }}
      >
        docs2skill
      </div>
      <div data-target="github" style={{ ...line, top: 668, fontFamily: MONO, fontWeight: 500, fontSize: 42, lineHeight: "56px", color: C.fg, ...rise(t, END.github) }}>
        github.com/OfficialSpicrawl/docs2skill
      </div>
      <div data-target="site" style={{ ...line, top: 738, fontFamily: MONO, fontWeight: 500, fontSize: 42, lineHeight: "56px", color: C.muted, ...rise(t, END.site) }}>
        docs2skill.spicrawl.com
      </div>
    </>
  );
};
