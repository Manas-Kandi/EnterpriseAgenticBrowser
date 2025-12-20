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
    setMode: (mode: 'chat' | 'read' | 'do') => Promise<{ success: boolean }>;
    getMode: () => Promise<'chat' | 'read' | 'do'>;
    setPermissionMode: (mode: 'yolo' | 'permissions') => Promise<{ success: boolean }>;
    getPermissionMode: () => Promise<'yolo' | 'permissions'>;
    onApprovalRequest: (callback: (payload: { requestId: string; toolName: string; args: unknown; runId?: string; timeoutMs?: number }) => void) => (() => void);
    onApprovalTimeout: (callback: (payload: any) => void) => () => void;
    respondApproval: (requestId: string, approved: boolean) => void;
    sendFeedback: (skillId: string, outcome: boolean | 'worked' | 'failed' | 'partial', version?: number) => Promise<boolean>;
    onStep: (callback: (step: any) => void) => () => void;
    onToken: (callback: (token: string) => void) => () => void;
    getSavedPlans: () => Promise<Array<{ id: string; ts: number; plan: string[] }>>;
    savePlanFor: (taskId: string, plan: string[]) => Promise<{ success: boolean }>;
    deletePlan: (taskId: string) => Promise<{ success: boolean }>;
    setAutoLearn: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
    runBenchmarkSuite: (filter?: string) => Promise<Array<{ scenarioId: string; success: boolean; durationMs: number; steps: number; error?: string; runId: string; llmCalls: number }>>;
    exportBenchmarkTrajectories: (results: any[]) => Promise<{ success: boolean; path: string }>;
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
}
