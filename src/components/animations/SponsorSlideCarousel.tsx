import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { pathToFileUrlHref } from '@/utils/electronApi'

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

export interface SponsorAnimationProps {
  sponsors: Array<{ name: string; imagePath: string; tier?: 'platinum' | 'gold' | 'silver' }>
  isVisible: boolean
  onComplete?: () => void
}

const ENTER_MS = 520
const EXIT_MS = 520
const HOLD_MS = 3000

const slideVariants: Variants = {
  enter: {
    x: '100%',
    opacity: 0,
  },
  center: {
    x: 0,
    opacity: 1,
    transition: {
      duration: ENTER_MS / 1000,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: {
      duration: EXIT_MS / 1000,
      ease: [0.22, 1, 0.36, 1],
    },
  },
}

function SlideCard({
  name,
  imagePath,
}: {
  name: string
  imagePath: string
}) {
  const src = useSponsorImageSrc(imagePath)
  return (
    <>
      <img
        src={src}
        alt=""
        className="h-[150px] w-[200px] max-w-[200px] object-contain"
        draggable={false}
      />
      <p className="mt-4 max-w-[280px] text-center text-sm font-medium tracking-wide text-white">
        {name}
      </p>
    </>
  )
}

export function SponsorSlideCarousel({
  sponsors,
  isVisible,
  onComplete,
}: SponsorAnimationProps) {
  const [index, setIndex] = useState(0)
  const [cycleKey, setCycleKey] = useState(0)
  const [runCycle, setRunCycle] = useState(isVisible)
  const exitDoneRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isVisible) {
      setRunCycle(true)
      exitDoneRef.current = false
    }
  }, [isVisible])

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!runCycle || !isVisible || sponsors.length === 0) {
      clearTimer()
      return
    }

    const advance = () => {
      setIndex((i) => (i + 1) % sponsors.length)
      setCycleKey((k) => k + 1)
      timeoutRef.current = setTimeout(advance, EXIT_MS + ENTER_MS + HOLD_MS)
    }

    timeoutRef.current = setTimeout(advance, ENTER_MS + HOLD_MS)

    return () => clearTimer()
  }, [runCycle, isVisible, sponsors.length, clearTimer])

  useEffect(() => {
    if (!isVisible) {
      clearTimer()
      setRunCycle(false)
    }
  }, [isVisible, clearTimer])

  const handleExitDone = () => {
    if (!isVisible && !exitDoneRef.current) {
      exitDoneRef.current = true
      onComplete?.()
    }
  }

  const sponsor = sponsors[index]

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden bg-[#0a0a0a]"
      initial={false}
      animate={{ opacity: isVisible ? 1 : 0 }}
      transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
      onAnimationComplete={(def) => {
        const d = def as { opacity?: number }
        if (!isVisible && d.opacity === 0) handleExitDone()
      }}
    >
      {sponsors.length > 0 && runCycle && sponsor && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${sponsor.name}-${index}-${cycleKey}`}
            className="absolute inset-0 flex flex-col items-center justify-center px-6"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <SlideCard name={sponsor.name} imagePath={sponsor.imagePath} />
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  )
}

export default SponsorSlideCarousel
