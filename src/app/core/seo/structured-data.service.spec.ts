import { TestBed } from '@angular/core/testing';
import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;

  beforeEach(() => {
    service = TestBed.inject(StructuredDataService);
  });

  afterEach(() => {
    service.remove('test');
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

  it('business schema contains only verified facts', () => {
    const schema = service.businessSchema();
    expect(schema['telephone']).toBe('+19167590383');
    expect(schema['email']).toBe('MiraNotary@gmail.com');
    expect(schema).not.toHaveProperty('address');
    expect(schema).not.toHaveProperty('openingHours');
    expect(schema).not.toHaveProperty('priceRange');
    expect(schema).not.toHaveProperty('geo');
  });
});
