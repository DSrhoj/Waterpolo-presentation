import { motion } from 'framer-motion'
import type { Club, Player } from '@/types'
import { ElectronImage } from '@/components/ElectronImage'

const CAP_NUMBERS = Array.from({ length: 14 }, (_, i) => i + 1)

export type PlayerCardProps = {
  player: Player
  club: Club | undefined
  isActive: boolean
  onClick: () => void
  capNumber?: number
  usedCapNumbers?: Set<number>
  onCapNumberChange?: (num: number | undefined) => void
}

export function PlayerCard({ player, club, isActive, onClick, capNumber, usedCapNumbers, onCapNumberChange }: PlayerCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'relative flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border shadow-lg transition-shadow',
        'bg-surface border-border-subtle hover:border-border-strong',
        isActive
          ? 'ring-2 ring-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.3)] border-emerald-500/50'
          : '',
      ].join(' ')}
    >
      {isActive && (
        <span className="absolute right-2 top-2 z-10 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
          Live
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 gap-3 p-4 text-left outline-none"
      >
        {capNumber != null && (
          <div className="flex w-8 shrink-0 items-center justify-center">
            <span className="text-lg font-black leading-none text-accent">
              {capNumber}
            </span>
          </div>
        )}
        <ElectronImage
          filename={player.imagePath}
          alt={player.name}
          className="size-14 shrink-0 rounded-xl"
        />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="break-words text-sm font-semibold leading-snug text-txt-primary">{player.name}</p>
          <div className="mt-1.5 flex min-w-0 items-center gap-2">
            {club ? (
              <>
                <ElectronImage
                  filename={club.logoPath}
                  alt={`${club.name} logo`}
                  className="size-6 shrink-0 rounded-md"
                  fit="contain"
                />
                <span className="truncate text-xs text-txt-secondary">{club.name}</span>
              </>
            ) : (
              <span className="text-xs text-txt-tertiary">Unknown club</span>
            )}
          </div>
        </div>
      </button>
      {onCapNumberChange && (
        <div className="border-t border-border-subtle px-4 py-2">
          <select
            value={capNumber ?? ''}
            onChange={(e) => {
              e.stopPropagation()
              const v = e.target.value
              onCapNumberChange(v ? Number(v) : undefined)
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded-lg border border-border-default bg-raised px-2 py-1 text-[11px] text-txt-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">Cap #</option>
            {CAP_NUMBERS.map((n) => (
              <option
                key={n}
                value={n}
                disabled={usedCapNumbers?.has(n) && n !== capNumber}
              >
                #{n}{usedCapNumbers?.has(n) && n !== capNumber ? ' (taken)' : ''}
              </option>
            ))}
          </select>
        </div>
      )}
    </motion.div>
  )
}
