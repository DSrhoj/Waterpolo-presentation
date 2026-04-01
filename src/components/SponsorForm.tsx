import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Sponsor, SponsorTier } from '@/types'
import { useImageUrl } from '@/hooks/useImageUrl'
import { ThumbnailImage } from '@/components/ThumbnailImage'

interface SponsorFormProps {
  open: boolean
  onClose: () => void
  onSave: (sponsor: Sponsor) => void
  initial?: Sponsor | null
}

export function SponsorForm({ open, onClose, onSave, initial }: SponsorFormProps) {
  const [name, setName] = useState('')
  const [imagePath, setImagePath] = useState('')
  const [tier, setTier] = useState<SponsorTier>('gold')
  const preview = useImageUrl(imagePath || null)

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setImagePath(initial.imagePath)
      setTier(initial.tier || 'gold')
    } else {
      setName('')
      setImagePath('')
      setTier('gold')
    }
  }, [open, initial])

  const pickImage = async () => {
    const result = await window.electronAPI?.selectImage()
    if (result?.filename) setImagePath(result.filename)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed || !imagePath.trim()) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      imagePath: imagePath.trim(),
      tier,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sponsor-form-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-8 shadow-2xl"
      >
        <h2 id="sponsor-form-title" className="mb-6 text-lg font-bold text-txt-primary">
          {initial ? 'Edit sponsor' : 'Add sponsor'}
        </h2>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Sponsor name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-6 w-full rounded-2xl border border-border-default bg-raised px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="e.g. Acme Sports"
        />

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Sponsor image</label>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={pickImage}
            className="rounded-2xl border border-border-default bg-raised px-5 py-3 text-sm text-txt-primary transition hover:border-accent hover:bg-overlay"
          >
            Choose image…
          </button>
          <div className="flex size-20 shrink-0 overflow-hidden rounded-2xl">
            {preview.loading ? (
              <div className="size-full animate-pulse bg-raised" />
            ) : preview.url ? (
              <img src={preview.url} alt="Sponsor preview" className="size-full object-contain p-2" />
            ) : imagePath ? (
              <ThumbnailImage filename={imagePath} alt="" className="size-full" fit="contain" />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-txt-tertiary">No image</div>
            )}
          </div>
        </div>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Sponsor level</label>
        <div className="mb-8 flex gap-3">
          {([
            { value: 'platinum' as const, label: 'Platinum', colors: 'border-[#c0c8d8]/40 bg-[#c0c8d8]/10 text-[#c0c8d8]' },
            { value: 'gold' as const, label: 'Gold', colors: 'border-[#d4a843]/40 bg-[#d4a843]/10 text-[#d4a843]' },
            { value: 'silver' as const, label: 'Silver', colors: 'border-[#a0a8b4]/40 bg-[#a0a8b4]/10 text-[#a0a8b4]' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTier(opt.value)}
              className={[
                'rounded-xl border px-5 py-2.5 text-sm font-semibold transition',
                tier === opt.value
                  ? opt.colors
                  : 'border-border-default text-txt-tertiary hover:border-border-strong hover:text-txt-secondary',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
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
            disabled={!name.trim() || !imagePath.trim()}
            className="rounded-2xl bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}
