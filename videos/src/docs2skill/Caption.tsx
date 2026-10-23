import React from "react";
import { CAPTIONS, SCENES } from "./cues";
import { C, MONO, SANS } from "./tokens";
import { clamp01 } from "../kit/time";

/** Caption text with file names in the mono face; the words are exactly the ones narrated. */
const PARTS: ReadonlyArray<ReadonlyArray<readonly [string, boolean]>> = [
  [[CAPTIONS[0], false]],
  [
    ["SKILL.md", true],
    [", ", false],
    ["llms.txt", true],
    [" and ", false],
    ["AGENTS.md", true],
    [", in seconds.", false],
  ],
  [[CAPTIONS[2], false]],
  [[CAPTIONS[3], false]],
];

const FADE_IN = 0.15;
const FADE_OUT = 0.12;

/** One caption, on screen exactly while its Kokoro clip plays. `t` is film time in seconds. */
export const Captions: React.FC<{ t: number }> = ({ t }) => {
  const i = SCENES.findIndex((s) => t >= s.clipStart && t < s.clipEnd);
  if (i < 0) return null;
  const { clipStart, clipEnd } = SCENES[i];
  const inP = clamp01((t - clipStart) / FADE_IN);
  const outP = clamp01((clipEnd - t) / FADE_OUT);
  const rise = (1 - (1 - inP) ** 3) * 1; // ease-out, like the product's spicrawlFadeUp
  return (
    <div
      data-target="caption"
      style={{
        position: "absolute",
        left: 100,
        right: 100,
        top: 66,
        height: 84,
        lineHeight: "84px",
        textAlign: "center",
        fontFamily: SANS,
        fontWeight: 600,
        fontSize: 64,
        letterSpacing: "-0.015em",
        color: C.fg,
        whiteSpace: "nowrap",
        opacity: Math.min(inP, outP),
        transform: `translateY(${(1 - rise) * 12}px)`,
      }}
    >
      {PARTS[i].map(([text, mono], k) =>
        mono ? (
          <span key={k} style={{ fontFamily: MONO, fontWeight: 500, fontSize: "0.88em", letterSpacing: "-0.02em" }}>
            {text}
          </span>
        ) : (
          <span key={k}>{text}</span>
        ),
      )}
    </div>
  );
};
