import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BUSINESS } from './business.config';

const OLD_PHONE_PATTERNS = [/916\)?[\s.-]*759[\s.-]*0383/, /\+?1?9167590383/];

/** Files that may legitimately mention the secondary number. */
const ALLOWED = [
  'business.config.ts',
  join('contact-card', 'contact-card.component.ts'),
  join('config', 'phone-numbers.spec.ts'),
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return sourceFiles(path);
    }
    return /\.(ts|html|scss|json)$/.test(name) ? [path] : [];
  });
}

describe('phone number migration guard', () => {
  it('makes (279) 529-8754 the primary number', () => {
    expect(BUSINESS.phones.primary.display).toBe('(279) 529-8754');
    expect(BUSINESS.phones.primary.href).toBe('tel:+12795298754');
    expect(BUSINESS.phones.secondary.display).toBe('(916) 759-0383');
  });

  it('only mentions the old number in the config and the Contact direct-contact panel', () => {
    expect(sourceFiles('src').length).toBeGreaterThan(50);
    const offenders = sourceFiles('src')
      .filter((file) => !file.endsWith('.spec.ts'))
      .filter((file) => !ALLOWED.some((allowed) => file.endsWith(allowed)))
      .filter((file) => {
        const content = readFileSync(file, 'utf8');
        return OLD_PHONE_PATTERNS.some((pattern) => pattern.test(content));
      });
    expect(offenders).toEqual([]);
  });
});
