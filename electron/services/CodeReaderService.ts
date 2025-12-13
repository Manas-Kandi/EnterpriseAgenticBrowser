import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { AgentTool, toolRegistry } from './ToolRegistry';
import { app } from 'electron';

type CodeSearchMatch = {
  path: string;
  line: number;
  preview: string;
};

const MAX_FILES_DEFAULT = 2000;
const MAX_FILE_BYTES_DEFAULT = 200_000; // ~200KB per file read

const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  '.next',
  '.turbo',
  '.cache',
]);

const isPathInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..');
};

export class CodeReaderService {
  private mockSaasSrcRoot: string | null = null;
  private mockSaasSrcRootReal: string | null = null;

  constructor() {
    this.registerTools();
  }

  private async pathExists(p: string): Promise<boolean> {
    try {
      await fs.stat(p);
      return true;
    } catch {
      return false;
    }
  }

  private async getMockSaasSrcRoot(): Promise<{ root: string; rootReal: string }> {
    if (this.mockSaasSrcRoot && this.mockSaasSrcRootReal) {
      return { root: this.mockSaasSrcRoot, rootReal: this.mockSaasSrcRootReal };
    }

    const candidates: string[] = [];
    // Common in dev
    candidates.push(process.cwd());
    candidates.push(path.dirname(process.cwd()));
    candidates.push(path.dirname(path.dirname(process.cwd())));

    // Electron context
    try {
      candidates.push(app.getAppPath());
      candidates.push(path.dirname(app.getAppPath()));
      candidates.push(path.dirname(path.dirname(app.getAppPath())));
    } catch {
      // ignore
    }

    for (const base of candidates) {
      const p = path.resolve(base, 'mock-saas', 'src');
      if (await this.pathExists(p)) {
        const real = await fs.realpath(p);
        this.mockSaasSrcRoot = p;
        this.mockSaasSrcRootReal = real;
        return { root: p, rootReal: real };
      }
    }

    throw new Error(
      'mock-saas/src not found. This white-box tool only works when the repo contains mock-saas/src.'
    );
  }

