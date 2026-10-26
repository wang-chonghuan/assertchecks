// Pre-renders the complete Ant stylesheet so server-rendered HTML is styled before hydration.
// Ant prefixes its class hashes differently in development (css-dev-only-do-not-override-…) and in
// production (css-…), so each mode gets its own file; a build never overwrites the stylesheet a
// running dev server uses. vite.config.ts picks the file for its mode.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractStyle } from '@ant-design/static-style-extract'
import { ConfigProvider } from 'antd'
import { theme } from '../src/infui/theme'

const file = process.env.NODE_ENV === 'production' ? 'antd.css' : 'antd.dev.css'
const output = resolve(import.meta.dirname, '../src/generated', file)
mkdirSync(resolve(output, '..'), { recursive: true })
writeFileSync(output, extractStyle((node) => <ConfigProvider theme={theme}>{node}</ConfigProvider>))
console.log(`wrote ${output}`)
