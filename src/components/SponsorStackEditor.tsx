import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, Reorder } from 'framer-motion'
import type { Sponsor, SponsorStack, SponsorTier } from '@/types'
import { ThumbnailImage } from '@/components/ThumbnailImage'

const TIER_ORDER: Record<SponsorTier, number> = { platinum: 0, gold: 1, silver: 2 }
const TIER_META: { value: SponsorTier; label: string; color: string }[] = [
  { value: 'platinum', label: 'Plat', color: '#c0c8d8' },
  { value: 'gold', label: 'Gold', color: '#d4a843' },
  { value: 'silver', label: 'Silver', color: '#a0a8b4' },
]

export const ANIMATION_VARIANTS = [
  'one-row',
  'tiered-rows',
  'marquee-grid',
  'fullscreen',
] as const

interface SponsorStackEditorProps {
  open: boolean
  onClose: () => void
  onSave: (stack: SponsorStack) => void
  onDelete?: () => void
  sponsors: Sponsor[]
  initial?: SponsorStack | null
}

export function SponsorStackEditor({
  open,
  onClose,
  onSave,
  onDelete,
  sponsors,
  initial,
}: SponsorStackEditorProps) {
  const [name, setName] = useState('')
  const [orderedIds, setOrderedIds] = useState<string[]>([])
  const [animationVariant, setAnimationVariant] = useState<string>(ANIMATION_VARIANTS[0])
  const [sponsorSearch, setSponsorSearch] = useState('')
  const [tierFilter, setTierFilter] = useState<Set<SponsorTier>>(new Set())

  const sponsorById = useMemo(() => new Map(sponsors.map((s) => [s.id, s])), [sponsors])

  const toggleTierFilter = useCallback((tier: SponsorTier) => {
    setTierFilter((prev) => {
      const next = new Set(prev)
      if (next.has(tier)) next.delete(tier)
      else next.add(tier)
      return next
    })
  }, [])

  const displayedSponsors = useMemo(() => {
    let list = [...sponsors]
    if (tierFilter.size > 0) {
      list = list.filter((s) => tierFilter.has(s.tier))
    }
    if (sponsorSearch.trim()) {
      const q = sponsorSearch.trim().toLowerCase()
      list = list.filter((s) => s.name.toLowerCase().includes(q))
    }
    list.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.name.localeCompare(b.name))
    return list
  }, [sponsors, tierFilter, sponsorSearch])

  useEffect(() => {
    if (!open) return
    setSponsorSearch('')
    setTierFilter(new Set())
    if (initial) {
      setName(initial.name)
      setOrderedIds([...initial.sponsorIds])
      setAnimationVariant(
        (ANIMATION_VARIANTS as readonly string[]).includes(initial.animationVariant)
          ? initial.animationVariant
          : ANIMATION_VARIANTS[0],
      )
    } else {
      setName('')
      setOrderedIds([])
      setAnimationVariant(ANIMATION_VARIANTS[0])
    }
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    setOrderedIds((prev) => prev.filter((id) => sponsors.some((s) => s.id === id)))
  }, [sponsors, open])

  const toggleSponsor = (id: string, checked: boolean) => {
    if (checked) {
      setOrderedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } else {
      setOrderedIds((prev) => prev.filter((x) => x !== id))
    }
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      sponsorIds: [...orderedIds],
      animationVariant,
    })
    onClose()
  }

  const handleDelete = () => {
    if (!onDelete) return
    if (window.confirm('Delete this sponsor stack?')) {
      onDelete()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stack-form-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-border-default bg-surface shadow-2xl"
      >
        <div className="shrink-0 border-b border-border-subtle px-8 py-6">
          <h2 id="stack-form-title" className="text-lg font-bold text-txt-primary">
            {initial ? 'Edit sponsor stack' : 'New sponsor stack'}
          </h2>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border-subtle">
          {/* ── Left column: settings + sponsor picker ── */}
          <div className="flex flex-col gap-4 overflow-y-auto p-6">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-txt-tertiary">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-raised px-3 py-2 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Halftime sponsors"
                />
              </div>
              <div className="w-36 shrink-0">
                <label className="mb-1 block text-xs font-medium text-txt-tertiary">Animation</label>
                <select
                  value={animationVariant}
                  onChange={(e) => setAnimationVariant(e.target.value)}
                  className="w-full rounded-xl border border-border-default bg-raised px-3 pr-8 py-2 text-sm text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {ANIMATION_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <p className="mb-3 text-sm font-medium text-txt-primary">
                Sponsors
                {orderedIds.length > 0 && (
                  <span className="ml-2 text-xs font-normal text-txt-tertiary">
                    {orderedIds.length} selected
                  </span>
                )}
              </p>
              {sponsors.length === 0 ? (
                <p className="rounded-2xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200/90">
                  Add sponsors first in the Sponsors tab, then return here to build a stack.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    value={sponsorSearch}
                    onChange={(e) => setSponsorSearch(e.target.value)}
                    placeholder="Search sponsors…"
                    className="mb-2 w-full rounded-xl border border-border-default bg-raised px-3 py-2 text-xs text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {TIER_META.map((t) => {
                      const active = tierFilter.has(t.value)
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => toggleTierFilter(t.value)}
                          className="rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider transition"
                          style={{
                            color: t.color,
                            background: active ? `${t.color}20` : 'transparent',
                            boxShadow: active ? `inset 0 0 0 1px ${t.color}60` : 'none',
                            opacity: active ? 1 : 0.5,
                          }}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                    {tierFilter.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setTierFilter(new Set())}
                        className="px-1.5 py-1 text-[10px] text-txt-tertiary transition hover:text-txt-secondary"
                      >
                        clear
                      </button>
                    )}
                  </div>
                  <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto rounded-2xl border border-border-default bg-raised p-4">
                    {displayedSponsors.length === 0 ? (
                      <li className="py-4 text-center text-xs text-txt-tertiary">No sponsors match.</li>
                    ) : (
                      displayedSponsors.map((s) => (
                        <li key={s.id} className="flex items-center gap-3.5 rounded-xl px-2 py-1.5 transition hover:bg-overlay">
                          <input
                            type="checkbox"
                            id={`stack-sponsor-${s.id}`}
                            checked={orderedIds.includes(s.id)}
                            onChange={(e) => toggleSponsor(s.id, e.target.checked)}
                            className="size-4 rounded border-border-default bg-overlay text-accent focus:ring-accent"
                          />
                          <label htmlFor={`stack-sponsor-${s.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                            <div className="size-9 shrink-0 overflow-hidden rounded-lg">
                              <ThumbnailImage filename={s.imagePath} alt="" className="size-full" fit="contain" />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm text-txt-primary">{s.name}</span>
                            <span className="ml-auto shrink-0 text-[9px] font-bold uppercase tracking-wider" style={{ color: TIER_META.find((t) => t.value === s.tier)?.color }}>
                              {TIER_META.find((t) => t.value === s.tier)?.label}
                            </span>
                          </label>
                        </li>
                      ))
                    )}
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* ── Right column: reorder list ── */}
          <div className="flex flex-col overflow-y-auto p-6">
            <p className="mb-3 text-sm font-medium text-txt-secondary">Order (drag to reorder)</p>
            {orderedIds.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border-default bg-raised p-8 text-center text-sm text-txt-tertiary">
                Select sponsors on the left to arrange them here.
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={orderedIds}
                onReorder={setOrderedIds}
                className="space-y-2"
              >
                {orderedIds.map((id) => {
                  const s = sponsorById.get(id)
                  if (!s) return null
                  return (
                    <Reorder.Item
                      key={id}
                      value={id}
                      className="cursor-grab list-none rounded-2xl border border-border-default bg-raised p-3 active:cursor-grabbing"
                      whileDrag={{ scale: 1.02, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-10 shrink-0 overflow-hidden rounded-xl">
                          <ThumbnailImage filename={s.imagePath} alt="" className="size-full" fit="contain" />
                        </div>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-txt-primary">{s.name}</span>
                        <span className="text-xs text-txt-tertiary">⋮⋮</span>
                      </div>
                    </Reorder.Item>
                  )
                })}
              </Reorder.Group>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border-subtle px-8 py-5">
          {initial && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="mr-auto rounded-2xl bg-red-500/15 px-6 py-3 text-sm font-medium text-red-400 transition hover:bg-red-500/25"
            >
              Delete
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl px-6 py-3 text-sm font-medium text-txt-secondary transition hover:bg-raised"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
