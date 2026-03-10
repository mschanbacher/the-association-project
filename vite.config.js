import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Inline all assets into a single HTML file
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
    rollupOptions: {
      input: 'index.html',
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
