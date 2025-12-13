/// <reference types="vite/client" />

interface Window {
  agent: {
    chat: (message: string) => Promise<string>;
    onApprovalRequest: (callback: (toolName: string, args: any) => void) => void;
    respondApproval: (toolName: string, approved: boolean) => void;
    onStep: (callback: (step: any) => void) => void;
  }
  vault: {
    set: (account: string, secret: string) => Promise<boolean>;
    get: (account: string) => Promise<string | null>;
    delete: (account: string) => Promise<boolean>;
  }
}
