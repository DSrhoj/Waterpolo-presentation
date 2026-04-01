import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Club, Player } from '@/types'
import { useImageUrl } from '@/hooks/useImageUrl'
import { ThumbnailImage } from '@/components/ThumbnailImage'

interface PlayerFormProps {
  open: boolean
  onClose: () => void
  onSave: (player: Player) => void
  clubs: Club[]
  initial?: Player | null
}

export function PlayerForm({ open, onClose, onSave, clubs, initial }: PlayerFormProps) {
  const [name, setName] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [clubId, setClubId] = useState('')
  const preview = useImageUrl(imagePath || null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setImagePath(initial.imagePath)
      const valid = clubs.some((c) => c.id === initial.clubId)
      setClubId(valid ? initial.clubId : (clubs[0]?.id ?? ''))
    } else {
      setName('')
      setImagePath('')
      setClubId(clubs[0]?.id ?? '')
    }
  }, [open, initial, clubs])

  const pickImage = async () => {
    const result = await window.electronAPI?.selectImage()
    if (result?.filename) setImagePath(result.filename)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed || !imagePath.trim() || !clubId) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      imagePath: imagePath.trim(),
      clubId,
    })
    onClose()
  }

  if (!open) return null

  const noClubs = clubs.length === 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-form-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-8 shadow-2xl"
      >
        <h2 id="player-form-title" className="mb-6 text-lg font-bold text-txt-primary">
          {initial ? 'Edit player' : 'Add player'}
        </h2>

        {noClubs ? (
          <p className="mb-5 rounded-2xl border border-amber-900/40 bg-amber-950/30 p-4 text-sm text-amber-200/90">
            Add at least one club in the Clubs tab before you can create players.
          </p>
        ) : null}

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Player name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={noClubs}
          className="mb-6 w-full rounded-2xl border border-border-default bg-raised px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
          placeholder="e.g. Alex Morgan"
        />

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Club</label>
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          disabled={noClubs}
          className="mb-6 w-full rounded-2xl border border-border-default bg-raised px-4 pr-10 py-3 text-sm text-txt-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
        >
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Player image</label>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={pickImage}
            disabled={noClubs}
            className="rounded-2xl border border-border-default bg-raised px-5 py-3 text-sm text-txt-primary transition hover:border-accent hover:bg-overlay disabled:cursor-not-allowed disabled:opacity-50"
          >
            Choose image…
          </button>
          <div className="flex size-24 shrink-0 overflow-hidden rounded-2xl">
            {preview.loading ? (
              <div className="size-full animate-pulse bg-raised" />
            ) : preview.url ? (
              <img src={preview.url} alt="Player preview" className="size-full object-contain" />
            ) : imagePath ? (
              <ThumbnailImage filename={imagePath} alt="" className="size-full" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-txt-tertiary">No image</div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
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
            disabled={noClubs || !name.trim() || !imagePath.trim() || !clubId}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
