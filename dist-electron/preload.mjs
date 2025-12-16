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
electron.contextBridge.exposeInMainWorld("agent", {
  chat: (message) => electron.ipcRenderer.invoke("agent:chat", message),
  resetConversation: () => electron.ipcRenderer.invoke("agent:reset-conversation"),
  onApprovalRequest: (callback) => {
    const listener = (_, { toolName, args }) => callback(toolName, args);
    electron.ipcRenderer.on("agent:request-approval", listener);
    return () => electron.ipcRenderer.off("agent:request-approval", listener);
  },
  respondApproval: (toolName, approved) => electron.ipcRenderer.send("agent:approval-response", { toolName, approved }),
  onStep: (callback) => {
    const listener = (_, step) => callback(step);
    electron.ipcRenderer.on("agent:step", listener);
    return () => electron.ipcRenderer.off("agent:step", listener);
  }
});
electron.contextBridge.exposeInMainWorld("browser", {
  registerWebview: (tabId, webContentsId) => electron.ipcRenderer.invoke("browser:webview-register", { tabId, webContentsId }),
  setActiveTab: (tabId) => electron.ipcRenderer.invoke("browser:active-tab", { tabId })
});
