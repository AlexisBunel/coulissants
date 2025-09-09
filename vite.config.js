import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import VueDevTools from "vite-plugin-vue-devtools";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), VueDevTools()],
  resolve: {
    alias: {
      // force tous les imports "three" vers une seule copie
      three: path.resolve(__dirname, "node_modules/three"),
    },
    dedupe: ["three"],
  },
  optimizeDeps: {
    // Ne prébundle pas three. Pas de glob ici !
    exclude: [
      "three",
      "three/examples/jsm/exporters/GLTFExporter.js",
      "three/examples/jsm/exporters/USDZExporter.js",
      "three/examples/jsm/controls/OrbitControls.js",
      "three/examples/jsm/loaders/GLTFLoader.js",
    ],
  },
  server: {
    // coupe le HMR en tunnel --live (évite les messages websocket)
    hmr: process.env.NETLIFY_LIVE_URL ? false : undefined,
  },
});
