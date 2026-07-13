import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    target: "es2021",
    outDir: "dist",
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
