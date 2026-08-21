import { createReadStream, existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import { defineConfig, type Plugin } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

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
  plugins: [rawDocsMocks()],
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: "es2021",
    outDir: "generated/dist",
    emptyOutDir: true,
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "hass-custom.js",
    },
  },
  server: {
    // Dev loop: add http://<this-machine>:5173/src/main.ts as a temporary
    // "JavaScript Module" dashboard resource in Home Assistant.
    host: true,
    port: 5173,
    cors: true,
  },
});
