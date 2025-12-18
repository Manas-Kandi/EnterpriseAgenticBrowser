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
  setMode: (mode: 'chat' | 'read' | 'do') => ipcRenderer.invoke('agent:set-mode', mode),
  getMode: () => ipcRenderer.invoke('agent:get-mode'),
  setPermissionMode: (mode: 'yolo' | 'permissions') => ipcRenderer.invoke('agent:set-permission-mode', mode),
  getPermissionMode: () => ipcRenderer.invoke('agent:get-permission-mode'),
  onApprovalRequest: (callback: (payload: any) => void) => {
    const listener = (_: unknown, payload: unknown) => callback(payload);
    ipcRenderer.on('agent:request-approval', listener);
    return () => ipcRenderer.off('agent:request-approval', listener);
  },
  onApprovalTimeout: (callback: (payload: any) => void) => {
    const listener = (_: unknown, payload: unknown) => callback(payload);
    ipcRenderer.on('agent:approval-timeout', listener);
    return () => ipcRenderer.off('agent:approval-timeout', listener);
  },
  respondApproval: (requestId: string, approved: boolean) =>
    ipcRenderer.send('agent:approval-response', { requestId, approved }),
  sendFeedback: (skillId: string, outcome: boolean | 'worked' | 'failed' | 'partial', version?: number) => {
    if (typeof outcome === 'boolean') {
      return ipcRenderer.invoke('agent:feedback', { skillId, success: outcome });
    }
    return ipcRenderer.invoke('agent:feedback', { skillId, label: outcome, version });
  },
  onStep: (callback: (step: any) => void) => {
    const listener = (_: unknown, step: unknown) => callback(step);
    ipcRenderer.on('agent:step', listener);
    return () => ipcRenderer.off('agent:step', listener);
  },
  onToken: (callback: (token: string) => void) => {
    const listener = (_: unknown, token: string) => callback(token);
    ipcRenderer.on('agent:token', listener);
    return () => ipcRenderer.off('agent:token', listener);
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

contextBridge.exposeInMainWorld('telemetry', {
  export: () => ipcRenderer.invoke('telemetry:export'),
})

contextBridge.exposeInMainWorld('benchmark', {
  runSuite: (filter?: string) => ipcRenderer.invoke('benchmark:runSuite', filter),
})
