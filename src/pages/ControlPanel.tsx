import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { AppData, Club, Player, Sponsor, SponsorStack } from '@/types'
import { PlayerCard } from '@/components/PlayerCard'
import { ElectronImage } from '@/components/ElectronImage'
import { getPresentationControlAPI } from '@/utils/electronApi'
import { AnimationThumbnail } from '@/components/AnimationThumbnail'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type TabId = 'clubs' | 'players' | 'officials' | 'sponsors'

type PresentingState =
  | { kind: 'idle' }
  | { kind: 'club'; clubId: string; label: string }
  | { kind: 'matchup'; label: string }
  | { kind: 'player'; playerId: string; label: string }
  | { kind: 'officials'; label: string }
  | { kind: 'sponsors'; stackId: string; label: string }

function clubMapFromData(data: AppData): Map<string, Club> {
  const m = new Map<string, Club>()
  for (const c of data.clubs) m.set(c.id, c)
  return m
}

function sponsorMapFromData(data: AppData): Map<string, Sponsor> {
  const m = new Map<string, Sponsor>()
  for (const s of data.sponsors) m.set(s.id, s)
  return m
}

function SortablePlayerCard({
  player,
  club,
  isActive,
  onClick,
}: {
  player: Player
  club: Club | undefined
  isActive: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style} className="group/sortable min-w-0">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 z-10 -translate-y-1/2 cursor-grab rounded p-1 text-txt-tertiary opacity-0 transition-opacity hover:text-txt-secondary group-hover/sortable:opacity-100 active:cursor-grabbing"
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
          <circle cx="2.5" cy="2" r="1.5" />
          <circle cx="7.5" cy="2" r="1.5" />
          <circle cx="2.5" cy="8" r="1.5" />
          <circle cx="7.5" cy="8" r="1.5" />
          <circle cx="2.5" cy="14" r="1.5" />
          <circle cx="7.5" cy="14" r="1.5" />
        </svg>
      </div>
      <PlayerCard player={player} club={club} isActive={isActive} onClick={onClick} />
    </div>
  )
}

