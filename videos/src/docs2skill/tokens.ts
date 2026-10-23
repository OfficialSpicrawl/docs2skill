/** Spicrawl's own theme (webora-ui/landing globals.css `.spicrawl-theme`), as hex. Hex only: anything may animate. */
export const C = {
  ground: "#16181B",
  card: "#1E2124",
  elevated: "#26292D",
  border: "#2E3135",
  fg: "#F9F9F9",
  fg85: "#D8D9DA", // foreground at 85% over the card (the product's terminal body text)
  muted: "#A9ADB2",
  // Code reads as steps of luminance, not hue: keywords brightest, then strings, numbers, flags, comments.
  keyword: "#FAFAFA",
  string: "#D4D6D9",
  number: "#AEB1B5",
  flag: "#93969B",
  comment: "#85888D",
  titlebar: "#1B1D20", // background/40 over the card
  titlebarLine: "#292B2F", // border/70 over the title bar
  guide: "#4B4F54", // tree guide lines
} as const;

export const SANS = "Inter, sans-serif";
export const MONO = "'JetBrains Mono', monospace";

/** The terminal window, in 1920x1080 pixels. The product's terminal scaled about 2x (12.5 px text -> 25 px). */
export const WIN = { x: 100, y: 200, w: 1720, h: 780 } as const;
export const TITLE_H = 64;
export const PAD_X = 40;
export const PAD_Y = 34;
export const FONT = 25; // JetBrains Mono advance is 0.6 em, so one column is exactly 15 px
export const COL = FONT * 0.6;
export const LH = 38; // integer, so tree guide lines join from row to row
export const BODY_H = WIN.h - TITLE_H - 2;
export const BODY_ROWS = Math.floor((BODY_H - PAD_Y * 2) / LH);
