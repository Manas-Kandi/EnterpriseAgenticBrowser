import { ipcMain, BrowserWindow } from 'electron';
import { v4 as uuidv4 } from 'uuid';

type OpenAgentTabArgs = {
  url: string;
  background: boolean;
  agentCreated: boolean;
};

export class AgentTabOpenService {
  private pending = new Map<string, (tabId: string) => void>();
  private listening = false;

  private ensureListener() {
    if (this.listening) return;
    this.listening = true;

    ipcMain.on(
      'browser:open-agent-tab-result',
      (_event, payload: { requestId: string; tabId: string }) => {
        const resolve = this.pending.get(payload.requestId);
        if (resolve) {
          this.pending.delete(payload.requestId);
          resolve(payload.tabId);
        }
      }
    );
  }

  async openAgentTab(args: OpenAgentTabArgs): Promise<string> {
    this.ensureListener();

    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      return 'new-tab-' + Date.now();
    }

    const requestId = uuidv4();
    const tabId = await new Promise<string>((resolve) => {
      this.pending.set(requestId, resolve);
      win.webContents.send('browser:open-agent-tab', { ...args, requestId });

      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          resolve('new-tab-' + Date.now());
        }
      }, 2000);
    });

    return tabId;
  }
}

export const agentTabOpenService = new AgentTabOpenService();
