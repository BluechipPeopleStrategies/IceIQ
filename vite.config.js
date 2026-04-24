import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: true },
    },
    rollupOptions: {
      output: {
        // Pull big third-party libs into their own chunks so the main
        // app bundle drops below the 500 KB warning threshold and
        // first-load gets parallel downloads.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) return 'vendor-react';
          return 'vendor';
        },
      },
    },
  },
})
