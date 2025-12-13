/// <reference types="vite/client" />

interface Window {
  agent: {
    chat: (message: string) => Promise<string>;
    onApprovalRequest: (callback: (toolName: string, args: unknown) => void) => (() => void);
    respondApproval: (toolName: string, approved: boolean) => void;
    onStep: (callback: (step: unknown) => void) => (() => void);
  }
  vault: {
    set: (account: string, secret: string) => Promise<void>;
    get: (account: string) => Promise<string | null>;
    delete: (account: string) => Promise<boolean>;
  }
  browser: {
    registerWebview: (tabId: string, webContentsId: number) => Promise<void>;
    setActiveTab: (tabId: string | null) => Promise<void>;
  }
}
