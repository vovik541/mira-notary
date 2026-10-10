import {
  canonicalUrl,
  isProductionHost,
  normalizeBase,
  normalizePath,
  productionHost,
} from './site-url';

describe('site-url', () => {
  it('normalizes the base origin (no trailing slash)', () => {
    expect(normalizeBase(' https://www.example.test/ ')).toBe('https://www.example.test');
    expect(normalizeBase('')).toBe('');
  });

  it('normalizes paths: no query, no hash, no trailing slash, leading slash', () => {
    expect(normalizePath('/contact?service=apostille')).toBe('/contact');
    expect(normalizePath('/contact?zip=95630#top')).toBe('/contact');
    expect(normalizePath('services/apostille/')).toBe('/services/apostille');
    expect(normalizePath('')).toBe('/');
  });

  it('builds canonical URLs only when a base is configured; home is the bare origin', () => {
    expect(canonicalUrl('', '/about')).toBeNull();
    expect(canonicalUrl('https://www.example.test', '/')).toBe('https://www.example.test');
    expect(canonicalUrl('https://www.example.test/', '/contact?service=apostille')).toBe(
      'https://www.example.test/contact',
    );
  });

  it('treats only the configured host as production (previews / workers.dev / unconfigured are not)', () => {
    expect(productionHost('https://www.example.test')).toBe('www.example.test');
    expect(isProductionHost('https://www.example.test', 'www.example.test')).toBe(true);
    expect(isProductionHost('https://www.example.test', 'WWW.EXAMPLE.TEST')).toBe(true);
    expect(isProductionHost('https://www.example.test', 'mira-notary.acct.workers.dev')).toBe(
      false,
    );
    expect(isProductionHost('https://www.example.test', 'example.test')).toBe(false);
    expect(isProductionHost('', 'www.example.test')).toBe(false);
  });
});
