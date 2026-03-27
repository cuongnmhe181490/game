import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1400
  },
  define: {
    CANVAS_RENDERER: 'true',
    WEBGL_RENDERER: 'true'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  }
});
