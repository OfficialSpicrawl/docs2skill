import { spawnSync } from "node:child_process";
import { SCENES, TOTAL } from "../src/docs2skill/cues";

/**
 * Narration track: the four Kokoro clips placed at their measured cue times (cues.ts), loudnormed to -16 LUFS
 * (one measuring pass, then a linear pass with the measured values), padded to the film's length. No music.
 *
 *   bun scripts/mix.ts   ->  public/audio/docs2skill/narration.wav (48 kHz mono)
 */
const dir = "public/audio/docs2skill";
const inputs = SCENES.flatMap((_, i) => ["-i", `${dir}/c${i + 1}.wav`]);
const delays = SCENES.map((s, i) => `[${i}]aresample=48000,adelay=${Math.round(s.clipStart * 1000)}:all=1[a${i}]`).join(";");
const mixed = `${delays};${SCENES.map((_, i) => `[a${i}]`).join("")}amix=inputs=${SCENES.length}:normalize=0:duration=longest,apad=whole_dur=${TOTAL},atrim=0:${TOTAL}`;
const TARGET = "I=-16:TP=-1.5:LRA=7";

const ffmpeg = (filter: string, tail: string[]) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-y", ...inputs, "-filter_complex", filter, ...tail], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stderr;
};

const log = ffmpeg(`${mixed},loudnorm=${TARGET}:print_format=json[o]`, ["-map", "[o]", "-f", "null", "-"]);
const m = JSON.parse(log.slice(log.lastIndexOf("{"), log.lastIndexOf("}") + 1));
const measured = `measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
ffmpeg(`${mixed},loudnorm=${TARGET}:${measured}[o]`, ["-map", "[o]", "-ar", "48000", "-ac", "1", `${dir}/narration.wav`]);
console.log(`narration.wav: ${TOTAL.toFixed(2)} s, input ${m.input_i} LUFS -> -16 LUFS target`);
