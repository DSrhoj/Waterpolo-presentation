import { motion } from 'framer-motion'
import type { Club, Player } from '@/types'
import { ElectronImage } from '@/components/ElectronImage'

export type PlayerCardProps = {
  player: Player
  club: Club | undefined
  isActive: boolean
  onClick: () => void
}

export function PlayerCard({ player, club, isActive, onClick }: PlayerCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={[
        'relative flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border p-4 text-left shadow-lg outline-none transition-shadow',
        'bg-surface border-border-subtle hover:border-border-strong',
        isActive
          ? 'ring-2 ring-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.3)] border-emerald-500/50'
          : '',
      ].join(' ')}
    >
      {isActive && (
        <span className="absolute right-2 top-2 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
          Live
        </span>
      )}
      <div className="flex min-w-0 gap-3">
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
      </div>
    </motion.button>
  )
}
