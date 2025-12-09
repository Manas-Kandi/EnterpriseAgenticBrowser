import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { vaultService } from './VaultService';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: 'user' | 'agent' | 'system';
  action: string;
  details: any; // Will be JSON stringified and encrypted
  status: 'success' | 'failure' | 'pending';
}

export class AuditService {
  private db: Database.Database;
  private encryptionKey: Buffer | null = null;
  private readonly DB_FILENAME = 'audit_logs.db';

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, this.DB_FILENAME);
    
    this.db = new Database(dbPath);
    this.init();
  }

  private async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL
      )
    `);

    await this.loadOrGenerateKey();
  }

  private async loadOrGenerateKey() {
    let keyHex = await vaultService.getSecret('audit_db_key');
    if (!keyHex) {
      keyHex = crypto.randomBytes(32).toString('hex');
      await vaultService.setSecret('audit_db_key', keyHex);
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  private encrypt(text: string): string {
    if (!this.encryptionKey) return text; // Should ensure key is loaded
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decrypt(text: string): string {
    if (!this.encryptionKey) return text;
    try {
        const textParts = text.split(':');
        const iv = Buffer.from(textParts.shift()!, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error('Failed to decrypt log:', e);
        return '[Encrypted Content]';
    }
  }

  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    if (!this.encryptionKey) await this.loadOrGenerateKey();

    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const detailsStr = JSON.stringify(entry.details);
    const encryptedDetails = this.encrypt(detailsStr);

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor, action, details, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, timestamp, entry.actor, entry.action, encryptedDetails, entry.status);
    return id;
  }

  getLogs(limit = 100): AuditLogEntry[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];

    return rows.map(row => ({
      ...row,
      details: this.decrypt(row.details) // Attempt to decrypt on read
    }));
  }
}

export const auditService = new AuditService();
