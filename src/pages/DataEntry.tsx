import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { AppData, Club, Player, Official, Sponsor, SponsorStack } from '@/types'
import { ClubForm } from '@/components/ClubForm'
import { PlayerForm } from '@/components/PlayerForm'
import { OfficialForm } from '@/components/OfficialForm'
import { SponsorForm } from '@/components/SponsorForm'
import { SponsorStackEditor } from '@/components/SponsorStackEditor'
import { ThumbnailImage } from '@/components/ThumbnailImage'
import { deleteImageFile } from '@/hooks/useIPC'
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

const emptyData: AppData = {
  clubs: [],
  players: [],
  officials: [],
  sponsors: [],
  sponsorStacks: [],
}

type TabId = 'clubs' | 'players' | 'officials' | 'sponsors' | 'stacks'

const tabs: { id: TabId; label: string; color: string }[] = [
  { id: 'clubs', label: 'Clubs', color: 'bg-sky-600' },
  { id: 'players', label: 'Players', color: 'bg-emerald-600' },
  { id: 'officials', label: 'Officials', color: 'bg-rose-600' },
  { id: 'sponsors', label: 'Sponsors', color: 'bg-amber-600' },
  { id: 'stacks', label: 'Stacks', color: 'bg-violet-600' },
]

function EmptyState({ title, onAction }: { title: string; description?: string; action?: string; onAction: () => void }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-border-default px-5 py-4">
      <button
        type="button"
        onClick={onAction}
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-white transition hover:bg-accent-hover"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <p className="text-sm text-txt-tertiary">{title}</p>
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold tracking-tight text-txt-primary">{title}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-txt-tertiary">{subtitle}</p>
    </div>
  )
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="grid w-0 shrink-0 overflow-hidden transition-all duration-200 ease-out group-hover:w-16">
      <div className="flex flex-col items-end gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/10"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

function SortablePlayerItem({
  player,
  club,
  clubName,
  onEdit,
  onDelete,
}: {
  player: Player
  club: Club | undefined
  clubName: string
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: player.id })
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group overflow-hidden rounded-2xl border border-border-subtle bg-surface hover:border-border-strong hover:bg-raised"
    >
      <div className="flex items-center gap-5 p-5">
        <div
          {...attributes}
          {...listeners}
          className="flex shrink-0 cursor-grab items-center text-txt-tertiary active:cursor-grabbing"
        >
          <svg className="size-4" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" /><circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" /><circle cx="11" cy="13" r="1.5" />
          </svg>
        </div>
        <div className="size-[72px] shrink-0 overflow-hidden rounded-2xl">
          <ThumbnailImage filename={player.imagePath} alt="" className="size-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{player.name}</p>
          <div className="mt-1.5 flex items-center gap-2.5">
            <div className="size-6 shrink-0 overflow-hidden rounded-md">
              {club?.logoPath && (
                <ThumbnailImage filename={club.logoPath} alt="" className="size-full" fit="contain" />
              )}
            </div>
            <p className="truncate text-xs text-txt-secondary">{clubName}</p>
          </div>
        </div>
        <CardActions onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  )
}

