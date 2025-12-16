import { AsyncLocalStorage } from 'node:async_hooks';

type AgentRunStore = {
  runId: string;
  requesterWebContentsId: number;
  browserContext?: {
    url?: string;
    domain?: string;
  };
};

export class AgentRunContext {
  private storage = new AsyncLocalStorage<AgentRunStore>();

  run<T>(store: AgentRunStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  getRunId(): string | null {
    return this.storage.getStore()?.runId ?? null;
  }

  getRequesterWebContentsId(): number | null {
    return this.storage.getStore()?.requesterWebContentsId ?? null;
  }

  getBrowserContext(): { url?: string; domain?: string } | null {
    return this.storage.getStore()?.browserContext ?? null;
  }

  setBrowserContext(context: { url?: string; domain?: string }): void {
    const store = this.storage.getStore();
    if (store) {
      store.browserContext = context;
    }
  }
}

export const agentRunContext = new AgentRunContext();
