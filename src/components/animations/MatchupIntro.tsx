import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type Transition, type Variants } from 'framer-motion'

export interface MatchupIntroProps {
  home: { name: string; logoPath: string; color: string } | null
  away: { name: string; logoPath: string; color: string } | null
  label?: string
  isVisible: boolean
  onComplete?: () => void
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const n = parseInt(
    clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean,
    16,
  )
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex)
  const l = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount))
  return `rgb(${l(r)},${l(g)},${l(b)})`
}

function darken(hex: string, amount: number) {
  const { r, g, b } = hexToRgb(hex)
  const d = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `rgb(${d(r)},${d(g)},${d(b)})`
}

function toFileUrl(fsPath: string) {
  const normalized = fsPath.replace(/\\/g, '/')
  const isWindowsAbs = /^[A-Za-z]:\//.test(normalized)
  const pathPart = isWindowsAbs ? `/${normalized}` : normalized
  const encoded = pathPart
    .split('/')
    .map((seg) => encodeURIComponent(seg).replace(/%2C/g, ','))
    .join('/')
  return `file://${encoded}`
}

function useResolvedFileUrl(filename: string | null) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!filename) { setUrl(null); setError(false); setLoading(false); return }
    let cancelled = false
    setLoading(true)
    setError(false)
    setUrl(null)
    const api = window.electronAPI
    if (!api?.getImagePath) { setLoading(false); setError(true); return }
    void api.getImagePath(filename).then((resolved) => {
      if (cancelled) return
      if (!resolved) { setError(true); setUrl(null) } else { setUrl(toFileUrl(resolved)); setError(false) }
    }).catch(() => { if (!cancelled) { setError(true); setUrl(null) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filename])

  return { url, loading, error }
}

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1]
const easeInExpo: [number, number, number, number] = [0.7, 0, 0.84, 0]
const exitQuick: Transition = { duration: 0.3, ease: easeInExpo }

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

