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
}
