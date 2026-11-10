import { CdxRow } from './cdx-client';
import { ArchiveConfig } from './config';

export interface ArchiveSignals {
  snapshots: number;
  first_year: number | null;
  last_year: number | null;
  years_covered: number;
  years: number[];
  spam_years: number[];
  max_gap_years: number;
  paths_per_year: Record<number, number>;
  recent_paths: number;
  max_paths: number;
  parked: boolean;
  hard_spam_urls: number;
  soft_spam_urls: number;
  hard_examples: string[];
  soft_examples: string[];
}

export class ArchiveAnalyzer {
  private readonly hard: RegExp[];
  private readonly soft: RegExp[];
  private readonly softExclude: RegExp[];

  constructor(private readonly cfg: ArchiveConfig) {
    const compile = (ps: string[]) => ps.map((p) => new RegExp(p, 'i'));
    this.hard = compile(cfg.hardSpamPatterns);
    this.soft = compile(cfg.softPatterns);
    this.softExclude = compile(cfg.softExcludePatterns);
  }

  analyze(rows: CdxRow[], now = new Date()): ArchiveSignals {
    const years = new Set<number>();
    const spamYears = new Set<number>();
    const pathsByYear = new Map<number, Set<string>>();
    const hardEx: string[] = [], softEx: string[] = [];
    let hardN = 0, softN = 0;

    for (const [ts, url] of rows) {
      const y = Number(ts.slice(0, 4));
      years.add(y);
      const u = safeDecode(url);
      (pathsByYear.get(y) ?? pathsByYear.set(y, new Set()).get(y)!).add(pathOf(u));
      // HARD важнее SOFT, один URL считаем один раз
      if (this.hard.some((r) => r.test(u))) { hardN++; spamYears.add(y); if (hardEx.length < 10) hardEx.push(url); }
      else if (this.soft.some((r) => r.test(u)) && !this.softExclude.some((r) => r.test(u))) { softN++; spamYears.add(y); if (softEx.length < 10) softEx.push(url); }
    }

    const sorted = [...years].sort((a, b) => a - b);
    const pathsPerYear = Object.fromEntries(sorted.map((y) => [y, pathsByYear.get(y)!.size])) as Record<number, number>;
    const recentYears = sorted.filter((y) => y >= now.getUTCFullYear() - this.cfg.parkedRecentYears);
    const maxPaths = Math.max(0, ...Object.values(pathsPerYear));
    const recentPaths = Math.max(0, ...recentYears.map((y) => pathsPerYear[y]));
    const parked = recentYears.length > 0 && maxPaths >= this.cfg.parkedMinHistoryPaths && recentPaths <= this.cfg.parkedMaxRecentPaths;
    let maxGap = 0;
    for (let i = 1; i < sorted.length; i++) maxGap = Math.max(maxGap, sorted[i] - sorted[i - 1] - 1);

    return {
      snapshots: rows.length,
      first_year: sorted[0] ?? null,
      last_year: sorted[sorted.length - 1] ?? null,
      years_covered: sorted.length,
      years: sorted,
      spam_years: [...spamYears].sort((a, b) => a - b),
      max_gap_years: maxGap,
      paths_per_year: pathsPerYear,
      recent_paths: recentPaths,
      max_paths: maxPaths,
      parked,
      hard_spam_urls: hardN,
      soft_spam_urls: softN,
      hard_examples: hardEx,
      soft_examples: softEx,
    };
  }
}

function pathOf(u: string): string {
  return u.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
}

function safeDecode(s: string): string {
  try { return decodeURIComponent(s); } catch { return s; }
}
