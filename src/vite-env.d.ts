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

  terminal?: {
    getContext: () => Promise<{
      url: string;
      title: string;
      metaDescription?: string;
      interactiveElements: {
        buttons: Array<{ tag: string; id?: string; classes?: string[]; text?: string; dataTestId?: string }>;
        links: Array<{ tag: string; id?: string; classes?: string[]; text?: string; href?: string }>;
        inputs: Array<{ tag: string; id?: string; classes?: string[]; type?: string; name?: string; placeholder?: string }>;
        selects: Array<{ tag: string; id?: string; classes?: string[]; name?: string }>;
      };
      mainContent?: Array<{ tag: string; id?: string; classes?: string[]; text?: string }>;
      tokenEstimate: number;
      truncated: boolean;
    }>;
    getMinimalContext: () => Promise<{ url: string; title: string; summary: string }>;
    executeCode: (code: string, options?: { timeout?: number }) => Promise<{
      success: boolean;
      result?: unknown;
      error?: string;
      stack?: string;
      duration: number;
      timedOut?: boolean;
    }>;
    evaluate: (expression: string) => Promise<{ success: boolean; result?: unknown; error?: string; duration: number }>;
    queryDOM: (selector: string) => Promise<{ success: boolean; result?: unknown; error?: string; duration: number }>;
    click: (selector: string) => Promise<{ success: boolean; result?: unknown; error?: string; duration: number }>;
    type: (selector: string, text: string) => Promise<{ success: boolean; result?: unknown; error?: string; duration: number }>;
    waitForElement: (selector: string, timeout?: number) => Promise<{ success: boolean; result?: unknown; error?: string; duration: number }>;
    execute: (input: string) => Promise<{ success: boolean; result?: unknown; error?: string }>;
    getTabs: () => Promise<Array<{ tabId: string; url: string; title: string; index: number; isActive: boolean }>>;
    parse: (input: string) => Promise<{ type: string; [key: string]: unknown } | null>;
    generateCode: (command: string, options?: { includeExplanation?: boolean }) => Promise<{
      success: boolean;
      code?: string;
      error?: string;
      tokensUsed?: number;
      duration: number;
    }>;
    generateCodeStream: (command: string) => Promise<{ started: boolean }>;
    cancelStream: () => Promise<{ cancelled: boolean }>;
    onStreamToken: (callback: (token: { type: string; content: string; code?: string }) => void) => () => void;
    run: (command: string) => Promise<{
      success: boolean;
      code?: string;
      result?: unknown;
      error?: string;
      stack?: string;
      duration: number;
      retryCount?: number;
      errorHistory?: string[];
    }>;
    agent: (query: string) => Promise<{ success: boolean; result?: string; error?: string }>;
    onStep: (callback: (step: any) => void) => () => void;
  }

  telemetry: {
    getTerminalLogs: (limit?: number) => Promise<Array<{
      id: string;
      timestamp: number;
      command: string;
      code: string;
      success: boolean;
      result?: unknown;
      error?: string;
      duration: number;
      contextHash?: string;
      url?: string;
      retryCount?: number;
    }>>;
    getTerminalStats: () => Promise<{
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
      recentErrors: string[];
    }>;
    exportTerminalLogs: (outputPath: string) => Promise<number>;
    clearTerminalLogs: () => Promise<void>;
  }

  scripts: {
    save: (config: { name: string; command: string; code: string; urlPattern?: string; tags?: string[]; description?: string }) => Promise<{
      id: string;
      name: string;
      command: string;
      code: string;
      urlPattern?: string;
      tags: string[];
      createdAt: number;
      useCount: number;
    }>;
    getAll: () => Promise<Array<{
      id: string;
      name: string;
      command: string;
      code: string;
      urlPattern?: string;
      tags: string[];
      createdAt: number;
      lastUsedAt?: number;
      useCount: number;
      description?: string;
    }>>;
    get: (id: string) => Promise<unknown>;
    update: (id: string, updates: Record<string, unknown>) => Promise<unknown>;
    delete: (id: string) => Promise<boolean>;
    recordUsage: (id: string) => Promise<void>;
    suggestForUrl: (url: string) => Promise<Array<{ id: string; name: string; command: string; code: string; urlPattern?: string }>>;
    search: (query: string) => Promise<Array<{ id: string; name: string; command: string; code: string }>>;
    generateName: (command: string) => Promise<string>;
  }

  monitor: {
    create: (config: { name: string; url: string; tabId?: string; checkCode: string; description: string; intervalMs?: number }) => Promise<{
      id: string;
      name: string;
      url: string;
      checkCode: string;
      description: string;
      intervalMs: number;
      createdAt: number;
      active: boolean;
      triggered: boolean;
    }>;
    getAll: () => Promise<Array<{
      id: string;
      name: string;
      url: string;
      description: string;
      intervalMs: number;
      active: boolean;
      triggered: boolean;
      lastCheckedAt?: number;
      triggeredAt?: number;
    }>>;
    get: (id: string) => Promise<unknown>;
    pause: (id: string) => Promise<boolean>;
    resume: (id: string) => Promise<boolean>;
    delete: (id: string) => Promise<boolean>;
    reset: (id: string) => Promise<boolean>;
    check: (id: string) => Promise<{ monitorId: string; triggered: boolean; result: unknown; error?: string; checkedAt: number } | null>;
    onTriggered: (callback: (data: { monitor: unknown; result: unknown }) => void) => () => void;
  }
}