  private normalizeUserPath(inputPath: string): string {
    const p = inputPath.replace(/\\/g, '/').trim();
    const stripped = p
      .replace(/^(\.\/)+/, '')
      .replace(/^\/+/, '')
      .replace(/^mock-saas\/src\//, '')
      .replace(/^mock-saas\//, '')
      .replace(/^src\//, '');
    return stripped;
  }

  private async resolvePathWithinMockSaasSrc(inputPath: string): Promise<string> {
    const { rootReal } = await this.getMockSaasSrcRoot();
    const rel = this.normalizeUserPath(inputPath);
    const resolved = path.resolve(rootReal, rel);
    if (!isPathInside(resolved, rootReal)) {
      throw new Error('Path escapes mock-saas/src. Access denied.');
    }
    return resolved;
  }

  private async listFilesRecursive(
    dir: string,
    maxFiles: number,
    out: string[],
    baseReal: string
  ): Promise<void> {
    if (out.length >= maxFiles) return;

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (out.length >= maxFiles) return;
      if (entry.name.startsWith('.')) continue;
      if (IGNORE_DIRS.has(entry.name)) continue;

      const full = path.join(dir, entry.name);
      // Avoid symlink escapes.
      let real: string;
      try {
        real = await fs.realpath(full);
      } catch {
        continue;
      }
      if (!isPathInside(real, baseReal)) continue;

      if (entry.isDirectory()) {
        await this.listFilesRecursive(real, maxFiles, out, baseReal);
      } else if (entry.isFile()) {
        out.push(real);
      }
    }
  }

  private registerTools() {
    const listSchema = z.object({
      dir: z
        .string()
        .optional()
        .describe('Directory within mock-saas/src to list (default: ".")'),
      maxFiles: z.number().int().min(1).max(5000).optional().describe('Max files to return (default 500)'),
    });

    const listTool: AgentTool = {
      name: 'code_list_files',
      description:
        'List files under mock-saas/src (white-box access). Ignores node_modules/dist. Returns paths relative to mock-saas/src.',
      schema: listSchema,
      execute: async (args: unknown) => {
        const { dir, maxFiles } = listSchema.parse(args ?? {});
        const { rootReal } = await this.getMockSaasSrcRoot();
        const resolvedDir = await this.resolvePathWithinMockSaasSrc(dir ?? '.');

        const filesReal: string[] = [];
        await this.listFilesRecursive(resolvedDir, maxFiles ?? 500, filesReal, rootReal);
        const files = filesReal.map((p) => path.relative(rootReal, p).replace(/\\/g, '/')).sort();

        return JSON.stringify(
          {
            root: 'mock-saas/src',
            dir: (dir ?? '.').replace(/\\/g, '/'),
            count: files.length,
            files,
          },
          null,
          2
        );
      },
    };

    const readSchema = z.object({
      path: z.string().describe('File path within mock-saas/src (e.g. "pages/jira/JiraPage.tsx")'),
      startLine: z.number().int().min(1).optional().describe('Start line (1-based)'),
      maxLines: z.number().int().min(1).max(2000).optional().describe('Max lines to return (default 200)'),
      maxBytes: z.number().int().min(1).max(2_000_000).optional().describe('Max bytes to read (default 200k)'),
    });

    const readTool: AgentTool = {
      name: 'code_read_file',
      description:
        'Read a file from mock-saas/src (white-box access). Use this to discover data-testid selectors and UI state logic.',
      schema: readSchema,
      execute: async (args: unknown) => {
        const { path: filePath, startLine, maxLines, maxBytes } = readSchema.parse(args);
        const { rootReal } = await this.getMockSaasSrcRoot();
        const resolved = await this.resolvePathWithinMockSaasSrc(filePath);

        const stat = await fs.stat(resolved);
        if (!stat.isFile()) throw new Error('Not a file.');
        if (stat.size > (maxBytes ?? MAX_FILE_BYTES_DEFAULT)) {
          throw new Error(
            `File too large (${stat.size} bytes). Increase maxBytes (<=2,000,000) or read a smaller file.`
          );
        }

        const raw = await fs.readFile(resolved, 'utf8');
        const lines = raw.split(/\r?\n/);
        const totalLines = lines.length;
        const start = Math.max(1, startLine ?? 1);
        const max = maxLines ?? 200;
        const end = Math.min(totalLines, start + max - 1);
        const content = lines.slice(start - 1, end).join('\n');

        return JSON.stringify(
          {
            root: 'mock-saas/src',
            path: path.relative(rootReal, resolved).replace(/\\/g, '/'),
            totalLines,
            startLine: start,
            endLine: end,
            content,
          },
          null,
          2
        );
      },
    };

    const searchSchema = z.object({
      query: z.string().min(1).describe('Text to search for'),
      dir: z.string().optional().describe('Directory within mock-saas/src to search (default ".")'),
      maxResults: z.number().int().min(1).max(200).optional().describe('Max matches to return (default 20)'),
      caseSensitive: z.boolean().optional().describe('Case-sensitive search (default false)'),
      maxFiles: z.number().int().min(1).max(5000).optional().describe('Max files to scan (default 2000)'),
    });

    const searchTool: AgentTool = {
      name: 'code_search',
      description:
        'Search for text within mock-saas/src (white-box access). Returns file/line previews to quickly find relevant components.',
      schema: searchSchema,
      execute: async (args: unknown) => {
        const { query, dir, maxResults, caseSensitive, maxFiles } = searchSchema.parse(args);
        const { rootReal } = await this.getMockSaasSrcRoot();
        const resolvedDir = await this.resolvePathWithinMockSaasSrc(dir ?? '.');

        const filesReal: string[] = [];
        await this.listFilesRecursive(resolvedDir, maxFiles ?? MAX_FILES_DEFAULT, filesReal, rootReal);

        const needle = caseSensitive ? query : query.toLowerCase();
        const limit = maxResults ?? 20;
        const matches: CodeSearchMatch[] = [];

        for (const fileReal of filesReal) {
          if (matches.length >= limit) break;

          let stat: Awaited<ReturnType<typeof fs.stat>>;
          try {
            stat = await fs.stat(fileReal);
          } catch {
            continue;
          }
          if (!stat.isFile()) continue;
          if (stat.size > (MAX_FILE_BYTES_DEFAULT * 2)) continue;

          let raw: string;
          try {
            raw = await fs.readFile(fileReal, 'utf8');
          } catch {
            continue;
          }

          const lines = raw.split(/\r?\n/);
          for (let i = 0; i < lines.length; i++) {
            if (matches.length >= limit) break;
            const hay = caseSensitive ? lines[i] : lines[i].toLowerCase();
            if (!hay.includes(needle)) continue;
            matches.push({
              path: path.relative(rootReal, fileReal).replace(/\\/g, '/'),
              line: i + 1,
              preview: lines[i].trim().slice(0, 200),
            });
          }
        }

        return JSON.stringify(
          {
            root: 'mock-saas/src',
            dir: (dir ?? '.').replace(/\\/g, '/'),
            query,
            count: matches.length,
            matches,
          },
          null,
          2
        );
      },
    };

    toolRegistry.register(listTool);
    toolRegistry.register(readTool);
    toolRegistry.register(searchTool);
  }
}

export const codeReaderService = new CodeReaderService();

