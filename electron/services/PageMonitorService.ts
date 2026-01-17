import { BrowserWindow, Notification } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import fs from 'node:fs/promises';
import path from 'node:path';
import { browserTargetService } from './BrowserTargetService';

/**
 * A page monitor configuration
 */
export interface PageMonitor {
  id: string;
  name: string;
  url: string;
  tabId?: string;
  checkCode: string;           // JS code that returns true when condition is met
  description: string;         // Human-readable description of what we're monitoring
  intervalMs: number;          // Polling interval in milliseconds
  createdAt: number;
  lastCheckedAt?: number;
  lastResult?: unknown;
  triggered: boolean;
  triggeredAt?: number;
  active: boolean;
  notifyOnTrigger: boolean;
}

/**
 * Result of a monitor check
 */
export interface MonitorCheckResult {
  monitorId: string;
  triggered: boolean;
  result: unknown;
  error?: string;
  checkedAt: number;
}

/**
 * Service for monitoring pages and alerting on conditions
 */
export class PageMonitorService {
  private monitors: Map<string, PageMonitor> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private persistPath: string;
  private mainWindow: BrowserWindow | null = null;
  private onTriggerCallback?: (monitor: PageMonitor, result: unknown) => void;

  constructor() {
    this.persistPath = path.join(process.cwd(), '.cache', 'page_monitors.json');
  }

  /**
   * Set the main window for notifications
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Set callback for when a monitor triggers
   */
  onTrigger(callback: (monitor: PageMonitor, result: unknown) => void): void {
    this.onTriggerCallback = callback;
  }

