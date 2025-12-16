import { AsyncLocalStorage } from 'node:async_hooks';

type AgentRunStore = {
  runId: string;
};

export class AgentRunContext {
  private storage = new AsyncLocalStorage<AgentRunStore>();

  run<T>(runId: string, fn: () => T): T {
    return this.storage.run({ runId }, fn);
  }

  getRunId(): string | null {
    return this.storage.getStore()?.runId ?? null;
  }
}

export const agentRunContext = new AgentRunContext();