export function ControlPanel() {
  const api = getPresentationControlAPI()
  const [data, setData] = useState<AppData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('players')
  const [presenting, setPresenting] = useState<PresentingState>({ kind: 'idle' })
  const [homeClubId, setHomeClubId] = useState<string>('')
  const [awayClubId, setAwayClubId] = useState<string>('')
  const [referee1Id, setReferee1Id] = useState<string>('')
  const [referee2Id, setReferee2Id] = useState<string>('')
  const [delegateId, setDelegateId] = useState<string>('')
  const [matchLabel, setMatchLabel] = useState<string>('Match')
  const [settingsOpen, setSettingsOpen] = useState(true)

  const clubById = useMemo(() => (data ? clubMapFromData(data) : new Map<string, Club>()), [data])
  const sponsorById = useMemo(
    () => (data ? sponsorMapFromData(data) : new Map<string, Sponsor>()),
    [data],
  )

  useEffect(() => {
    if (!api) {
      setLoadError('Electron API is not available. Open this screen from the desktop app.')
      return
    }
    void api
      .loadData()
      .then(setData)
      .catch(() => setLoadError('Failed to load saved data.'))

    const unsub = window.electronAPI?.onDataUpdate?.((updated: unknown) => {
      setData(updated as AppData)
    })
    return () => { unsub?.() }
  }, [api])

  const isLive = presenting.kind !== 'idle'

  const sendStop = useCallback(() => {
    api?.sendCommand({ type: 'stop' })
    setPresenting({ kind: 'idle' })
    api?.backToDataEntry()
  }, [api])

  const sendClear = useCallback(() => {
    api?.sendCommand({ type: 'clear' })
    setPresenting({ kind: 'idle' })
  }, [api])

  const showClub = useCallback(
    (club: Club) => {
      api?.sendCommand({ type: 'show-club', clubId: club.id })
      setPresenting({ kind: 'club', clubId: club.id, label: club.name })
    },
    [api],
  )

  const showPlayer = useCallback(
    (player: Player) => {
      api?.sendCommand({ type: 'show-player', playerId: player.id })
      setPresenting({ kind: 'player', playerId: player.id, label: player.name })
    },
    [api],
  )

  const showMatchup = useCallback(() => {
    if (!homeClubId || !awayClubId) return
    const home = data?.clubs.find((c) => c.id === homeClubId)
    const away = data?.clubs.find((c) => c.id === awayClubId)
    if (!home || !away) return
    api?.sendCommand({ type: 'show-matchup', homeClubId, awayClubId, matchLabel: matchLabel.trim() || 'Match' })
    setPresenting({ kind: 'matchup', label: `${home.name} vs ${away.name}` })
  }, [api, data, homeClubId, awayClubId, matchLabel])

  const showOfficials = useCallback(() => {
    if (!referee1Id || !referee2Id || !delegateId) return
    api?.sendCommand({ type: 'show-officials', referee1Id, referee2Id, delegateId })
    setPresenting({ kind: 'officials', label: 'Officials' })
  }, [api, referee1Id, referee2Id, delegateId])

  const allOfficialsSelected = !!(referee1Id && referee2Id && delegateId)

  const showSponsors = useCallback(
    (stack: SponsorStack) => {
      api?.sendCommand({
        type: 'show-sponsors',
        stackId: stack.id,
        animationVariant: stack.animationVariant,
      })
      setPresenting({ kind: 'sponsors', stackId: stack.id, label: stack.name })
    },
    [api],
  )

  const selectedClubIds = useMemo(() => {
    const s = new Set<string>()
    if (homeClubId) s.add(homeClubId)
    if (awayClubId) s.add(awayClubId)
    return s
  }, [homeClubId, awayClubId])

  const filteredClubs = useMemo(() => {
    if (!data) return []
    if (selectedClubIds.size === 0) return data.clubs
    return data.clubs.filter((c) => selectedClubIds.has(c.id))
  }, [data, selectedClubIds])

  const filteredPlayers = useMemo(() => {
    if (!data) return []
    return selectedClubIds.size === 0 ? data.players : data.players.filter((p) => selectedClubIds.has(p.clubId))
  }, [data, selectedClubIds])

  const orderedGrouped = useMemo(() => {
    const clubMap = new Map<string, Player[]>()
    const clubOrder: string[] = []
    for (const p of filteredPlayers) {
      const key = p.clubId || '_none'
      let arr = clubMap.get(key)
      if (!arr) {
        arr = []
        clubMap.set(key, arr)
        clubOrder.push(key)
      }
      arr.push(p)
    }
    const order = data?.playerOrder ?? {}
    return clubOrder.map((cid) => {
      const players = clubMap.get(cid)!
      const clubOrderIds = order[cid]
      if (clubOrderIds && clubOrderIds.length > 0) {
        const posMap = new Map(clubOrderIds.map((id, i) => [id, i]))
        players.sort((a, b) => {
          const ai = posMap.get(a.id) ?? Infinity
          const bi = posMap.get(b.id) ?? Infinity
          if (ai !== Infinity || bi !== Infinity) return ai - bi
          return a.name.localeCompare(b.name)
        })
      } else {
        players.sort((a, b) => a.name.localeCompare(b.name))
      }
      return { clubId: cid, players }
    })
  }, [filteredPlayers, data?.playerOrder])

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((clubId: string, event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !data) return
    const group = orderedGrouped.find((g) => g.clubId === clubId)
    if (!group) return
    const ids = group.players.map((p) => p.id)
    const oldIdx = ids.indexOf(active.id as string)
    const newIdx = ids.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return
    const newIds = [...ids]
    newIds.splice(oldIdx, 1)
    newIds.splice(newIdx, 0, active.id as string)
    const newOrder = { ...(data.playerOrder ?? {}), [clubId]: newIds }
    const newData = { ...data, playerOrder: newOrder }
    setData(newData)
    window.electronAPI?.saveData(newData)
  }, [data, orderedGrouped])

  const handleDragStart = useCallback(() => {
    document.documentElement.style.overflow = 'hidden'
  }, [])

  const handleDragEndWithScroll = useCallback((clubId: string, event: DragEndEvent) => {
    document.documentElement.style.overflow = ''
    handleDragEnd(clubId, event)
  }, [handleDragEnd])

  const handleDragCancel = useCallback(() => {
    document.documentElement.style.overflow = ''
  }, [])

  const statusMessage = useMemo(() => {
    if (presenting.kind === 'idle') return 'Program output: idle'
    if (presenting.kind === 'club') return `Club: ${presenting.label}`
    if (presenting.kind === 'matchup') return `Matchup: ${presenting.label}`
    if (presenting.kind === 'player') return `Presenting: ${presenting.label}`
    if (presenting.kind === 'officials') return `Officials`
    return `Sponsor stack: ${presenting.label}`
  }, [presenting])


  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-base text-txt-primary">

      {/* ═══ HEADER ═══ */}
      <header className="shrink-0 border-b border-border-subtle bg-surface/60 backdrop-blur-sm">
        <div className="flex items-center gap-5 px-10 py-4">
          <h1 className="text-xl font-bold tracking-tight">Control Panel</h1>
          <div
            className="flex items-center gap-2.5 px-2 py-1.5 text-xs font-medium"
            title={isLive ? 'Program output is active' : 'No live output'}
          >
            <span
              className={[
                'inline-block size-2 rounded-full',
                isLive
                  ? 'animate-pulse bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]'
                  : 'bg-txt-tertiary',
              ].join(' ')}
            />
            <span className={isLive ? 'text-emerald-300' : 'text-txt-tertiary'}>LIVE</span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-xl border border-border-default bg-raised px-3.5 py-2 text-xs font-medium text-txt-secondary transition hover:border-border-strong hover:text-txt-primary"
            >
              <svg
                className={['size-3.5 transition-transform duration-200', settingsOpen ? 'rotate-180' : ''].join(' ')}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
              Settings
            </button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={sendClear}
              disabled={!api}
              className="rounded-2xl border border-border-default bg-raised px-5 py-2.5 text-sm font-medium text-txt-secondary transition hover:border-border-strong hover:text-txt-primary disabled:opacity-40"
            >
              Clear
            </motion.button>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={sendStop}
              disabled={!api}
              className="rounded-2xl border border-red-900/50 bg-red-950/40 px-5 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-900/40 disabled:opacity-40"
            >
              Stop
            </motion.button>
          </div>
        </div>
      </header>

      {/* ═══ COLLAPSIBLE SETTINGS ═══ */}
      <div
        className={[
          'shrink-0 overflow-hidden border-b border-border-subtle bg-surface/40 transition-all duration-200',
          settingsOpen ? 'max-h-[200px] opacity-100' : 'max-h-0 opacity-0',
        ].join(' ')}
      >
        {data && (
          <div className="flex flex-col gap-3 px-10 py-4">
            {/* Row 1 — Match setup */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-txt-tertiary">Match</span>
              <select
                value={homeClubId}
                onChange={(e) => setHomeClubId(e.target.value)}
                className="rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Home</option>
                {data.clubs
                  .filter((c) => c.id !== awayClubId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <span className="text-[10px] text-txt-tertiary">vs</span>
              <select
                value={awayClubId}
                onChange={(e) => setAwayClubId(e.target.value)}
                className="rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Away</option>
                {data.clubs
                  .filter((c) => c.id !== homeClubId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              {(homeClubId || awayClubId) && (
                <button
                  type="button"
                  onClick={() => { setHomeClubId(''); setAwayClubId('') }}
                  className="text-[10px] text-txt-tertiary transition hover:text-txt-secondary"
                >
                  reset
                </button>
              )}
            </div>

            {/* Row 2 — Match label */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-txt-tertiary">Title</span>
              <input
                type="text"
                value={matchLabel}
                onChange={(e) => setMatchLabel(e.target.value)}
                placeholder="Match"
                className="w-40 rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            {/* Row 3 — Officials */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[10px] font-bold uppercase tracking-wider text-txt-tertiary">Officials</span>
              <select
                value={referee1Id}
                onChange={(e) => setReferee1Id(e.target.value)}
                className="rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Ref 1</option>
                {data.officials
                  .filter((o) => o.role === 'referee' && o.id !== referee2Id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
              </select>
              <select
                value={referee2Id}
                onChange={(e) => setReferee2Id(e.target.value)}
                className="rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Ref 2</option>
                {data.officials
                  .filter((o) => o.role === 'referee' && o.id !== referee1Id)
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
              </select>
              <select
                value={delegateId}
                onChange={(e) => setDelegateId(e.target.value)}
                className="rounded-lg border border-border-default bg-raised px-2.5 py-1 text-xs text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="">Delegate</option>
                {data.officials
                  .filter((o) => o.role === 'delegate')
                  .map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
              </select>
              {(referee1Id || referee2Id || delegateId) && (
                <button
                  type="button"
                  onClick={() => { setReferee1Id(''); setReferee2Id(''); setDelegateId('') }}
                  className="text-[10px] text-txt-tertiary transition hover:text-txt-secondary"
                >
                  reset
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ TABS ═══ */}
      <div className="shrink-0 px-10 py-3">
        <div className="flex gap-3">
          {(
            [
              { id: 'clubs' as const, label: 'Clubs', color: 'bg-sky-600' },
              { id: 'players' as const, label: 'Players', color: 'bg-emerald-600' },
              { id: 'officials' as const, label: 'Officials', color: 'bg-rose-600' },
              { id: 'sponsors' as const, label: 'Stacks', color: 'bg-violet-600' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={[
                'relative rounded-xl px-6 py-3 text-sm font-semibold tracking-wide text-white transition',
                t.color,
                tab === t.id
                  ? 'opacity-100 shadow-lg'
                  : 'opacity-40 hover:opacity-70',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-10 py-5">
          {loadError && (
            <div className="mb-6 rounded-2xl border border-amber-800/50 bg-amber-950/30 px-6 py-4 text-sm text-amber-100">
              {loadError}
            </div>
          )}

          {!data && !loadError && (
            <div className="flex h-48 items-center justify-center text-txt-tertiary">Loading roster…</div>
          )}

          {data && (
            <AnimatePresence mode="wait">
              {tab === 'clubs' && (
                <motion.div
                  key="clubs"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {(!homeClubId || !awayClubId) ? (
                    <p className="py-6 text-center text-sm text-txt-tertiary">Select both clubs in the match setup above</p>
                  ) : (() => {
                    const homeClub = data.clubs.find((c) => c.id === homeClubId)
                    const awayClub = data.clubs.find((c) => c.id === awayClubId)
                    if (!homeClub || !awayClub) return null
                    const isMatchupActive = presenting.kind === 'matchup'
                    const isHomeClubActive = presenting.kind === 'club' && presenting.clubId === homeClub.id
                    const isAwayClubActive = presenting.kind === 'club' && presenting.clubId === awayClub.id
                    return (
                      <div className="flex flex-col gap-4">
                        {/* Matchup card */}
                        <div
                          onClick={() => showMatchup()}
                          className={[
                            'group relative cursor-pointer rounded-2xl border p-6 transition',
                            'bg-surface hover:bg-raised',
                            isMatchupActive
                              ? 'border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.2)] ring-1 ring-emerald-400/80'
                              : 'border-border-subtle hover:border-border-strong',
                          ].join(' ')}
                        >
                          {isMatchupActive && (
                            <span className="absolute right-3 top-3 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                              Live
                            </span>
                          )}
                          <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-txt-tertiary">
                            Match
                          </p>
                          <div className="flex items-center justify-center gap-8">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl">
                                <ElectronImage filename={homeClub.logoPath} alt={homeClub.name} className="size-full" fit="contain" />
                              </div>
                              <p className="max-w-[120px] truncate text-center text-sm font-semibold">{homeClub.name}</p>
                            </div>
                            <span className="text-lg font-black text-txt-tertiary">VS</span>
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl">
                                <ElectronImage filename={awayClub.logoPath} alt={awayClub.name} className="size-full" fit="contain" />
                              </div>
                              <p className="max-w-[120px] truncate text-center text-sm font-semibold">{awayClub.name}</p>
                            </div>
                          </div>
                        </div>
                        {/* Individual club cards */}
                        <div className="grid grid-cols-2 gap-4">
                          {[homeClub, awayClub].map((club) => {
                            const isActive =
                              (club === homeClub && isHomeClubActive) ||
                              (club === awayClub && isAwayClubActive)
                            const playerCount = data.players.filter((p) => p.clubId === club.id).length
                            return (
                              <div
                                key={club.id}
                                onClick={() => showClub(club)}
                                className={[
                                  'group relative cursor-pointer rounded-2xl border p-4 transition',
                                  'bg-surface hover:bg-raised',
                                  isActive
                                    ? 'border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.2)] ring-1 ring-emerald-400/80'
                                    : 'border-border-subtle hover:border-border-strong',
                                ].join(' ')}
                              >
                                <div className="mx-auto mb-3 flex size-14 items-center justify-center overflow-hidden rounded-xl">
                                  <ElectronImage filename={club.logoPath} alt={club.name} className="size-full" fit="contain" />
                                </div>
                                {isActive && (
                                  <span className="absolute right-2 top-2 text-[9px] font-bold uppercase tracking-wide text-emerald-400">Live</span>
                                )}
                                <h3 className="truncate text-center text-sm font-semibold">{club.name}</h3>
                                <p className="mt-0.5 text-center text-[10px] text-txt-tertiary">
                                  {playerCount} player{playerCount === 1 ? '' : 's'}
                                </p>
                                <div
                                  className="mx-auto mt-2 h-0.5 w-6 rounded-full opacity-0 transition group-hover:opacity-100"
                                  style={{ background: club.color }}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {tab === 'players' && (
                <motion.div
                  key="players"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedClubIds.size === 0 ? (
                    <p className="py-6 text-center text-sm text-txt-tertiary">Pick two clubs above to filter players</p>
                  ) : filteredPlayers.length === 0 ? (
                    <p className="text-txt-tertiary">No players for the selected clubs.</p>
                  ) : (
                    <div className="flex flex-col gap-10">
                      {orderedGrouped.map(({ clubId, players }) => {
                        const club = clubById.get(clubId)
                        const clubLive = presenting.kind === 'club' && club && presenting.clubId === club.id
                        const itemIds = players.map((p) => p.id)
                        return (
                          <div key={clubId}>
                            <button
                              type="button"
                              onClick={() => club && showClub(club)}
                              disabled={!club}
                              className={[
                                'mb-4 flex items-center gap-3 rounded-xl px-3 py-2 transition',
                                club ? 'cursor-pointer hover:bg-raised' : '',
                                clubLive ? 'ring-1 ring-emerald-400/80 bg-raised' : '',
                              ].join(' ')}
                            >
                              {club ? (
                                <>
                                  <div className="size-8 shrink-0 overflow-hidden rounded-lg">
                                    <ElectronImage filename={club.logoPath} alt="" className="size-full" fit="contain" />
                                  </div>
                                  <h3 className="text-sm font-semibold text-txt-primary">{club.name}</h3>
                                  <div className="ml-1 size-2.5 rounded-full" style={{ background: club.color }} />
                                </>
                              ) : (
                                <h3 className="text-sm font-semibold text-txt-secondary">No club</h3>
                              )}
                              <span className="text-xs text-txt-tertiary">
                                {players.length} player{players.length === 1 ? '' : 's'}
                              </span>
                              {clubLive && (
                                <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-emerald-400">Live</span>
                              )}
                            </button>
                            <DndContext
                              sensors={dndSensors}
                              collisionDetection={closestCenter}
                              onDragStart={handleDragStart}
                              onDragEnd={(e) => handleDragEndWithScroll(clubId, e)}
                              onDragCancel={handleDragCancel}
                            >
                              <SortableContext items={itemIds} strategy={rectSortingStrategy}>
                                <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                                  {players.map((player) => (
                                    <SortablePlayerCard
                                      key={player.id}
                                      player={player}
                                      club={club}
                                      isActive={
                                        presenting.kind === 'player' && presenting.playerId === player.id
                                      }
                                      onClick={() => showPlayer(player)}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'officials' && (
                <motion.div
                  key="officials"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {!allOfficialsSelected ? (
                    <p className="py-6 text-center text-sm text-txt-tertiary">
                      Select two referees and a delegate in the toolbar above to present officials
                    </p>
                  ) : (() => {
                    const ref1 = data.officials.find((o) => o.id === referee1Id)
                    const ref2 = data.officials.find((o) => o.id === referee2Id)
                    const del = data.officials.find((o) => o.id === delegateId)
                    const isActive = presenting.kind === 'officials'
                    return (
                      <div
                        onClick={() => showOfficials()}
                        className={[
                          'group relative mx-auto max-w-sm cursor-pointer rounded-2xl border p-6 transition',
                          'bg-surface hover:bg-raised',
                          isActive
                            ? 'border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.2)] ring-1 ring-emerald-400/80'
                            : 'border-border-subtle hover:border-border-strong',
                        ].join(' ')}
                      >
                        {isActive && (
                          <span className="absolute right-3 top-3 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                            Live
                          </span>
                        )}
                        <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-txt-tertiary">
                          Match Officials
                        </p>
                        <div className="mb-4 flex justify-center gap-8">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">R</div>
                            <p className="max-w-[100px] truncate text-center text-xs font-semibold">{ref1?.name ?? '—'}</p>
                            <p className="text-[9px] text-txt-tertiary">Referee</p>
                          </div>
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-400">R</div>
                            <p className="max-w-[100px] truncate text-center text-xs font-semibold">{ref2?.name ?? '—'}</p>
                            <p className="text-[9px] text-txt-tertiary">Referee</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex size-10 items-center justify-center rounded-full bg-cyan-500/15 text-xs font-bold text-cyan-400">D</div>
                          <p className="max-w-[140px] truncate text-center text-xs font-semibold">{del?.name ?? '—'}</p>
                          <p className="text-[9px] text-txt-tertiary">Delegate</p>
                        </div>
                      </div>
                    )
                  })()}
                </motion.div>
              )}

              {tab === 'sponsors' && (
                <motion.div
                  key="sponsors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {data.sponsorStacks.length === 0 ? (
                    <p className="text-txt-tertiary">No sponsor stacks configured.</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-4">
                      {data.sponsorStacks.map((stack) => {
                        const previewIds = stack.sponsorIds.slice(0, 4)
                        const isActive =
                          presenting.kind === 'sponsors' && presenting.stackId === stack.id
                        return (
                          <motion.li
                            key={stack.id}
                            layout
                            onClick={() => api && showSponsors(stack)}
                            className={[
                              'relative cursor-pointer rounded-2xl border p-4 transition',
                              'bg-surface hover:bg-raised',
                              isActive
                                ? 'border-emerald-500/50 shadow-[0_0_16px_rgba(52,211,153,0.2)] ring-1 ring-emerald-400/80'
                                : 'border-border-subtle hover:border-border-strong',
                            ].join(' ')}
                          >
                            {isActive && (
                              <span className="absolute right-2 top-2 text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                                Live
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <h2 className="truncate text-sm font-semibold">{stack.name}</h2>
                            </div>
                            <p className="mt-1 text-xs text-txt-tertiary">
                              {stack.sponsorIds.length} sponsor{stack.sponsorIds.length === 1 ? '' : 's'} · <span className="font-mono text-txt-secondary">{stack.animationVariant}</span>
                            </p>
                            <AnimationThumbnail variant={stack.animationVariant} className="mt-3" />
                            <div className="mt-3 flex flex-wrap gap-3">
                              {previewIds.map((id) => {
                                const sp = sponsorById.get(id)
                                return (
                                  <div
                                    key={id}
                                    className="size-9 overflow-hidden rounded-lg"
                                    title={sp?.name ?? id}
                                  >
                                    {sp ? (
                                      <ElectronImage
                                        filename={sp.imagePath}
                                        alt={sp.name}
                                        className="size-full"
                                        fit="contain"
                                      />
                                    ) : (
                                      <div className="flex size-full items-center justify-center text-[10px] text-txt-tertiary">
                                        ?
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                              {stack.sponsorIds.length > 4 && (
                                <div className="flex size-9 items-center justify-center rounded-lg text-[10px] font-bold text-txt-tertiary">
                                  +{stack.sponsorIds.length - 4}
                                </div>
                              )}
                            </div>
                          </motion.li>
                        )
                      })}
                    </ul>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="shrink-0 border-t border-border-subtle bg-surface/60">
        <div className="px-10 py-4">
          <p className="truncate text-sm text-txt-tertiary">
            <span className="font-medium text-txt-secondary">Status · </span>
            {statusMessage}
          </p>
        </div>
      </footer>
    </div>
  )
}

export default ControlPanel
