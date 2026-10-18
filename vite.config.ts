import { resolve } from 'node:path'
import { defineConfig } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

const config = defineConfig(({ mode }) => ({
  resolve: {
    tsconfigPaths: true,
    // The pre-rendered Ant stylesheet for this mode; scripts/gen-antd-css.tsx explains the two files.
    alias: [{
      find: /^#antd-css(\?.*)?$/,
      replacement: `${resolve(import.meta.dirname, 'src/generated', mode === 'production' ? 'antd.css' : 'antd.dev.css')}$1`,
    }],
  },
  // The pre-rendered Ant stylesheet contains a rule lightningcss rejects; esbuild minifies it as browsers parse it.
  build: { cssMinify: 'esbuild' },
  plugins: [
    nitro({ compressPublicAssets: { gzip: true, brotli: true } }),

    tanstackStart(),
    viteReact(),
  ],
}))

export default config
