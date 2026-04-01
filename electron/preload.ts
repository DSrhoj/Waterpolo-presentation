import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  loadData: () => ipcRenderer.invoke('load-data'),
  saveData: (data: unknown) => ipcRenderer.invoke('save-data', data),

  copyImage: (sourcePath: string) => ipcRenderer.invoke('copy-image', sourcePath),
  getImagePath: (filename: string) => ipcRenderer.invoke('get-image-path', filename),
  deleteImage: (filename: string) => ipcRenderer.invoke('delete-image', filename),
  selectImage: () => ipcRenderer.invoke('select-image'),

  signalReady: () => ipcRenderer.send('presentation-ready'),
  startPresentation: () => ipcRenderer.send('start-presentation'),
  backToDataEntry: () => ipcRenderer.send('back-to-data-entry'),

  sendCommand: (command: unknown) =>
    ipcRenderer.send('presentation-command', command),

  onCommand: (callback: (command: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, command: unknown) => {
      callback(command)
    }
    ipcRenderer.on('presentation-command', listener)
    return () => {
      ipcRenderer.removeListener('presentation-command', listener)
    }
  },

  onDataUpdate: (callback: (data: unknown) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown) => {
      callback(data)
    }
    ipcRenderer.on('data-update', listener)
    return () => {
      ipcRenderer.removeListener('data-update', listener)
    }
  },

  getWindowType: () => {
    const url = new URL(window.location.href)
    return url.searchParams.get('window') || 'data-entry'
  },
})
