import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MobileCtaStartDirective } from '../../layout/mobile-cta/mobile-cta-markers.directive';
import { RouterLink } from '@angular/router';
import { BUSINESS } from '../../core/config/business.config';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-about',
  imports: [RouterLink, IconComponent, MobileCtaStartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss',
})
export class AboutComponent {
  protected readonly business = BUSINESS;
  protected readonly credentials = [
    'California Notary Public',
    `Commission #${BUSINESS.commissionNumber}`,
    'NNA Certified Signing Agent',
    'Background Screened',
    '$1M E&O Insurance',
  ];
}
