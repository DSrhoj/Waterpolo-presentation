import { useEffect, useRef } from 'react'
import type { AppData, PresentationCommand } from '../types'

declare global {
  interface Window {
    electronAPI?: {
      loadData: () => Promise<AppData>
      saveData: (data: AppData) => Promise<void>
      copyImage: (sourcePath: string) => Promise<string>
      getImagePath: (filename: string) => Promise<string>
      deleteImage: (filename: string) => Promise<void>
      selectImage: () => Promise<{
        filename: string
        originalName: string
      } | null>
      signalReady: () => void
      startPresentation: () => void
      backToDataEntry: () => void
      sendCommand: (command: PresentationCommand) => void
      onCommand: (
        callback: (command: PresentationCommand) => void,
      ) => () => void
      onDataUpdate: (callback: (data: AppData) => void) => () => void
      getWindowType: () => string
    }
  }
}

const emptyAppData: AppData = {
  clubs: [],
  players: [],
  officials: [],
  sponsors: [],
  sponsorStacks: [],
}

function getApi(): Window['electronAPI'] {
  if (typeof window === 'undefined') {
    return undefined
  }
  return window.electronAPI
}

export async function loadAppData(): Promise<AppData> {
  const api = getApi()
  if (!api?.loadData) {
    return { ...emptyAppData }
  }
  return api.loadData()
}

export async function saveAppData(data: AppData): Promise<void> {
  const api = getApi()
  if (!api?.saveData) {
    return
  }
  await api.saveData(data)
}

export async function copyImageFile(sourcePath: string): Promise<string> {
  const api = getApi()
  if (!api?.copyImage) {
    throw new Error('copyImage is only available in the Electron app')
  }
  return api.copyImage(sourcePath)
}

export async function resolveImagePath(filename: string): Promise<string> {
  const api = getApi()
  if (!api?.getImagePath) {
    return ''
  }
  return api.getImagePath(filename)
}

export async function deleteImageFile(filename: string): Promise<void> {
  const api = getApi()
  if (!api?.deleteImage || !filename) return
  await api.deleteImage(filename)
}

export async function selectImageFile(): Promise<{
  filename: string
  originalName: string
} | null> {
  const api = getApi()
  if (!api?.selectImage) {
    return null
  }
  return api.selectImage()
}

export function startPresentationFlow(): void {
  getApi()?.startPresentation?.()
}

export function backToDataEntryFlow(): void {
  getApi()?.backToDataEntry?.()
}

export function sendPresentationCommand(command: PresentationCommand): void {
  getApi()?.sendCommand?.(command)
}

export function getWindowType(): string {
  const api = getApi()
  if (api?.getWindowType) {
    return api.getWindowType()
  }
  if (typeof window === 'undefined') {
    return 'data-entry'
  }
  try {
    const url = new URL(window.location.href)
    return url.searchParams.get('window') || 'data-entry'
  } catch {
    return 'data-entry'
  }
}

/**
 * Subscribe to commands forwarded from the control panel (presentation window only in practice).
 * Cleans up on unmount. Uses a ref so the latest callback is always invoked without resubscribing.
 */
export function useCommandListener(
  callback: (command: PresentationCommand) => void,
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const api = getApi()
    if (!api?.onCommand) {
      return
    }
    const unsubscribe = api.onCommand((command) => {
      callbackRef.current(command)
    })
    return unsubscribe
  }, [])
}

/**
 * Subscribe to app data updates broadcast after save (all windows).
 */
export function useDataUpdateListener(callback: (data: AppData) => void): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const api = getApi()
    if (!api?.onDataUpdate) {
      return
    }
    const unsubscribe = api.onDataUpdate((data) => {
      callbackRef.current(data)
    })
    return unsubscribe
  }, [])
}

export function useIsElectronApp(): boolean {
  return typeof window !== 'undefined' && window.electronAPI !== undefined
}
