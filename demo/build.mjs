// Bundles the React island (island/main.jsx) into public/island.<hash>.js, which Workers static assets serve with an
// immutable cache header (public/_headers), and writes the file's name to src/island-url.mjs for the page to load.
// wrangler runs this before `dev` and `deploy` (build.command in wrangler.jsonc) and `npm test` runs it first (pretest);
// both outputs are generated and gitignored.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const here = (path) => fileURLToPath(new URL(path, import.meta.url));

const { outputFiles } = await build({
  entryPoints: [here("island/main.jsx")],
  outfile: here("public/island.js"),
  write: false,
  bundle: true,
  minify: true,
  format: "esm",
  target: "es2020",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  legalComments: "none",
  logLevel: "info",
});

const code = outputFiles[0].contents;
const name = `island.${createHash("sha256").update(code).digest("hex").slice(0, 10)}.js`;
// Writes only what changed: `wrangler dev` watches src/, and a rewrite of island-url.mjs would start the build again.
const write = (path, content) => {
  if (existsSync(path) && Buffer.compare(readFileSync(path), Buffer.from(content)) === 0) return;
  writeFileSync(path, content);
};
for (const file of readdirSync(here("public"))) if (/^island(\..+)?\.js$/.test(file) && file !== name) rmSync(here(`public/${file}`));
write(here(`public/${name}`), code);
write(here("src/island-url.mjs"), `// Written by build.mjs, not committed: the island's content-hashed file name.\nexport const ISLAND_URL = "/${name}";\n`);
console.log(`  public/${name}  ${(code.length / 1024).toFixed(1)}kb`);
