import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { pathToFileUrlHref } from '@/utils/electronApi'
import type { SponsorAnimationProps } from './SponsorSlideCarousel'

function useSponsorImageSrc(imagePath: string): string {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      if (!imagePath.trim()) {
        setSrc('')
        return
      }
      if (imagePath.startsWith('file:') || imagePath.startsWith('http')) {
        setSrc(imagePath)
        return
      }
      const api = window.electronAPI
      if (!api?.getImagePath) {
        setSrc('')
        return
      }
      try {
        const abs = await api.getImagePath(imagePath)
        if (cancelled) return
        setSrc(abs ? pathToFileUrlHref(abs) : '')
      } catch {
        if (!cancelled) setSrc('')
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [imagePath])

  return src
}

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function SponsorTile({
  imagePath,
  delay,
}: {
  imagePath: string
  delay: number
}) {
  const src = useSponsorImageSrc(imagePath)

  return (
    <motion.div
      className="flex shrink-0 items-center justify-center"
      style={{ width: 140 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{
        opacity: 1,
        scale: 1,
        transition: { delay, duration: 0.45, ease: easeOutExpo },
      }}
    >
      <div className="flex size-[90px] items-center justify-center">
        {src ? (
          <img
            src={src}
            alt=""
            className="max-h-full max-w-full object-contain"
            draggable={false}
          />
        ) : (
          <div className="size-full rounded-lg bg-white/5" />
        )}
      </div>
    </motion.div>
  )
}

const TILE_WIDTH = 140
const PIXELS_PER_SECOND = 50

function MarqueeRow({
  sponsors,
  direction,
  rowDelay,
}: {
  sponsors: Array<{ name: string; imagePath: string }>
  direction: 'left' | 'right'
  rowDelay: number
}) {
  const animName = direction === 'left' ? 'marqueeLeft' : 'marqueeRight'
  const duration = Math.max((sponsors.length * TILE_WIDTH) / PIXELS_PER_SECOND, 5)

  return (
    <motion.div
      className="flex overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{
        opacity: 1,
        transition: { delay: rowDelay, duration: 0.5, ease: easeOutExpo },
      }}
    >
      <div
        className="flex shrink-0"
        style={{
          animation: `${animName} ${duration}s linear infinite`,
        }}
      >
        {sponsors.map((sp, i) => (
          <SponsorTile
            key={`a-${sp.name}-${i}`}
            imagePath={sp.imagePath}
            delay={rowDelay + 0.2 + i * 0.05}
          />
        ))}
      </div>
      <div
        className="flex shrink-0"
        style={{
          animation: `${animName} ${duration}s linear infinite`,
        }}
      >
        {sponsors.map((sp, i) => (
          <SponsorTile
            key={`b-${sp.name}-${i}`}
            imagePath={sp.imagePath}
            delay={rowDelay + 0.2 + i * 0.05}
          />
        ))}
      </div>
    </motion.div>
  )
}

const ROW_COUNT = 3

const marqueeStyles = `
@keyframes marqueeLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
@keyframes marqueeRight {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
`

export function SponsorMarqueeGrid({
  sponsors,
  isVisible,
  onComplete,
}: SponsorAnimationProps) {
  const rows = useMemo(() => {
    if (sponsors.length === 0) return []
    return Array.from({ length: ROW_COUNT }, () => shuffle(sponsors))
  }, [sponsors])

  useEffect(() => {
    if (!isVisible || !onComplete) return
    const id = window.setTimeout(() => onComplete(), 30000)
    return () => window.clearTimeout(id)
  }, [isVisible, onComplete])

  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#04080e] py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.5, ease: easeOutExpo }}
    >
      <style dangerouslySetInnerHTML={{ __html: marqueeStyles }} />

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 50% 50%, rgba(59,130,246,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <motion.div
        className="relative z-10 mb-5"
        initial={{ opacity: 0, y: -8 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: 0.15, duration: 0.5, ease: easeOutExpo }}
      >
        <div className="flex items-center gap-4">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/25" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
            Official Partners
          </p>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/25" />
        </div>
      </motion.div>

      {/* Separator */}
      <motion.div
        className="relative z-10 mb-5 h-px w-3/4"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.08) 70%, transparent)',
        }}
        initial={{ scaleX: 0 }}
        animate={isVisible ? { scaleX: 1 } : { scaleX: 0 }}
        transition={{ delay: 0.25, duration: 0.6, ease: easeOutExpo }}
      />

      {/* Scrolling rows */}
      <div className="relative z-10 flex w-full flex-col gap-4 overflow-hidden">
        {rows.map((rowSponsors, i) => (
          <MarqueeRow
            key={i}
            sponsors={rowSponsors}
            direction={i % 2 === 0 ? 'left' : 'right'}
            rowDelay={0.3 + i * 0.12}
          />
        ))}
      </div>

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[#04080e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[#04080e] to-transparent" />

      {/* Top & bottom accent lines */}
      <motion.div
        className="absolute left-0 right-0 top-0 z-10 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.3) 30%, rgba(59,130,246,0.3) 70%, transparent 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-10 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.3) 30%, rgba(59,130,246,0.3) 70%, transparent 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />
    </motion.div>
  )
}

export default SponsorMarqueeGrid
