import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// Temporarily disabled to check CSP issue
// import { viteSourceLocator } from "@metagptx/vite-plugin-source-locator";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    // Temporarily disabled - this plugin might be setting strict CSP
    // viteSourceLocator({
    //   prefix: "mgx",
    // }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    sourcemap: mode === 'development' ? 'inline' : false,
  },
  esbuild: {
    legalComments: 'none',
  },
  // Remove CSP headers completely for dev
  server: {
    headers: {}
  }
}));
