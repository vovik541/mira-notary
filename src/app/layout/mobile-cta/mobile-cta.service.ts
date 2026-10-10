import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, NavigationStart, Router } from '@angular/router';

export type MobileCtaMarker = 'start' | 'blocker';

/**
 * Observer margins. The bottom margin is the height of the sticky bar (+ safe area): a CTA block only
 * counts as "visible" once it is above the bar, so the bar never sits on top of a block that is
 * being read, and a block grazing the edge cannot make the bar flicker.
 */
export const MOBILE_CTA_ROOT_MARGIN = '0px 0px -88px 0px';

/**
 * Single, central visibility strategy for the global mobile CTA bar.
 *
 *   visible = routeAllowed AND not typing AND the page's start area is out of view AND no CTA
 *             blocker is in view
 *
 * Pages mark elements with `appMobileCtaStart` (the first area / hero) and `appMobileCtaBlocker`
 * (any Call / Text / Book block, the ZIP checker, the footer). Routes opt out with
 * `data: { mobileCta: false }`. Newly registered elements count as visible until the observer
 * reports, so nothing flashes on navigation.
 */
@Injectable({ providedIn: 'root' })
export class MobileCtaService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly router = inject(Router);

  private readonly marks = new Map<Element, { kind: MobileCtaMarker; visible: boolean }>();
  private observer: IntersectionObserver | null = null;

  private readonly routeAllowed = signal(false);
  private readonly typing = signal(false);
  private readonly startTotal = signal(0);
  private readonly startVisible = signal(0);
  private readonly blockersVisible = signal(0);

  readonly visible = computed(
    () =>
      this.routeAllowed() &&
      !this.typing() &&
      this.startTotal() > 0 &&
      this.startVisible() === 0 &&
      this.blockersVisible() === 0,
  );

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    // Hidden from the very start of a navigation until the new route says it is allowed.
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.routeAllowed.set(false);
      } else if (event instanceof NavigationEnd) {
        this.routeAllowed.set(this.routeData(this.router.routerState.snapshot.root) !== false);
      }
    });
    // A mobile keyboard / active form control must never share the screen with the bar.
    const isField = (target: EventTarget | null): boolean =>
      target instanceof HTMLElement && target.matches('input, select, textarea');
    document.addEventListener('focusin', (event) => this.typing.set(isField(event.target)));
    document.addEventListener('focusout', () => this.typing.set(false));
  }

  /** Registers an element; returns the function that unregisters it. No-op on the server. */
  register(element: Element, kind: MobileCtaMarker): () => void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      return () => undefined;
    }
    this.marks.set(element, { kind, visible: true });
    this.getObserver().observe(element);
    this.recount();
    return () => {
      this.observer?.unobserve(element);
      this.marks.delete(element);
      this.recount();
    };
  }

  private getObserver(): IntersectionObserver {
    this.observer ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const mark = this.marks.get(entry.target);
          if (mark) {
            mark.visible = entry.isIntersecting;
          }
        }
        this.recount();
      },
      { rootMargin: MOBILE_CTA_ROOT_MARGIN, threshold: 0 },
    );
    return this.observer;
  }

  private recount(): void {
    let startTotal = 0;
    let startVisible = 0;
    let blockersVisible = 0;
    for (const mark of this.marks.values()) {
      if (mark.kind === 'start') {
        startTotal += 1;
        startVisible += mark.visible ? 1 : 0;
      } else if (mark.visible) {
        blockersVisible += 1;
      }
    }
    this.startTotal.set(startTotal);
    this.startVisible.set(startVisible);
    this.blockersVisible.set(blockersVisible);
  }

  private routeData(snapshot: ActivatedRouteSnapshot): unknown {
    let current: ActivatedRouteSnapshot | null = snapshot;
    let value: unknown;
    while (current) {
      if ('mobileCta' in current.data) {
        value = current.data['mobileCta'];
      }
      current = current.firstChild;
    }
    return value;
  }
}
