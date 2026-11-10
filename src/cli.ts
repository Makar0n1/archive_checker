import { ArchiveChecker } from './archive-checker';
import { CdxUnavailableError } from './cdx-client';

async function main() {
  const domains = process.argv.slice(2);
  if (!domains.length) {
    console.error('usage: npm run check -- <domain> [domain...]');
    process.exit(1);
  }
  const checker = new ArchiveChecker();
  for (const domain of domains) {
    try {
      const { raw: _raw, ...result } = await checker.check(domain);
      console.log(JSON.stringify(result, null, 2));
    } catch (e) {
      if (e instanceof CdxUnavailableError) console.error(`${domain}: ${e.message}`);
      else throw e;
    }
  }
}

void main();
