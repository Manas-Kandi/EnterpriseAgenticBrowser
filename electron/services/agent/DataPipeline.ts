/**
 * DataPipeline - Data normalization, validation, and transformation
 * 
 * Features:
 * - Schema validation with Zod
 * - Data normalization (prices, dates, names)
 * - Deduplication by configurable fields
 * - Data enrichment hooks
 * - Multiple export formats (JSON, CSV)
 */

import { z } from 'zod';

export interface NormalizationRule {
  field: string;
  type: 'price' | 'date' | 'name' | 'email' | 'phone' | 'url' | 'text' | 'number';
  options?: Record<string, unknown>;
}

export interface DeduplicationConfig {
  fields: string[];
  strategy: 'first' | 'last' | 'merge' | 'highest-quality';
  qualityScorer?: (item: Record<string, unknown>) => number;
}

export interface PipelineConfig {
  normalizationRules?: NormalizationRule[];
  schema?: z.ZodSchema;
  deduplication?: DeduplicationConfig;
  enrichers?: Array<(item: Record<string, unknown>) => Promise<Record<string, unknown>>>;
  filters?: Array<(item: Record<string, unknown>) => boolean>;
}

export class DataPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig = {}) {
    this.config = config;
  }

  /**
   * Process raw data through the full pipeline
   */
  async process(rawData: unknown[]): Promise<{
    data: Record<string, unknown>[];
    stats: ProcessingStats;
  }> {
    const stats: ProcessingStats = {
      inputCount: rawData.length,
      normalizedCount: 0,
      validCount: 0,
      duplicatesRemoved: 0,
      enrichedCount: 0,
      filteredCount: 0,
      outputCount: 0,
      errors: [],
    };

    let data = rawData.map(item => 
      typeof item === 'object' && item !== null 
        ? item as Record<string, unknown>
        : { value: item }
    );

    // Step 1: Normalize
    if (this.config.normalizationRules?.length) {
      data = data.map(item => this.normalize(item));
      stats.normalizedCount = data.length;
    }

    // Step 2: Validate
    if (this.config.schema) {
      const validated: Record<string, unknown>[] = [];
      for (const item of data) {
        const result = this.config.schema.safeParse(item);
        if (result.success) {
          validated.push(result.data as Record<string, unknown>);
        } else {
          stats.errors.push({
            item,
            error: result.error.message,
          });
        }
      }
      data = validated as Record<string, unknown>[];
      stats.validCount = data.length;
    }

    // Step 3: Filter
    if (this.config.filters?.length) {
      const beforeFilter = data.length;
      for (const filter of this.config.filters) {
        data = data.filter(filter);
      }
      stats.filteredCount = beforeFilter - data.length;
    }

    // Step 4: Deduplicate
    if (this.config.deduplication) {
      const beforeDedup = data.length;
      data = this.deduplicate(data);
      stats.duplicatesRemoved = beforeDedup - data.length;
    }

    // Step 5: Enrich
    if (this.config.enrichers?.length) {
      const enriched: Record<string, unknown>[] = [];
      for (const item of data) {
        let enrichedItem = { ...item };
        for (const enricher of this.config.enrichers) {
          try {
            enrichedItem = await enricher(enrichedItem);
          } catch (error) {
            stats.errors.push({
              item,
              error: `Enrichment failed: ${error}`,
            });
          }
        }
        enriched.push(enrichedItem);
      }
      data = enriched;
      stats.enrichedCount = data.length;
    }

    stats.outputCount = data.length;
    return { data, stats };
  }

  /**
   * Normalize a single item based on rules
   */
  private normalize(item: Record<string, unknown>): Record<string, unknown> {
    const result = { ...item };

    for (const rule of this.config.normalizationRules ?? []) {
      const value = result[rule.field];
      if (value === undefined || value === null) continue;

      switch (rule.type) {
        case 'price':
          result[rule.field] = this.normalizePrice(String(value));
          break;
        case 'date':
          result[rule.field] = this.normalizeDate(String(value));
          break;
        case 'name':
          result[rule.field] = this.normalizeName(String(value));
          break;
        case 'email':
          result[rule.field] = this.normalizeEmail(String(value));
          break;
        case 'phone':
          result[rule.field] = this.normalizePhone(String(value));
          break;
        case 'url':
          result[rule.field] = this.normalizeUrl(String(value));
          break;
        case 'text':
          result[rule.field] = this.normalizeText(String(value));
          break;
        case 'number':
          result[rule.field] = this.normalizeNumber(String(value));
          break;
      }
    }

    return result;
  }

  /**
   * Normalize price strings to numbers
   * Handles: "$1,999.00", "1999 USD", "€1.999,00", "1999"
   */
  private normalizePrice(value: string): number | null {
    if (!value) return null;
    
    // Remove currency symbols and whitespace
    let cleaned = value.replace(/[$€£¥₹]/g, '').trim();
    
    // Handle European format (1.999,00 -> 1999.00)
    if (/^\d{1,3}(\.\d{3})*,\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    
    // Remove remaining non-numeric except decimal point
    cleaned = cleaned.replace(/[^\d.]/g, '');
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }

  /**
   * Normalize date strings to ISO format
   */
  private normalizeDate(value: string): string | null {
    if (!value) return null;
    
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Normalize names to Title Case
   */
  private normalizeName(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
      .trim();
  }

  /**
   * Normalize email to lowercase
   */
  private normalizeEmail(value: string): string {
    return value.toLowerCase().trim();
  }

  /**
   * Normalize phone numbers to digits only
   */
  private normalizePhone(value: string): string {
    return value.replace(/[^\d+]/g, '');
  }

  /**
   * Normalize URLs
   */
  private normalizeUrl(value: string): string {
    let url = value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url;
  }

  /**
   * Normalize text (trim, collapse whitespace)
   */
  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalize number strings
   */
  private normalizeNumber(value: string): number | null {
    const num = parseFloat(value.replace(/[^\d.-]/g, ''));
    return isNaN(num) ? null : num;
  }

  /**
   * Deduplicate data based on configuration
   */
  private deduplicate(data: Record<string, unknown>[]): Record<string, unknown>[] {
    const config = this.config.deduplication!;
    const seen = new Map<string, Record<string, unknown>>();

    for (const item of data) {
      const key = config.fields.map(f => String(item[f] ?? '')).join('|');
      
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        const existing = seen.get(key)!;
        
        switch (config.strategy) {
          case 'first':
            // Keep first, do nothing
            break;
          case 'last':
            seen.set(key, item);
            break;
          case 'merge':
            seen.set(key, { ...existing, ...item });
            break;
          case 'highest-quality':
            if (config.qualityScorer) {
              const existingScore = config.qualityScorer(existing);
              const newScore = config.qualityScorer(item);
              if (newScore > existingScore) {
                seen.set(key, item);
              }
            }
            break;
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Export data as CSV
   */
  toCSV(data: Record<string, unknown>[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(h => {
        const val = item[h];
        const str = val === null || val === undefined ? '' : String(val);
        // Escape quotes and wrap in quotes if contains comma
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export data as JSON
   */
  toJSON(data: Record<string, unknown>[], pretty = true): string {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  }
}

export interface ProcessingStats {
  inputCount: number;
  normalizedCount: number;
  validCount: number;
  duplicatesRemoved: number;
  enrichedCount: number;
  filteredCount: number;
  outputCount: number;
  errors: Array<{ item: unknown; error: string }>;
}

/**
 * Common schemas for reuse
 */
export const CommonSchemas = {
  lead: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    linkedinUrl: z.string().url().optional(),
    source: z.string().optional(),
  }),

  product: z.object({
    name: z.string().min(1),
    price: z.number().positive().optional(),
    currency: z.string().optional(),
    url: z.string().url().optional(),
    imageUrl: z.string().url().optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().nonnegative().optional(),
    inStock: z.boolean().optional(),
  }),

  job: z.object({
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    salary: z.string().optional(),
    description: z.string().optional(),
    url: z.string().url().optional(),
    postedDate: z.string().optional(),
  }),

  article: z.object({
    title: z.string().min(1),
    content: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.string().optional(),
    url: z.string().url().optional(),
    source: z.string().optional(),
  }),
};
