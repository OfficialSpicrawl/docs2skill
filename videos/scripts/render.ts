import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Final render for a 30 fps film (the brief fixes 30 fps and nothing in it moves fast enough to need the
 * 240 fps motion-blur master of the full skill pipeline).
 *
 *   bun scripts/render.ts <version>        e.g. bun scripts/render.ts v1
 *
 * 1. Remotion renders every frame as an exact sRGB PNG (--sequence). Encoding from the PNGs, not from a
 *    Remotion MP4 master, converts colour once: no limited-range / BT.601 detour (the range trap).
 * 2. ffmpeg: RGB -> BT.709 limited range, yuv420p tagged BT.709, H.264 CRF 16, narration muxed as AAC 192k.
 * 3. The README GIF (960 px wide, 15 fps, silent, loops) comes from the final MP4 through a palette pass.
 * 4. The poster and the review stills are copied from the exact PNGs before they are deleted.
 */
const version = process.argv[2];
if (!version) throw new Error("Usage: bun scripts/render.ts <version>");

const root = resolve(import.meta.dirname, "..");
const out = join(root, "out", "docs2skill", version);
mkdirSync(out, { recursive: true });
const run = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: root, stdio: "inherit" });

const frames = join(out, "frames-tmp");
const mp4 = join(out, "docs2skill.mp4");
const gif = join(out, "docs2skill.gif");

run("npx", ["remotion", "render", "src/index.ts", "Docs2Skill", frames, "--sequence", "--image-format", "png", "--concurrency", "4", "--log", "error"]);

const digits = readdirSync(frames).find((f) => /^element-\d+\.png$/.test(f))!.match(/\d+/)![0].length;
run("ffmpeg", [
  "-v", "error", "-y", "-framerate", "30", "-i", join(frames, `element-%0${digits}d.png`), "-i", join(root, "public/audio/docs2skill/narration.wav"),
  "-vf", "format=rgb24,scale=out_range=tv:out_color_matrix=bt709:flags=accurate_rnd+full_chroma_int,format=yuv420p",
  "-map", "0:v", "-map", "1:a",
  "-c:v", "libx264", "-preset", "slow", "-crf", "16",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-movflags", "+faststart", mp4,
]);

run("ffmpeg", [
  "-v", "error", "-y", "-i", mp4,
  "-vf", "fps=15,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
  "-loop", "0", gif,
]);

// Poster = the payoff (SKILL.md's Reference list, caption 2 still on screen). Stills = one frame per beat.
const pad = (n: number) => String(n).padStart(digits, "0");
const STILLS: Record<string, number> = {
  "01-prompt": 0, "02-typing": 45, "03-run-output": 147, "04-tree": 200, "05-skill-frontmatter": 255,
  "06-skill-reference": 300, "07-install-typing": 360, "08-install-done": 430, "09-end-card": 500, "10-last-frame": 572,
};
mkdirSync(join(out, "stills"), { recursive: true });
for (const [name, n] of Object.entries(STILLS)) copyFileSync(join(frames, `element-${pad(n)}.png`), join(out, "stills", `${name}-f${n}.png`));
copyFileSync(join(frames, `element-${pad(300)}.png`), join(out, "poster.png"));

rmSync(frames, { recursive: true });
for (const f of [mp4, gif, join(out, "poster.png")]) console.log(`${f}: ${(statSync(f).size / 1e6).toFixed(2)} MB`);
