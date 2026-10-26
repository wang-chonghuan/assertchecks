import { theme } from 'antd'

// The homepage "How it works" diagram: one run from the project's repository to its results page.
// Drawn twice, wide and tall, because a wide diagram scaled down to a phone makes its text unreadable;
// the stylesheet shows one or the other at antd's md breakpoint.

interface Node { key: string; title: string; lines: string[]; accent?: boolean }
interface Box { x: number; y: number; w: number; h: number }
interface Edge { from: Box; to: Box; label: string; detail: string; offset?: number }

const NODES: Node[] = [
  { key: 'repo', title: 'Your repository', lines: ['e2e.json catalog', 'Playwright tests'] },
  { key: 'ci', title: 'Your CI runner', lines: ['Runs the tests', 'where they always run'] },
  { key: 'ac', title: 'AssertChecks', lines: ['On time?', 'Complete?', 'Correct?'], accent: true },
  { key: 'team', title: 'Your team', lines: ['Results by environment', 'failed case and Then'] },
]

export function HowItWorks() {
  return (
    <>
      <div className="diagram-wide"><Diagram layout="wide" /></div>
      <div className="diagram-tall"><Diagram layout="tall" /></div>
    </>
  )
}

// Inner padding of a box, in diagram units.
const PAD = 16

function Diagram({ layout }: { layout: 'wide' | 'tall' }) {
  const { token } = theme.useToken()
  const wide = layout === 'wide'
  // Text is set on the theme's line-height scale: titles on the large line, the rest on the body line.
  const titleLine = Math.round(token.fontSizeLG * token.lineHeightLG)
  const textLine = Math.round(token.fontSize * token.lineHeight)
  const heightOf = (node: Node) => PAD * 2 + titleLine + node.lines.length * textLine
  const [repo, ci, ac, team] = NODES.map(heightOf)
  // Wide: four columns centred on one line. Tall: four rows, with room between them for the labels.
  const middle = 100
  const boxes: Record<string, Box> = wide
    ? {
        repo: { x: 10, y: middle - repo / 2, w: 220, h: repo },
        ci: { x: 350, y: middle - ci / 2, w: 220, h: ci },
        ac: { x: 740, y: middle - ac / 2, w: 230, h: ac },
        team: { x: 1090, y: middle - team / 2, w: 220, h: team },
      }
    : (() => {
        const repoBox = { x: 20, y: 10, w: 320, h: repo }
        const ciBox = { x: 20, y: repoBox.y + repo + 90, w: 320, h: ci }
        const acBox = { x: 20, y: ciBox.y + ci + 110, w: 320, h: ac }
        return { repo: repoBox, ci: ciBox, ac: acBox, team: { x: 20, y: acBox.y + ac + 90, w: 320, h: team } }
      })()
  const edges: Edge[] = [
    { from: boxes.repo, to: boxes.ci, label: 'checks out', detail: '' },
    { from: boxes.ci, to: boxes.ac, label: '① start', detail: 'deployed versions', offset: -1 },
    { from: boxes.ci, to: boxes.ac, label: '② report', detail: 'results + catalog', offset: 1 },
    { from: boxes.ac, to: boxes.team, label: '③ judged run', detail: '' },
  ]
  const width = wide ? 1320 : 360
  const height = wide ? middle + ac / 2 + 10 : boxes.team.y + team + 10
  const marker = `arrow-${layout}`
  const font = { fontFamily: token.fontFamily }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label="Your repository's tests run in your CI runner, which reports the start and the results to AssertChecks; AssertChecks judges whether the run was on time, complete and correct, and your team reads the result."
      style={{ display: 'block', maxWidth: wide ? width : 420, marginInline: 'auto' }}
    >
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={token.colorTextSecondary} />
        </marker>
      </defs>

      {edges.map((edge) => {
        const spread = (edge.offset ?? 0) * 40
        const [x1, y1, x2, y2] = wide
          ? [edge.from.x + edge.from.w, edge.from.y + edge.from.h / 2 + spread, edge.to.x - 4, edge.to.y + edge.to.h / 2 + spread]
          : [edge.from.x + edge.from.w / 2 + spread, edge.from.y + edge.from.h, edge.to.x + edge.to.w / 2 + spread, edge.to.y - 4]
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        // Wide: label above the line. Tall: label beside it, outside the pair when two lines run together,
        // so neither label runs into the other line or past the edge.
        const left = !wide && (edge.offset ?? 0) < 0
        const [lx, ly] = wide ? [midX, midY - (edge.detail ? textLine + 6 : 10)] : [left ? midX - 10 : midX + 10, midY - (edge.detail ? 8 : -5)]
        const anchor = wide ? 'middle' : left ? 'end' : 'start'
        return (
          <g key={`${edge.label}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={token.colorTextSecondary} strokeWidth={1.5} markerEnd={`url(#${marker})`} />
            <text x={lx} y={ly} textAnchor={anchor} fill={token.colorText} fontSize={token.fontSize} fontWeight={token.fontWeightStrong} style={font}>{edge.label}</text>
            {edge.detail && (
              <text x={lx} y={ly + textLine} textAnchor={anchor} fill={token.colorTextSecondary} fontSize={token.fontSizeSM} style={font}>{edge.detail}</text>
            )}
          </g>
        )
      })}

      {NODES.map((node) => {
        const box = boxes[node.key]
        return (
          <g key={node.key}>
            <rect
              x={box.x}
              y={box.y}
              width={box.w}
              height={box.h}
              rx={token.borderRadiusLG}
              fill={node.accent ? token.colorPrimaryBg : token.colorBgContainer}
              stroke={node.accent ? token.colorPrimary : token.colorBorder}
              strokeWidth={node.accent ? 1.5 : 1}
            />
            <text x={box.x + PAD} y={box.y + PAD + titleLine / 2} dominantBaseline="central" fill={node.accent ? token.colorPrimary : token.colorText} fontSize={token.fontSizeLG} fontWeight={token.fontWeightStrong} style={font}>
              {node.title}
            </text>
            {node.lines.map((line, index) => (
              <text key={line} x={box.x + PAD} y={box.y + PAD + titleLine + (index + 0.5) * textLine} dominantBaseline="central" fill={token.colorTextSecondary} fontSize={token.fontSize} style={font}>
                {node.accent ? `✓ ${line}` : line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
