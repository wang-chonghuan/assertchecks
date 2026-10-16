// Pre-renders the complete Ant stylesheet so server-rendered HTML is styled before hydration.
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractStyle } from '@ant-design/static-style-extract'
import { ConfigProvider } from 'antd'
import { theme } from '../src/theme'

const output = resolve(import.meta.dirname, '../src/generated/antd.css')
mkdirSync(resolve(output, '..'), { recursive: true })
writeFileSync(output, extractStyle((node) => <ConfigProvider theme={theme}>{node}</ConfigProvider>))
console.log(`wrote ${output}`)
