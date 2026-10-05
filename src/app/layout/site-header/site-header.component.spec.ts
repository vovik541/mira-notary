import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { SiteHeaderComponent } from './site-header.component';

describe('SiteHeaderComponent', () => {
  let fixture: ComponentFixture<SiteHeaderComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteHeaderComponent],
      providers: [provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();
    fixture = TestBed.createComponent(SiteHeaderComponent);
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  const el = (): HTMLElement => fixture.nativeElement;
  const q = <T extends HTMLElement>(selector: string): T => el().querySelector(selector) as T;

  it('links the Services label to /services and lists all four service pages', () => {
    const services = Array.from(el().querySelectorAll('.desktop-nav a')).find(
      (a) => a.textContent?.trim() === 'Services',
    );
    expect(services?.getAttribute('href')).toBe('/services');
    const hrefs = Array.from(el().querySelectorAll('#services-menu a')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toEqual([
      '/services/mobile-notary',
      '/services/loan-signing',
      '/services/apostille',
      '/services/translation',
    ]);
  });

  it('toggles the services dropdown with aria-expanded and closes on Escape', () => {
    const toggle = q<HTMLButtonElement>('.dropdown-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(q('#services-menu').classList.contains('open')).toBe(true);

    el().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the mobile menu with a real button and closes it after navigation', async () => {
    const button = q<HTMLButtonElement>('.menu-button');
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(q('#mobile-menu').classList.contains('open')).toBe(true);

    await router.navigateByUrl('/pricing');
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(q('#mobile-menu').classList.contains('open')).toBe(false);
  });
});
