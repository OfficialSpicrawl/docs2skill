import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { TargetLog } from "../kit/debug";
import { useTime } from "../kit/time";
import { Captions } from "./Caption";
import { FPS, SCENES } from "./cues";
import { EndCard } from "./EndCard";
import { FilesScene } from "./FilesScene";
import "./fonts";
import { InstallScene } from "./InstallScene";
import { RunScene } from "./RunScene";
import { C } from "./tokens";

const SCENE_COMPONENTS = { run: RunScene, files: FilesScene, install: InstallScene, end: EndCard } as const;

/** Four clean cuts. Inside a Sequence the frame is local to the scene; captions run on film time. */
export const Film: React.FC<{ debug?: boolean }> = ({ debug }) => {
  const t = useTime();
  return (
    <AbsoluteFill style={{ background: C.ground }}>
      {SCENES.map((s) => {
        const Scene = SCENE_COMPONENTS[s.id];
        const from = Math.round(s.start * FPS);
        return (
          <Sequence key={s.id} from={from} durationInFrames={Math.round(s.end * FPS) - from}>
            <Scene />
          </Sequence>
        );
      })}
      <Captions t={t} />
      {debug ? <TargetLog /> : null}
    </AbsoluteFill>
  );
};
