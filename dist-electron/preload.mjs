"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
electron.contextBridge.exposeInMainWorld("vault", {
  set: (account, secret) => electron.ipcRenderer.invoke("vault:set", account, secret),
  get: (account) => electron.ipcRenderer.invoke("vault:get", account),
  delete: (account) => electron.ipcRenderer.invoke("vault:delete", account)
});
electron.contextBridge.exposeInMainWorld("audit", {
  getLogs: (limit) => electron.ipcRenderer.invoke("audit:get-logs", limit)
});
electron.contextBridge.exposeInMainWorld("chatHistory", {
  get: () => electron.ipcRenderer.invoke("chatHistory:get"),
  set: (messages) => electron.ipcRenderer.invoke("chatHistory:set", messages),
  clear: () => electron.ipcRenderer.invoke("chatHistory:clear")
});
electron.contextBridge.exposeInMainWorld("policy", {
  status: () => electron.ipcRenderer.invoke("policy:status"),
  syncState: () => electron.ipcRenderer.invoke("policy:sync-state"),
  sync: (url) => electron.ipcRenderer.invoke("policy:sync", url),
  configure: (cfg) => electron.ipcRenderer.invoke("policy:configure", cfg),
  setAuthToken: (token) => electron.ipcRenderer.invoke("policy:set-auth-token", token),
  clearAuthToken: () => electron.ipcRenderer.invoke("policy:clear-auth-token"),
  getAdminMessage: () => electron.ipcRenderer.invoke("policy:get-admin-message"),
  setDevOverride: (enabled, token) => electron.ipcRenderer.invoke("policy:set-dev-override", enabled, token)
});
electron.contextBridge.exposeInMainWorld("identity", {
  getSession: () => electron.ipcRenderer.invoke("identity:get-session"),
  login: () => electron.ipcRenderer.invoke("identity:login"),
  logout: () => electron.ipcRenderer.invoke("identity:logout"),
  getAccessToken: () => electron.ipcRenderer.invoke("identity:get-access-token")
});
electron.contextBridge.exposeInMainWorld("agent", {
  chat: (message) => electron.ipcRenderer.invoke("agent:chat", message),
  resetConversation: () => electron.ipcRenderer.invoke("agent:reset-conversation"),
  getModels: () => electron.ipcRenderer.invoke("agent:get-models"),
  getLlmConfig: () => electron.ipcRenderer.invoke("agent:get-llm-config"),
  setLlmConfig: (cfg) => electron.ipcRenderer.invoke("agent:set-llm-config", cfg),
  testConnection: (cfg) => electron.ipcRenderer.invoke("agent:test-connection", cfg),
  listRemoteModels: (cfg) => electron.ipcRenderer.invoke("agent:list-remote-models", cfg),
  getCurrentModel: () => electron.ipcRenderer.invoke("agent:get-current-model"),
  setModel: (modelId) => electron.ipcRenderer.invoke("agent:set-model", modelId),
  setMode: (mode) => electron.ipcRenderer.invoke("agent:set-mode", mode),
  getMode: () => electron.ipcRenderer.invoke("agent:get-mode"),
  setPermissionMode: (mode) => electron.ipcRenderer.invoke("agent:set-permission-mode", mode),
  getPermissionMode: () => electron.ipcRenderer.invoke("agent:get-permission-mode"),
  onApprovalRequest: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("agent:request-approval", listener);
    return () => electron.ipcRenderer.off("agent:request-approval", listener);
  },
  onApprovalTimeout: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("agent:approval-timeout", listener);
    return () => electron.ipcRenderer.off("agent:approval-timeout", listener);
  },
  respondApproval: (requestId, approved) => electron.ipcRenderer.send("agent:approval-response", { requestId, approved }),
  sendFeedback: (skillId, outcome, version) => {
    if (typeof outcome === "boolean") {
      return electron.ipcRenderer.invoke("agent:feedback", { skillId, success: outcome });
    }
    return electron.ipcRenderer.invoke("agent:feedback", { skillId, label: outcome, version });
  },
  onStep: (callback) => {
    const listener = (_, step) => callback(step);
    electron.ipcRenderer.on("agent:step", listener);
    return () => electron.ipcRenderer.off("agent:step", listener);
  },
  getSavedPlans: () => electron.ipcRenderer.invoke("agent:get-saved-plans"),
  savePlanFor: (taskId, plan) => electron.ipcRenderer.invoke("agent:save-plan", taskId, plan),
  deletePlan: (taskId) => electron.ipcRenderer.invoke("agent:delete-plan", taskId),
  setAutoLearn: (enabled) => electron.ipcRenderer.invoke("agent:set-auto-learn", enabled),
  onToken: (callback) => {
    const listener = (_, token) => callback(token);
    electron.ipcRenderer.on("agent:token", listener);
    return () => electron.ipcRenderer.off("agent:token", listener);
  }
});
electron.contextBridge.exposeInMainWorld("browser", {
  registerWebview: (tabId, webContentsId) => electron.ipcRenderer.invoke("browser:webview-register", { tabId, webContentsId }),
  setActiveTab: (tabId) => electron.ipcRenderer.invoke("browser:active-tab", { tabId }),
  activateTab: (tabId) => electron.ipcRenderer.send("browser:activate-tab", { tabId }),
  navigate: (url) => electron.ipcRenderer.invoke("browser:navigate-tab", url),
  onNavigateTo: (callback) => {
    const listener = (_, url) => callback(url);
    electron.ipcRenderer.on("browser:navigate-to", listener);
    return () => electron.ipcRenderer.off("browser:navigate-to", listener);
  },
  onActivateTab: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("browser:activate-tab", listener);
    return () => electron.ipcRenderer.off("browser:activate-tab", listener);
  },
  onOpenAgentTab: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("browser:open-agent-tab", listener);
    return () => electron.ipcRenderer.off("browser:open-agent-tab", listener);
  },
  reportAgentTabOpened: (payload) => electron.ipcRenderer.send("browser:open-agent-tab-result", payload)
});
electron.contextBridge.exposeInMainWorld("newtab", {
  getDashboardSnapshot: () => electron.ipcRenderer.invoke("newtab:dashboard-snapshot"),
  onDashboardUpdate: (callback) => {
    const listener = (_, snapshot) => callback(snapshot);
    electron.ipcRenderer.on("newtab:dashboard-update", listener);
    return () => electron.ipcRenderer.off("newtab:dashboard-update", listener);
  }
});
electron.contextBridge.exposeInMainWorld("telemetry", {
  export: () => electron.ipcRenderer.invoke("telemetry:export")
});
electron.contextBridge.exposeInMainWorld("session", {
  getInfo: () => electron.ipcRenderer.invoke("session:get-info"),
  clear: () => electron.ipcRenderer.invoke("session:clear"),
  onRestored: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("session:restored", listener);
    return () => electron.ipcRenderer.off("session:restored", listener);
  }
});
electron.contextBridge.exposeInMainWorld("benchmark", {
  runSuite: (filter) => electron.ipcRenderer.invoke("benchmark:runSuite", filter)
});
electron.contextBridge.exposeInMainWorld("terminal", {
  getContext: () => electron.ipcRenderer.invoke("terminal:getContext"),
  getMinimalContext: () => electron.ipcRenderer.invoke("terminal:getMinimalContext"),
  executeCode: (code, options) => electron.ipcRenderer.invoke("terminal:executeCode", code, options),
  evaluate: (expression) => electron.ipcRenderer.invoke("terminal:evaluate", expression),
  queryDOM: (selector) => electron.ipcRenderer.invoke("terminal:queryDOM", selector),
  click: (selector) => electron.ipcRenderer.invoke("terminal:click", selector),
  type: (selector, text) => electron.ipcRenderer.invoke("terminal:type", selector, text),
  waitForElement: (selector, timeout) => electron.ipcRenderer.invoke("terminal:waitForElement", selector, timeout),
  execute: (input) => electron.ipcRenderer.invoke("terminal:execute", input),
  getTabs: () => electron.ipcRenderer.invoke("terminal:get-tabs"),
  parse: (input) => electron.ipcRenderer.invoke("terminal:parse", input),
  generateCode: (command, options) => electron.ipcRenderer.invoke("terminal:generateCode", command, options),
  generateCodeStream: (command) => electron.ipcRenderer.invoke("terminal:generateCodeStream", command),
  cancelStream: () => electron.ipcRenderer.invoke("terminal:cancelStream"),
  onStreamToken: (callback) => {
    const listener = (_, token) => callback(token);
    electron.ipcRenderer.on("terminal:streamToken", listener);
    return () => electron.ipcRenderer.off("terminal:streamToken", listener);
  },
  run: (command) => electron.ipcRenderer.invoke("terminal:run", command),
  agent: (query) => electron.ipcRenderer.invoke("terminal:agent", query),
  cancelAgent: () => electron.ipcRenderer.invoke("agent:cancel"),
  onStep: (callback) => {
    const listener = (_, step) => callback(step);
    electron.ipcRenderer.on("terminal:step", listener);
    return () => electron.ipcRenderer.off("terminal:step", listener);
  }
});
electron.contextBridge.exposeInMainWorld("telemetry", {
  getTerminalLogs: (limit) => electron.ipcRenderer.invoke("telemetry:getTerminalLogs", limit),
  getTerminalStats: () => electron.ipcRenderer.invoke("telemetry:getTerminalStats"),
  exportTerminalLogs: (outputPath) => electron.ipcRenderer.invoke("telemetry:exportTerminalLogs", outputPath),
  clearTerminalLogs: () => electron.ipcRenderer.invoke("telemetry:clearTerminalLogs")
});
electron.contextBridge.exposeInMainWorld("scripts", {
  save: (config) => electron.ipcRenderer.invoke("scripts:save", config),
  getAll: () => electron.ipcRenderer.invoke("scripts:getAll"),
  get: (id) => electron.ipcRenderer.invoke("scripts:get", id),
  update: (id, updates) => electron.ipcRenderer.invoke("scripts:update", id, updates),
  delete: (id) => electron.ipcRenderer.invoke("scripts:delete", id),
  recordUsage: (id) => electron.ipcRenderer.invoke("scripts:recordUsage", id),
  suggestForUrl: (url) => electron.ipcRenderer.invoke("scripts:suggestForUrl", url),
  search: (query) => electron.ipcRenderer.invoke("scripts:search", query),
  generateName: (command) => electron.ipcRenderer.invoke("scripts:generateName", command)
});
electron.contextBridge.exposeInMainWorld("monitor", {
  create: (config) => electron.ipcRenderer.invoke("monitor:create", config),
  getAll: () => electron.ipcRenderer.invoke("monitor:getAll"),
  get: (id) => electron.ipcRenderer.invoke("monitor:get", id),
  pause: (id) => electron.ipcRenderer.invoke("monitor:pause", id),
  resume: (id) => electron.ipcRenderer.invoke("monitor:resume", id),
  delete: (id) => electron.ipcRenderer.invoke("monitor:delete", id),
  reset: (id) => electron.ipcRenderer.invoke("monitor:reset", id),
  check: (id) => electron.ipcRenderer.invoke("monitor:check", id),
  onTriggered: (callback) => {
    const listener = (_, data) => callback(data);
    electron.ipcRenderer.on("monitor:triggered", listener);
    return () => electron.ipcRenderer.off("monitor:triggered", listener);
  }
});
