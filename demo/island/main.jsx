// The effects of an otherwise static page (see ../DESIGN.md): three small React islands (a border beam, a thinking orb,
// a bot). The page's own script owns the demo and writes its state to <html data-run="idle|crawl|write|done|error">
// and fires "d2s:run"; the effects only read it.
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { BorderBeam } from "border-beam";
import { BotAvatar } from "bot-avatars";
import { ThinkingOrb } from "thinking-orbs";

const root = document.documentElement;
const readRun = () => root.dataset.run || "idle";

function useRun() {
  const [run, setRun] = useState(readRun);
  useEffect(() => {
    const sync = () => setRun(readRun());
    document.addEventListener("d2s:run", sync);
    sync();
    return () => document.removeEventListener("d2s:run", sync);
  }, []);
  return run;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

const busy = (run) => run === "crawl" || run === "write";

// A line of light under the URL field while the run is in flight. It sits over the input and never takes a click.
function Beam() {
  const run = useRun();
  const reduced = useReducedMotion();
  return (
    <BorderBeam size="line" colorVariant="mono" theme="dark" strength={1} brightness={1.7} active={busy(run) && !reduced} style={{ display: "block", width: "100%", height: "100%" }}>
      <div style={{ height: "100%", borderRadius: 10 }} />
    </BorderBeam>
  );
}

// Beside the title-bar label: searching while the pages are found and read, composing while the files are written.
function Orb() {
  const run = useRun();
  if (!busy(run)) return null;
  return <ThinkingOrb state={run === "crawl" ? "searching" : "composing"} size={20} theme="dark" />;
}

// The agent that will read the skill, small, at the left of the pane's status line. Working while the demo reads docs,
// idle (looking around) otherwise. The crisp rim is the cheap shading: plastic is shaded per pixel and took scrolling
// from 60 to 34 fps in a software-rendered browser even at 36 px, and to 12 on a 4x throttled phone. Phones also hold
// the pose until a run starts: a loop of canvas frames under a scrolling thumb cost more than the rest of the page.
const small = matchMedia("(max-width: 820px), (pointer: coarse)").matches;
function Bot() {
  const run = useRun();
  const label = busy(run) ? "Agent reading docs" : run === "done" ? "Agent with the new skill" : "Agent, idle";
  return <BotAvatar type="droid" color="#E4E5E7" shading="crisp" size={36} paused={small && !busy(run)} state={busy(run) ? "working" : "default"} aria-label={label} />;
}

const mount = (id, node) => {
  const el = document.getElementById(id);
  if (el) createRoot(el).render(node);
};
mount("slot-beam", <Beam />);
mount("slot-orb", <Orb />);
mount("slot-bot", <Bot />);
