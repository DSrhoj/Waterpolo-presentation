import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, type Variants } from 'framer-motion'

export interface OfficialIntroProps {
  referee1: { name: string } | null
  referee2: { name: string } | null
  delegate: { name: string } | null
  isVisible: boolean
  onComplete?: () => void
}

const easeOutExpo: [number, number, number, number] = [0.16, 1, 0.3, 1]
const easeInExpo: [number, number, number, number] = [0.7, 0, 0.84, 0]

const REFEREE_ACCENT = '#f59e0b'
const DELEGATE_ACCENT = '#06b6d4'

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

function OfficialSlot({
  name,
  role,
  accent,
  delay,
  ready,
}: {
  name: string
  role: string
  accent: string
  delay: number
  ready: boolean
}) {
  const iconVariants: Variants = {
    initial: { opacity: 0, scale: 0.6 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: { delay, duration: 0.5, ease: easeOutExpo },
    },
    exit: { opacity: 0, scale: 0.8, transition: { duration: 0.2 } },
  }

  const labelVariants: Variants = {
    initial: { opacity: 0, y: -6 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: delay + 0.1, duration: 0.4, ease: easeOutExpo },
    },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  }

  const nameVariants: Variants = {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: delay + 0.2, duration: 0.5, ease: easeOutExpo },
    },
    exit: { opacity: 0, y: 6, transition: { duration: 0.15 } },
  }

  const lineVariants: Variants = {
    initial: { scaleX: 0 },
    animate: {
      scaleX: 1,
      transition: { delay: delay + 0.15, duration: 0.4, ease: easeOutExpo },
    },
    exit: { scaleX: 0, transition: { duration: 0.1 } },
  }

  const isReferee = role === 'Referee'

  return (
    <div className="flex flex-col items-center">
      <motion.div
        className="flex size-14 items-center justify-center rounded-full"
        style={{
          border: `2px solid ${accent}40`,
          boxShadow: `0 0 30px ${accent}10`,
        }}
        variants={iconVariants}
        initial="initial"
        animate={ready ? 'animate' : 'initial'}
        exit="exit"
      >
        {isReferee ? (
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx={12} cy={12} r={10} />
            <line x1={12} y1={8} x2={12} y2={12} />
            <line x1={12} y1={12} x2={15} y2={14} />
          </svg>
        ) : (
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx={9} cy={7} r={4} />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        )}
      </motion.div>

      <motion.p
        className="mt-3 text-[9px] font-bold uppercase tracking-[0.35em]"
        style={{ color: `${accent}99` }}
        variants={labelVariants}
        initial="initial"
        animate={ready ? 'animate' : 'initial'}
        exit="exit"
      >
        {role}
      </motion.p>

      <motion.div
        className="mt-2 h-[1.5px] w-[100px] origin-center"
        style={{
          background: `linear-gradient(90deg, transparent, ${accent}60 30%, ${accent} 50%, ${accent}60 70%, transparent)`,
        }}
        variants={lineVariants}
        initial="initial"
        animate={ready ? 'animate' : 'initial'}
        exit="exit"
      />

      <motion.h3
        className="mt-2.5 max-w-[200px] truncate text-center text-[18px] font-black uppercase leading-none tracking-[0.1em]"
        style={{
          color: '#e8ecf2',
          textShadow: `0 0 20px ${accent}30, 0 2px 4px rgba(0,0,0,0.4)`,
        }}
        variants={nameVariants}
        initial="initial"
        animate={ready ? 'animate' : 'initial'}
        exit="exit"
      >
        {name}
      </motion.h3>
    </div>
  )
}

export function OfficialIntro({
  referee1,
  referee2,
  delegate,
  isVisible,
  onComplete,
}: OfficialIntroProps) {
  const presenceKey = useMemo(() => {
    if (!referee1 && !referee2 && !delegate) return 'empty'
    return `${referee1?.name}\0${referee2?.name}\0${delegate?.name}`
  }, [referee1, referee2, delegate])

  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isVisible || (!referee1 && !referee2 && !delegate)) {
      setReady(false)
      return
    }
    const id = window.requestAnimationFrame(() => setReady(true))
    return () => window.cancelAnimationFrame(id)
  }, [isVisible, referee1, referee2, delegate, presenceKey])

  useEffect(() => {
    if (!isVisible || !onComplete) return
    const id = window.setTimeout(() => onComplete(), 4500)
    return () => window.clearTimeout(id)
  }, [isVisible, presenceKey, onComplete])

  const active = isVisible && (referee1 || referee2 || delegate)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#04080e]">
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
            {/* Ambient glow — blend of both role colours */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 70% 50% at 35% 35%, rgba(245,158,11,0.1) 0%, transparent 60%), radial-gradient(ellipse 70% 50% at 65% 35%, rgba(245,158,11,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 70%, rgba(6,182,212,0.1) 0%, transparent 60%)`,
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
                background: `linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.08) 30%, rgba(255,255,255,0.15) 50%, rgba(6,182,212,0.08) 70%, transparent 100%)`,
                willChange: 'transform',
              }}
              variants={sweepVariants}
              initial="initial"
              animate={ready ? 'animate' : 'initial'}
              exit="exit"
            />

            {/* Header */}
            <motion.p
              className="relative z-10 mb-8 text-[10px] font-bold uppercase tracking-[0.5em] text-white/30"
              initial={{ opacity: 0 }}
              animate={ready ? { opacity: 1, transition: { delay: 0.1, duration: 0.5 } } : { opacity: 0 }}
              exit={{ opacity: 0 }}
            >
              Match Officials
            </motion.p>

            {/* Two referees side by side */}
            <div className="relative z-10 flex items-start gap-16">
              {referee1 && (
                <OfficialSlot
                  name={referee1.name}
                  role="Referee"
                  accent={REFEREE_ACCENT}
                  delay={0.2}
                  ready={ready}
                />
              )}
              {referee2 && (
                <OfficialSlot
                  name={referee2.name}
                  role="Referee"
                  accent={REFEREE_ACCENT}
                  delay={0.35}
                  ready={ready}
                />
              )}
            </div>

            {/* Divider */}
            <motion.div
              className="relative z-10 my-6 h-px w-[240px] origin-center"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent)',
              }}
              initial={{ scaleX: 0 }}
              animate={ready ? { scaleX: 1, transition: { delay: 0.5, duration: 0.5, ease: easeOutExpo } } : { scaleX: 0 }}
              exit={{ scaleX: 0, transition: { duration: 0.1 } }}
            />

            {/* Delegate centered below */}
            {delegate && (
              <div className="relative z-10">
                <OfficialSlot
                  name={delegate.name}
                  role="Delegate"
                  accent={DELEGATE_ACCENT}
                  delay={0.55}
                  ready={ready}
                />
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default OfficialIntro
