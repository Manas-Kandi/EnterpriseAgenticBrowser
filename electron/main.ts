import { app, BrowserWindow, ipcMain, webContents } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { vaultService } from './services/VaultService'
import { agentService, AVAILABLE_MODELS } from './services/AgentService'
import { taskKnowledgeService } from './services/TaskKnowledgeService'
import { auditService } from './services/AuditService'
import { toolRegistry } from './services/ToolRegistry'
import { browserTargetService } from './services/BrowserTargetService'
import { agentRunContext } from './services/AgentRunContext'
import { telemetryService } from './services/TelemetryService'
import { PlanMemory } from './services/PlanMemory'
import { PolicyService } from './services/PolicyService'
import { benchmarkService, BenchmarkResult } from './services/BenchmarkService'
import { DummyAeroCoreDataSource, NewTabDashboardService } from './services/NewTabDashboardService'
import { identityService } from './services/IdentityService'
import './services/CodeReaderService'
import './integrations/mock/MockJiraConnector'; // Initialize Mock Jira
import './integrations/mock/MockConfluenceConnector'; // Initialize Mock Confluence
import './integrations/mock/MockTrelloConnector'; // Initialize Mock Trello
import './integrations/BrowserAutomationService'; // Initialize Playwright Automation
import './services/WebAPIService'; // Initialize Web API tools (GitHub, HN, Wikipedia APIs)
import './services/CodeExecutionService'; // Initialize dynamic code execution for agent

const planMemory = new PlanMemory();

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

const newTabDashboardService = new NewTabDashboardService(new DummyAeroCoreDataSource());
let newTabDashboardTimer: NodeJS.Timeout | null = null;

let auditMaintenanceTimer: NodeJS.Timeout | null = null;

type PendingApproval = {
  requestId: string;
  runId: string | null;
  toolName: string;
  requesterWebContentsId: number;
  createdAt: number;
  timeout: NodeJS.Timeout;
  resolve: (result: boolean | { approved: boolean; reason?: 'timeout' | 'denied' }) => void;
};

const pendingApprovals = new Map<string, PendingApproval>();
const APPROVAL_TIMEOUT_MS = 30_000;

let chatHistoryKey: Buffer | null = null;

async function loadOrGenerateChatHistoryKey() {
  if (chatHistoryKey) return chatHistoryKey;
  let keyHex = await vaultService.getSecret('chat_history_key');
  if (!keyHex) {
    keyHex = crypto.randomBytes(32).toString('hex');
    await vaultService.setSecret('chat_history_key', keyHex);
  }
  chatHistoryKey = Buffer.from(keyHex, 'hex');
  return chatHistoryKey;
}

