import type { AppData, PresentationCommand } from '@/types'

/** Safe access to the preload bridge; types come from `global.d.ts` (may be a subset of the real preload). */
export function getElectronAPI(): Window['electronAPI'] {
  if (typeof window === 'undefined') return undefined
  return window.electronAPI
}

/** Methods the control panel needs; asserted because `global.d.ts` may not list every preload member. */
export type PresentationControlAPI = {
  loadData: () => Promise<AppData>
  getImagePath: (filename: string) => Promise<string>
  sendCommand: (command: PresentationCommand) => void
  backToDataEntry: () => void
}

export function getPresentationControlAPI(): PresentationControlAPI | undefined {
  const api = getElectronAPI()
  if (!api) return undefined
  const extended = api as unknown as PresentationControlAPI & Record<string, unknown>
  if (typeof extended.sendCommand !== 'function' || typeof extended.backToDataEntry !== 'function') {
    return undefined
  }
  return extended
}

/** Convert an absolute filesystem path to a file:// URL safe for <img src> in Electron. */
export function pathToFileUrlHref(fsPath: string): string {
  const normalized = fsPath.replace(/\\/g, '/')
  const pathPart = /^[a-zA-Z]:/.test(normalized)
    ? `/${normalized}`
    : normalized.startsWith('/')
      ? normalized
      : `/${normalized}`
  const url = new URL(`file://${pathPart}`)
  return url.href
}

export async function resolveImageSrc(filename: string): Promise<string | null> {
  const api = getElectronAPI()
  if (!api?.getImagePath || !filename.trim()) return null
  try {
    const absolutePath = await api.getImagePath(filename)
    if (!absolutePath) return null
    return pathToFileUrlHref(absolutePath)
  } catch {
    return null
  }
}
