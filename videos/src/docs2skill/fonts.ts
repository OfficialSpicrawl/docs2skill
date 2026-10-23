import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Local files copied from webora-ui/landing/node_modules (@fontsource-variable). loadFont holds the render until they are ready.
loadFont({ family: "Inter", url: staticFile("fonts/inter-latin-wght-normal.woff2"), weight: "100 900" });
loadFont({ family: "JetBrains Mono", url: staticFile("fonts/jetbrains-mono-latin-wght-normal.woff2"), weight: "100 800" });
