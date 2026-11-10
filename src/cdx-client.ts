import { ArchiveConfig } from './config';

export type CdxRow = [timestamp: string, original: string];

export type Transport = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ status: number; text(): Promise<string> }>;

export class CdxUnavailableError extends Error {
  constructor(readonly reason: string, readonly status: number | null = null) {
    super(`archive unavailable (${reason})`);
    this.name = 'CdxUnavailableError';
  }
}

export class CdxClient {
  constructor(private readonly cfg: ArchiveConfig, private readonly transport: Transport = fetch) {}

  urlFor(domain: string): string {
    const q = new URLSearchParams({
      url: domain,
      matchType: 'domain',
      output: 'json',
      fl: 'timestamp,original',
      filter: 'statuscode:200',
      limit: String(this.cfg.limit),
    });
    return `https://web.archive.org/cdx/search/cdx?${q}`;
  }

  async fetch(domain: string): Promise<CdxRow[]> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.cfg.timeoutMs);
    try {
      const res = await this.transport(this.urlFor(domain), { headers: { 'user-agent': this.cfg.userAgent }, signal: ctrl.signal });
      const text = await res.text();
      if (res.status === 200) {
        const body = text.trim();
        if (!body) return [];
        return (JSON.parse(body) as string[][]).slice(1) as CdxRow[]; // первая строка - заголовки
      }
      // 4xx кроме 429 - архив не знает домен, это не ошибка
      if (res.status !== 429 && res.status < 500) return [];
      throw new CdxUnavailableError(`http ${res.status}`, res.status);
    } catch (e: any) {
      if (e instanceof CdxUnavailableError) throw e;
      throw new CdxUnavailableError(e?.name === 'AbortError' ? 'timeout' : String(e?.cause?.code ?? e?.message ?? e));
    } finally {
      clearTimeout(timer);
    }
  }
}
