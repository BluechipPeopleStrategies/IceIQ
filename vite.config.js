import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { reviewServerPlugin } from './tools/review-server-plugin.mjs'
import { seedEditorPlugin } from './tools/seed-editor-plugin.mjs'
import { practiceJudgePlugin } from './tools/practice-judge-plugin.mjs'
import { practiceReviewAssetsPlugin } from './tools/practice-review-assets.mjs'

export default defineConfig({
  plugins: [react(), reviewServerPlugin(), seedEditorPlugin(), practiceJudgePlugin(), practiceReviewAssetsPlugin()],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: { passes: 2, drop_console: true },
    },
    rollupOptions: {
      output: {
        // Without this, Rollup hoists a shared runtime helper (needed by
        // every dynamic import() in the app) into whichever manual chunk it
        // happens to land in first -- which pulled the huge lazy-only
        // vendor-three chunk into the eager main-entry import graph and got
        // it modulepreloaded on every page load. Off = chunks reached only
        // via dynamic import stay lazy, as they should.
        hoistTransitiveImports: false,
        // Pull big third-party libs into their own chunks so the main
        // app bundle drops below the 500 KB warning threshold and
        // first-load gets parallel downloads.
        manualChunks(id) {
          // Vite's own dynamic-import preload-helper virtual module is
          // shared by every lazy route in the app. Left unassigned, Rollup
          // was inlining the ONE canonical copy of it into whichever manual
          // chunk it built first (vendor-three), which made every other
          // lazy chunk that also uses dynamic import() -- i.e. most routes
          // -- statically depend on vendor-three, and that shared-dependency
          // status is what made Vite modulepreload it from index.html. Its
          // own tiny standalone chunk keeps it out of vendor-three entirely.
          if (id.includes('vite/preload-helper')) return 'vite-preload-helper';
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('react-dom')) return 'vendor-react-dom';
          if (id.includes('/react/') || id.includes('\\react\\') || id.includes('scheduler')) return 'vendor-react';
          // Three/R3F/Drei are only reachable through the dev-only 3D scenario
          // route's dynamic import — keep them out of the shared `vendor`
          // chunk so the normal app never modulepreloads them on first load.
          if (id.includes('@react-three') || id.includes('/three/') || id.includes('\\three\\') || id.includes('three-mesh-bvh') || id.includes('three-stdlib')) return 'vendor-three';
          return 'vendor';
        },
      },
    },
  },
})
