import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})

contextBridge.exposeInMainWorld('vault', {
  set: (account: string, secret: string) => ipcRenderer.invoke('vault:set', account, secret),
  get: (account: string) => ipcRenderer.invoke('vault:get', account),
  delete: (account: string) => ipcRenderer.invoke('vault:delete', account),
})

contextBridge.exposeInMainWorld('audit', {
  getLogs: (limit?: number) => ipcRenderer.invoke('audit:get-logs', limit),
})

contextBridge.exposeInMainWorld('agent', {
  chat: (message: string) => ipcRenderer.invoke('agent:chat', message),
  resetConversation: () => ipcRenderer.invoke('agent:reset-conversation'),
  getModels: () => ipcRenderer.invoke('agent:get-models'),
  getCurrentModel: () => ipcRenderer.invoke('agent:get-current-model'),
  setModel: (modelId: string) => ipcRenderer.invoke('agent:set-model', modelId),
  onApprovalRequest: (callback: (toolName: string, args: any) => void) => {
    const listener = (_: unknown, { toolName, args }: { toolName: string; args: unknown }) =>
      callback(toolName, args);
    ipcRenderer.on('agent:request-approval', listener);
    return () => ipcRenderer.off('agent:request-approval', listener);
  },
  respondApproval: (toolName: string, approved: boolean) => ipcRenderer.send('agent:approval-response', { toolName, approved }),
  onStep: (callback: (step: any) => void) => {
    const listener = (_: unknown, step: unknown) => callback(step);
    ipcRenderer.on('agent:step', listener);
    return () => ipcRenderer.off('agent:step', listener);
  },
})

contextBridge.exposeInMainWorld('browser', {
  registerWebview: (tabId: string, webContentsId: number) =>
    ipcRenderer.invoke('browser:webview-register', { tabId, webContentsId }),
  setActiveTab: (tabId: string | null) => ipcRenderer.invoke('browser:active-tab', { tabId }),
  onNavigateTo: (callback: (url: string) => void) => {
    const listener = (_: unknown, url: string) => callback(url);
    ipcRenderer.on('browser:navigate-to', listener);
    return () => ipcRenderer.off('browser:navigate-to', listener);
  },
})
