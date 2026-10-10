import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return files(path);
    }
    return /\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts') ? [path] : [];
  });
}

describe('customer contact wording', () => {
  const sources = files('src').map((file) => [file, readFileSync(file, 'utf8')] as const);

  it('no customer-facing "Call Mira" CTA is left: it is "Call or Text" (Mira & Team for scheduling)', () => {
    const stale = sources
      .filter(([file]) => !file.endsWith('site.config.ts')) // comment only
      .filter(([, text]) => /\b[Cc]all Mira(?! & Team)\b|[Pp]lease call (?!or text)/.test(text))
      .map(([file]) => file);
    expect(stale).toEqual([]);
  });

  it('scheduling / availability copy uses "Mira & Team"', () => {
    const joined = sources.map(([, text]) => text).join('\n');
    expect(joined).toContain('Call or text Mira &amp; Team');
    expect(joined).toContain('Call Mira & Team at');
    expect(joined).toContain('Mira & Team will confirm travel availability');
    expect(joined).toContain(
      'Mira & Team will confirm availability and any additional after-hours fee',
    );
  });
});
