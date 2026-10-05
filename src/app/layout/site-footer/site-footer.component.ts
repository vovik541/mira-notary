import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS, EMAIL_HREF, LANGUAGES_LABEL } from '../../core/config/business.config';
import { SERVICE_LINKS } from '../../data/navigation.data';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.component.html',
  styleUrl: './site-footer.component.scss',
})
export class SiteFooterComponent {
  protected readonly business = BUSINESS;
  protected readonly emailHref = EMAIL_HREF;
  protected readonly languages = LANGUAGES_LABEL;
  protected readonly serviceLinks = SERVICE_LINKS;
}
