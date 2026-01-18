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

contextBridge.exposeInMainWorld('chatHistory', {
  get: () => ipcRenderer.invoke('chatHistory:get'),
  set: (messages: any[]) => ipcRenderer.invoke('chatHistory:set', messages),
  clear: () => ipcRenderer.invoke('chatHistory:clear'),
})

contextBridge.exposeInMainWorld('policy', {
  status: () => ipcRenderer.invoke('policy:status'),
  syncState: () => ipcRenderer.invoke('policy:sync-state'),
  sync: (url?: string) => ipcRenderer.invoke('policy:sync', url),
  configure: (cfg: { url: string; authToken?: string }) => ipcRenderer.invoke('policy:configure', cfg),
  setAuthToken: (token: string) => ipcRenderer.invoke('policy:set-auth-token', token),
  clearAuthToken: () => ipcRenderer.invoke('policy:clear-auth-token'),
  getAdminMessage: () => ipcRenderer.invoke('policy:get-admin-message'),
  setDevOverride: (enabled: boolean, token?: string) => ipcRenderer.invoke('policy:set-dev-override', enabled, token),
})

contextBridge.exposeInMainWorld('identity', {
  getSession: () => ipcRenderer.invoke('identity:get-session'),
  login: () => ipcRenderer.invoke('identity:login'),
  logout: () => ipcRenderer.invoke('identity:logout'),
  getAccessToken: () => ipcRenderer.invoke('identity:get-access-token'),
})

contextBridge.exposeInMainWorld('agent', {
  chat: (message: string) => ipcRenderer.invoke('agent:chat', message),
  resetConversation: () => ipcRenderer.invoke('agent:reset-conversation'),
  getModels: () => ipcRenderer.invoke('agent:get-models'),
  getLlmConfig: () => ipcRenderer.invoke('agent:get-llm-config'),
  setLlmConfig: (cfg: { provider?: string; baseUrl?: string; apiKeyAccount?: string; modelId?: string }) =>
    ipcRenderer.invoke('agent:set-llm-config', cfg),
  testConnection: (cfg: { baseUrl: string; apiKey?: string; model: string }) =>
    ipcRenderer.invoke('agent:test-connection', cfg),
  listRemoteModels: (cfg: { baseUrl: string; apiKey?: string }) =>
    ipcRenderer.invoke('agent:list-remote-models', cfg),
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
  getSavedPlans: () => ipcRenderer.invoke('agent:get-saved-plans'),
  savePlanFor: (taskId: string, plan: string[]) => ipcRenderer.invoke('agent:save-plan', taskId, plan),
  deletePlan: (taskId: string) => ipcRenderer.invoke('agent:delete-plan', taskId),
  setAutoLearn: (enabled: boolean) => ipcRenderer.invoke('agent:set-auto-learn', enabled),

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
  activateTab: (tabId: string) => ipcRenderer.send('browser:activate-tab', { tabId }),
  navigate: (url: string) => ipcRenderer.invoke('browser:navigate-tab', url),
  onNavigateTo: (callback: (url: string) => void) => {
    const listener = (_: unknown, url: string) => callback(url);
    ipcRenderer.on('browser:navigate-to', listener);
    return () => ipcRenderer.off('browser:navigate-to', listener);
  },
  onActivateTab: (callback: (payload: { tabId: string }) => void) => {
    const listener = (_: unknown, payload: { tabId: string }) => callback(payload);
    ipcRenderer.on('browser:activate-tab', listener);
    return () => ipcRenderer.off('browser:activate-tab', listener);
  },
  onOpenAgentTab: (
    callback: (payload: { url: string; background: boolean; agentCreated: boolean; requestId?: string }) => void
  ) => {
    const listener = (
      _: unknown,
      payload: { url: string; background: boolean; agentCreated: boolean; requestId?: string }
    ) => callback(payload);
    ipcRenderer.on('browser:open-agent-tab', listener);
    return () => ipcRenderer.off('browser:open-agent-tab', listener);
  },

  reportAgentTabOpened: (payload: { requestId: string; tabId: string }) =>
    ipcRenderer.send('browser:open-agent-tab-result', payload),
})

contextBridge.exposeInMainWorld('newtab', {
  getDashboardSnapshot: () => ipcRenderer.invoke('newtab:dashboard-snapshot'),
  onDashboardUpdate: (callback: (snapshot: any) => void) => {
    const listener = (_: unknown, snapshot: unknown) => callback(snapshot);
    ipcRenderer.on('newtab:dashboard-update', listener);
    return () => ipcRenderer.off('newtab:dashboard-update', listener);
  },
})

contextBridge.exposeInMainWorld('telemetry', {
  export: () => ipcRenderer.invoke('telemetry:export'),
})

contextBridge.exposeInMainWorld('session', {
  getInfo: () => ipcRenderer.invoke('session:get-info'),
  clear: () => ipcRenderer.invoke('session:clear'),
  onRestored: (callback: (payload: { lastSessionTime: number; restoredAt: number }) => void) => {
    const listener = (_: unknown, payload: { lastSessionTime: number; restoredAt: number }) => callback(payload);
    ipcRenderer.on('session:restored', listener);
    return () => ipcRenderer.off('session:restored', listener);
  },
})

