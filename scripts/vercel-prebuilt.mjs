import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

/**
 * Vercel discovers the repo's Dockerfile (used by Railway) as a container
 * service, which makes its normal build path ambiguous. We only need the
 * static web app, so we build it locally and deploy it through the Build
 * Output API instead.
 *
 * Usage: pnpm deploy:vercel
 */
const root = resolve(import.meta.dirname, "..");
const out = resolve(root, ".vercel/output");
const staticDir = resolve(out, "static");

await rm(out, { recursive: true, force: true });
await mkdir(staticDir, { recursive: true });
await cp(resolve(root, "packages/web/dist"), staticDir, { recursive: true });

await writeFile(
  resolve(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [{ handle: "filesystem" }, { src: "/.*", dest: "/index.html" }],
    },
    null,
    2
  ) + "\n"
);

const result = spawnSync("vercel", ["deploy", "--prebuilt", "--prod", "--yes"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

process.exit(result.status ?? 1);
