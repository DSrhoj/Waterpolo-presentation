import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Club } from '@/types'
import { useImageUrl } from '@/hooks/useImageUrl'
import { ThumbnailImage } from '@/components/ThumbnailImage'

interface ClubFormProps {
  open: boolean
  onClose: () => void
  onSave: (club: Club) => void
  initial?: Club | null
}

export function ClubForm({ open, onClose, onSave, initial }: ClubFormProps) {
  const [name, setName] = useState('')
  const [logoPath, setLogoPath] = useState('')
  const [color, setColor] = useState('#3b82f6')
  const preview = useImageUrl(logoPath || null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setLogoPath(initial.logoPath)
      setColor(initial.color || '#3b82f6')
    } else {
      setName('')
      setLogoPath('')
      setColor('#3b82f6')
    }
  }, [open, initial])

  const pickLogo = async () => {
    const result = await window.electronAPI?.selectImage()
    if (result?.filename) setLogoPath(result.filename)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed || !logoPath.trim()) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      logoPath: logoPath.trim(),
      color,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="club-form-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-8 shadow-2xl"
      >
        <h2 id="club-form-title" className="mb-6 text-lg font-bold text-txt-primary">
          {initial ? 'Edit club' : 'Add club'}
        </h2>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Club name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-6 w-full rounded-2xl border border-border-default bg-raised px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="e.g. City FC"
        />

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Logo</label>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={pickLogo}
            className="rounded-2xl border border-border-default bg-raised px-5 py-3 text-sm text-txt-primary transition hover:border-accent hover:bg-overlay"
          >
            Choose image…
          </button>
          <div className="flex size-20 shrink-0 overflow-hidden rounded-2xl">
            {preview.loading ? (
              <div className="size-full animate-pulse bg-raised" />
            ) : preview.url ? (
              <img src={preview.url} alt="Logo preview" className="size-full object-contain p-2" />
            ) : logoPath ? (
              <ThumbnailImage filename={logoPath} alt="" className="size-full" fit="contain" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-txt-tertiary">No logo</div>
            )}
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Club color</label>
        <div className="mb-8 flex items-center gap-4">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-14 cursor-pointer rounded-lg border border-border-default bg-raised p-0.5"
          />
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-28 rounded-2xl border border-border-default bg-raised px-4 py-3 font-mono text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder="#3b82f6"
          />
          <div
            className="size-10 rounded-lg border border-border-default"
            style={{ background: color }}
          />
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
            disabled={!name.trim() || !logoPath.trim()}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
