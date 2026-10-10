import { INDEXABLE_PAGES } from '../seo/seo-pages';
import { canonicalUrl } from '../seo/site-url';
import { SITE, TURNSTILE_DEV_SITE_KEY, turnstileSiteKeyFor } from './site.config';

describe('SITE (production domain)', () => {
  it('is https://miranotary.com — canonical, non-www, no trailing slash', () => {
    expect(SITE.url).toBe('https://miranotary.com');
    expect(SITE.url).not.toMatch(/www\.|workers\.dev|localhost|\/$/);
  });

  it('every canonical URL is built on it', () => {
    expect(canonicalUrl(SITE.url, '/')).toBe('https://miranotary.com');
    expect(canonicalUrl(SITE.url, '/services/mobile-notary')).toBe(
      'https://miranotary.com/services/mobile-notary',
    );
    expect(canonicalUrl(SITE.url, '/contact?service=apostille')).toBe(
      'https://miranotary.com/contact',
    );
    for (const page of INDEXABLE_PAGES) {
      expect(canonicalUrl(SITE.url, page.path)).toMatch(/^https:\/\/miranotary\.com(\/[a-z-/]+)?$/);
    }
  });
});

describe('Turnstile site key policy', () => {
  it('uses the official dummy key on localhost and local Wrangler', () => {
    for (const host of ['localhost', 'LOCALHOST', '127.0.0.1', '[::1]', 'dev.localhost']) {
      expect(turnstileSiteKeyFor(host), host).toBe('1x00000000000000000000AA');
    }
    expect(TURNSTILE_DEV_SITE_KEY).toBe('1x00000000000000000000AA');
  });

  it("uses Mira's production key only on the production host", () => {
    expect(turnstileSiteKeyFor('miranotary.com')).toBe(SITE.turnstileSiteKey);
    expect(turnstileSiteKeyFor('MiraNotary.com')).toBe(SITE.turnstileSiteKey);
  });

  it('does NOT treat any other hostname as production (fails safe with an empty key)', () => {
    for (const host of [
      'unknown.example.com',
      'www.miranotary.com', // not an explicitly supported hostname
      'miranotary.com.evil.example',
      'evilmiranotary.com',
      'mira-notary.account.workers.dev',
      'abcd1234-mira-notary.account.workers.dev',
      'localhost.evil.example',
      'notlocalhost.com',
    ]) {
      expect(turnstileSiteKeyFor(host), host).toBe('');
    }
  });

  it('an unknown or missing hostname yields no key', () => {
    for (const host of [undefined, null, '']) {
      expect(turnstileSiteKeyFor(host)).toBe('');
    }
  });

  it('the production key is a real public key, not the dummy or a secret', () => {
    expect(SITE.turnstileSiteKey).toMatch(/^0x4[A-Za-z0-9_-]{15,40}$/);
    expect(SITE.turnstileSiteKey).not.toBe(TURNSTILE_DEV_SITE_KEY);
    expect(JSON.stringify(SITE)).not.toMatch(/secret/i);
  });
});
