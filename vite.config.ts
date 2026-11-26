import { execSync } from "node:child_process";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

const git = (args: string): string | null => {
  try {
    return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

// `virtual:build-info` — version + commit for the console banner and the dev
// badge. A virtual module rather than `define`: define values never reach
// modules the dev server serves into Home Assistant (Vite only provides them
// via /@vite/env, which the HA page never imports). On the dev server the
// module is re-read on each page load, so a new commit shows after a refresh.
const buildInfo = (): Plugin => {
  const id = "virtual:build-info";
  const resolved = `\0${id}`;
  let dev = false;
  return {
    name: "build-info",
    configResolved(config) {
      dev = config.command === "serve";
    },
    resolveId(source) {
      return source === id ? resolved : undefined;
    },
    load(source) {
      if (source !== resolved) return undefined;
      const info = {
        version: pkg.version as string,
        commit: git("rev-parse --short HEAD") ?? "unknown",
        dirty: (git("status --porcelain --untracked-files=no") ?? "") !== "",
        dev,
      };
      return `export default ${JSON.stringify(info)};`;
    },
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        // A dashboard refresh re-imports src/main.ts — drop the cached
        // build info so it reflects the current commit / dirty state.
        if (req.url?.startsWith("/src/main.ts")) {
          const mod = server.moduleGraph.getModuleById(resolved);
          if (mod) server.moduleGraph.invalidateModule(mod);
        }
        next();
      });
    },
  };
};

// The design mocks under docs/ carry template syntax ({{ … }}) in style
// attributes that vite's dev html transform feeds to postcss, which errors.
// Serve them verbatim — they are static pages, nothing needs transforming.
const rawDocsMocks = (): Plugin => ({
  name: "raw-docs-mocks",
  apply: "serve",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = decodeURIComponent((req.url ?? "").split("?")[0]);
      if (!url.startsWith("/docs/") || !url.endsWith(".html") || url.includes("..")) {
        return next();
      }
      const file = normalize(join(server.config.root, url));
      if (!existsSync(file)) return next();
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      createReadStream(file).pipe(res);
    });
  },
});

export default defineConfig({
  plugins: [rawDocsMocks(), buildInfo()],
  build: {
    target: "es2021",
    outDir: "generated/dist",
    emptyOutDir: true,
    lib: {
      // entry.ts picks the dev server (if this browser opted in and it is
      // running) or the bundled main.ts — see its header.
      entry: "src/entry.ts",
      formats: ["es"],
      fileName: () => "hass-custom.js",
    },
    rollupOptions: {
      // Keep main.ts in the one file HACS serves instead of a split chunk.
      output: { inlineDynamicImports: true },
    },
  },
  server: {
    // Dev loop: browsers with the dev switch set load src/main.ts from here
    // instead of the release bundle — see src/entry.ts and DEVELOPMENT.md.
    host: true,
    port: 5173,
    cors: true,
  },
});
