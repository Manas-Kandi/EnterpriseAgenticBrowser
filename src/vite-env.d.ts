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
    getLlmConfig: () => Promise<{ provider: string; baseUrl: string; apiKeyAccount: string }>;
    setLlmConfig: (cfg: any) => Promise<{ success: boolean }>;
    testConnection: (cfg: { baseUrl: string; apiKey?: string; model: string }) => Promise<{ success: boolean; error?: string; response?: string; model?: string }>;
    listRemoteModels: (cfg: { baseUrl: string; apiKey?: string }) => Promise<{ success: boolean; error?: string; models: Array<{ id: string; name: string }> }>;
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

  chatHistory?: {
    get: () => Promise<any[]>;
    set: (messages: any[]) => Promise<{ success: boolean }>;
    clear: () => Promise<{ success: boolean }>;
  }

  policy?: {
    status: () => Promise<{ 
      configuredUrl: string | null; 
      hasRemotePolicy: boolean; 
      version: number | null; 
      fetchedAt: number | null; 
      expiresAt: number | null;
      allowlistCount: number; 
      blocklistCount: number; 
      toolRestrictionsCount: number;
      timeBasedRulesCount: number;
      developerOverrideEnabled: boolean;
      message: string | null;
      syncStatus: 'idle' | 'syncing' | 'success' | 'error';
      lastSyncError: string | null;
      isExpired: boolean;
    }>;
    syncState: () => Promise<{
      status: 'idle' | 'syncing' | 'success' | 'error';
      lastSyncTime: number | null;
      lastError: string | null;
      nextSyncTime: number | null;
      policyVersion: number | null;
      isExpired: boolean;
    }>;
    sync: (url?: string) => Promise<{ success: boolean; bundle?: any; error?: string }>;
    configure: (cfg: { url: string; authToken?: string }) => Promise<{ success: boolean; error?: string }>;
    setAuthToken: (token: string) => Promise<{ success: boolean; error?: string }>;
    clearAuthToken: () => Promise<{ success: boolean }>;
    getAdminMessage: () => Promise<{ message: string | null }>;
    setDevOverride: (enabled: boolean, token?: string) => Promise<{ success: boolean }>;
  }

  identity?: {
    getSession: () => Promise<{ name: string; email: string; avatar?: string } | null>;
    login: () => Promise<{ name: string; email: string; avatar?: string }>;
    logout: () => Promise<{ success: boolean }>;
    getAccessToken: () => Promise<string | null>;
  }
  browser?: {
    registerWebview: (tabId: string, webContentsId: number) => Promise<void>;
    setActiveTab: (tabId: string | null) => Promise<void>;
    activateTab: (tabId: string) => void;
    onNavigateTo: (callback: (url: string) => void) => (() => void);
    onActivateTab: (callback: (payload: { tabId: string }) => void) => (() => void);
    onOpenAgentTab: (callback: (payload: { url: string; background: boolean; agentCreated: boolean; requestId?: string }) => void) => (() => void);
    reportAgentTabOpened: (payload: { requestId: string; tabId: string }) => void;
  }
  telemetry?: {
    export: () => Promise<{ success: boolean; count: number; path: string }>;
  }

  newtab?: {
    getDashboardSnapshot: () => Promise<{ ts: number; kpis: Array<{ id: string; label: string; value: string; delta?: string }>; events: Array<{ id: string; ts: number; title: string; detail?: string; severity?: 'info' | 'warn' | 'critical' }>; reasoning: Array<{ id: string; ts: number; markdown: string }> }>;
    onDashboardUpdate: (callback: (snapshot: { ts: number; kpis: Array<{ id: string; label: string; value: string; delta?: string }>; events: Array<{ id: string; ts: number; title: string; detail?: string; severity?: 'info' | 'warn' | 'critical' }>; reasoning: Array<{ id: string; ts: number; markdown: string }> }) => void) => (() => void);
  }

  session?: {
    getInfo: () => Promise<{ lastSessionTime: number | null; hasSession: boolean }>;
    clear: () => Promise<{ success: boolean }>;
    onRestored: (callback: (payload: { lastSessionTime: number; restoredAt: number }) => void) => (() => void);
  }
}
