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
  details: Record<string, unknown> | string; // Will be JSON stringified and encrypted
  status: 'success' | 'failure' | 'pending';
}

type AuditLogRow = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
  status: string;
  prev_hash?: string | null;
  hash?: string | null;
  shipped_at?: string | null;
  rowid?: number;
};

export interface LogShipper {
  ship(payload: string): Promise<void>;
}

class HttpLogShipper implements LogShipper {
  private url: string;
  private apiKey?: string;

  constructor(url: string, apiKey?: string) {
    this.url = url;
    this.apiKey = apiKey;
  }

  async ship(payload: string): Promise<void> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;
    const res = await fetch(this.url, {
      method: 'POST',
      headers,
      body: payload,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Audit ship failed: ${res.status} ${text}`);
    }
  }
}

export class AuditService {
  private db: Database.Database;
  private encryptionKey: Buffer | null = null;
  private shipperKey: Buffer | null = null;
  private ready: Promise<void>;
  private shipper: LogShipper | null = null;
  private readonly DB_FILENAME = 'audit_logs.db';

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, this.DB_FILENAME);
    
    this.db = new Database(dbPath);
    this.ready = this.init();
  }

  private async init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        status TEXT NOT NULL,
        prev_hash TEXT,
        hash TEXT,
        shipped_at TEXT
      )
    `);

    this.ensureColumn('prev_hash', 'TEXT');
    this.ensureColumn('hash', 'TEXT');
    this.ensureColumn('shipped_at', 'TEXT');

    await this.loadOrGenerateKey();
    await this.loadOrGenerateShipperKey();
    this.backfillHashChain();
    this.configureFromEnv();
  }

  private ensureColumn(name: string, type: string) {
    try {
      const cols = this.db.prepare('PRAGMA table_info(audit_logs)').all() as { name: string }[];
      const exists = cols.some((c) => c && String(c.name) === name);
      if (!exists) {
        this.db.exec(`ALTER TABLE audit_logs ADD COLUMN ${name} ${type}`);
      }
    } catch {
    }
  }

  private configureFromEnv() {
    const url = process.env.AUDIT_SHIPPER_URL;
    if (typeof url === 'string' && url.trim()) {
      const apiKey = typeof process.env.AUDIT_SHIPPER_API_KEY === 'string' ? process.env.AUDIT_SHIPPER_API_KEY.trim() : undefined;
      this.shipper = new HttpLogShipper(url.trim(), apiKey && apiKey.length > 0 ? apiKey : undefined);
    }
  }

