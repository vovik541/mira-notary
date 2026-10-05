import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { BUSINESS } from '../../core/config/business.config';
import {
  MAIN_NAV,
  MOBILE_NAV_PRIMARY,
  MOBILE_NAV_SECONDARY,
  SERVICE_LINKS,
} from '../../data/navigation.data';
import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive, BrandLogoComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-header.component.html',
  styleUrl: './site-header.component.scss',
})
export class SiteHeaderComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly serviceLinks = SERVICE_LINKS;
  protected readonly mainNav = MAIN_NAV;
  protected readonly mobilePrimary = MOBILE_NAV_PRIMARY;
  protected readonly mobileSecondary = MOBILE_NAV_SECONDARY;

  protected readonly mobileOpen = signal(false);
  protected readonly servicesOpen = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');
  private readonly servicesToggle = viewChild<ElementRef<HTMLButtonElement>>('servicesToggle');

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.closeAll());
  }

  protected toggleMobile(): void {
    this.mobileOpen.update((open) => !open);
  }

  protected toggleServices(): void {
    this.servicesOpen.update((open) => !open);
  }

  protected openServices(): void {
    this.servicesOpen.set(true);
  }

  protected closeServices(): void {
    this.servicesOpen.set(false);
  }

  /** Closes the dropdown when keyboard focus moves outside of it. */
  protected onServicesFocusOut(event: FocusEvent, dropdown: HTMLElement): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !dropdown.contains(next)) {
      this.closeServices();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (
      this.servicesOpen() &&
      !this.host.nativeElement.querySelector('.dropdown')?.contains(event.target as Node)
    ) {
      this.closeServices();
    }
  }

  @HostListener('keydown.escape')
  protected onEscape(): void {
    if (this.servicesOpen()) {
      this.closeServices();
      this.servicesToggle()?.nativeElement.focus();
    } else if (this.mobileOpen()) {
      this.mobileOpen.set(false);
      this.menuButton()?.nativeElement.focus();
    }
  }

  private closeAll(): void {
    this.mobileOpen.set(false);
    this.servicesOpen.set(false);
  }
}
