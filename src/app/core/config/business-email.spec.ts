import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EMAIL_HREF, BUSINESS } from './business.config';

const OLD_EMAIL = /miranotary@gmail\.com/i;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('public business email', () => {
  it('is contact@miranotary.com everywhere it is exposed', () => {
    expect(BUSINESS.email).toBe('contact@miranotary.com');
    expect(EMAIL_HREF).toBe('mailto:contact@miranotary.com');
  });

  it('no current production source, config or doc still references the old Gmail address', () => {
    const current = [
      ...files('src').filter(
        (f) => /\.(ts|html|scss)$/.test(f) && !f.endsWith('business-email.spec.ts'),
      ),
      'wrangler.jsonc',
      '.dev.vars.example',
      'README.md',
      ...files(join('docs', 'seo')),
    ];
    expect(current.filter((file) => OLD_EMAIL.test(readFileSync(file, 'utf8')))).toEqual([]);
  });

  it('production Worker config: recipient is contact@miranotary.com, sender stays notify.miranotary.com', () => {
    const wrangler = readFileSync('wrangler.jsonc', 'utf8');
    expect(wrangler).toMatch(/"APPOINTMENT_RECIPIENT":\s*"contact@miranotary\.com"/);
    expect(wrangler).toMatch(/"EMAIL_FROM_ADDRESS":\s*"appointments@notify\.miranotary\.com"/);
  });
});
