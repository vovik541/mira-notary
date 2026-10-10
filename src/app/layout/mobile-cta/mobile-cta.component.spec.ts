import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavigationStart, Router, provideRouter } from '@angular/router';
import { MobileCtaBlockerDirective, MobileCtaStartDirective } from './mobile-cta-markers.directive';
import { MobileCtaComponent } from './mobile-cta.component';
import { MOBILE_CTA_ROOT_MARGIN } from './mobile-cta.service';

/** Minimal IntersectionObserver double: tests decide when an element is in or out of view. */
class FakeObserver {
  static instances: FakeObserver[] = [];
  readonly targets = new Set<Element>();
  constructor(
    private readonly callback: IntersectionObserverCallback,
    readonly options?: IntersectionObserverInit,
  ) {
    FakeObserver.instances.push(this);
  }
  observe(target: Element): void {
    this.targets.add(target);
  }
  unobserve(target: Element): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.targets.clear();
  }
  report(target: Element, isIntersecting: boolean): void {
    this.callback([{ target, isIntersecting } as IntersectionObserverEntry], this as never);
  }
}

@Component({
  selector: 'app-page',
  imports: [MobileCtaStartDirective, MobileCtaBlockerDirective, MobileCtaComponent],
  template: `
    <div id="hero" appMobileCtaStart>hero with its own Book / Call / Text</div>
    <div id="cta-1" appMobileCtaBlocker>CTA band</div>
    <div id="cta-2" appMobileCtaBlocker>ZIP checker</div>
    <input id="zip" />
    <app-mobile-cta />
  `,
})
class PageComponent {}

@Component({ template: '' })
class EmptyComponent {}

const view = (id: string, visible: boolean): void => {
  FakeObserver.instances[0].report(document.getElementById(id) as Element, visible);
};

