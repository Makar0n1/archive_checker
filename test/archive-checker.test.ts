import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ArchiveChecker, CdxRow, CdxUnavailableError, Transport } from '../src';

const row = (year: number, path: string): CdxRow => [`${year}0101000000`, `http://example.com${path}`];
const nowY = new Date().getUTCFullYear();

const fake = (status: number, body: unknown): Transport => async () => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });

test('чистая история - pass', () => {
  const rows = [nowY - 3, nowY - 2, nowY - 1, nowY].map((y) => row(y, '/about'));
  assert.equal(new ArchiveChecker().judge('example.com', rows).verdict, 'pass');
});

test('нет снапшотов - hard_fail no_archive', () => {
  const r = new ArchiveChecker().judge('example.com', []);
  assert.equal(r.verdict, 'hard_fail');
  assert.deepEqual(r.flags, ['no_archive']);
});

test('2 HARD-URL - hard_fail, 1 - флаг hard_spam_1', () => {
  const base = [row(nowY - 1, '/'), row(nowY, '/')];
  const checker = new ArchiveChecker();
  assert.equal(checker.judge('example.com', [...base, row(nowY, '/buy-viagra'), row(nowY, '/cialis')]).verdict, 'hard_fail');
  const one = checker.judge('example.com', [...base, row(nowY, '/buy-viagra')]);
  assert.equal(one.verdict, 'flag');
  assert.ok(one.flags.includes('hard_spam_1'));
});

test('SOFT: исключения не считаются, отказ только при >=5 URL и >=3%', () => {
  const checker = new ArchiveChecker();
  const casino = Array.from({ length: 5 }, (_, i) => row(nowY, `/casino-${i}`));
  assert.equal(checker.judge('example.com', [row(nowY - 1, '/'), ...casino]).verdict, 'hard_fail');
  const excluded = checker.judge('example.com', [row(nowY, '/'), row(nowY, '/hotel-casino')]);
  assert.equal(excluded.signals.soft_spam_urls, 0);
});

test('разрыв в истории от 3 лет - флаг archive_gap', () => {
  const r = new ArchiveChecker().judge('example.com', [row(2010, '/'), row(2015, '/')]);
  assert.ok(r.flags.includes('archive_gap'));
  assert.equal(r.signals.max_gap_years, 4);
});

test('парковка: раньше много страниц, теперь только главная', () => {
  const old = Array.from({ length: 12 }, (_, i) => row(nowY - 5, `/page-${i}`));
  const r = new ArchiveChecker().judge('example.com', [...old, row(nowY - 4, '/'), row(nowY - 3, '/'), row(nowY - 2, '/'), row(nowY - 1, '/'), row(nowY, '/')]);
  assert.ok(r.flags.includes('archive_parked'));
});

test('транспорт: 200 - строки без заголовка, 404 - пусто, 429/503 - CdxUnavailableError', async () => {
  const ok = new ArchiveChecker({}, fake(200, [['timestamp', 'original'], ['20200101000000', 'http://example.com/']]));
  assert.equal((await ok.check('example.com')).signals.snapshots, 1);
  assert.equal((await new ArchiveChecker({}, fake(404, '')).check('example.com')).verdict, 'hard_fail');
  await assert.rejects(new ArchiveChecker({}, fake(429, '')).check('example.com'), CdxUnavailableError);
  await assert.rejects(new ArchiveChecker({}, fake(503, '')).check('example.com'), CdxUnavailableError);
});
