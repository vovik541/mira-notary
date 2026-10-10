import { TestBed } from '@angular/core/testing';
import { SEO_PAGES } from './seo-pages';
import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;

  beforeEach(() => {
    service = TestBed.inject(StructuredDataService);
  });

  afterEach(() => {
    service.remove('test');
    service.remove('page');
  });

  it('writes and replaces a single JSON-LD script per id', () => {
    service.set('test', { '@type': 'Thing', name: 'A' });
    service.set('test', { '@type': 'Thing', name: 'B' });
    const scripts = document.head.querySelectorAll('script#ld-test');
    expect(scripts.length).toBe(1);
    expect(JSON.parse(scripts[0].textContent ?? '{}').name).toBe('B');
  });

  it('escapes "<" so the payload cannot close the script element', () => {
    service.set('test', { name: '</script><b>' });
    expect(document.getElementById('ld-test')?.textContent).not.toContain('</script>');
  });

  it('applyPage writes the page graph and removes it for pages without structured data', () => {
    service.applyPage(SEO_PAGES.home);
    const graph = JSON.parse(document.getElementById('ld-page')?.textContent ?? '{}');
    expect(graph['@graph'].map((n: { '@type': string }) => n['@type'])).toContain('Organization');
    service.applyPage(SEO_PAGES.pricing);
    expect(document.getElementById('ld-page')).toBeNull();
  });
});
