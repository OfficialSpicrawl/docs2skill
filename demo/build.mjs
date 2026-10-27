// Bundles the React island (island/main.jsx) into public/island.js, which Workers static assets serve at /island.js.
// wrangler runs this before `dev` and `deploy` (build.command in wrangler.jsonc); public/island.js is gitignored.
import { build } from "esbuild";

await build({
  entryPoints: ["island/main.jsx"],
  outfile: "public/island.js",
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "info",
});