  /**
   * Load monitors from disk
   */
  async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.persistPath, 'utf-8');
      const monitors = JSON.parse(data) as PageMonitor[];
      
      for (const monitor of monitors) {
        this.monitors.set(monitor.id, monitor);
        if (monitor.active && !monitor.triggered) {
          this.startMonitor(monitor.id);
        }
      }
      
      console.log(`[PageMonitor] Loaded ${monitors.length} monitors`);
    } catch (err) {
      // File doesn't exist or is invalid, start fresh
      console.log('[PageMonitor] No saved monitors found');
    }
  }

  /**
   * Save monitors to disk
   */
  async save(): Promise<void> {
    try {
      const monitors = Array.from(this.monitors.values());
      await fs.mkdir(path.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(monitors, null, 2));
    } catch (err) {
      console.error('[PageMonitor] Failed to save monitors:', err);
    }
  }

  /**
   * Create a new monitor
   */
  async createMonitor(config: {
    name: string;
    url: string;
    tabId?: string;
    checkCode: string;
    description: string;
    intervalMs?: number;
    notifyOnTrigger?: boolean;
  }): Promise<PageMonitor> {
    const monitor: PageMonitor = {
      id: uuidv4(),
      name: config.name,
      url: config.url,
      tabId: config.tabId,
      checkCode: config.checkCode,
      description: config.description,
      intervalMs: config.intervalMs ?? 60000, // Default 60 seconds
      createdAt: Date.now(),
      triggered: false,
      active: true,
      notifyOnTrigger: config.notifyOnTrigger ?? true,
    };

    this.monitors.set(monitor.id, monitor);
    this.startMonitor(monitor.id);
    await this.save();

    console.log(`[PageMonitor] Created monitor: ${monitor.name} (${monitor.id})`);
    return monitor;
  }

  /**
   * Start polling for a monitor
   */
  private startMonitor(monitorId: string): void {
    const monitor = this.monitors.get(monitorId);
    if (!monitor || !monitor.active) return;

    // Clear existing interval if any
    this.stopMonitor(monitorId);

    // Run check immediately
    this.checkMonitor(monitorId);

    // Set up polling interval
    const interval = setInterval(() => {
      this.checkMonitor(monitorId);
    }, monitor.intervalMs);

    this.intervals.set(monitorId, interval);
    console.log(`[PageMonitor] Started monitoring: ${monitor.name} (every ${monitor.intervalMs}ms)`);
  }

  /**
   * Stop polling for a monitor
   */
  private stopMonitor(monitorId: string): void {
    const interval = this.intervals.get(monitorId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(monitorId);
    }
  }

  /**
   * Check a monitor's condition
   */
  async checkMonitor(monitorId: string): Promise<MonitorCheckResult | null> {
    const monitor = this.monitors.get(monitorId);
    if (!monitor || !monitor.active) return null;

    const checkedAt = Date.now();

    try {
      // Get the webContents to execute in
      let wc = monitor.tabId 
        ? browserTargetService.getWebContents(monitor.tabId)
        : browserTargetService.getActiveWebContents();

      if (!wc || wc.isDestroyed()) {
        console.log(`[PageMonitor] No active tab for monitor: ${monitor.name}`);
        return {
          monitorId,
          triggered: false,
          result: null,
          error: 'No suitable tab found',
          checkedAt,
        };
      }

      // Execute the check code
      const wrappedCode = `
        (async function() {
          try {
            const result = await (async () => { ${monitor.checkCode} })();
            return { success: true, result };
          } catch (e) {
            return { success: false, error: e.message };
          }
        })();
      `;

      const response = await wc.executeJavaScript(wrappedCode);

      // Update monitor state
      monitor.lastCheckedAt = checkedAt;
      monitor.lastResult = response.result;

      const result: MonitorCheckResult = {
        monitorId,
        triggered: response.success && response.result === true,
        result: response.result,
        error: response.error,
        checkedAt,
      };

      // Check if condition was triggered
      if (result.triggered && !monitor.triggered) {
        monitor.triggered = true;
        monitor.triggeredAt = checkedAt;
        monitor.active = false; // Stop monitoring after trigger
        this.stopMonitor(monitorId);

        console.log(`[PageMonitor] TRIGGERED: ${monitor.name}`);

        // Show notification
        if (monitor.notifyOnTrigger) {
          this.showNotification(monitor);
        }

        // Call callback
        this.onTriggerCallback?.(monitor, response.result);

        // Notify renderer
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('monitor:triggered', {
            monitor,
            result: response.result,
          });
        }
      }

      await this.save();
      return result;
    } catch (err) {
      console.error(`[PageMonitor] Check failed for ${monitor.name}:`, err);
      return {
        monitorId,
        triggered: false,
        result: null,
        error: err instanceof Error ? err.message : String(err),
        checkedAt,
      };
    }
  }

  /**
   * Show a system notification
   */
  private showNotification(monitor: PageMonitor): void {
    if (!Notification.isSupported()) {
      console.log('[PageMonitor] Notifications not supported');
      return;
    }

    const notification = new Notification({
      title: '🔔 Monitor Alert',
      body: `${monitor.name}: ${monitor.description}`,
      silent: false,
    });

    notification.on('click', () => {
      // Focus the main window when notification is clicked
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.focus();
      }
    });

    notification.show();
  }

  /**
   * Get all monitors
   */
  getMonitors(): PageMonitor[] {
    return Array.from(this.monitors.values());
  }

  /**
   * Get a specific monitor
   */
  getMonitor(id: string): PageMonitor | undefined {
    return this.monitors.get(id);
  }

  /**
   * Pause a monitor
   */
  async pauseMonitor(id: string): Promise<boolean> {
    const monitor = this.monitors.get(id);
    if (!monitor) return false;

    monitor.active = false;
    this.stopMonitor(id);
    await this.save();
    return true;
  }

  /**
   * Resume a monitor
   */
  async resumeMonitor(id: string): Promise<boolean> {
    const monitor = this.monitors.get(id);
    if (!monitor || monitor.triggered) return false;

    monitor.active = true;
    this.startMonitor(id);
    await this.save();
    return true;
  }

  /**
   * Delete a monitor
   */
  async deleteMonitor(id: string): Promise<boolean> {
    const monitor = this.monitors.get(id);
    if (!monitor) return false;

    this.stopMonitor(id);
    this.monitors.delete(id);
    await this.save();
    return true;
  }

  /**
   * Reset a triggered monitor (allow it to trigger again)
   */
  async resetMonitor(id: string): Promise<boolean> {
    const monitor = this.monitors.get(id);
    if (!monitor) return false;

    monitor.triggered = false;
    monitor.triggeredAt = undefined;
    monitor.active = true;
    this.startMonitor(id);
    await this.save();
    return true;
  }

  /**
   * Clean up all monitors
   */
  cleanup(): void {
    for (const [id] of this.intervals) {
      this.stopMonitor(id);
    }
  }
}

export const pageMonitorService = new PageMonitorService();
