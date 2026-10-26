// Fails when a page or component sets spacing, text style or colour without src/infui (charter/ui.md):
// margins, paddings and gaps come from `space`; every text takes one `text` style (family, size, line
// height, weight, colour); colours come from the theme. Part of the mechanical defence: `pnpm check:infui`.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['src/routes', 'src/components']
const SKIP = new Set(['src/routeTree.gen.ts'])

const RULES: { pattern: RegExp; message: string; unless?: RegExp }[] = [
  { pattern: /token\.(margin|padding|size)[A-Za-z]*/, message: 'spacing from Ant tokens; use space.* from src/infui/tokens' },
  { pattern: /\bgap="(small|middle|large)"/, message: 'named Flex gap; use gap={space.*}' },
  { pattern: /\b(margin|padding|gap|rowGap|columnGap|top|bottom|left|right|inset)[A-Za-z]*\s*:\s*['"`]?-?(?:[1-9]|0\.\d)/, message: 'spacing literal; use space.*' },
  { pattern: /\b(gap|gutter|size)=\{\s*\[?\s*-?[1-9]/, message: 'spacing literal; use space.*' },
  { pattern: /\b(lineHeight|fontSize|fontWeight|fontFamily|letterSpacing|textTransform)\s*[:=]/, message: 'text style outside a text token; use style={text.*} from src/infui/tokens', unless: /\b(text|mark)\.[a-z0-9]+|lineHeightSingle/ },
  { pattern: /token\.(lineHeight|fontSize|fontWeight|fontFamily)[A-Za-z0-9]*/, message: 'text style from Ant tokens; use text.* from src/infui/tokens' },
  { pattern: /\btype="secondary"/, message: 'secondary text; use style={text.caption} (or text.body for a description)' },
  { pattern: /<Typography\.\w+[^>]*\sstrong\b/, message: 'strong text; use style={text.label}' },
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
  const source = readFileSync(file, 'utf8')
  // A title's size and weight come from its text style, not from its heading level.
  for (const match of source.matchAll(/<Typography\.Title\b[^>]*>/g)) {
    if (!/\btext\.(display|heading[123])\b/.test(match[0])) {
      const line = source.slice(0, match.index).split('\n').length
      problems.push(`${relative('.', file)}:${line}: title without a heading text style; add text.heading* or text.display\n    ${match[0].replace(/\s+/g, ' ')}`)
    }
  }
  source.split('\n').forEach((line, index) => {
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
console.log('check:infui: every spacing, text style and colour comes from src/infui')
