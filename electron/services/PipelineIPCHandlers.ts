import { ipcMain, BrowserWindow } from 'electron';
import { pipelineIntegration } from './PipelineIntegration';
import { stateManager } from './StateManager';
import { ExecutionEvent } from './BrowserAgentPipeline';

/**
 * IPC Handlers for Pipeline Integration
 * 
 * Exposes pipeline functionality to the renderer process
 */

export function registerPipelineIPCHandlers(mainWindow: BrowserWindow): void {
  // Execute command through pipeline
  ipcMain.handle('pipeline:execute', async (_event, args: {
    userMessage: string;
    options?: {
      enableCheckpoints?: boolean;
      enableParallel?: boolean;
      maxParallelTabs?: number;
    };
  }) => {
    try {
      const result = await pipelineIntegration.execute(args.userMessage, args.options);
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: 0
      };
    }
  });

  // Resume task from checkpoint
  ipcMain.handle('pipeline:resume', async (_event, taskId: string) => {
    try {
      const result = await pipelineIntegration.resume(taskId);
      return result;
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: 0
      };
    }
  });

  // Get resumable tasks
  ipcMain.handle('pipeline:get-resumable-tasks', async () => {
    return pipelineIntegration.getResumableTasks();
  });

  // Get pipeline statistics
  ipcMain.handle('pipeline:get-stats', async () => {
    return pipelineIntegration.getStats();
  });

  // Pause task
  ipcMain.handle('pipeline:pause-task', async (_event, taskId: string) => {
    pipelineIntegration.pauseTask(taskId);
    return { success: true };
  });

  // Cancel task
  ipcMain.handle('pipeline:cancel-task', async (_event, taskId: string) => {
    pipelineIntegration.cancelTask(taskId);
    return { success: true };
  });

  // Get task details
  ipcMain.handle('pipeline:get-task', async (_event, taskId: string) => {
    return stateManager.getTask(taskId);
  });

  // Get all tasks
  ipcMain.handle('pipeline:get-all-tasks', async () => {
    return stateManager.getAllTasks();
  });

  // Clean up old tasks
  ipcMain.handle('pipeline:cleanup', async (_event, maxAgeMs?: number) => {
    const cleaned = pipelineIntegration.cleanup(maxAgeMs);
    return { cleaned };
  });

  // Stream execution events to renderer
  pipelineIntegration.onEvent((event: ExecutionEvent) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('pipeline:event', event);
    }
  });

  console.log('[PipelineIPCHandlers] Registered pipeline IPC handlers');
}
