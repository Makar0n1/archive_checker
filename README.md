# archive-checker

Проверка домена по истории Web Archive. Делается один запрос к CDX API (все снапшоты домена со статусом 200), по ним проверяется:

- есть ли история вообще;
- спам в URL: HARD (порно, фарма, реплики) и SOFT (гемблинг, крипта, SEO);
- парковка: раньше было много страниц, последние годы только главная;
- долгие разрывы в истории (возможна смена владельца).

Зависимостей нет, нужен Node 18+.

## Запуск

```bash
npm install
npm run check -- example.com example.org
npm test
npm run build
```

## Использование

```ts
import { ArchiveChecker, CdxUnavailableError } from 'archive-checker';

const checker = new ArchiveChecker();
const res = await checker.check('example.com');
// res.verdict: 'pass' | 'flag' | 'hard_fail'
// res.reason, res.flags, res.signals
```

Настройки можно переопределить частично: `new ArchiveChecker({ limit: 5000, gapMode: 'hard_fail' })`. Список настроек и значения по умолчанию лежат в `src/config.ts`.

Если CDX-строки уже получены где-то ещё, вердикт можно посчитать без сети: `checker.judge(domain, rows)`.

## Прокси и ретраи

Ретраев и прокси внутри нет. Вторым аргументом можно передать свой `Transport` (функция с сигнатурой `fetch`):

```ts
import { ProxyAgent } from 'undici';

const agent = new ProxyAgent('http://user:pass@1.2.3.4:8080');
const checker = new ArchiveChecker({}, (url, init) => fetch(url, { ...init, dispatcher: agent } as any));
```

На 429, 5xx, таймаут и сетевые ошибки бросается `CdxUnavailableError`. Это проблема IP или архива, а не домена, поэтому такой запрос надо повторить, лучше с другого IP. Остальные 4xx считаются пустой историей.

web.archive.org быстро режет один IP. У меня стоит: не чаще 1 запроса в 1,5 с на IP, пул от 100 прокси, после 3 ошибок подряд IP отдыхает 45 с (при повторах до 10 мин), 3 ретрая, таймаут 30 с.

## Правила

Проверяются по порядку, первый отказ завершает проверку.

| Условие | Результат |
|---|---|
| Нет снапшотов | `hard_fail`, `no_archive` (при `noArchiveMode: 'flag'` только флаг) |
| HARD-URL >= 2 | `hard_fail`, `hard_spam` |
| SOFT-URL >= 5 и >= 3% снапшотов | `hard_fail` (при `softSpamMode: 'hard_fail'`) |
| SOFT-URL > 0 | `soft_spam:N` |
| Было >= 10 страниц в год, за последние 2 года <= 2 | `archive_parked` |
| Разрыв >= 3 лет | `archive_gap` (при `gapMode: 'hard_fail'` отказ) |
| Ровно 1 HARD-URL | `hard_spam_1` |
| Флагов нет | `pass`, иначе `flag` |

Паттерны проверяются без учёта регистра по декодированному URL. Каждый URL считается один раз, HARD приоритетнее SOFT. URL из `softExcludePatterns` (вакансии, отели, wikipedia, /news/) в SOFT не попадают. Для парковки страницы сравниваются без схемы, `www`, query и слеша в конце.
