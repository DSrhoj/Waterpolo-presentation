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

function SponsorTile({ name, imagePath, delay }: { name: string; imagePath: string; delay: number }) {
  const src = useSponsorImageSrc(imagePath)

  return (
    <motion.div
      className="flex shrink-0 flex-col items-center gap-2"
      style={{ width: 140 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: { delay, duration: 0.5, ease: easeOutExpo } }}
    >
      <div className="flex size-[80px] items-center justify-center">
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
      <p className="max-w-[130px] truncate text-center text-[10px] font-semibold uppercase tracking-wider text-white/70">
        {name}
      </p>
    </motion.div>
  )
}

const marqueeStyles = `
@keyframes oneRowLeft {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}
@keyframes oneRowRight {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(0); }
}
`

function ScrollingRow({
  sponsors,
  direction,
  speed,
  rowDelay,
}: {
  sponsors: Array<{ name: string; imagePath: string }>
  direction: 'left' | 'right'
  speed: number
  rowDelay: number
}) {
  const animName = direction === 'left' ? 'oneRowLeft' : 'oneRowRight'

  return (
    <motion.div
      className="flex overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: rowDelay, duration: 0.6, ease: easeOutExpo } }}
    >
      <div
        className="flex shrink-0"
        style={{ animation: `${animName} ${speed}s linear infinite` }}
      >
        {sponsors.map((sp, i) => (
          <SponsorTile
            key={`a-${sp.name}-${i}`}
            name={sp.name}
            imagePath={sp.imagePath}
            delay={rowDelay + i * 0.06}
          />
        ))}
      </div>
      <div
        className="flex shrink-0"
        style={{ animation: `${animName} ${speed}s linear infinite` }}
      >
        {sponsors.map((sp, i) => (
          <SponsorTile
            key={`b-${sp.name}-${i}`}
            name={sp.name}
            imagePath={sp.imagePath}
            delay={rowDelay + i * 0.06}
          />
        ))}
      </div>
    </motion.div>
  )
}

export function SponsorOneRow({
  sponsors,
  isVisible,
  onComplete,
}: SponsorAnimationProps) {
  const rows = useMemo(() => {
    if (sponsors.length === 0) return []
    if (sponsors.length <= 3) return [sponsors]
    if (sponsors.length <= 6) {
      const mid = Math.ceil(sponsors.length / 2)
      return [sponsors.slice(0, mid), sponsors.slice(mid)]
    }
    const third = Math.ceil(sponsors.length / 3)
    return [
      sponsors.slice(0, third),
      sponsors.slice(third, third * 2),
      sponsors.slice(third * 2),
    ]
  }, [sponsors])

  useEffect(() => {
    if (!isVisible) return
    if (!onComplete) return
    const id = window.setTimeout(() => onComplete(), 30000)
    return () => window.clearTimeout(id)
  }, [isVisible, onComplete])

  return (
    <motion.div
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#04080e]"
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
            'radial-gradient(ellipse 90% 60% at 50% 50%, rgba(59,130,246,0.08) 0%, transparent 70%)',
        }}
      />

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Title bar */}
      <motion.div
        className="relative z-10 mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: easeOutExpo }}
      >
        <div className="flex items-center gap-4">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-white/30" />
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">
            Official Partners
          </p>
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-white/30" />
        </div>
      </motion.div>

      {/* Scrolling rows */}
      <div className="relative z-10 flex w-full flex-col gap-6 overflow-hidden">
        {rows.map((rowSponsors, i) => (
          <ScrollingRow
            key={i}
            sponsors={rowSponsors}
            direction={i % 2 === 0 ? 'left' : 'right'}
            speed={20 + i * 4}
            rowDelay={0.3 + i * 0.15}
          />
        ))}
      </div>

      {/* Bottom accent line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-10 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 30%, rgba(59,130,246,0.4) 70%, transparent 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      />

      {/* Top accent line */}
      <motion.div
        className="absolute left-0 right-0 top-0 z-10 h-[2px]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 30%, rgba(59,130,246,0.4) 70%, transparent 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      />

      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-16 bg-gradient-to-r from-[#04080e] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-16 bg-gradient-to-l from-[#04080e] to-transparent" />
    </motion.div>
  )
}

export default SponsorOneRow
