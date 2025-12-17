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
    onApprovalRequest: (callback: (payload: { requestId: string; toolName: string; args: unknown; runId?: string; timeoutMs?: number }) => void) => (() => void);
    onApprovalTimeout: (callback: (payload: any) => void) => () => void;
    respondApproval: (requestId: string, approved: boolean) => void;
    sendFeedback: (skillId: string, success: boolean) => Promise<boolean>;
    onStep: (callback: (step: any) => void) => () => void;
  }
  vault?: {
    set: (account: string, secret: string) => Promise<void>;
    get: (account: string) => Promise<string | null>;
    delete: (account: string) => Promise<boolean>;
  }
  audit?: {
    getLogs: (limit?: number) => Promise<Array<{ id: string; timestamp: string; actor: string; action: string; details: unknown; status: string }>>;
  }
  browser?: {
    registerWebview: (tabId: string, webContentsId: number) => Promise<void>;
    setActiveTab: (tabId: string | null) => Promise<void>;
    onNavigateTo: (callback: (url: string) => void) => (() => void);
  }
  telemetry?: {
    export: () => Promise<{ success: boolean; count: number; path: string }>;
  }
  benchmark?: {
    runSuite: (filter?: string) => Promise<Array<{ scenarioId: string; success: boolean; durationMs: number; steps: number; error?: string; runId: string }>>;
  }
}
