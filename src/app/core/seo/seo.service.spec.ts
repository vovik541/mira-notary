import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { SeoService } from './seo.service';

describe('SeoService', () => {
  let seo: SeoService;
  let title: Title;
  let meta: Meta;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    seo = TestBed.inject(SeoService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
  });

  it('applies title and description', () => {
    seo.apply({ title: 'Test Title', description: 'Test description' }, '/about');
    expect(title.getTitle()).toBe('Test Title');
    expect(meta.getTag('name="description"')?.content).toBe('Test description');
    expect(meta.getTag('name="robots"')?.content).toBe('index, follow');
  });

  it('marks noindex pages', () => {
    seo.apply({ title: 'Not found', description: 'x', noindex: true }, '/nope');
    expect(meta.getTag('name="robots"')?.content).toBe('noindex, follow');
  });

  it('does not invent a canonical URL while no site URL is configured', () => {
    expect(seo.canonicalUrl('/about')).toBeNull();
    seo.apply({ title: 't', description: 'd' }, '/about');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(meta.getTag('property="og:url"')).toBeNull();
  });
});
