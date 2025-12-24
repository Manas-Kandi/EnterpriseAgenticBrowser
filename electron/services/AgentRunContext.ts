import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';

type AgentRunStore = {
  runId: string;
  requesterWebContentsId: number;
  browserContext?: {
    url?: string;
    domain?: string;
  };
  observeOnly?: boolean;
  permissionMode?: 'yolo' | 'permissions' | 'manual';
  loop?: {
    urlCounts: Map<string, number>;
    toolSigCounts: Map<string, number>;
    alert?: { kind: 'url' | 'tool'; key: string; count: number };
  };
};

export class AgentRunContext {
  private storage = new AsyncLocalStorage<AgentRunStore>();

  run<T>(store: AgentRunStore, fn: () => T): T {
    if (!store.loop) {
      store.loop = {
        urlCounts: new Map(),
        toolSigCounts: new Map(),
      };
    }
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
      const url = typeof context?.url === 'string' ? context.url : undefined;
      if (url) this.recordUrlVisit(url);
    }
  }

  recordUrlVisit(url: string) {
    const store = this.storage.getStore();
    if (!store?.loop) return;
    const key = String(url);
    const next = (store.loop.urlCounts.get(key) ?? 0) + 1;
    store.loop.urlCounts.set(key, next);
    if (next > 3) {
      store.loop.alert = { kind: 'url', key, count: next };
    }
  }

  recordToolCall(toolName: string, args: any) {
    const store = this.storage.getStore();
    if (!store?.loop) return;
    const argsJson = (() => {
      try {
        return JSON.stringify(args ?? null);
      } catch {
        return '[unserializable_args]';
      }
    })();
    const argsHash = crypto.createHash('sha256').update(argsJson).digest('hex');
    const sig = `${toolName}:${argsHash}`;
    const next = (store.loop.toolSigCounts.get(sig) ?? 0) + 1;
    store.loop.toolSigCounts.set(sig, next);
    if (next > 3) {
      store.loop.alert = { kind: 'tool', key: sig, count: next };
    }
    if (toolName === 'browser_navigate' && typeof args?.url === 'string') {
      this.recordUrlVisit(args.url);
    }
  }

  consumeLoopAlert(): { kind: 'url' | 'tool'; key: string; count: number } | null {
    const store = this.storage.getStore();
    if (!store?.loop?.alert) return null;
    const v = store.loop.alert;
    store.loop.alert = undefined;
    return v;
  }

  getObserveOnly(): boolean {
    return this.storage.getStore()?.observeOnly ?? false;
  }

  setObserveOnly(observeOnly: boolean): void {
    const store = this.storage.getStore();
    if (store) {
      store.observeOnly = observeOnly;
    }
  }

  getPermissionMode(): 'yolo' | 'permissions' | 'manual' {
    return this.storage.getStore()?.permissionMode ?? 'permissions';
  }

  getYoloMode(): boolean {
    return this.storage.getStore()?.permissionMode === 'yolo';
  }

  setPermissionMode(mode: 'yolo' | 'permissions' | 'manual'): void {
    const store = this.storage.getStore();
    if (store) {
      store.permissionMode = mode;
    }
  }
}

export const agentRunContext = new AgentRunContext();
