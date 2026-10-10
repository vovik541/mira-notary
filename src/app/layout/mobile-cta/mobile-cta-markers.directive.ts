import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { MobileCtaMarker, MobileCtaService } from './mobile-cta.service';

function mark(kind: MobileCtaMarker): void {
  const element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  const off = inject(MobileCtaService).register(element, kind);
  inject(DestroyRef).onDestroy(off);
}

/** A Call / Text / Book block (CTA band, ZIP checker, footer): while it is in view the bar hides. */
@Directive({ selector: '[appMobileCtaBlocker]' })
export class MobileCtaBlockerDirective {
  constructor() {
    mark('blocker');
  }
}

/** The page's first area (hero): the bar stays hidden until the visitor has moved past it. */
@Directive({ selector: '[appMobileCtaStart]' })
export class MobileCtaStartDirective {
  constructor() {
    mark('start');
  }
}
