import { ArchiveAnalyzer, ArchiveSignals } from './archive-analyzer';
import { CdxClient, CdxRow, Transport } from './cdx-client';
import { ArchiveConfig, DEFAULT_CONFIG } from './config';

export type Verdict = 'pass' | 'flag' | 'hard_fail';

export interface ArchiveResult {
  domain: string;
  verdict: Verdict;
  reason?: string;
  flags: string[];
  signals: ArchiveSignals;
  raw: { rows_total: number; rows: CdxRow[] };
}

export class ArchiveChecker {
  readonly cfg: ArchiveConfig;
  private readonly client: CdxClient;
  private readonly analyzer: ArchiveAnalyzer;

  constructor(overrides: Partial<ArchiveConfig> = {}, transport?: Transport) {
    this.cfg = { ...DEFAULT_CONFIG, ...overrides };
    this.client = new CdxClient(this.cfg, transport);
    this.analyzer = new ArchiveAnalyzer(this.cfg);
  }

  async check(domain: string): Promise<ArchiveResult> {
    return this.judge(domain, await this.client.fetch(domain));
  }

  judge(domain: string, rows: CdxRow[]): ArchiveResult {
    const signals = this.analyzer.analyze(rows);
    const raw = { rows_total: rows.length, rows: rows.slice(0, 500) };
    const result = (verdict: Verdict, flags: string[], reason?: string): ArchiveResult => ({ domain, verdict, reason, flags, signals, raw });
    const flags: string[] = [];

    if (signals.snapshots === 0) {
      if (this.cfg.noArchiveMode === 'hard_fail') return result('hard_fail', ['no_archive'], 'no snapshots in web archive');
      flags.push('no_archive');
    }

    if (signals.hard_spam_urls >= this.cfg.hardSpamMinUrls) {
      return result('hard_fail', [...flags, 'hard_spam'], `hard spam in archive: ${signals.hard_spam_urls} urls`);
    }

    if (signals.soft_spam_urls > 0) {
      flags.push(`soft_spam:${signals.soft_spam_urls}`);
      const share = signals.soft_spam_urls / Math.max(1, signals.snapshots);
      if (this.cfg.softSpamMode === 'hard_fail' && signals.soft_spam_urls >= this.cfg.softSpamHardMinUrls && share >= this.cfg.softSpamHardMinShare) {
        return result('hard_fail', flags, `soft spam in archive: ${signals.soft_spam_urls} urls`);
      }
    }

    if (signals.parked) flags.push('archive_parked');

    if (signals.max_gap_years >= this.cfg.gapYearsFlag) {
      flags.push('archive_gap');
      if (this.cfg.gapMode === 'hard_fail') return result('hard_fail', flags, `archive gap: ${signals.max_gap_years} years (owner change?)`);
    }

    if (signals.hard_spam_urls === 1) flags.push('hard_spam_1');

    return result(flags.length ? 'flag' : 'pass', flags);
  }
}
