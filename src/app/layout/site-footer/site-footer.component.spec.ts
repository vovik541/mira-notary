import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { organizationSchema } from '../../core/seo/structured-data';
import { SiteFooterComponent } from './site-footer.component';

function render(): HTMLElement {
  TestBed.configureTestingModule({
    imports: [SiteFooterComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(SiteFooterComponent);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('SiteFooterComponent development credit', () => {
  it('shows the subtle credit with only "ReIskra" as the link', () => {
    const credit = render().querySelector('.credit') as HTMLElement;
    expect(credit.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Website by ReIskra — Volodymyr Khymych',
    );
    const links = credit.querySelectorAll('a');
    expect(links).toHaveLength(1);
    expect(links[0].textContent?.trim()).toBe('ReIskra');
  });

  it('links to ReIskra in a new tab as a sponsored, opener-safe link that keeps the referrer', () => {
    const link = render().querySelector('.credit a') as HTMLAnchorElement;
    // /ref/mira-notary returned 404 on 2026-10-12; switch once the ReIskra route exists.
    expect(link.getAttribute('href')).toBe('https://reiskra.com/');
    expect(link.getAttribute('href')).not.toContain('utm_');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener sponsored');
    expect(link.getAttribute('rel')).not.toMatch(/noreferrer|nofollow/);
    expect(link.hasAttribute('aria-label')).toBe(false);
  });

  it('comes after the Mira disclaimer, the last thing in the footer', () => {
    const container = render().querySelector('.container') as HTMLElement;
    const last = container.lastElementChild as HTMLElement;
    expect(last.classList.contains('credit')).toBe(true);
    expect((last.previousElementSibling as HTMLElement).classList.contains('disclaimer')).toBe(
      true,
    );
  });
});

describe('Organization structured data', () => {
  it('stays Mira’s business identity and never mentions ReIskra', () => {
    const org = organizationSchema('https://miranotary.com');
    expect(JSON.stringify(org)).not.toMatch(/reiskra|khymych/i);
    expect(org['name']).toBe('Local Notary Signings by Mira Derkach');
  });
});
