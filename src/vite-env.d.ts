/// <reference types="vite/client" />

interface Window {
  ipcRenderer?: {
    on: (channel: string, listener: (event: unknown, ...args: unknown[]) => void) => void;
    off: (channel: string, listener: (...args: unknown[]) => void) => void;
    send: (channel: string, ...args: unknown[]) => void;
    invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
  }
  agent?: {
    chat: (message: string) => Promise<string>;
    resetConversation: () => Promise<{ success: boolean }>;
    getModels: () => Promise<Array<{ id: string; name: string; supportsThinking: boolean }>>;
    getCurrentModel: () => Promise<string>;
    setModel: (modelId: string) => Promise<{ success: boolean; modelId: string }>;
    onApprovalRequest: (callback: (toolName: string, args: unknown) => void) => (() => void);
    respondApproval: (toolName: string, approved: boolean) => void;
    onStep: (callback: (step: unknown) => void) => (() => void);
  }
  vault?: {
    set: (account: string, secret: string) => Promise<void>;
    get: (account: string) => Promise<string | null>;
    delete: (account: string) => Promise<boolean>;
  }
  browser?: {
    registerWebview: (tabId: string, webContentsId: number) => Promise<void>;
    setActiveTab: (tabId: string | null) => Promise<void>;
  }
}
