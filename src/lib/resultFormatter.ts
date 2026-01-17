/**
 * Result formatting utilities for the AI Terminal
 */

export type ResultType = 'table' | 'json' | 'text' | 'error' | 'empty';

export interface FormattedResult {
  type: ResultType;
  display: string;
  raw: unknown;
  columns?: string[];
  rows?: Record<string, unknown>[];
}

/**
 * Detect the type of result and format accordingly
 */
export function formatResult(result: unknown): FormattedResult {
  // Handle null/undefined
  if (result === null || result === undefined) {
    return {
      type: 'empty',
      display: '(no output)',
      raw: result,
    };
  }

  // Handle errors
  if (result instanceof Error) {
    return {
      type: 'error',
      display: result.stack || result.message,
      raw: result,
    };
  }

  // Handle primitives
  if (typeof result === 'string') {
    return {
      type: 'text',
      display: result || '(empty string)',
      raw: result,
    };
  }

  if (typeof result === 'number' || typeof result === 'boolean') {
    return {
      type: 'text',
      display: String(result),
      raw: result,
    };
  }

  // Handle arrays
  if (Array.isArray(result)) {
    if (result.length === 0) {
      return {
        type: 'empty',
        display: '(empty array)',
        raw: result,
      };
    }

    // Check if it's an array of objects (table-friendly)
    if (result.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
      const columns = extractColumns(result as Record<string, unknown>[]);
      if (columns.length > 0 && columns.length <= 10) {
        return {
          type: 'table',
          display: formatAsTable(result as Record<string, unknown>[], columns),
          raw: result,
          columns,
          rows: result as Record<string, unknown>[],
        };
      }
    }

    // Fall back to JSON for other arrays
    return {
      type: 'json',
      display: JSON.stringify(result, null, 2),
      raw: result,
    };
  }

  // Handle objects
  if (typeof result === 'object') {
    return {
      type: 'json',
      display: JSON.stringify(result, null, 2),
      raw: result,
    };
  }

  // Fallback
  return {
    type: 'text',
    display: String(result),
    raw: result,
  };
}

/**
 * Extract column names from an array of objects
 */
function extractColumns(rows: Record<string, unknown>[]): string[] {
  const columnSet = new Set<string>();
  
  // Sample first 10 rows to get columns
  const sample = rows.slice(0, 10);
  for (const row of sample) {
    for (const key of Object.keys(row)) {
      columnSet.add(key);
    }
  }

  return Array.from(columnSet);
}

/**
 * Format an array of objects as an ASCII table
 */
function formatAsTable(rows: Record<string, unknown>[], columns: string[]): string {
  if (rows.length === 0 || columns.length === 0) {
    return '(empty table)';
  }

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
  }

  // Check values in first 50 rows
  const sampleRows = rows.slice(0, 50);
  for (const row of sampleRows) {
    for (const col of columns) {
      const value = formatCellValue(row[col]);
      widths[col] = Math.max(widths[col], value.length);
    }
  }

  // Cap column widths at 40 chars
  for (const col of columns) {
    widths[col] = Math.min(widths[col], 40);
  }

  // Build table
  const lines: string[] = [];

  // Header
  const headerCells = columns.map(col => col.padEnd(widths[col]));
  lines.push(headerCells.join(' │ '));

  // Separator
  const separatorCells = columns.map(col => '─'.repeat(widths[col]));
  lines.push(separatorCells.join('─┼─'));

  // Rows (limit to 100)
  const displayRows = rows.slice(0, 100);
  for (const row of displayRows) {
    const cells = columns.map(col => {
      const value = formatCellValue(row[col]);
      return truncate(value, widths[col]).padEnd(widths[col]);
    });
    lines.push(cells.join(' │ '));
  }

  // Add truncation notice if needed
  if (rows.length > 100) {
    lines.push(`... (${rows.length - 100} more rows)`);
  }

  return lines.join('\n');
}

/**
 * Format a cell value for display
 */
function formatCellValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

/**
 * Truncate a string to a max length
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Convert result to CSV format
 */
export function toCSV(result: FormattedResult): string | null {
  if (result.type !== 'table' || !result.columns || !result.rows) {
    // Try to convert JSON arrays to CSV
    if (result.type === 'json' && Array.isArray(result.raw)) {
      const rows = result.raw as Record<string, unknown>[];
      if (rows.length > 0 && typeof rows[0] === 'object') {
        const columns = extractColumns(rows);
        return generateCSV(rows, columns);
      }
    }
    return null;
  }

  return generateCSV(result.rows, result.columns);
}

/**
 * Generate CSV string from rows and columns
 */
function generateCSV(rows: Record<string, unknown>[], columns: string[]): string {
  const lines: string[] = [];

  // Header
  lines.push(columns.map(escapeCSV).join(','));

  // Rows
  for (const row of rows) {
    const cells = columns.map(col => escapeCSV(formatCellValue(row[col])));
    lines.push(cells.join(','));
  }

  return lines.join('\n');
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Convert result to JSON format (pretty-printed)
 */
export function toJSON(result: FormattedResult): string {
  return JSON.stringify(result.raw, null, 2);
}

/**
 * Download data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export result as CSV file
 */
export function exportAsCSV(result: FormattedResult, filename = 'export.csv'): boolean {
  const csv = toCSV(result);
  if (!csv) return false;
  downloadFile(csv, filename, 'text/csv');
  return true;
}

/**
 * Export result as JSON file
 */
export function exportAsJSON(result: FormattedResult, filename = 'export.json'): void {
  const json = toJSON(result);
  downloadFile(json, filename, 'application/json');
}
