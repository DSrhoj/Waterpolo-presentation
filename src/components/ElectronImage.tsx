import { useEffect, useState } from 'react'
import { resolveImageSrc } from '@/utils/electronApi'

type ElectronImageProps = {
  filename: string
  alt: string
  className?: string
  imgClassName?: string
  fit?: 'cover' | 'contain'
}

export function ElectronImage({ filename, alt, className = '', imgClassName = '', fit = 'contain' }: ElectronImageProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setSrc(null)
    if (!filename.trim()) {
      setFailed(true)
      return
    }
    void resolveImageSrc(filename).then((url) => {
      if (cancelled) return
      if (url) setSrc(url)
      else setFailed(true)
    })
    return () => {
      cancelled = true
    }
  }, [filename])

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center text-neutral-500 text-xs ${className}`}
        aria-hidden={!alt}
      >
        {failed ? '—' : <span className="inline-block size-4 animate-pulse rounded bg-neutral-600" />}
      </div>
    )
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className={`size-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${imgClassName}`}
        onError={() => setFailed(true)}
        draggable={false}
      />
    </div>
  )
}
