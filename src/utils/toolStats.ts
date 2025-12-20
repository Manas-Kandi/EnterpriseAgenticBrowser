
/**
 * Simple IndexedDB helper for logging tool call statistics.
 * DB name: 'tool_stats'
 * Object store: 'calls'
 * Schema: {
 *   id: number (auto)
 *   ts: number (Date.now())
 *   tool: string
 *   durationMs: number
 *   ok: boolean
 * }
 */

interface ToolCallRecord {
  id?: number;
  ts: number;
  tool: string;
  durationMs: number;
  ok: boolean;
}

const DB_NAME = 'tool_stats';
const STORE_NAME = 'calls';
const DB_VERSION = 1;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tool', 'tool', { unique: false });
        store.createIndex('ts', 'ts', { unique: false });
        store.createIndex('ok', 'ok', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function logToolCall(tool: string, durationMs: number, ok: boolean) {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: ToolCallRecord = { ts: Date.now(), tool, durationMs, ok };
    store.add(record);
    return new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.error('[toolStats] Failed to log tool call', e);
  }
}

/**
 * Return raw records since a unix timestamp.
 */
export async function getCallsSince(sinceMs: number): Promise<ToolCallRecord[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('ts');
  const range = IDBKeyRange.lowerBound(sinceMs);
  const records: ToolCallRecord[] = [];
  return new Promise((resolve, reject) => {
    index.openCursor(range).onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (cursor) {
        records.push(cursor.value as ToolCallRecord);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all records.
 */
export async function getAllCalls(): Promise<ToolCallRecord[]> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const records: ToolCallRecord[] = [];
  return new Promise((resolve, reject) => {
    store.openCursor().onsuccess = (e: any) => {
      const cursor: IDBCursorWithValue | null = e.target.result;
      if (cursor) {
        records.push(cursor.value as ToolCallRecord);
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve(records);
    tx.onerror = () => reject(tx.error);
  });
}

export type AggregatedToolStat = {
  tool: string;
  count: number;
  failures: number;
  avgLatency: number; // ms
};

export function aggregateStats(records: ToolCallRecord[]): AggregatedToolStat[] {
  const map: Record<string, { count: number; failures: number; totalLatency: number }> = {};
  for (const r of records) {
    if (!map[r.tool]) map[r.tool] = { count: 0, failures: 0, totalLatency: 0 };
    map[r.tool].count++;
    if (!r.ok) map[r.tool].failures++;
    map[r.tool].totalLatency += r.durationMs;
  }
  return Object.entries(map).map(([tool, data]) => ({
    tool,
    count: data.count,
    failures: data.failures,
    avgLatency: data.count ? Math.round(data.totalLatency / data.count) : 0,
  }));
}

export function toCSV(records: ToolCallRecord[]): string {
  const header = 'ts,tool,durationMs,ok';
  const rows = records.map(r => `${r.ts},${r.tool},${r.durationMs},${r.ok}`);
  return [header, ...rows].join('\n');
}
