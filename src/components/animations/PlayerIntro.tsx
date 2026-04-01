import { useEffect, useMemo, useState } from 'react'
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from 'framer-motion'

export interface PlayerIntroProps {
  player: { name: string; imagePath: string } | null
  club: { name: string; logoPath: string; color: string } | null
  isVisible: boolean
  onComplete?: () => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const n = parseInt(clean.length === 3
    ? clean.split('').map((c) => c + c).join('')
    : clean, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const l = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `rgb(${l(r)},${l(g)},${l(b)})`
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex)
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}

function toFileUrl(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, '/')
  const isWindowsAbs = /^[A-Za-z]:\//.test(normalized)
  const pathPart = isWindowsAbs ? `/${normalized}` : normalized
  const encoded = pathPart
    .split('/')
    .map((segment) => encodeURIComponent(segment).replace(/%2C/g, ','))
    .join('/')
  return `file://${encoded}`
}

function useResolvedFileUrl(filename: string | null): {
  url: string | null
  loading: boolean
  error: boolean
} {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!filename) {
      setUrl(null)
      setLoading(false)
      setError(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(false)
    setUrl(null)

    const api = window.electronAPI
    if (!api?.getImagePath) {
      setLoading(false)
      setError(true)
      return
    }

    void api
      .getImagePath(filename)
      .then((resolved) => {
        if (cancelled) return
        if (!resolved) {
          setError(true)
          setUrl(null)
          return
        }
        setUrl(toFileUrl(resolved))
        setError(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setUrl(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filename])

  return { url, loading, error }
}

/* ── easing ── */
const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1]
const easeInExpo: [number, number, number, number] = [0.7, 0, 0.84, 0]

const exitQuick: Transition = { duration: 0.3, ease: easeInExpo }

/* ── variants ── */

const rootVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.25, ease: easeInExpo } },
}

const sweepVariants: Variants = {
  initial: { x: '-110%' },
  animate: {
    x: '300%',
    transition: { duration: 0.7, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

const playerRevealVariants: Variants = {
  initial: { opacity: 0, scale: 1.04 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.25, duration: 0.8, ease: easeOutExpo },
  },
  exit: { opacity: 0, scale: 1.02, transition: exitQuick },
}

const barVariants: Variants = {
  initial: { clipPath: 'inset(0 100% 0 0)' },
  animate: {
    clipPath: 'inset(0 0% 0 0)',
    transition: { delay: 0.5, duration: 0.5, ease: easeOutExpo },
  },
  exit: {
    clipPath: 'inset(0 0 0 100%)',
    transition: { duration: 0.25, ease: easeInExpo },
  },
}

const accentVariants: Variants = {
  initial: { scaleY: 0, opacity: 0 },
  animate: {
    scaleY: 1,
    opacity: 1,
    transition: { delay: 0.55, duration: 0.35, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}

const logoVariants: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { delay: 0.7, duration: 0.4, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.12 } },
}

const nameVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.65, duration: 0.45, ease: easeOutExpo },
  },
  exit: { opacity: 0, y: 4, transition: { duration: 0.15 } },
}

const clubTextVariants: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { delay: 0.8, duration: 0.35, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.1 } },
}

