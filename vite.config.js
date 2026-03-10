import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: resolve(__dirname, 'src'),
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    // Inline all assets into a single HTML file
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Single chunk
        manualChunks: undefined,
        inlineDynamicImports: true,
      }
    },
    // Don't minify during development for easier debugging
    minify: false,
  },
  // Dev server config
  server: {
    open: true,
    port: 3000
  }
});
