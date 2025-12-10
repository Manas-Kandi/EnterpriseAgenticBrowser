/// <reference types="vite-plugin-electron/electron-env" />

declare namespace JSX {
  interface IntrinsicElements {
    webview: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string; allowpopups?: string; webpreferences?: string; onDidStartLoading?: any; onDidStopLoading?: any; onPageTitleUpdated?: any }, HTMLElement>;
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
    onApprovalRequest: (callback: (toolName: string, args: any) => void) => void
    respondApproval: (toolName: string, approved: boolean) => void
  }
}
