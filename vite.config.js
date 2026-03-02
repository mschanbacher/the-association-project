import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist',
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
    // Change to true for release builds
    minify: false,
  },
  // Dev server config
  server: {
    open: true,
    port: 3000
  }
});
