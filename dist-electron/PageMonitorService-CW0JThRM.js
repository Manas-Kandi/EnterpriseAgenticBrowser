var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Notification } from "electron";
import fs from "node:fs/promises";
import path__default from "node:path";
import { v as v4, b as browserTargetService } from "./main-D8Mbce0S.js";
class PageMonitorService {
  constructor() {
    __publicField(this, "monitors", /* @__PURE__ */ new Map());
    __publicField(this, "intervals", /* @__PURE__ */ new Map());
    __publicField(this, "persistPath");
    __publicField(this, "mainWindow", null);
    __publicField(this, "onTriggerCallback");
    this.persistPath = path__default.join(process.cwd(), ".cache", "page_monitors.json");
  }
  /**
   * Set the main window for notifications
   */
  setMainWindow(window) {
    this.mainWindow = window;
  }
  /**
   * Set callback for when a monitor triggers
   */
  onTrigger(callback) {
    this.onTriggerCallback = callback;
  }
  /**
   * Load monitors from disk
   */
  async load() {
    try {
      const data = await fs.readFile(this.persistPath, "utf-8");
      const monitors = JSON.parse(data);
      for (const monitor of monitors) {
        this.monitors.set(monitor.id, monitor);
        if (monitor.active && !monitor.triggered) {
          this.startMonitor(monitor.id);
        }
      }
      console.log(`[PageMonitor] Loaded ${monitors.length} monitors`);
    } catch (err) {
      console.log("[PageMonitor] No saved monitors found");
    }
  }
  /**
   * Save monitors to disk
   */
  async save() {
    try {
      const monitors = Array.from(this.monitors.values());
      await fs.mkdir(path__default.dirname(this.persistPath), { recursive: true });
      await fs.writeFile(this.persistPath, JSON.stringify(monitors, null, 2));
    } catch (err) {
      console.error("[PageMonitor] Failed to save monitors:", err);
    }
  }
  /**
   * Create a new monitor
   */
  async createMonitor(config) {
    const monitor = {
      id: v4(),
      name: config.name,
      url: config.url,
      tabId: config.tabId,
      checkCode: config.checkCode,
      description: config.description,
      intervalMs: config.intervalMs ?? 6e4,
      // Default 60 seconds
      createdAt: Date.now(),
      triggered: false,
      active: true,
      notifyOnTrigger: config.notifyOnTrigger ?? true
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
  startMonitor(monitorId) {
    const monitor = this.monitors.get(monitorId);
    if (!monitor || !monitor.active) return;
    this.stopMonitor(monitorId);
    this.checkMonitor(monitorId);
    const interval = setInterval(() => {
      this.checkMonitor(monitorId);
    }, monitor.intervalMs);
    this.intervals.set(monitorId, interval);
    console.log(`[PageMonitor] Started monitoring: ${monitor.name} (every ${monitor.intervalMs}ms)`);
  }
  /**
   * Stop polling for a monitor
   */
  stopMonitor(monitorId) {
    const interval = this.intervals.get(monitorId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(monitorId);
    }
  }
  /**
   * Check a monitor's condition
   */
  async checkMonitor(monitorId) {
    var _a;
    const monitor = this.monitors.get(monitorId);
    if (!monitor || !monitor.active) return null;
    const checkedAt = Date.now();
    try {
      let wc = monitor.tabId ? browserTargetService.getWebContents(monitor.tabId) : browserTargetService.getActiveWebContents();
      if (!wc || wc.isDestroyed()) {
        console.log(`[PageMonitor] No active tab for monitor: ${monitor.name}`);
        return {
          monitorId,
          triggered: false,
          result: null,
          error: "No suitable tab found",
          checkedAt
        };
      }
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
      monitor.lastCheckedAt = checkedAt;
      monitor.lastResult = response.result;
      const result = {
        monitorId,
        triggered: response.success && response.result === true,
        result: response.result,
        error: response.error,
        checkedAt
      };
      if (result.triggered && !monitor.triggered) {
        monitor.triggered = true;
        monitor.triggeredAt = checkedAt;
        monitor.active = false;
        this.stopMonitor(monitorId);
        console.log(`[PageMonitor] TRIGGERED: ${monitor.name}`);
        if (monitor.notifyOnTrigger) {
          this.showNotification(monitor);
        }
        (_a = this.onTriggerCallback) == null ? void 0 : _a.call(this, monitor, response.result);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send("monitor:triggered", {
            monitor,
            result: response.result
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
        checkedAt
      };
    }
  }
  /**
   * Show a system notification
   */
  showNotification(monitor) {
    if (!Notification.isSupported()) {
      console.log("[PageMonitor] Notifications not supported");
      return;
    }
    const notification = new Notification({
      title: "🔔 Monitor Alert",
      body: `${monitor.name}: ${monitor.description}`,
      silent: false
    });
    notification.on("click", () => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.focus();
      }
    });
    notification.show();
  }
  /**
   * Get all monitors
   */
  getMonitors() {
    return Array.from(this.monitors.values());
  }
  /**
   * Get a specific monitor
   */
  getMonitor(id) {
    return this.monitors.get(id);
  }
  /**
   * Pause a monitor
   */
  async pauseMonitor(id) {
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
  async resumeMonitor(id) {
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
  async deleteMonitor(id) {
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
  async resetMonitor(id) {
    const monitor = this.monitors.get(id);
    if (!monitor) return false;
    monitor.triggered = false;
    monitor.triggeredAt = void 0;
    monitor.active = true;
    this.startMonitor(id);
    await this.save();
    return true;
  }
  /**
   * Clean up all monitors
   */
  cleanup() {
    for (const [id] of this.intervals) {
      this.stopMonitor(id);
    }
  }
}
const pageMonitorService = new PageMonitorService();
export {
  PageMonitorService,
  pageMonitorService
};
