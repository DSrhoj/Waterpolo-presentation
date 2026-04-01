import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { Official, OfficialRole } from '@/types'

interface OfficialFormProps {
  open: boolean
  onClose: () => void
  onSave: (official: Official) => void
  initial?: Official | null
}

export function OfficialForm({ open, onClose, onSave, initial }: OfficialFormProps) {
  const [name, setName] = useState('')
  const [role, setRole] = useState<OfficialRole>('referee')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setName(initial.name)
      setRole(initial.role)
    } else {
      setName('')
      setRole('referee')
    }
  }, [open, initial])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onSave({
      id: initial?.id ?? crypto.randomUUID(),
      name: trimmed,
      role,
    })
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="official-form-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-md rounded-2xl border border-border-default bg-surface p-8 shadow-2xl"
      >
        <h2 id="official-form-title" className="mb-6 text-lg font-bold text-txt-primary">
          {initial ? 'Edit official' : 'Add official'}
        </h2>

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-6 w-full rounded-2xl border border-border-default bg-raised px-4 py-3 text-sm text-txt-primary placeholder:text-txt-tertiary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="e.g. John Smith"
        />

        <label className="mb-2 block text-sm font-medium text-txt-secondary">Role</label>
        <div className="mb-8 flex gap-3">
          {([
            { value: 'referee' as const, label: 'Referee', colors: 'border-amber-500/40 bg-amber-500/10 text-amber-400' },
            { value: 'delegate' as const, label: 'Delegate', colors: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setRole(opt.value)}
              className={[
                'rounded-xl border px-5 py-2.5 text-sm font-semibold transition',
                role === opt.value
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