  private async loadOrGenerateKey() {
    let keyHex = await vaultService.getSecret('audit_db_key');
    if (!keyHex) {
      keyHex = crypto.randomBytes(32).toString('hex');
      await vaultService.setSecret('audit_db_key', keyHex);
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
  }

  private async loadOrGenerateShipperKey() {
    let keyHex = await vaultService.getSecret('audit_shipper_key');
    if (!keyHex) {
      keyHex = crypto.randomBytes(32).toString('hex');
      await vaultService.setSecret('audit_shipper_key', keyHex);
    }
    this.shipperKey = Buffer.from(keyHex, 'hex');
  }

  private computeHash(prevHash: string, row: { id: string; timestamp: string; actor: string; action: string; details: string; status: string }) {
    const h = crypto.createHash('sha256');
    h.update(prevHash);
    h.update('|');
    h.update(row.id);
    h.update('|');
    h.update(row.timestamp);
    h.update('|');
    h.update(row.actor);
    h.update('|');
    h.update(row.action);
    h.update('|');
    h.update(row.details);
    h.update('|');
    h.update(row.status);
    return h.digest('hex');
  }

  private backfillHashChain() {
    try {
      const rows = this.db
        .prepare('SELECT rowid, id, timestamp, actor, action, details, status, prev_hash, hash FROM audit_logs ORDER BY rowid ASC')
        .all() as AuditLogRow[];
      let prev = '';
      for (const r of rows) {
        const existing = typeof r.hash === 'string' && r.hash.length > 0 ? r.hash : null;
        if (existing) {
          prev = existing;
          continue;
        }
        const prevHash = prev;
        const nextHash = this.computeHash(prevHash, {
          id: r.id,
          timestamp: r.timestamp,
          actor: String(r.actor),
          action: String(r.action),
          details: String(r.details ?? ''),
          status: String(r.status),
        });
        this.db
          .prepare('UPDATE audit_logs SET prev_hash = ?, hash = ? WHERE id = ?')
          .run(prevHash || null, nextHash, r.id);
        prev = nextHash;
      }
    } catch {
    }
  }

  private encrypt(text: string): string {
    if (!this.encryptionKey) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private encryptForShipping(text: string): string {
    if (!this.shipperKey) return text;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.shipperKey, iv);
    const enc = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + enc.toString('hex');
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
    await this.ready;
    if (!this.encryptionKey) await this.loadOrGenerateKey();

    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const detailsStr = JSON.stringify(entry.details);
    const encryptedDetails = this.encrypt(detailsStr);

    const last = this.db.prepare('SELECT hash FROM audit_logs ORDER BY rowid DESC LIMIT 1').get() as { hash: string } | undefined;
    const prevHash = typeof last?.hash === 'string' ? last.hash : '';
    const rowHash = this.computeHash(prevHash || '', {
      id,
      timestamp,
      actor: entry.actor,
      action: entry.action,
      details: encryptedDetails,
      status: entry.status,
    });

    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (id, timestamp, actor, action, details, status, prev_hash, hash, shipped_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `);

    stmt.run(id, timestamp, entry.actor, entry.action, encryptedDetails, entry.status, prevHash || null, rowHash);
    return id;
  }

  getLogs(limit = 100): AuditLogEntry[] {
    const stmt = this.db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit) as (AuditLogRow & { details: string })[];

    return rows.map(row => ({
      ...row,
      actor: row.actor as 'user' | 'agent' | 'system',
      status: row.status as 'success' | 'failure' | 'pending',
      details: this.decrypt(row.details)
    }));
  }

  verifyHashChain(limit?: number): { ok: boolean; brokenAtId?: string } {
    try {
      const sql = typeof limit === 'number'
        ? 'SELECT rowid, id, timestamp, actor, action, details, status, prev_hash, hash FROM audit_logs ORDER BY rowid ASC LIMIT ?'
        : 'SELECT rowid, id, timestamp, actor, action, details, status, prev_hash, hash FROM audit_logs ORDER BY rowid ASC';
      const rows = (typeof limit === 'number'
        ? (this.db.prepare(sql).all(limit) as AuditLogRow[])
        : (this.db.prepare(sql).all() as AuditLogRow[]));

      let prev = '';
      for (const r of rows) {
        const expectedPrev = prev;
        const storedPrev = typeof r.prev_hash === 'string' ? r.prev_hash : '';
        if ((storedPrev || '') !== (expectedPrev || '')) {
          return { ok: false, brokenAtId: r.id };
        }
        const computed = this.computeHash(expectedPrev || '', {
          id: r.id,
          timestamp: r.timestamp,
          actor: String(r.actor),
          action: String(r.action),
          details: String(r.details ?? ''),
          status: String(r.status),
        });
        if (String(r.hash ?? '') !== computed) {
          return { ok: false, brokenAtId: r.id };
        }
        prev = computed;
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  async shipPendingLogs(limit = 200): Promise<{ shipped: number }> {
    await this.ready;
    if (!this.shipper) return { shipped: 0 };

    const rows = this.db
      .prepare(
        'SELECT rowid, id, timestamp, actor, action, details, status, prev_hash, hash FROM audit_logs WHERE shipped_at IS NULL ORDER BY rowid ASC LIMIT ?'
      )
      .all(limit) as AuditLogRow[];
    if (!rows.length) return { shipped: 0 };

    const batch = rows.map((r) => {
      const decrypted = this.decrypt(String(r.details ?? ''));
      const parsed = (() => {
        try {
          return JSON.parse(decrypted);
        } catch {
          return decrypted;
        }
      })();
      return {
        id: r.id,
        timestamp: r.timestamp,
        actor: r.actor,
        action: r.action,
        status: r.status,
        details: parsed,
        prev_hash: r.prev_hash ?? null,
        hash: r.hash ?? null,
      };
    });

    const payload = {
      sentAt: new Date().toISOString(),
      count: batch.length,
      payload: this.encryptForShipping(JSON.stringify(batch)),
    };

    await this.shipper.ship(JSON.stringify(payload));

    const shippedAt = new Date().toISOString();
    const update = this.db.prepare('UPDATE audit_logs SET shipped_at = ? WHERE id = ?');
    const tx = this.db.transaction((ids: string[]) => {
      for (const id of ids) update.run(shippedAt, id);
    });
    tx(rows.map((r) => r.id));

    return { shipped: rows.length };
  }

  async rotateLogs(retentionDays = 30): Promise<{ deleted: number }> {
    await this.ready;
    const days = typeof retentionDays === 'number' && Number.isFinite(retentionDays) ? retentionDays : 30;
    const cutoff = new Date(Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000).toISOString();
    const stmt = this.db.prepare('DELETE FROM audit_logs WHERE timestamp < ? AND shipped_at IS NOT NULL');
    const info = stmt.run(cutoff);
    return { deleted: Number(info.changes) || 0 };
  }
}

export const auditService = new AuditService();
