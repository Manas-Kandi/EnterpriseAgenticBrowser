/**
 * IntegrationLayer - External system integrations
 * 
 * Features:
 * - Webhook notifications
 * - File export (JSON, CSV)
 * - Clipboard integration
 * - Desktop notifications
 * - Future: Email, Slack, CRM integrations
 */

import { app, Notification, clipboard } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DataPipeline } from './DataPipeline';

export interface WebhookConfig {
  url: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  headers?: Record<string, string>;
  includeTimestamp?: boolean;
}

export interface ExportConfig {
  format: 'json' | 'csv' | 'txt';
  filename?: string;
  directory?: string;
  pretty?: boolean;
}

export interface NotificationConfig {
  title: string;
  body: string;
  silent?: boolean;
  urgency?: 'normal' | 'critical' | 'low';
}

export interface IntegrationResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export class IntegrationLayer {
  private exportDir: string;

  constructor() {
    this.exportDir = path.join(app.getPath('documents'), 'BrowserAgent', 'exports');
    this.ensureExportDir();
  }

  private async ensureExportDir(): Promise<void> {
    try {
      await fs.mkdir(this.exportDir, { recursive: true });
    } catch {
      // Directory exists
    }
  }

  /**
   * Send data to a webhook
   */
  async sendWebhook(data: unknown, config: WebhookConfig): Promise<IntegrationResult> {
    try {
      const payload = config.includeTimestamp
        ? { timestamp: new Date().toISOString(), data }
        : data;

      const response = await fetch(config.url, {
        method: config.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      return {
        success: true,
        message: `Webhook sent successfully to ${config.url}`,
        data: { status: response.status },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Webhook failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Export data to a file
   */
  async exportToFile(data: unknown, config: ExportConfig): Promise<IntegrationResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = config.filename || `export-${timestamp}`;
      const directory = config.directory || this.exportDir;
      
      let content: string;
      let extension: string;

      switch (config.format) {
        case 'json':
          content = JSON.stringify(data, null, config.pretty ? 2 : 0);
          extension = 'json';
          break;
        case 'csv':
          if (Array.isArray(data)) {
            const pipeline = new DataPipeline({});
            content = pipeline.toCSV(data as Record<string, unknown>[]);
          } else {
            content = String(data);
          }
          extension = 'csv';
          break;
        case 'txt':
          content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
          extension = 'txt';
          break;
        default:
          throw new Error(`Unknown format: ${config.format}`);
      }

      const filePath = path.join(directory, `${filename}.${extension}`);
      await fs.mkdir(directory, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');

      return {
        success: true,
        message: `Exported to ${filePath}`,
        data: { path: filePath, size: content.length },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Export failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Copy data to clipboard
   */
  async copyToClipboard(data: unknown, format: 'text' | 'json' = 'text'): Promise<IntegrationResult> {
    try {
      let content: string;
      
      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
      } else if (typeof data === 'string') {
        content = data;
      } else {
        content = JSON.stringify(data);
      }

      clipboard.writeText(content);

      return {
        success: true,
        message: 'Copied to clipboard',
        data: { length: content.length },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Clipboard copy failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Show desktop notification
   */
  async showNotification(config: NotificationConfig): Promise<IntegrationResult> {
    try {
      if (!Notification.isSupported()) {
        return {
          success: false,
          message: 'Notifications not supported on this system',
        };
      }

      const notification = new Notification({
        title: config.title,
        body: config.body,
        silent: config.silent ?? false,
        urgency: config.urgency ?? 'normal',
      });

      notification.show();

      return {
        success: true,
        message: 'Notification shown',
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Notification failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Read from a local file
   */
  async readFile(filePath: string): Promise<IntegrationResult> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Try to parse as JSON
      let data: unknown = content;
      try {
        data = JSON.parse(content);
      } catch {
        // Keep as string
      }

      return {
        success: true,
        message: `Read ${filePath}`,
        data,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `Read failed: ${errorMsg}`,
      };
    }
  }

  /**
   * List exported files
   */
  async listExports(): Promise<IntegrationResult> {
    try {
      const files = await fs.readdir(this.exportDir);
      const fileInfos = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(this.exportDir, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime.toISOString(),
          };
        })
      );

      return {
        success: true,
        message: `Found ${files.length} exports`,
        data: fileInfos,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: `List failed: ${errorMsg}`,
      };
    }
  }

  /**
   * Get export directory path
   */
  getExportDirectory(): string {
    return this.exportDir;
  }

  /**
   * Batch operations - run multiple integrations
   */
  async batch(operations: Array<{
    type: 'webhook' | 'export' | 'clipboard' | 'notification';
    data?: unknown;
    config: WebhookConfig | ExportConfig | NotificationConfig | { format?: 'text' | 'json' };
  }>): Promise<IntegrationResult[]> {
    const results: IntegrationResult[] = [];

    for (const op of operations) {
      let result: IntegrationResult;

      switch (op.type) {
        case 'webhook':
          result = await this.sendWebhook(op.data, op.config as WebhookConfig);
          break;
        case 'export':
          result = await this.exportToFile(op.data, op.config as ExportConfig);
          break;
        case 'clipboard':
          result = await this.copyToClipboard(op.data, (op.config as { format?: 'text' | 'json' }).format);
          break;
        case 'notification':
          result = await this.showNotification(op.config as NotificationConfig);
          break;
        default:
          result = { success: false, message: `Unknown operation type` };
      }

      results.push(result);
    }

    return results;
  }
}

export const integrationLayer = new IntegrationLayer();
