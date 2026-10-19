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

function Diagram({ layout }: { layout: 'wide' | 'tall' }) {
  const { token } = theme.useToken()
  const wide = layout === 'wide'
  // Wide: four columns. Tall: four rows.
  const boxes: Record<string, Box> = wide
    ? {
        repo: { x: 10, y: 40, w: 220, h: 150 },
        ci: { x: 350, y: 40, w: 220, h: 150 },
        ac: { x: 740, y: 25, w: 230, h: 180 },
        team: { x: 1090, y: 40, w: 220, h: 150 },
      }
    : {
        repo: { x: 20, y: 10, w: 320, h: 124 },
        ci: { x: 20, y: 224, w: 320, h: 124 },
        ac: { x: 20, y: 458, w: 320, h: 160 },
        team: { x: 20, y: 708, w: 320, h: 124 },
      }
  const edges: Edge[] = [
    { from: boxes.repo, to: boxes.ci, label: 'checks out', detail: '' },
    { from: boxes.ci, to: boxes.ac, label: '① start', detail: 'deployed versions', offset: -1 },
    { from: boxes.ci, to: boxes.ac, label: '② report', detail: 'results + catalog', offset: 1 },
    { from: boxes.ac, to: boxes.team, label: '③ judged run', detail: '' },
  ]
  const width = wide ? 1320 : 360
  const height = wide ? 230 : 840
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
        const spread = (edge.offset ?? 0) * (wide ? 40 : 76)
        const [x1, y1, x2, y2] = wide
          ? [edge.from.x + edge.from.w, edge.from.y + edge.from.h / 2 + spread, edge.to.x - 4, edge.to.y + edge.to.h / 2 + spread]
          : [edge.from.x + edge.from.w / 2 + spread, edge.from.y + edge.from.h, edge.to.x + edge.to.w / 2 + spread, edge.to.y - 4]
        const midX = (x1 + x2) / 2
        const midY = (y1 + y2) / 2
        // Wide: label above the line. Tall: label beside it.
        const [lx, ly] = wide ? [midX, midY - (edge.detail ? 26 : 10)] : [midX + 10, midY - (edge.detail ? 8 : -5)]
        const anchor = wide ? 'middle' : 'start'
        return (
          <g key={`${edge.label}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={token.colorTextSecondary} strokeWidth={1.5} markerEnd={`url(#${marker})`} />
            <text x={lx} y={ly} textAnchor={anchor} fill={token.colorText} fontSize={token.fontSize} fontWeight={token.fontWeightStrong} style={font}>{edge.label}</text>
            {edge.detail && (
              <text x={lx} y={ly + 18} textAnchor={anchor} fill={token.colorTextSecondary} fontSize={token.fontSizeSM} style={font}>{edge.detail}</text>
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
              stroke={node.accent ? token.colorPrimary : token.colorBorderSecondary}
              strokeWidth={node.accent ? 1.5 : 1}
            />
            <text x={box.x + 18} y={box.y + 36} fill={node.accent ? token.colorPrimary : token.colorText} fontSize={token.fontSizeLG} fontWeight={token.fontWeightStrong} style={font}>
              {node.title}
            </text>
            {node.lines.map((line, index) => (
              <text key={line} x={box.x + 18} y={box.y + 68 + index * 26} fill={token.colorTextSecondary} fontSize={token.fontSize} style={font}>
                {node.accent ? `✓ ${line}` : line}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}
