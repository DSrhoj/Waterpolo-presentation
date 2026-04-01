interface Props {
  variant: string
  className?: string
}

const W = 80
const H = 50
const BG = 'rgba(255,255,255,0.04)'
const RECT = 'rgba(255,255,255,0.35)'
const ACCENT = 'rgba(255,255,255,0.15)'
const LABEL = 'rgba(255,255,255,0.55)'

function FifaRows() {
  const rowY = [8, 20, 32]
  return (
    <>
      {rowY.map((y, ri) => {
        const dir = ri % 2 === 0 ? 1 : -1
        return (
          <g key={ri}>
            {[0, 1, 2, 3, 4].map((ci) => (
              <rect key={ci} x={6 + ci * 15} y={y} width={11} height={10} rx={1.5} fill={RECT} />
            ))}
            <path
              d={dir > 0 ? `M74 ${y + 5} l-4 0 M72 ${y + 3} l2 2 -2 2` : `M4 ${y + 5} l4 0 M6 ${y + 3} l-2 2 2 2`}
              stroke={LABEL}
              strokeWidth={0.8}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        )
      })}
    </>
  )
}

function TieredRows() {
  return (
    <>
      <text x={4} y={10} fontSize={6} fill={LABEL} fontWeight={600}>P</text>
      {[0, 1, 2].map((i) => (
        <rect key={`p${i}`} x={12 + i * 22} y={3} width={18} height={14} rx={2} fill={RECT} />
      ))}
      <text x={4} y={37} fontSize={6} fill={LABEL} fontWeight={600}>G</text>
      {[0, 1, 2, 3].map((i) => (
        <rect key={`g${i}`} x={12 + i * 17} y={28} width={13} height={11} rx={1.5} fill={ACCENT} />
      ))}
      <line x1={4} y1={23} x2={76} y2={23} stroke={ACCENT} strokeWidth={0.5} />
    </>
  )
}

function MarqueeGrid() {
  const rows = 4
  const cols = 5
  const rw = 10
  const rh = 6
  const gx = 3
  const gy = 3
  const ox = (W - (cols * rw + (cols - 1) * gx)) / 2
  const oy = (H - (rows * rh + (rows - 1) * gy)) / 2
  const rects = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push(
        <rect
          key={`${r}-${c}`}
          x={ox + c * (rw + gx)}
          y={oy + r * (rh + gy)}
          width={rw}
          height={rh}
          rx={1}
          fill={r % 2 === 0 ? RECT : ACCENT}
        />,
      )
    }
  }
  return <>{rects}</>
}

function Fullscreen() {
  return (
    <>
      <rect x={25} y={10} width={30} height={22} rx={2} fill={RECT} />
      <line x1={28} y1={37} x2={52} y2={37} stroke={ACCENT} strokeWidth={0.8} />
      <rect x={22} y={40} width={36} height={4} rx={1} fill={ACCENT} />
    </>
  )
}

const VARIANT_MAP: Record<string, () => JSX.Element> = {
  'one-row': FifaRows,
  'tiered-rows': TieredRows,
  'marquee-grid': MarqueeGrid,
  'fullscreen': Fullscreen,
}

export function AnimationThumbnail({ variant, className = '' }: Props) {
  const Renderer = VARIANT_MAP[variant]
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={className}
      style={{ background: BG, borderRadius: 6 }}
    >
      {Renderer ? <Renderer /> : (
        <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize={8} fill={LABEL}>
          {variant}
        </text>
      )}
    </svg>
  )
}

export default AnimationThumbnail
