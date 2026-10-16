import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // The pre-rendered Ant stylesheet contains a rule lightningcss rejects; esbuild minifies it as browsers parse it.
  build: { cssMinify: 'esbuild' },
  plugins: [
    nitro({ compressPublicAssets: { gzip: true, brotli: true } }),

    tanstackStart(),
    viteReact(),
  ],
})

export default config
