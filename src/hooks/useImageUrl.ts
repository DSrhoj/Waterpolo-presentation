import { useState, useEffect } from 'react'

/** Build a file:// URL from an absolute filesystem path (Windows + POSIX). */
export function pathToFileUrl(absolutePath: string): string {
  let pathName = absolutePath.replace(/\\/g, '/')
  if (!pathName.startsWith('/')) {
    pathName = `/${pathName}`
  }
  return encodeURI(`file://${pathName}`)
}

export interface UseImageUrlResult {
  url: string | null
  loading: boolean
  error: string | null
}

/**
 * Resolves a stored image filename to a file:// URL via Electron.
 */
export function useImageUrl(filename: string | null | undefined): UseImageUrlResult {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmed = filename?.trim()
    if (!trimmed) {
      setUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    const api = window.electronAPI
    if (!api?.getImagePath) {
      setUrl(null)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    setUrl(null)

    api
      .getImagePath(trimmed)
      .then((fullPath) => {
        if (cancelled) return
        setUrl(pathToFileUrl(fullPath))
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filename])

  return { url, loading, error }
}