async function encryptChatHistory(text: string): Promise<string> {
  const key = await loadOrGenerateChatHistoryKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

async function decryptChatHistory(payload: string): Promise<string> {
  const key = await loadOrGenerateChatHistoryKey();
  const parts = String(payload ?? '').split(':');
  const ivHex = parts.shift() ?? '';
  const dataHex = parts.join(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedText = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      webviewTag: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL).catch((e) => {
      console.error('Failed to load dev server URL:', e);
    });
    // Open DevTools in development mode to see any errors
    win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
if (process.env.ENABLE_ELECTRON_REMOTE_DEBUGGING === 'true') {
  app.commandLine.appendSwitch('remote-debugging-port', '9222');
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  // Initialize PolicyService
  const policyService = new PolicyService(telemetryService, auditService);
  toolRegistry.setPolicyService(policyService);

  policyService
    .init({ remotePolicyUrl: process.env.POLICY_REMOTE_URL || undefined })
    .catch(() => undefined);

  ipcMain.handle('policy:status', async () => {
    return policyService.getRemotePolicyStatus();
  });

  ipcMain.handle('policy:sync', async (_event, url?: string) => {
    const targetUrl = typeof url === 'string' && url.trim() ? url.trim() : (process.env.POLICY_REMOTE_URL || '');
    if (!targetUrl) return { success: false, error: 'No policy URL provided' };
    try {
      const bundle = await policyService.fetchRemotePolicies(targetUrl);
      return { success: true, bundle };
    } catch (e: any) {
      return { success: false, error: String(e?.message ?? e) };
    }
  });

  ipcMain.handle('policy:set-dev-override', async (_event, enabled: boolean, token?: string) => {
    const ok = await policyService.setDeveloperOverride(Boolean(enabled), token);
    return { success: ok };
  });

  ipcMain.handle('identity:get-session', async () => {
    return await identityService.getSession();
  });

  ipcMain.handle('identity:login', async () => {
    const profile = await identityService.loginWithPopup();
    return profile;
  });

  ipcMain.handle('identity:logout', async () => {
    await identityService.clearSession();
    return { success: true };
  });

  ipcMain.handle('identity:get-access-token', async () => {
    return await identityService.getAccessToken();
  });

  // New Tab live dashboard (dummy data + scripted reasoning).
  // Intended to be swappable with real SaaS inputs later via DashboardDataSource.
  newTabDashboardService
    .init()
    .then(() => {
      if (newTabDashboardTimer) clearInterval(newTabDashboardTimer);
      newTabDashboardTimer = setInterval(async () => {
        try {
          const next = await newTabDashboardService.tick();
          for (const w of BrowserWindow.getAllWindows()) {
            if (!w || w.isDestroyed()) continue;
            try {
              w.webContents.send('newtab:dashboard-update', next);
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore tick failures
        }
      }, 3500);
    })
    .catch(() => undefined);

  ipcMain.handle('newtab:dashboard-snapshot', async () => {
    return newTabDashboardService.getSnapshot();
  });

  ipcMain.handle('chatHistory:get', async () => {
    const filePath = path.join(app.getPath('userData'), 'chat_history.json.enc');
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const json = await decryptChatHistory(raw);
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  ipcMain.handle('chatHistory:set', async (_event, messages: unknown) => {
    const filePath = path.join(app.getPath('userData'), 'chat_history.json.enc');
    const arr = Array.isArray(messages) ? messages : [];
    const capped = arr.slice(-200);
    const json = JSON.stringify(capped);
    const enc = await encryptChatHistory(json);
    await fs.writeFile(filePath, enc, 'utf8');
    return { success: true };
  });

  ipcMain.handle('chatHistory:clear', async () => {
    const filePath = path.join(app.getPath('userData'), 'chat_history.json.enc');
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore
    }
    return { success: true };
  });

  ipcMain.on('agent:approval-response', (event, payload: any) => {
    const requestId = payload?.requestId;
    const approved = Boolean(payload?.approved);
    if (typeof requestId !== 'string') return;

    const pending = pendingApprovals.get(requestId);
    if (!pending) return;
    if (event.sender?.id !== pending.requesterWebContentsId) return;

    clearTimeout(pending.timeout);
    pendingApprovals.delete(requestId);
    pending.resolve(approved ? true : { approved: false, reason: 'denied' });
  });

  toolRegistry.setApprovalHandler(async (toolName, args) => {
    const runId = agentRunContext.getRunId();
    const requesterWebContentsId = agentRunContext.getRequesterWebContentsId();
    const permissionMode = agentRunContext.getPermissionMode();

    // YOLO: never prompt. If the tool reached the approval handler, auto-approve here.
    // (Policy DENY still happens earlier inside ToolRegistry.)
    if (permissionMode === 'yolo') return true;
    if (!requesterWebContentsId) return false;

    const wc = webContents.fromId(requesterWebContentsId);
    if (!wc || wc.isDestroyed()) return false;

    const requestId = uuidv4();
    const createdAt = Date.now();
    wc.send('agent:request-approval', { requestId, toolName, args, runId, timeoutMs: APPROVAL_TIMEOUT_MS });

    return await new Promise<boolean | { approved: boolean; reason?: 'timeout' | 'denied' }>((resolve) => {
      const timeout = setTimeout(() => {
        pendingApprovals.delete(requestId);
        try {
          const still = webContents.fromId(requesterWebContentsId);
          if (still && !still.isDestroyed()) {
            still.send('agent:approval-timeout', { requestId, toolName, runId });
          }
        } catch {
          // ignore
        }
        resolve({ approved: false, reason: 'timeout' });
      }, APPROVAL_TIMEOUT_MS);

      pendingApprovals.set(requestId, {
        requestId,
        runId,
        toolName,
        requesterWebContentsId,
        createdAt,
        timeout,
        resolve,
      });
    });
  });

  ipcMain.handle('browser:webview-register', async (_, { tabId, webContentsId }) => {
    browserTargetService.registerWebview(tabId, webContentsId);
  });

  ipcMain.handle('browser:active-tab', async (_, { tabId }) => {
    browserTargetService.setActiveTab(tabId ?? null);
  });

  // Vault IPC Handlers
  ipcMain.handle('vault:set', async (_, account, secret) => {
    return await vaultService.setSecret(account, secret);
  });

  ipcMain.handle('vault:get', async (_, account) => {
    return await vaultService.getSecret(account);
  });

  ipcMain.handle('vault:delete', async (_, account) => {
    return await vaultService.deleteSecret(account);
  });

  ipcMain.handle('audit:get-logs', async (_, limit?: number) => {
    const rows = auditService.getLogs(typeof limit === 'number' ? limit : 100);
    return rows.map((row: any) => {
      const details = (() => {
        try {
          return JSON.parse(row.details);
        } catch {
          return row.details;
        }
      })();
      return { ...row, details };
    });
  });

  ipcMain.handle('audit:verify-chain', async (_event, limit?: number) => {
    const n = typeof limit === 'number' ? limit : undefined;
    return auditService.verifyHashChain(n);
  });

  ipcMain.handle('audit:ship-now', async (_event, limit?: number) => {
    const n = typeof limit === 'number' ? limit : 200;
    return await auditService.shipPendingLogs(n);
  });

  ipcMain.handle('audit:rotate-now', async (_event, retentionDays?: number) => {
    const n = typeof retentionDays === 'number' ? retentionDays : 30;
    return await auditService.rotateLogs(n);
  });

  if (auditMaintenanceTimer) clearInterval(auditMaintenanceTimer);
  const shipIntervalMs = (() => {
    const raw = process.env.AUDIT_SHIP_INTERVAL_MS;
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 5000) return n;
    return 60_000;
  })();
  const retentionDays = (() => {
    const raw = process.env.AUDIT_RETENTION_DAYS;
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n) && n > 0) return n;
    return 30;
  })();
  auditMaintenanceTimer = setInterval(async () => {
    try {
      await auditService.shipPendingLogs(200);
    } catch {
    }
    try {
      await auditService.rotateLogs(retentionDays);
    } catch {
    }
  }, shipIntervalMs);

  ipcMain.handle('agent:feedback', async (_event, payload: unknown) => {
    const p = payload as {
      skillId?: unknown;
      success?: unknown;
      label?: unknown;
      version?: unknown;
    };

    const id = p?.skillId;
    if (typeof id !== 'string') return false;

    const label = p?.label;
    const version = p?.version;
    const successVal = p?.success;

    if (label === 'worked' || label === 'failed' || label === 'partial') {
      const v = typeof version === 'number' ? version : undefined;
      if (typeof (taskKnowledgeService as unknown as { recordFeedback?: unknown }).recordFeedback === 'function') {
        (taskKnowledgeService as unknown as { recordFeedback: (skillId: string, l: 'worked' | 'failed' | 'partial', version?: number) => void }).recordFeedback(
          id,
          label,
          v
        );
        return true;
      }
      taskKnowledgeService.recordOutcome(id, label === 'worked');
      return true;
    }

    if (typeof successVal === 'boolean') {
      taskKnowledgeService.recordOutcome(id, successVal);
      return true;
    }

    return false;
  });

  ipcMain.handle('telemetry:export', async () => {
    const exportPath = path.join(app.getPath('userData'), 'trajectories_export.json');
    const count = await telemetryService.exportTrajectories(exportPath);
    return { success: true, count, path: exportPath };
  });

  ipcMain.handle('benchmark:runSuite', async (_, filter?: string) => {
    const results = await benchmarkService.runSuite(filter);
    return results;
  });

  ipcMain.handle('agent:set-auto-learn', async (_, enabled: boolean) => {
    benchmarkService.setAutoLearn(enabled);
    return { success: true, enabled };
  });

  ipcMain.handle('benchmark:runSuiteWithFlag', async (_, filter?: string, enableActionsPolicy?: boolean) => {
    const results = await benchmarkService.runSuite(filter, enableActionsPolicy);
    return results;
  });

  ipcMain.handle('benchmark:exportTrajectories', async (_, results: BenchmarkResult[]) => {
    const filePath = await benchmarkService.exportTrajectories(results);
    return { success: true, path: filePath };
  });

  // Agent IPC Handlers
  ipcMain.handle('agent:get-saved-plans', async () => {
  return planMemory.getPlans();
});

ipcMain.handle('agent:save-plan', async (_event, taskId: string, plan: string[]) => {
  await planMemory.savePlan(taskId, plan);
  return { success: true };
});

ipcMain.handle('agent:delete-plan', async (_event, taskId: string) => {
  await planMemory.deletePlan(taskId);
  return { success: true };
});

ipcMain.handle('agent:chat', async (event, message) => {
    const runId = uuidv4();

    try {
      event.sender.send('agent:step', {
        type: 'observation',
        content: `Run started: ${runId}`,
        metadata: { runId, ts: new Date().toISOString() },
      });
    } catch {
      // ignore
    }

    // Get browser context early for policy evaluation
    let url: string | undefined;
    let domain: string | undefined;
    try {
      const activeWebview = browserTargetService.getActiveWebContents();
      if (activeWebview && !activeWebview.isDestroyed()) {
        url = activeWebview.getURL();
        if (url) {
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname;
            if (urlObj.port) {
              domain += `:${urlObj.port}`;
            }
          } catch {
            // Invalid URL, ignore domain extraction
          }
        }
      }
    } catch {
      // Ignore errors getting browser context
    }

    try {
      await telemetryService.emit({
        eventId: uuidv4(),
        runId,
        ts: new Date().toISOString(),
        type: 'agent_run_start',
        name: 'agent:chat',
        data: { messageLength: String(message ?? '').length },
      });
    } catch {
      // ignore telemetry failures
    }

    // Log User Input
    await auditService.log({
        actor: 'user',
        action: 'chat_message',
        details: { message, runId },
        status: 'success'
    });
    
    // Set up Step Handler
    agentService.setStepHandler((step) => {
        event.sender.send('agent:step', step);
        try {
          const rawMetadata = (step as any)?.metadata;
          const toolName = rawMetadata?.tool;
          const args = rawMetadata?.args;
          const stepContent = String((step as any)?.content ?? '');
          const contentLength = stepContent.length;
          const contentHash = crypto.createHash('sha256').update(stepContent).digest('hex');
          const contentPreview = contentLength > 2000 ? stepContent.slice(0, 2000) : stepContent;

          const argsJson = (() => {
            try {
              return JSON.stringify(args ?? null);
            } catch {
              return '[unserializable_args]';
            }
          })();
          const argsHash = crypto.createHash('sha256').update(argsJson).digest('hex');

          const sanitizedMetadata = rawMetadata
            ? {
                ...rawMetadata,
                ...(args !== undefined ? { args: undefined, argsHash } : null),
              }
            : undefined;

          auditService
            .log({
              actor: 'agent',
              action: 'agent_step',
              details: {
                runId,
                type: (step as any)?.type,
                toolName,
                contentPreview,
                contentLength,
                contentHash,
                argsHash: args !== undefined ? argsHash : undefined,
                metadata: sanitizedMetadata,
              },
              status: 'success',
            })
            .catch(() => undefined);
        } catch {
          // ignore
        }
    });

    // Set up Token Handler for streaming
    agentService.setTokenHandler((token) => {
        event.sender.send('agent:token', token);
    });

    // Get current browser context
    let browserContext = 'Current browser state: No active tab';
    try {
        const wc = browserTargetService.getActiveWebContents();
        const url = wc.getURL();
        const title = wc.getTitle();
        browserContext = `Current browser state: URL="${url}", Title="${title}"`;
    } catch (err) {
        // Ignore error if no active tab
    }

    let response = '';
    try {
      const permissionMode = agentService.getPermissionMode();
      response = await agentRunContext.run(
        { runId, requesterWebContentsId: event.sender.id, browserContext: { url, domain }, permissionMode },
        async () => {
        return await agentService.chat(message, browserContext);
        }
      );
    } finally {
      try {
        await telemetryService.emit({
          eventId: uuidv4(),
          runId,
          ts: new Date().toISOString(),
          type: 'agent_run_end',
          name: 'agent:chat',
          data: { responseLength: response.length },
        });
      } catch {
        // ignore telemetry failures
      }
    }
    
    // Log Agent Response
    await auditService.log({
        actor: 'agent',
        action: 'chat_response',
        details: { response, runId },
        status: 'success'
    });

    return response;
  });

  // Agent conversation reset handler
  ipcMain.handle('agent:reset-conversation', async () => {
    agentService.resetConversation();
    return { success: true };
  });

  // Agent model management handlers
  ipcMain.handle('agent:get-models', async () => {
    return AVAILABLE_MODELS;
  });

  ipcMain.handle('agent:get-llm-config', async () => {
    return agentService.getLLMConfig();
  });

  ipcMain.handle('agent:set-llm-config', async (_event, cfg: any) => {
    await agentService.setLLMConfig(cfg ?? {});
    return { success: true };
  });

  ipcMain.handle('agent:get-current-model', async () => {
    return agentService.getCurrentModelId();
  });

  ipcMain.handle('agent:set-model', async (_, modelId: string) => {
    agentService.setModel(modelId);
    return { success: true, modelId };
  });

  ipcMain.handle('agent:set-mode', async (_, mode: 'chat' | 'read' | 'do') => {
    agentService.setAgentMode(mode);
    return { success: true };
  });

  ipcMain.handle('agent:get-mode', async () => {
    return agentService.getAgentMode();
  });

  ipcMain.handle('agent:set-permission-mode', async (_, mode: 'yolo' | 'permissions' | 'manual') => {
    agentService.setPermissionMode(mode);
    return { success: true };
  });

  ipcMain.handle('agent:get-permission-mode', async () => {
    return agentService.getPermissionMode();
  });

  // Test LLM connection
  ipcMain.handle('agent:test-connection', async (_event, cfg: { baseUrl: string; apiKey?: string; model: string }) => {
    const { baseUrl, apiKey, model } = cfg;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Say "ok" and nothing else.' }],
          max_tokens: 10,
          temperature: 0,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `HTTP ${response.status}: ${errorText.slice(0, 200)}` };
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      return { success: true, response: content.slice(0, 100), model: data?.model || model };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Connection timed out (10s)' };
      }
      return { success: false, error: err.message || 'Connection failed' };
    }
  });

  // List available models from provider
  ipcMain.handle('agent:list-remote-models', async (_event, cfg: { baseUrl: string; apiKey?: string }) => {
    const { baseUrl, apiKey } = cfg;
    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {}),
        },
      });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}`, models: [] };
      }

      const data = await response.json();
      const models = (data?.data || data?.models || []).map((m: any) => ({
        id: m.id || m.name || m,
        name: m.name || m.id || m,
      }));
      return { success: true, models };
    } catch (err: any) {
      return { success: false, error: err.message, models: [] };
    }
  });

  // Handler for agent to navigate when no webview exists (e.g., New Tab page)
  ipcMain.handle('browser:navigate-tab', async (_, url: string) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('browser:navigate-to', url);
      return { success: true, url };
    }
    return { success: false, error: 'No window found' };
  });

  createWindow();
})