describe('MobileCtaComponent (context-aware visibility)', () => {
  let fixture: ComponentFixture<PageComponent>;
  const host = (): HTMLElement => fixture.nativeElement.querySelector('app-mobile-cta');
  const shown = (): boolean => {
    fixture.detectChanges();
    return host().classList.contains('visible');
  };
  const go = async (url: string): Promise<void> => {
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
  };
  /** Everything reported out of view: the "reading content" state on an allowed route. */
  const scrolledIntoContent = (): void => {
    view('hero', false);
    view('cta-1', false);
    view('cta-2', false);
  };

  beforeEach(async () => {
    FakeObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeObserver);
    await TestBed.configureTestingModule({
      imports: [PageComponent],
      providers: [
        provideRouter([
          { path: '', component: EmptyComponent },
          { path: 'pricing', component: EmptyComponent },
          { path: 'contact', component: EmptyComponent, data: { mobileCta: false } },
          { path: '**', component: EmptyComponent, data: { mobileCta: false } },
        ]),
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PageComponent);
    fixture.detectChanges();
    await go('/');
  });
  afterEach(() => vi.unstubAllGlobals());

  describe('initial state and the start area', () => {
    it('is hidden (and inert) at first paint, before anything has been observed', () => {
      expect(shown()).toBe(false);
      expect(host().hasAttribute('inert')).toBe(true);
    });

    it('stays hidden while the hero (with its own Book / Call / Text) is in view', () => {
      view('hero', true);
      view('cta-1', false);
      view('cta-2', false);
      expect(shown()).toBe(false);
    });

    it('appears once the hero is behind the visitor and no CTA block is in view', () => {
      scrolledIntoContent();
      expect(shown()).toBe(true);
      expect(host().hasAttribute('inert')).toBe(false);
    });

    it('hides again when the visitor scrolls back up to the hero', () => {
      scrolledIntoContent();
      view('hero', true);
      expect(shown()).toBe(false);
    });

    it('never appears on a page without a start area (fail-safe)', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [MobileCtaComponent],
        providers: [provideRouter([])],
      });
      const bare = TestBed.createComponent(MobileCtaComponent);
      bare.detectChanges();
      expect(bare.nativeElement.classList.contains('visible')).toBe(false);
    });
  });

  describe('CTA blockers', () => {
    it('a blocker entering the viewport hides the bar; leaving it allows the bar again', () => {
      scrolledIntoContent();
      view('cta-1', true);
      expect(shown()).toBe(false);
      view('cta-1', false);
      expect(shown()).toBe(true);
    });

    it('several blockers at once: the bar stays hidden until the last one has left', () => {
      scrolledIntoContent();
      view('cta-1', true);
      view('cta-2', true);
      expect(shown()).toBe(false);
      view('cta-1', false);
      expect(shown()).toBe(false);
      view('cta-2', false);
      expect(shown()).toBe(true);
    });

    it('observes with a margin equal to the bar height so edge-grazing blocks cannot flicker it', () => {
      expect(FakeObserver.instances[0].options?.rootMargin).toBe(MOBILE_CTA_ROOT_MARGIN);
      expect(MOBILE_CTA_ROOT_MARGIN).toBe('0px 0px -88px 0px');
    });
  });

  describe('routes', () => {
    it.each(['/contact', '/definitely-not-a-page'])(
      '%s never shows the bar, whatever is in view',
      async (url) => {
        scrolledIntoContent();
        expect(shown()).toBe(true);
        await go(url);
        expect(shown()).toBe(false);
        view('hero', false);
        view('cta-1', false);
        expect(shown()).toBe(false);
      },
    );

    it('does not flash while navigating to a disabled route', async () => {
      scrolledIntoContent();
      expect(shown()).toBe(true);
      const seen: boolean[] = [];
      TestBed.inject(Router).events.subscribe(() => {
        fixture.detectChanges();
        seen.push(host().classList.contains('visible'));
      });
      await go('/contact');
      expect(seen.length).toBeGreaterThan(1);
      expect(seen.every((value) => value === false)).toBe(true);
    });

    it('is hidden from NavigationStart on and recalculated when the next route allows it', async () => {
      scrolledIntoContent();
      let atStart: boolean | null = null;
      TestBed.inject(Router).events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          fixture.detectChanges();
          atStart = host().classList.contains('visible');
        }
      });
      await go('/pricing');
      expect(atStart).toBe(false);
      expect(shown()).toBe(true); // /pricing allows it and nothing is in view
    });

    it('coming back from a disabled route allows the bar again', async () => {
      scrolledIntoContent();
      await go('/contact');
      expect(shown()).toBe(false);
      await go('/');
      expect(shown()).toBe(true);
    });
  });

  describe('form controls, focus and links', () => {
    it('hides while a form control has focus (mobile keyboard) and returns when it loses it', () => {
      scrolledIntoContent();
      const zip = document.getElementById('zip') as HTMLInputElement;
      zip.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(shown()).toBe(false);
      zip.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      expect(shown()).toBe(true);
    });

    it('never steals or drops keyboard focus: a focused bar link keeps the bar open', () => {
      scrolledIntoContent();
      const call = host().querySelector('a[href^="tel:"]') as HTMLAnchorElement;
      call.focus();
      expect(document.activeElement).toBe(call);
      view('cta-1', true); // a CTA block scrolls into view while the link has focus
      expect(shown()).toBe(true);
      expect(document.activeElement).toBe(call);
      call.blur();
      expect(shown()).toBe(false);
    });

    it('keeps real Call (tel:), Text (sms:) and Book (/contact) actions with explicit labels', () => {
      const links = Array.from(host().querySelectorAll('a'));
      expect(links.map((a) => a.getAttribute('href'))).toEqual([
        'tel:+12795298754',
        'sms:+12795298754',
        '/contact',
      ]);
      expect(links[0].getAttribute('aria-label')).toBe('Call Mira & Team at (279) 529-8754');
      expect(links[1].getAttribute('aria-label')).toBe('Text Mira & Team at (279) 529-8754');
      expect(links[2].textContent?.trim()).toBe('Book Appointment');
    });
  });
});
