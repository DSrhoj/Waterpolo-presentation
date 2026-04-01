import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type Transition, type Variants } from 'framer-motion'

export interface ClubIntroProps {
  club: { name: string; logoPath: string; color: string } | null
  isVisible: boolean
  onComplete?: () => void
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '')
  const n = parseInt(
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean,
    16,
  )
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

function useResolvedFileUrl(filename: string | null) {
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

const logoRevealVariants: Variants = {
  initial: { opacity: 0, scale: 1.15 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { delay: 0.25, duration: 0.9, ease: easeOutExpo },
  },
  exit: { opacity: 0, scale: 0.95, transition: exitQuick },
}

const nameVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { delay: 0.55, duration: 0.6, ease: easeOutExpo },
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.2 } },
}

const lineVariants: Variants = {
  initial: { scaleX: 0 },
  animate: {
    scaleX: 1,
    transition: { delay: 0.7, duration: 0.5, ease: easeOutExpo },
  },
  exit: { scaleX: 0, transition: { duration: 0.15 } },
}

export function ClubIntro({ club, isVisible, onComplete }: ClubIntroProps) {
  const presenceKey = useMemo(() => {
    if (!club) return 'empty'
    return `${club.name}\0${club.logoPath}`
  }, [club])

  const clubImg = useResolvedFileUrl(club?.logoPath ?? null)

  const clubColor = club?.color || '#3b82f6'
  const ambientGlow = `radial-gradient(ellipse 70% 60% at 50% 45%, ${clubColor}35 0%, transparent 65%)`
  const accentLight = lighten(clubColor, 0.4)
  const nameColor = lighten(clubColor, 0.35)
  const lineGrad = `linear-gradient(90deg, transparent, ${lighten(clubColor, 0.45)} 30%, ${clubColor} 50%, ${lighten(clubColor, 0.45)} 70%, transparent)`

  const [imageReady, setImageReady] = useState(false)

  useEffect(() => {
    if (!isVisible || !club) {
      setImageReady(false)
    } else {
      setImageReady(false)
    }
  }, [isVisible, club, presenceKey])

  useEffect(() => {
    if (!isVisible || !club || !onComplete) return
    const id = window.setTimeout(() => onComplete(), 3500)
    return () => window.clearTimeout(id)
  }, [isVisible, club, presenceKey, onComplete])

  const activeClub = isVisible && club ? club : null

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04080e]">
      <AnimatePresence mode="wait">
        {activeClub ? (
          <motion.div
            key={presenceKey}
            className="absolute inset-0 flex flex-col items-center justify-center"
            variants={rootVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: ambientGlow }}
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
                background: `linear-gradient(90deg, transparent 0%, ${clubColor}25 30%, rgba(255,255,255,0.25) 50%, ${clubColor}25 70%, transparent 100%)`,
                willChange: 'transform',
              }}
              variants={sweepVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            />

            {/* Club logo — large centered */}
            <motion.div
              className="relative z-[5] flex items-center justify-center"
              style={{ willChange: 'transform, opacity' }}
              variants={logoRevealVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            >
              {clubImg.url && !clubImg.error ? (
                <img
                  src={clubImg.url}
                  alt=""
                  className="size-[180px] object-contain"
                  draggable={false}
                  onLoad={() => setImageReady(true)}
                />
              ) : null}
              {!clubImg.loading && clubImg.error ? (
                <div className="flex size-[180px] items-center justify-center text-base font-medium text-white/20">
                  No logo
                </div>
              ) : null}
            </motion.div>

            {/* Accent line */}
            <motion.div
              className="relative z-10 mt-6 h-[2px] w-[200px] origin-center"
              style={{ background: lineGrad }}
              variants={lineVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            />

            {/* Club name */}
            <motion.h2
              className="relative z-10 mt-5 text-center text-[28px] font-black uppercase leading-none tracking-[0.15em]"
              style={{
                color: accentLight,
                textShadow: `0 0 30px ${clubColor}60, 0 2px 4px rgba(0,0,0,0.5)`,
                willChange: 'transform, opacity',
              }}
              variants={nameVariants}
              initial="initial"
              animate={imageReady ? 'animate' : 'initial'}
              exit="exit"
            >
              {activeClub.name}
            </motion.h2>


            {/* Outer ring glow behind logo */}
            <motion.div
              className="pointer-events-none absolute z-0"
              style={{
                width: 260,
                height: 260,
                borderRadius: '50%',
                border: `1px solid ${clubColor}20`,
                boxShadow: `0 0 60px ${clubColor}15, inset 0 0 60px ${clubColor}08`,
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={imageReady ? {
                opacity: 1,
                scale: 1,
                transition: { delay: 0.3, duration: 0.8, ease: easeOutExpo },
              } : { opacity: 0 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default ClubIntro