contextBridge.exposeInMainWorld('benchmark', {
  runSuite: (filter?: string) => ipcRenderer.invoke('benchmark:runSuite', filter),
})

contextBridge.exposeInMainWorld('terminal', {
  getContext: () => ipcRenderer.invoke('terminal:getContext'),
  getMinimalContext: () => ipcRenderer.invoke('terminal:getMinimalContext'),
  executeCode: (code: string, options?: { timeout?: number }) => 
    ipcRenderer.invoke('terminal:executeCode', code, options),
  evaluate: (expression: string) => ipcRenderer.invoke('terminal:evaluate', expression),
  queryDOM: (selector: string) => ipcRenderer.invoke('terminal:queryDOM', selector),
  click: (selector: string) => ipcRenderer.invoke('terminal:click', selector),
  type: (selector: string, text: string) => ipcRenderer.invoke('terminal:type', selector, text),
  waitForElement: (selector: string, timeout?: number) =>
    ipcRenderer.invoke('terminal:waitForElement', selector, timeout),
  execute: (input: string) => ipcRenderer.invoke('terminal:execute', input),
  getTabs: () => ipcRenderer.invoke('terminal:get-tabs'),
  parse: (input: string) => ipcRenderer.invoke('terminal:parse', input),
  generateCode: (command: string, options?: { includeExplanation?: boolean }) =>
    ipcRenderer.invoke('terminal:generateCode', command, options),
  generateCodeStream: (command: string) =>
    ipcRenderer.invoke('terminal:generateCodeStream', command),
  cancelStream: () => ipcRenderer.invoke('terminal:cancelStream'),
  onStreamToken: (callback: (token: { type: string; content: string; code?: string }) => void) => {
    const listener = (_: unknown, token: { type: string; content: string; code?: string }) => callback(token);
    ipcRenderer.on('terminal:streamToken', listener);
    return () => ipcRenderer.off('terminal:streamToken', listener);
  },
  run: (command: string) =>
    ipcRenderer.invoke('terminal:run', command),
  agent: (query: string) =>
    ipcRenderer.invoke('terminal:agent', query),
  cancelAgent: () =>
    ipcRenderer.invoke('agent:cancel'),
  onStep: (callback: (step: any) => void) => {
    const listener = (_: unknown, step: any) => callback(step);
    ipcRenderer.on('terminal:step', listener);
    return () => ipcRenderer.off('terminal:step', listener);
  },
})

// Telemetry API
contextBridge.exposeInMainWorld('telemetry', {
  getTerminalLogs: (limit?: number) => ipcRenderer.invoke('telemetry:getTerminalLogs', limit),
  getTerminalStats: () => ipcRenderer.invoke('telemetry:getTerminalStats'),
  exportTerminalLogs: (outputPath: string) => ipcRenderer.invoke('telemetry:exportTerminalLogs', outputPath),
  clearTerminalLogs: () => ipcRenderer.invoke('telemetry:clearTerminalLogs'),
})

// Script Library API
contextBridge.exposeInMainWorld('scripts', {
  save: (config: { name: string; command: string; code: string; urlPattern?: string; tags?: string[]; description?: string }) =>
    ipcRenderer.invoke('scripts:save', config),
  getAll: () => ipcRenderer.invoke('scripts:getAll'),
  get: (id: string) => ipcRenderer.invoke('scripts:get', id),
  update: (id: string, updates: Record<string, unknown>) => ipcRenderer.invoke('scripts:update', id, updates),
  delete: (id: string) => ipcRenderer.invoke('scripts:delete', id),
  recordUsage: (id: string) => ipcRenderer.invoke('scripts:recordUsage', id),
  suggestForUrl: (url: string) => ipcRenderer.invoke('scripts:suggestForUrl', url),
  search: (query: string) => ipcRenderer.invoke('scripts:search', query),
  generateName: (command: string) => ipcRenderer.invoke('scripts:generateName', command),
})

// Page Monitor API
contextBridge.exposeInMainWorld('monitor', {
  create: (config: { name: string; url: string; tabId?: string; checkCode: string; description: string; intervalMs?: number }) =>
    ipcRenderer.invoke('monitor:create', config),
  getAll: () => ipcRenderer.invoke('monitor:getAll'),
  get: (id: string) => ipcRenderer.invoke('monitor:get', id),
  pause: (id: string) => ipcRenderer.invoke('monitor:pause', id),
  resume: (id: string) => ipcRenderer.invoke('monitor:resume', id),
  delete: (id: string) => ipcRenderer.invoke('monitor:delete', id),
  reset: (id: string) => ipcRenderer.invoke('monitor:reset', id),
  check: (id: string) => ipcRenderer.invoke('monitor:check', id),
  onTriggered: (callback: (data: { monitor: unknown; result: unknown }) => void) => {
    const listener = (_: unknown, data: { monitor: unknown; result: unknown }) => callback(data);
    ipcRenderer.on('monitor:triggered', listener);
    return () => ipcRenderer.off('monitor:triggered', listener);
  },
})