export function PlayerIntro({
  player,
  club,
  isVisible,
  onComplete,
}: PlayerIntroProps) {
  const presenceKey = useMemo(() => {
    if (!player) return 'empty'
    return `${player.name}\0${player.imagePath}`
  }, [player])

  const playerImg = useResolvedFileUrl(player?.imagePath ?? null)
  const clubImg = useResolvedFileUrl(club?.logoPath ?? null)

  const clubColor = club?.color || '#3b82f6'
  const barBg = `linear-gradient(90deg, ${darken(clubColor, 0.75)} 0%, ${darken(clubColor, 0.82)} 100%)`
  const accentLight = lighten(clubColor, 0.35)
  const accentMid = clubColor
  const accentDark = darken(clubColor, 0.35)
  const topEdge = `linear-gradient(90deg, ${lighten(clubColor, 0.45)} 0%, ${clubColor}55 40%, transparent 70%)`
  const ambientGlow = `radial-gradient(ellipse 80% 70% at 50% 35%, ${clubColor}30 0%, transparent 65%)`
  const clubTextColor = lighten(clubColor, 0.4)

  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    if (!isVisible || !player) {
      setImageReady(false)
      return
    }
    setImageReady(false)
  }, [isVisible, player, presenceKey])

  useEffect(() => {
    if (!isVisible || !player || !onComplete) return
    const id = window.setTimeout(() => onComplete(), 3500)
    return () => window.clearTimeout(id)
  }, [isVisible, player, presenceKey, onComplete])

  const activePlayer = isVisible && player ? player : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04080e]">
      <AnimatePresence mode="wait">
        {activePlayer ? (
          <motion.div
            key={presenceKey}
            className="absolute inset-0"
            variants={rootVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* ── Background ambient glow ── */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: ambientGlow }}
            />

            {/* ── Subtle grid pattern ── */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* ── Light sweep wipe ── */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 z-10 w-[35%]"
              style={{
                background:
                  `linear-gradient(90deg, transparent 0%, ${clubColor}25 30%, rgba(255,255,255,0.25) 50%, ${clubColor}25 70%, transparent 100%)`,
                willChange: 'transform',
              }}
              variants={sweepVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            />

            {/* ── Large faded club crest watermark ── */}
            {clubImg.url && !clubImg.error ? (
              <motion.div
                className="pointer-events-none absolute left-1/2 top-[38%] z-0 -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 0.04,
                  transition: { delay: 0.3, duration: 1, ease: easeOutExpo },
                }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
              >
                <img
                  src={clubImg.url}
                  alt=""
                  className="size-[240px] object-contain"
                  draggable={false}
                />
              </motion.div>
            ) : null}

            {/* ── Player image ── */}
            <motion.div
              className="absolute inset-x-0 bottom-[74px] top-0 z-[5] flex items-end justify-center"
              style={{ willChange: 'transform, opacity' }}
              variants={playerRevealVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            >
              {playerImg.url && !playerImg.error ? (
                <img
                  src={playerImg.url}
                  alt=""
                  className="h-full max-h-full w-auto max-w-full object-contain object-bottom"
                  draggable={false}
                  onLoad={() => setImageReady(true)}
                />
              ) : null}
              {!playerImg.loading && playerImg.error ? (
                <div className="flex h-full w-full items-center justify-center text-base font-medium text-white/20">
                  No photo
                </div>
              ) : null}

              {/* Bottom fade into bar */}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-[50px]"
                style={{
                  background:
                    'linear-gradient(to top, #04080e 0%, transparent 100%)',
                }}
              />
            </motion.div>

            {/* ── Bottom bar — wipes in from left ── */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 z-30 h-[74px]"
              variants={barVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div
                className="flex h-full items-center gap-0"
                style={{ background: barBg }}
              >
                {/* Club color left accent edge */}
                <motion.div
                  className="h-full w-[4px] shrink-0 origin-top"
                  style={{
                    background: `linear-gradient(to bottom, ${accentLight}, ${accentMid}, ${accentDark})`,
                  }}
                  variants={accentVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                />

                {/* Club badge */}
                {club?.logoPath ? (
                  <motion.div
                    className="mx-3 flex size-[52px] shrink-0 items-center justify-center"
                    style={{ willChange: 'transform, opacity' }}
                    variants={logoVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {clubImg.url && !clubImg.error ? (
                      <img
                        src={clubImg.url}
                        alt=""
                        className="size-[40px] object-contain"
                        draggable={false}
                      />
                    ) : null}
                  </motion.div>
                ) : null}

                {/* Thin divider */}
                {club?.logoPath ? (
                  <div className="mr-3 h-[36px] w-px bg-white/10" />
                ) : <div className="w-4" />}

                {/* Name + club text */}
                <div className="min-w-0 flex-1 pr-4">
                  <motion.h2
                    className="truncate text-[22px] font-black uppercase leading-none tracking-wider text-white"
                    style={{
                      fontFamily:
                        'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                      textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                      willChange: 'transform, opacity',
                    }}
                    variants={nameVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                  >
                    {activePlayer.name}
                  </motion.h2>
                  {club?.name ? (
                    <motion.p
                      className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{ color: clubTextColor, opacity: 0.75 }}
                      style={{ willChange: 'opacity' }}
                      variants={clubTextVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      {club.name}
                    </motion.p>
                  ) : null}
                </div>
              </div>

              {/* Top edge highlight */}
              <div
                className="absolute inset-x-0 top-0 h-px"
                style={{ background: topEdge }}
              />
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default PlayerIntro
