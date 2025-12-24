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
  sync: (url) => electron.ipcRenderer.invoke("policy:sync", url),
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
  onNavigateTo: (callback) => {
    const listener = (_, url) => callback(url);
    electron.ipcRenderer.on("browser:navigate-to", listener);
    return () => electron.ipcRenderer.off("browser:navigate-to", listener);
  },
  onOpenAgentTab: (callback) => {
    const listener = (_, payload) => callback(payload);
    electron.ipcRenderer.on("browser:open-agent-tab", listener);
    return () => electron.ipcRenderer.off("browser:open-agent-tab", listener);
  }
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
electron.contextBridge.exposeInMainWorld("benchmark", {
  runSuite: (filter) => electron.ipcRenderer.invoke("benchmark:runSuite", filter)
});
