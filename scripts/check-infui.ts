// Fails when a page or component sets spacing, type or colour without src/infui (charter/ui.md):
// margins, paddings and gaps come from `space`, font size and line height from `type`, colours from the
// theme. Run as part of the mechanical defence: `pnpm check:infui`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['src/routes', 'src/components']
const SKIP = new Set(['src/routeTree.gen.ts'])

const RULES: { pattern: RegExp; message: string; unless?: RegExp }[] = [
  { pattern: /token\.(margin|padding|size)[A-Za-z]*/, message: 'spacing from Ant tokens; use space.* from src/infui/tokens' },
  { pattern: /\bgap="(small|middle|large)"/, message: 'named Flex gap; use gap={space.*}' },
  { pattern: /\b(margin|padding|gap|rowGap|columnGap|top|bottom|left|right|inset)[A-Za-z]*\s*:\s*['"`]?-?(?:[1-9]|0\.\d)/, message: 'spacing literal; use space.*' },
  { pattern: /\b(gap|gutter|size)=\{\s*\[?\s*-?[1-9]/, message: 'spacing literal; use space.*' },
  { pattern: /\blineHeight\s*:/, message: 'line height outside a type pair; spread type.* from src/infui/tokens', unless: /type\.[a-z0-9]+\.lineHeight|lineHeightSingle/ },
  { pattern: /\bfontSize\s*[:=]/, message: 'font size outside a type pair; use type.* from src/infui/tokens', unless: /type\.[a-z0-9]+\.fontSize|mark\.(fontSize|iconSize)/ },
  { pattern: /token\.(lineHeight|fontSize)[A-Za-z0-9]*/, message: 'type from Ant tokens; use type.* from src/infui/tokens' },
  { pattern: /#[0-9a-fA-F]{3,8}\b|\brgba?\(/, message: 'colour literal; use a theme token' },
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.(tsx?|css)$/.test(name) && !SKIP.has(path) ? [path] : []
  })
}

const problems: string[] = []
for (const file of ROOTS.flatMap(files)) {
  readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, '')
    for (const rule of RULES) {
      if (rule.pattern.test(code) && !(rule.unless && rule.unless.test(code))) {
        problems.push(`${relative('.', file)}:${index + 1}: ${rule.message}\n    ${line.trim()}`)
      }
    }
  })
}

if (problems.length) {
  console.error(problems.join('\n'))
  console.error(`\n${problems.length} value(s) bypass src/infui.`)
  process.exit(1)
}
console.log('check:infui: every spacing, type and colour value comes from src/infui')
