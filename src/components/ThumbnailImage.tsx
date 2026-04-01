import { useImageUrl } from '@/hooks/useImageUrl'

interface ThumbnailImageProps {
  filename: string
  alt: string
  className?: string
  fit?: 'cover' | 'contain'
}

/** Image preview using resolved file URL, or filename fallback when unavailable. */
export function ThumbnailImage({ filename, alt, className = '', fit = 'contain' }: ThumbnailImageProps) {
  const { url, loading, error } = useImageUrl(filename)

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover'

  if (!filename.trim()) {
    return <div className={className} aria-hidden />
  }

  if (loading) {
    return <div className={`animate-pulse ${className}`} aria-busy="true" />
  }

  if (url && !error) {
    return <img src={url} alt={alt} className={`${fitClass} ${className}`} />
  }

  return (
    <div
      className={`flex items-center justify-center p-2 text-center text-xs text-neutral-500 ${className}`}
      title={filename}
    >
      {filename}
    </div>
  )
}
