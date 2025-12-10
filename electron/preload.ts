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

contextBridge.exposeInMainWorld('agent', {
  chat: (message: string) => ipcRenderer.invoke('agent:chat', message),
  onApprovalRequest: (callback: (toolName: string, args: any) => void) => {
    ipcRenderer.on('agent:request-approval', (_, { toolName, args }) => callback(toolName, args));
  },
  respondApproval: (toolName: string, approved: boolean) => ipcRenderer.send('agent:approval-response', { toolName, approved }),
})
