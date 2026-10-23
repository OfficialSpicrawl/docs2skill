import React from "react";
import { Composition } from "remotion";
import { FPS, TOTAL_FRAMES } from "./docs2skill/cues";
import { Film } from "./docs2skill/Film";

export const Root: React.FC = () => (
  <Composition id="Docs2Skill" component={Film} width={1920} height={1080} fps={FPS} durationInFrames={TOTAL_FRAMES} defaultProps={{ debug: false }} />
);
