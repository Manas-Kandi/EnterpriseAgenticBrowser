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
  onApprovalRequest: (callback) => {
    electron.ipcRenderer.on("agent:request-approval", (_, { toolName, args }) => callback(toolName, args));
  },
  respondApproval: (toolName, approved) => electron.ipcRenderer.send("agent:approval-response", { toolName, approved })
});
