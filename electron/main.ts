import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron'
import path from 'path'
import fs from 'fs'
import {
  loadData,
  saveData,
  copyImage,
  getImagePath,
  deleteImage,
  ensurePresentationDirs,
  type AppData,
} from './store'

app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('enable-zero-copy')

function forceSquareCorners(win: BrowserWindow): void {
  if (process.platform !== 'win32') return
  try {
    const koffi = require('koffi')
    const dwmapi = koffi.load('dwmapi.dll')
    const DwmSetWindowAttribute = dwmapi.func(
      'long __stdcall DwmSetWindowAttribute(void *hwnd, uint32_t dwAttribute, void *pvAttribute, uint32_t cbAttribute)',
    )
    const DWMWA_WINDOW_CORNER_PREFERENCE = 33
    const DWMWCP_DONOTROUND = 1
    const hwnd = win.getNativeWindowHandle()
    const pref = Buffer.alloc(4)
    pref.writeUInt32LE(DWMWCP_DONOTROUND)
    DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, pref, 4)
  } catch {
    // koffi not available or not on Windows 11 — silently ignore
  }
}

let dataEntryWindow: BrowserWindow | null = null
let controlPanelWindow: BrowserWindow | null = null
let presentationWindow: BrowserWindow | null = null

let presentationMode = false
let presentationReady = false
let pendingPresentationCommands: unknown[] = []

function loadPresentationConfig(): { width: number; height: number } {
  const configPath = path.join(__dirname, '..', 'config.json')
  try {
    const raw = fs.readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw) as {
      presentationWindow?: { width?: number; height?: number }
    }
    const w = config.presentationWindow?.width ?? 500
    const h = config.presentationWindow?.height ?? 400
    return { width: w, height: h }
  } catch {
    return { width: 500, height: 400 }
  }
}

function getPreloadPath(): string {
  return path.join(__dirname, 'preload.js')
}

function loadRenderer(win: BrowserWindow, windowParam: string): void {
  if (process.env.VITE_DEV_SERVER_URL) {
    const url = new URL(process.env.VITE_DEV_SERVER_URL)
    url.searchParams.set('window', windowParam)
    void win.loadURL(url.toString())
  } else {
    const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
    void win.loadFile(indexHtml, { query: { window: windowParam } })
  }
}

function sharedWebPrefs(): Electron.WebPreferences {
  return {
    nodeIntegration: false,
    contextIsolation: true,
    preload: getPreloadPath(),
    webSecurity: false,
  }
}

function createDataEntryWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: sharedWebPrefs(),
  })
  loadRenderer(win, 'data-entry')
  win.on('closed', () => {
    if (dataEntryWindow === win) {
      dataEntryWindow = null
    }
  })
  return win
}

function createControlPanelWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: sharedWebPrefs(),
  })
  loadRenderer(win, 'control-panel')
  win.on('closed', () => {
    if (controlPanelWindow === win) {
      controlPanelWindow = null
    }
  })
  return win
}

function flushPresentationQueue(): void {
  if (!presentationWindow || presentationWindow.isDestroyed()) return
  for (const cmd of pendingPresentationCommands) {
    presentationWindow.webContents.send('presentation-command', cmd)
  }
  pendingPresentationCommands = []
}

function createPresentationWindow(): BrowserWindow {
  presentationReady = false
  pendingPresentationCommands = []

  const { width, height } = loadPresentationConfig()
  const win = new BrowserWindow({
    x: 0,
    y: 0,
    width,
    height,
    frame: false,
    resizable: false,
    roundedCorners: false,
    alwaysOnTop: false,
    webPreferences: sharedWebPrefs(),
  })
  forceSquareCorners(win)
  loadRenderer(win, 'presentation')
  win.on('closed', () => {
    if (presentationWindow === win) {
      presentationWindow = null
      presentationReady = false
      pendingPresentationCommands = []
    }
  })
  return win
}

function getDialogParentWindow(): BrowserWindow | null {
  return (
    BrowserWindow.getFocusedWindow() ??
    dataEntryWindow ??
    controlPanelWindow ??
    presentationWindow ??
    BrowserWindow.getAllWindows()[0] ??
    null
  )
}

function registerIpcHandlers(): void {
  ipcMain.handle('load-data', async () => {
    return loadData()
  })

  ipcMain.handle('save-data', async (_event, data: AppData) => {
    await saveData(data)
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('data-update', data)
      }
    }
  })

  ipcMain.handle('copy-image', async (_event, sourcePath: string) => {
    if (typeof sourcePath !== 'string' || !sourcePath) {
      throw new Error('copy-image requires a non-empty source path')
    }
    return copyImage(sourcePath)
  })

  ipcMain.handle('get-image-path', async (_event, filename: string) => {
    if (typeof filename !== 'string' || !filename) {
      throw new Error('get-image-path requires a filename')
    }
    return getImagePath(filename)
  })

  ipcMain.handle('delete-image', async (_event, filename: string) => {
    if (typeof filename !== 'string' || !filename) return
    await deleteImage(filename)
  })

  ipcMain.handle('select-image', async () => {
    const parent = getDialogParentWindow()
    const dialogOptions: Electron.OpenDialogOptions = {
      title: 'Select image',
      properties: ['openFile'],
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'],
        },
      ],
    }
    const result = parent
      ? await dialog.showOpenDialog(parent, dialogOptions)
      : await dialog.showOpenDialog(dialogOptions)
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    const sourcePath = result.filePaths[0]
    const originalName = path.basename(sourcePath)
    const filename = await copyImage(sourcePath)
    return { filename, originalName }
  })

  ipcMain.on('start-presentation', () => {
    if (presentationMode) {
      return
    }
    presentationMode = true
    if (dataEntryWindow && !dataEntryWindow.isDestroyed()) {
      dataEntryWindow.hide()
    }
    controlPanelWindow = createControlPanelWindow()
    presentationWindow = createPresentationWindow()
  })

  ipcMain.on('back-to-data-entry', () => {
    presentationMode = false
    if (controlPanelWindow && !controlPanelWindow.isDestroyed()) {
      controlPanelWindow.close()
    }
    controlPanelWindow = null
    if (presentationWindow && !presentationWindow.isDestroyed()) {
      presentationWindow.close()
    }
    presentationWindow = null
    if (dataEntryWindow && !dataEntryWindow.isDestroyed()) {
      dataEntryWindow.show()
    } else {
      dataEntryWindow = createDataEntryWindow()
    }
  })

  ipcMain.on('presentation-ready', () => {
    presentationReady = true
    flushPresentationQueue()
  })

  ipcMain.on('presentation-command', (_event, command: unknown) => {
    if (!presentationWindow || presentationWindow.isDestroyed()) return
    if (presentationReady) {
      presentationWindow.webContents.send('presentation-command', command)
    } else {
      pendingPresentationCommands.push(command)
    }
  })
}

function createInitialWindows(): void {
  dataEntryWindow = createDataEntryWindow()
}

app.whenReady().then(async () => {
  await ensurePresentationDirs()

  protocol.handle('app-asset', (request) => {
    const filename = decodeURIComponent(new URL(request.url).pathname).replace(/^\//, '')
    const fullPath = getImagePath(filename)
    return net.fetch(`file://${fullPath}`)
  })

  registerIpcHandlers()
  createInitialWindows()
})

app.on('window-all-closed', () => {
  app.quit()
})