function ClubSide({
  name,
  logoUrl,
  logoError,
  color,
  delay,
  ready,
  onImgLoad,
}: {
  name: string
  logoUrl: string | null
  logoError: boolean
  color: string
  delay: number
  ready: boolean
  onImgLoad: () => void
}) {
  const accentLight = lighten(color, 0.55)

  const logoReveal: Variants = {
    initial: { opacity: 0, scale: 1.15 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { delay, duration: 0.9, ease: easeOutExpo },
    },
    exit: { opacity: 0, scale: 0.95, transition: exitQuick },
  }

  const ringVariants: Variants = {
    initial: { opacity: 0, scale: 0.8 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { delay: delay + 0.05, duration: 0.8, ease: easeOutExpo },
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.2 } },
  }

  const lineVariants: Variants = {
    initial: { scaleX: 0 },
    animate: {
      scaleX: 1,
      transition: { delay: delay + 0.3, duration: 0.5, ease: easeOutExpo },
    },
    exit: { scaleX: 0, transition: { duration: 0.15 } },
  }

  const nameVariants: Variants = {
    initial: { opacity: 0, y: 14 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: delay + 0.35, duration: 0.6, ease: easeOutExpo },
    },
    exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
  }

  const go = ready ? 'animate' : 'initial'

  return (
    <div className="relative flex min-w-0 flex-1 flex-col items-center">
      {/* Logo */}
      <motion.div
        className="relative z-[5] flex size-[140px] items-center justify-center"
        style={{ willChange: 'transform, opacity' }}
        variants={logoReveal}
        initial="initial"
        animate={go}
        exit="exit"
      >
        {logoUrl && !logoError ? (
          <img
            src={logoUrl}
            alt=""
            className="size-[130px] object-contain"
            draggable={false}
            onLoad={onImgLoad}
          />
        ) : null}
        {!logoUrl && !logoError ? (
          <div className="flex size-[130px] items-center justify-center text-sm text-white/20">
            No logo
          </div>
        ) : null}
      </motion.div>

      {/* Accent line */}
      <motion.div
        className="relative z-10 mt-4 h-[2px] w-[140px] origin-center"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentLight}80 30%, ${color} 50%, ${accentLight}80 70%, transparent)`,
        }}
        variants={lineVariants}
        initial="initial"
        animate={go}
        exit="exit"
      />

      {/* Name */}
      <motion.h3
        className="relative z-10 mt-4 w-full px-2 text-center text-[18px] font-black uppercase leading-snug tracking-[0.1em]"
        style={{
          color: accentLight,
          textShadow: `0 0 30px ${color}70, 0 2px 4px rgba(0,0,0,0.4)`,
          willChange: 'transform, opacity',
        }}
        variants={nameVariants}
        initial="initial"
        animate={go}
        exit="exit"
      >
        {name}
      </motion.h3>
    </div>
  )
}

export function MatchupIntro({ home, away, label = 'Match', isVisible, onComplete }: MatchupIntroProps) {
  const presenceKey = useMemo(() => {
    if (!home || !away) return 'empty'
    return `${home.name}\0${away.name}`
  }, [home, away])

  const homeImg = useResolvedFileUrl(home?.logoPath ?? null)
  const awayImg = useResolvedFileUrl(away?.logoPath ?? null)

  const [homeReady, setHomeReady] = useState(false)
  const [awayReady, setAwayReady] = useState(false)

  useEffect(() => {
    if (!isVisible || !home || !away) {
      setHomeReady(false)
      setAwayReady(false)
    } else {
      setHomeReady(false)
      setAwayReady(false)
    }
  }, [isVisible, home, away, presenceKey])

  useEffect(() => {
    if (!isVisible || !onComplete) return
    const id = window.setTimeout(() => onComplete(), 4000)
    return () => window.clearTimeout(id)
  }, [isVisible, presenceKey, onComplete])

  const active = isVisible && home && away
  const hc = home?.color || '#3b82f6'
  const ac = away?.color || '#ef4444'
  const imagesReady = (homeReady || homeImg.error || (!homeImg.url && !homeImg.loading)) &&
                       (awayReady || awayImg.error || (!awayImg.url && !awayImg.loading))

  const vsVariants: Variants = {
    initial: { opacity: 0, scale: 0.6 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { delay: 0.5, duration: 0.5, ease: easeOutExpo },
    },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  }

  const vsLineVariants: Variants = {
    initial: { scaleY: 0 },
    animate: {
      scaleY: 1,
      transition: { delay: 0.4, duration: 0.6, ease: easeOutExpo },
    },
    exit: { scaleY: 0, transition: { duration: 0.15 } },
  }

  const headerVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { delay: 0.15, duration: 0.5, ease: easeOutExpo },
    },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080c14]">
      <AnimatePresence mode="wait">
        {active ? (
          <motion.div
            key={presenceKey}
            className="absolute inset-0 flex flex-col items-center justify-center"
            variants={rootVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Background color split — each half tinted with club color */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${darken(hc, 0.7)} 0%, ${darken(hc, 0.85)} 35%, #080c14 50%, ${darken(ac, 0.85)} 65%, ${darken(ac, 0.7)} 100%)`,
              }}
            />

            {/* Ambient glow — stronger blend of both club colours */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 55% 70% at 28% 50%, ${hc}35 0%, transparent 65%), radial-gradient(ellipse 55% 70% at 72% 50%, ${ac}35 0%, transparent 65%)`,
              }}
            />

            {/* Subtle grid */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Light sweep */}
            <motion.div
              className="pointer-events-none absolute inset-y-0 z-10 w-[35%]"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${hc}25 25%, rgba(255,255,255,0.25) 50%, ${ac}25 75%, transparent 100%)`,
                willChange: 'transform',
              }}
              variants={sweepVariants}
              initial="initial"
              animate={imagesReady ? 'animate' : 'initial'}
              exit="exit"
            />

            {/* Header label */}
            <motion.p
              className="relative z-10 mb-6 text-[10px] font-bold uppercase tracking-[0.5em] text-white/25"
              variants={headerVariants}
              initial="initial"
              animate={imagesReady ? 'animate' : 'initial'}
              exit="exit"
            >
              {label}
            </motion.p>

            {/* ── The two clubs + VS ── */}
            <div className="relative z-10 flex w-full items-center gap-4 px-4">
              {/* Home */}
              <ClubSide
                name={home!.name}
                logoUrl={homeImg.url}
                logoError={homeImg.error}
                color={hc}
                delay={0.2}
                ready={imagesReady}
                onImgLoad={() => setHomeReady(true)}
              />

              {/* VS divider */}
              <div className="relative flex h-[200px] flex-col items-center justify-center">
                {/* Vertical accent line */}
                <motion.div
                  className="absolute h-full w-px origin-center"
                  style={{
                    background: `linear-gradient(180deg, transparent, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.06) 75%, transparent)`,
                  }}
                  variants={vsLineVariants}
                  initial="initial"
                  animate={imagesReady ? 'animate' : 'initial'}
                  exit="exit"
                />

                {/* VS text */}
                <motion.div
                  className="relative z-10 flex size-10 items-center justify-center rounded-full"
                  style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  boxShadow: `0 0 40px ${hc}18, 0 0 40px ${ac}18`,
                  }}
                  variants={vsVariants}
                  initial="initial"
                  animate={imagesReady ? 'animate' : 'initial'}
                  exit="exit"
                >
                  <span
                    className="text-[11px] font-black tracking-widest"
                    style={{
                      background: `linear-gradient(135deg, ${lighten(hc, 0.6)}, #ffffff, ${lighten(ac, 0.6)})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    VS
                  </span>
                </motion.div>
              </div>

              {/* Away */}
              <ClubSide
                name={away!.name}
                logoUrl={awayImg.url}
                logoError={awayImg.error}
                color={ac}
                delay={0.3}
                ready={imagesReady}
                onImgLoad={() => setAwayReady(true)}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default MatchupIntro