export function DataEntry() {
  const [data, setData] = useState<AppData>(emptyData)
  const [hydrated, setHydrated] = useState(false)
  const [tab, setTab] = useState<TabId>('clubs')

  const [clubFormOpen, setClubFormOpen] = useState(false)
  const [editingClub, setEditingClub] = useState<Club | null>(null)

  const [playerFormOpen, setPlayerFormOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  const [officialFormOpen, setOfficialFormOpen] = useState(false)
  const [editingOfficial, setEditingOfficial] = useState<Official | null>(null)

  const [sponsorFormOpen, setSponsorFormOpen] = useState(false)
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null)

  const [stackFormOpen, setStackFormOpen] = useState(false)
  const [editingStack, setEditingStack] = useState<SponsorStack | null>(null)

  const [playerSearch, setPlayerSearch] = useState('')
  const [playerClubFilter, setPlayerClubFilter] = useState<Set<string>>(new Set())

  const loadFreshData = useCallback(() => {
    window.electronAPI
      ?.loadData()
      .then((loaded) => {
        if (!loaded) return
        setData({
          clubs: loaded.clubs ?? [],
          players: loaded.players ?? [],
          officials: loaded.officials ?? [],
          sponsors: loaded.sponsors ?? [],
          sponsorStacks: loaded.sponsorStacks ?? [],
          playerOrder: loaded.playerOrder,
        })
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    window.electronAPI
      ?.loadData()
      .then((loaded) => {
        if (!alive) return
        setData({
          clubs: loaded?.clubs ?? [],
          players: loaded?.players ?? [],
          officials: loaded?.officials ?? [],
          sponsors: loaded?.sponsors ?? [],
          sponsorStacks: loaded?.sponsorStacks ?? [],
          playerOrder: loaded?.playerOrder,
        })
      })
      .catch(() => {
        if (!alive) return
        setData(emptyData)
      })
      .finally(() => {
        if (alive) setHydrated(true)
      })

    const unsub = window.electronAPI?.onDataUpdate?.((updated) => {
      if (!alive) return
      setData(updated)
    })

    const onVisible = () => {
      if (document.visibilityState === 'visible') loadFreshData()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      unsub?.()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadFreshData])

  const persist = useCallback((next: AppData) => {
    setData(next)
    void window.electronAPI?.saveData(next)
  }, [])

  const canStartPresentation = data.players.length > 0 || data.sponsors.length > 0

  const startPresentation = () => {
    if (!canStartPresentation) return
    window.electronAPI?.startPresentation()
  }

  const openAddClub = () => { setEditingClub(null); setClubFormOpen(true) }
  const openEditClub = (c: Club) => { setEditingClub(c); setClubFormOpen(true) }
  const saveClub = (club: Club) => {
    const existing = data.clubs.find((c) => c.id === club.id)
    if (existing && existing.logoPath && existing.logoPath !== club.logoPath) {
      deleteImageFile(existing.logoPath)
    }
    const clubs = existing ? data.clubs.map((c) => (c.id === club.id ? club : c)) : [...data.clubs, club]
    persist({ ...data, clubs })
  }
  const deleteClub = (id: string) => {
    if (data.players.some((p) => p.clubId === id)) {
      window.alert('Cannot delete a club that still has players assigned. Reassign or remove those players first.')
      return
    }
    if (!window.confirm('Delete this club?')) return
    const club = data.clubs.find((c) => c.id === id)
    if (club?.logoPath) deleteImageFile(club.logoPath)
    persist({ ...data, clubs: data.clubs.filter((c) => c.id !== id) })
  }

  const openAddPlayer = () => { setEditingPlayer(null); setPlayerFormOpen(true) }
  const openEditPlayer = (p: Player) => { setEditingPlayer(p); setPlayerFormOpen(true) }
  const savePlayer = (player: Player) => {
    const existing = data.players.find((p) => p.id === player.id)
    if (existing && existing.imagePath && existing.imagePath !== player.imagePath) {
      deleteImageFile(existing.imagePath)
    }
    const players = existing
      ? data.players.map((p) => (p.id === player.id ? player : p))
      : [...data.players, player]
    persist({ ...data, players })
  }
  const deletePlayer = (id: string) => {
    if (!window.confirm('Delete this player?')) return
    const player = data.players.find((p) => p.id === id)
    if (player?.imagePath) deleteImageFile(player.imagePath)
    persist({ ...data, players: data.players.filter((p) => p.id !== id) })
  }

  const openAddOfficial = () => { setEditingOfficial(null); setOfficialFormOpen(true) }
  const openEditOfficial = (o: Official) => { setEditingOfficial(o); setOfficialFormOpen(true) }
  const saveOfficial = (official: Official) => {
    const exists = data.officials.some((o) => o.id === official.id)
    const officials = exists
      ? data.officials.map((o) => (o.id === official.id ? official : o))
      : [...data.officials, official]
    persist({ ...data, officials })
  }
  const deleteOfficial = (id: string) => {
    if (!window.confirm('Delete this official?')) return
    persist({ ...data, officials: data.officials.filter((o) => o.id !== id) })
  }

  const openAddSponsor = () => { setEditingSponsor(null); setSponsorFormOpen(true) }
  const openEditSponsor = (s: Sponsor) => { setEditingSponsor(s); setSponsorFormOpen(true) }
  const saveSponsor = (sponsor: Sponsor) => {
    const existing = data.sponsors.find((s) => s.id === sponsor.id)
    if (existing && existing.imagePath && existing.imagePath !== sponsor.imagePath) {
      deleteImageFile(existing.imagePath)
    }
    const sponsors = existing
      ? data.sponsors.map((s) => (s.id === sponsor.id ? sponsor : s))
      : [...data.sponsors, sponsor]
    persist({ ...data, sponsors })
  }
  const deleteSponsor = (id: string) => {
    if (!window.confirm('Delete this sponsor? It will be removed from any stacks that reference it.')) return
    const sponsor = data.sponsors.find((s) => s.id === id)
    if (sponsor?.imagePath) deleteImageFile(sponsor.imagePath)
    const sponsorStacks = data.sponsorStacks.map((stack) => ({
      ...stack,
      sponsorIds: stack.sponsorIds.filter((sid) => sid !== id),
    }))
    persist({ ...data, sponsors: data.sponsors.filter((s) => s.id !== id), sponsorStacks })
  }

  const openAddStack = () => { setEditingStack(null); setStackFormOpen(true) }
  const openEditStack = (s: SponsorStack) => { setEditingStack(s); setStackFormOpen(true) }
  const saveStack = (stack: SponsorStack) => {
    const exists = data.sponsorStacks.some((s) => s.id === stack.id)
    const sponsorStacks = exists
      ? data.sponsorStacks.map((s) => (s.id === stack.id ? stack : s))
      : [...data.sponsorStacks, stack]
    persist({ ...data, sponsorStacks })
  }
  const deleteStack = (id: string) => {
    persist({ ...data, sponsorStacks: data.sponsorStacks.filter((s) => s.id !== id) })
  }

  const clubName = (id: string) => data.clubs.find((c) => c.id === id)?.name ?? 'Unknown club'

  const toggleClubFilter = useCallback((clubId: string) => {
    setPlayerClubFilter((prev) => {
      const next = new Set(prev)
      if (next.has(clubId)) next.delete(clubId)
      else next.add(clubId)
      return next
    })
  }, [])

  const filteredPlayers = useMemo(() => {
    let result = data.players
    if (playerClubFilter.size > 0) {
      result = result.filter((p) => playerClubFilter.has(p.clubId))
    }
    if (playerSearch.trim()) {
      const q = playerSearch.trim().toLowerCase()
      result = result.filter((p) => p.name.toLowerCase().includes(q))
    }
    return result
  }, [data.players, playerClubFilter, playerSearch])

  const groupedPlayers = useMemo(() => {
    const grouped = new Map<string, Player[]>()
    for (const p of filteredPlayers) {
      const key = p.clubId || '_none'
      const arr = grouped.get(key)
      if (arr) arr.push(p)
      else grouped.set(key, [p])
    }
    const order = data.playerOrder ?? {}
    for (const [clubId, players] of grouped) {
      const clubOrder = order[clubId]
      if (clubOrder && clubOrder.length > 0) {
        const posMap = new Map(clubOrder.map((id, i) => [id, i]))
        players.sort((a, b) => {
          const ai = posMap.get(a.id) ?? Infinity
          const bi = posMap.get(b.id) ?? Infinity
          if (ai !== Infinity || bi !== Infinity) return ai - bi
          return a.name.localeCompare(b.name)
        })
      } else {
        players.sort((a, b) => a.name.localeCompare(b.name))
      }
    }
    return grouped
  }, [filteredPlayers, data.playerOrder])

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handlePlayerDragEnd = useCallback(
    (clubId: string) => (event: DragEndEvent) => {
      document.documentElement.style.overflow = ''
      const { active, over } = event
      if (!over || active.id === over.id) return
      const players = groupedPlayers.get(clubId)
      if (!players) return
      const ids = players.map((p) => p.id)
      const oldIdx = ids.indexOf(active.id as string)
      const newIdx = ids.indexOf(over.id as string)
      if (oldIdx === -1 || newIdx === -1) return
      const newIds = [...ids]
      newIds.splice(oldIdx, 1)
      newIds.splice(newIdx, 0, active.id as string)
      const newOrder = { ...(data.playerOrder ?? {}), [clubId]: newIds }
      persist({ ...data, playerOrder: newOrder })
    },
    [groupedPlayers, data, persist],
  )

  const handlePlayerDragStart = useCallback(() => {
    document.documentElement.style.overflow = 'hidden'
  }, [])

  const handlePlayerDragCancel = useCallback(() => {
    document.documentElement.style.overflow = ''
  }, [])

  const tabCounts: Record<TabId, number> = {
    clubs: data.clubs.length,
    players: data.players.length,
    officials: data.officials.length,
    sponsors: data.sponsors.length,
    stacks: data.sponsorStacks.length,
  }

  return (
    <div className="flex h-full w-full flex-col bg-base text-txt-primary">

      {/* ═══ HEADER ═══ */}
      <header className="relative shrink-0 overflow-hidden border-b border-border-subtle">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/8 via-transparent to-indigo-600/4" />
        <div className="absolute -right-32 -top-32 size-80 rounded-full bg-blue-500/[0.03] blur-[80px]" />
        <div className="relative flex items-center justify-between gap-6 px-10 py-7">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Presentation Manager</h1>
            <p className="mt-1 text-sm text-txt-tertiary">Configure your lineup, sponsors and stacks before going live.</p>
          </div>
          <motion.button
            type="button"
            onClick={startPresentation}
            disabled={!canStartPresentation}
            whileHover={canStartPresentation ? { scale: 1.03 } : {}}
            whileTap={canStartPresentation ? { scale: 0.97 } : {}}
            className="relative shrink-0 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none"
          >
            <span className="relative z-10">Start Presentation</span>
            {canStartPresentation && (
              <motion.span
                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        </div>
      </header>

      {/* ═══ TABS ═══ */}
      <div className="shrink-0 px-10 py-3">
        <div className="flex gap-3" role="tablist" aria-label="Data sections">
          {tabs.map((t) => {
            const isActive = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={[
                  'relative rounded-xl px-6 py-3 text-sm font-semibold tracking-wide text-white transition',
                  t.color,
                  isActive
                    ? 'opacity-100 shadow-lg'
                    : 'opacity-40 hover:opacity-70',
                ].join(' ')}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="px-10 pt-5 pb-24">
          {!hydrated ? (
            <div className="flex h-48 items-center justify-center">
              <div className="size-7 animate-spin rounded-full border-2 border-border-default border-t-accent" />
            </div>
          ) : (
            <AnimatePresence mode="wait">

              {/* ── CLUBS ── */}
              {tab === 'clubs' && (
                <motion.section
                  key="clubs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-labelledby="clubs-heading"
                >
                  <SectionHeader title="Clubs" subtitle="Add team logos and names. Players are linked to clubs." />

                  {data.clubs.length === 0 ? (
                    <EmptyState
                      title="No clubs yet — add your first club"
                      onAction={openAddClub}
                    />
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {data.clubs.map((c) => (
                        <li
                          key={c.id}
                          className="group flex items-center gap-5 rounded-2xl border border-border-subtle bg-surface p-5 transition hover:border-border-strong hover:bg-raised"
                        >
                          <div className="size-16 shrink-0 overflow-hidden rounded-2xl">
                            <ThumbnailImage filename={c.logoPath} alt="" className="size-full" fit="contain" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{c.name}</p>
                            <p className="mt-1 truncate text-xs text-txt-tertiary">
                              {data.players.filter(p => p.clubId === c.id).length} player(s)
                            </p>
                          </div>
                          <CardActions onEdit={() => openEditClub(c)} onDelete={() => deleteClub(c.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.section>
              )}

              {/* ── PLAYERS ── */}
              {tab === 'players' && (
                <motion.section
                  key="players"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-labelledby="players-heading"
                >
                  <SectionHeader title="Players" subtitle="Add player photos and assign them to a club." />

                  {data.players.length === 0 ? (
                    <EmptyState
                      title={data.clubs.length === 0 ? 'Add clubs first' : 'No players yet — add your first player'}
                      onAction={data.clubs.length === 0 ? () => setTab('clubs') : openAddPlayer}
                    />
                  ) : (
                    <>
                      {/* ── Search + club filter toolbar ── */}
                      <div className="mb-8 flex flex-col gap-4">
                        <input
                          type="text"
                          value={playerSearch}
                          onChange={(e) => setPlayerSearch(e.target.value)}
                          placeholder="Search players…"
                          className="w-full rounded-2xl border border-border-default bg-raised px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        {data.clubs.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {data.clubs.map((c) => {
                              const selected = playerClubFilter.has(c.id)
                              return (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => toggleClubFilter(c.id)}
                                  className={[
                                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition',
                                    selected
                                      ? 'bg-accent/20 text-accent ring-1 ring-accent/40'
                                      : 'text-txt-tertiary hover:bg-white/[0.04] hover:text-txt-secondary',
                                  ].join(' ')}
                                >
                                  <div className="size-5 shrink-0 overflow-hidden rounded-full">
                                    <ThumbnailImage filename={c.logoPath} alt="" className="size-full" fit="contain" />
                                  </div>
                                  {c.name}
                                </button>
                              )
                            })}
                            {playerClubFilter.size > 0 && (
                              <button
                                type="button"
                                onClick={() => setPlayerClubFilter(new Set())}
                                className="px-2 py-1.5 text-[10px] text-txt-tertiary transition hover:text-txt-secondary"
                              >
                                clear
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Grouped player list ── */}
                      {filteredPlayers.length === 0 ? (
                        <p className="py-6 text-center text-sm text-txt-tertiary">No players match your search or filter.</p>
                      ) : (
                        <div className="flex flex-col gap-10">
                          {[...groupedPlayers.entries()].map(([clubId, players]) => {
                            const club = data.clubs.find((c) => c.id === clubId)
                            const playerIds = players.map((p) => p.id)
                            return (
                              <div key={clubId}>
                                <div className="mb-4 flex items-center gap-3">
                                  {club ? (
                                    <>
                                      <div className="size-8 shrink-0 overflow-hidden rounded-lg">
                                        <ThumbnailImage filename={club.logoPath} alt="" className="size-full" fit="contain" />
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
                                </div>
                                <DndContext
                                  sensors={dndSensors}
                                  collisionDetection={closestCenter}
                                  onDragStart={handlePlayerDragStart}
                                  onDragEnd={handlePlayerDragEnd(clubId)}
                                  onDragCancel={handlePlayerDragCancel}
                                >
                                  <SortableContext items={playerIds} strategy={rectSortingStrategy}>
                                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                      {players.map((p) => (
                                        <SortablePlayerItem
                                          key={p.id}
                                          player={p}
                                          club={club}
                                          clubName={clubName(p.clubId)}
                                          onEdit={() => openEditPlayer(p)}
                                          onDelete={() => deletePlayer(p.id)}
                                        />
                                      ))}
                                    </ul>
                                  </SortableContext>
                                </DndContext>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </motion.section>
              )}

              {/* ── OFFICIALS ── */}
              {tab === 'officials' && (
                <motion.section
                  key="officials"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-labelledby="officials-heading"
                >
                  <SectionHeader title="Officials" subtitle="Add match officials — referees and delegates." />

                  {data.officials.length === 0 ? (
                    <EmptyState
                      title="No officials yet — add your first official"
                      onAction={openAddOfficial}
                    />
                  ) : (
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {data.officials.map((o) => (
                        <li
                          key={o.id}
                          className="group flex items-center gap-5 rounded-2xl border border-border-subtle bg-surface p-5 transition hover:border-border-strong hover:bg-raised"
                        >
                          <div className={[
                            'flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase',
                            o.role === 'referee'
                              ? 'bg-amber-500/15 text-amber-400'
                              : 'bg-cyan-500/15 text-cyan-400',
                          ].join(' ')}>
                            {o.role === 'referee' ? 'R' : 'D'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{o.name}</p>
                            <p className="mt-1 text-xs capitalize text-txt-tertiary">{o.role}</p>
                          </div>
                          <CardActions onEdit={() => openEditOfficial(o)} onDelete={() => deleteOfficial(o.id)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </motion.section>
              )}

              {/* ── SPONSORS ── */}
              {tab === 'sponsors' && (
                <motion.section
                  key="sponsors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-labelledby="sponsors-heading"
                >
                  <SectionHeader title="Sponsors" subtitle="Upload sponsor logos and names. Group them into stacks for presentation." />

                  {data.sponsors.length === 0 ? (
                    <EmptyState
                      title="No sponsors yet — add your first sponsor"
                      onAction={openAddSponsor}
                    />
                  ) : (
                    <div className="flex flex-col gap-10">
                      {(['platinum', 'gold', 'silver'] as const).map((tier) => {
                        const tierSponsors = data.sponsors.filter((s) => s.tier === tier)
                        if (tierSponsors.length === 0) return null
                        const tierLabel = tier === 'platinum' ? 'Platinum' : tier === 'gold' ? 'Gold' : 'Silver'
                        const tierColor = tier === 'platinum' ? '#c0c8d8' : tier === 'gold' ? '#d4a843' : '#a0a8b4'
                        return (
                          <div key={tier}>
                            <div className="mb-4 flex items-center gap-3">
                              <div className="size-2.5 rounded-full" style={{ background: tierColor }} />
                              <h3 className="text-sm font-semibold" style={{ color: tierColor }}>{tierLabel}</h3>
                              <span className="text-xs text-txt-tertiary">
                                {tierSponsors.length} sponsor{tierSponsors.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                              {tierSponsors.map((s) => (
                                <li
                                  key={s.id}
                                  className="group flex items-center gap-5 rounded-2xl border border-border-subtle bg-surface p-5 transition hover:border-border-strong hover:bg-raised"
                                >
                                  <div className="size-16 shrink-0 overflow-hidden rounded-2xl">
                                    <ThumbnailImage filename={s.imagePath} alt="" className="size-full" fit="contain" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-semibold">{s.name}</p>
                                    <p className="mt-1 truncate text-xs text-txt-tertiary">
                                      In {data.sponsorStacks.filter(st => st.sponsorIds.includes(s.id)).length} stack(s)
                                    </p>
                                  </div>
                                  <CardActions onEdit={() => openEditSponsor(s)} onDelete={() => deleteSponsor(s.id)} />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </motion.section>
              )}

              {/* ── SPONSOR STACKS ── */}
              {tab === 'stacks' && (
                <motion.section
                  key="stacks"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  aria-labelledby="stacks-heading"
                >
                  <SectionHeader title="Sponsor Stacks" subtitle="Group sponsors together with an animation style for presentation." />

                  {data.sponsorStacks.length === 0 ? (
                    <EmptyState
                      title={data.sponsors.length === 0 ? 'Add sponsors first' : 'No stacks yet — create your first stack'}
                      onAction={data.sponsors.length === 0 ? () => setTab('sponsors') : openAddStack}
                    />
                  ) : (
                    <ul className="grid gap-5 sm:grid-cols-2">
                      {data.sponsorStacks.map((stack) => {
                        const previewSponsors = stack.sponsorIds
                          .slice(0, 5)
                          .map(id => data.sponsors.find(s => s.id === id))
                          .filter(Boolean) as Sponsor[]
                        return (
                          <li
                            key={stack.id}
                            className="group flex flex-col gap-5 rounded-2xl border border-border-subtle bg-surface p-6 transition hover:border-border-strong hover:bg-raised"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-semibold">{stack.name}</p>
                                <p className="mt-1.5 text-xs text-txt-tertiary">
                                  {stack.sponsorIds.length} sponsor{stack.sponsorIds.length === 1 ? '' : 's'}
                                </p>
                              </div>
                              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-violet-400">
                                {stack.animationVariant}
                              </span>
                            </div>

                            <div className="flex items-center">
                              <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                                {previewSponsors.map((sp) => (
                                  <div key={sp.id} className="size-10 overflow-hidden rounded-xl" title={sp.name}>
                                    <ThumbnailImage filename={sp.imagePath} alt="" className="size-full" fit="contain" />
                                  </div>
                                ))}
                                {stack.sponsorIds.length > 5 && (
                                  <div className="flex size-10 items-center justify-center rounded-xl border-2 border-surface bg-overlay text-[10px] font-bold text-txt-tertiary">
                                    +{stack.sponsorIds.length - 5}
                                  </div>
                                )}
                              </div>
                              <CardActions onEdit={() => openEditStack(stack)} onDelete={() => {
                                if (window.confirm('Delete this stack?')) deleteStack(stack.id)
                              }} />
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </motion.section>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Floating Add Button */}
      {hydrated && (() => {
        const fabConfig: Record<TabId, { label: string; onClick: () => void; disabled?: boolean }> = {
          clubs: { label: '+ Add Club', onClick: openAddClub },
          players: { label: '+ Add Player', onClick: openAddPlayer, disabled: data.clubs.length === 0 },
          officials: { label: '+ Add Official', onClick: openAddOfficial },
          sponsors: { label: '+ Add Sponsor', onClick: openAddSponsor },
          stacks: { label: '+ New Stack', onClick: openAddStack },
        }
        const { label, onClick, disabled } = fabConfig[tab]
        return (
          <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            whileHover={disabled ? {} : { scale: 1.05 }}
            whileTap={disabled ? {} : { scale: 0.95 }}
            className="fixed bottom-6 right-6 z-30 rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-30"
          >
            {label}
          </motion.button>
        )
      })()}

      <ClubForm
        open={clubFormOpen}
        onClose={() => setClubFormOpen(false)}
        onSave={saveClub}
        initial={editingClub}
      />
      <PlayerForm
        open={playerFormOpen}
        onClose={() => setPlayerFormOpen(false)}
        onSave={savePlayer}
        clubs={data.clubs}
        initial={editingPlayer}
      />
      <OfficialForm
        open={officialFormOpen}
        onClose={() => setOfficialFormOpen(false)}
        onSave={saveOfficial}
        initial={editingOfficial}
      />
      <SponsorForm
        open={sponsorFormOpen}
        onClose={() => setSponsorFormOpen(false)}
        onSave={saveSponsor}
        initial={editingSponsor}
      />
      <SponsorStackEditor
        open={stackFormOpen}
        onClose={() => setStackFormOpen(false)}
        onSave={saveStack}
        onDelete={editingStack ? () => deleteStack(editingStack.id) : undefined}
        sponsors={data.sponsors}
        initial={editingStack}
      />
    </div>
  )
}

export default DataEntry
