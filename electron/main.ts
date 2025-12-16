import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { vaultService } from './services/VaultService'
import { agentService } from './services/AgentService'
import { auditService } from './services/AuditService'
import { toolRegistry } from './services/ToolRegistry'
import { browserTargetService } from './services/BrowserTargetService'
import './services/CodeReaderService'
import './integrations/mock/MockJiraConnector'; // Initialize Mock Jira
import './integrations/mock/MockConfluenceConnector'; // Initialize Mock Confluence
import './integrations/mock/MockTrelloConnector'; // Initialize Mock Trello
import './integrations/BrowserAutomationService'; // Initialize Playwright Automation

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
    win.loadURL(VITE_DEV_SERVER_URL)
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

  // Agent IPC Handlers
  ipcMain.handle('agent:chat', async (event, message) => {
    // Log User Input
    await auditService.log({
        actor: 'user',
        action: 'chat_message',
        details: { message },
        status: 'success'
    });
    
    // Set up Approval Handler context
    toolRegistry.setApprovalHandler(async (toolName, args) => {
        // Send request to renderer
        event.sender.send('agent:request-approval', { toolName, args });
        
        // Wait for response
        return new Promise<boolean>((resolve) => {
            ipcMain.once('agent:approval-response', (_, { toolName: respondedTool, approved }) => {
                // In a real app we'd verify request IDs to ensure we don't mix up approvals
                if (respondedTool === toolName) {
                    resolve(approved);
                }
            });
        });
    });

    // Set up Step Handler
    agentService.setStepHandler((step) => {
        event.sender.send('agent:step', step);
    });

    const response = await agentService.chat(message);
    
    // Log Agent Response
    await auditService.log({
        actor: 'agent',
        action: 'chat_response',
        details: { response },
        status: 'success'
    });

    return response;
  });

  // Agent conversation reset handler
  ipcMain.handle('agent:reset-conversation', async () => {
    agentService.resetConversation();
    return { success: true };
  });

  createWindow();
})
