/// <reference types="vite-plugin-electron/electron-env" />

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; allowpopups?: string; webpreferences?: string; onDidStartLoading?: any; onDidStopLoading?: any; onPageTitleUpdated?: any; ref?: any }, HTMLElement>;
  }
}
declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer
  vault: {
    set: (account: string, secret: string) => Promise<void>
    get: (account: string) => Promise<string | null>
    delete: (account: string) => Promise<boolean>
  }
  agent: {
    chat: (message: string) => Promise<string>
    resetConversation: () => Promise<{ success: boolean }>
    getModels: () => Promise<Array<{ id: string; name: string; supportsThinking: boolean }>>
    getCurrentModel: () => Promise<string>
    setModel: (modelId: string) => Promise<{ success: boolean; modelId: string }>
    onApprovalRequest: (callback: (toolName: string, args: unknown) => void) => (() => void)
    respondApproval: (toolName: string, approved: boolean) => void
    onStep: (callback: (step: unknown) => void) => (() => void)
  }
  browser: {
    registerWebview: (tabId: string, webContentsId: number) => Promise<void>
    setActiveTab: (tabId: string | null) => Promise<void>
  }
  terminal?: {
    getContext: () => Promise<unknown>
    getMinimalContext: () => Promise<unknown>
    executeCode: (code: string, options?: { timeout?: number }) => Promise<unknown>
    evaluate: (expression: string) => Promise<unknown>
    queryDOM: (selector: string) => Promise<unknown>
    click: (selector: string) => Promise<unknown>
    type: (selector: string, text: string) => Promise<unknown>
    waitForElement: (selector: string, timeout?: number) => Promise<unknown>
    execute: (input: string) => Promise<{ success: boolean; result?: unknown; error?: string }>
    getTabs: () => Promise<Array<{ tabId: string; url: string; title: string; index: number; isActive: boolean }>>
    parse: (input: string) => Promise<{ type: 'structured' | 'natural'; target: { type: string; value?: any }; action: string; args: string[] }>
    generateCode: (command: string, options?: { includeExplanation?: boolean }) => Promise<{ success: boolean; code?: string; error?: string }>
    generateCodeStream: (command: string) => Promise<unknown>
    cancelStream: () => Promise<unknown>
    onStreamToken: (callback: (token: { type: string; content: string; code?: string }) => void) => () => void
    run: (command: string) => Promise<{ success: boolean; result?: unknown; code?: string; error?: string; stack?: string }>
    agent: (query: string) => Promise<{ success: boolean; result?: string; error?: string }>
    onStep: (callback: (step: any) => void) => () => void
  }
}
