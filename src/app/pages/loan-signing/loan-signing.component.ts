import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BUSINESS, EXTERNAL_LINKS } from '../../core/config/business.config';
import {
  ADDITIONAL_SIGNING_SUPPORT,
  LOAN_SIGNING_ITEMS,
  MOBILE_OFFICE_ITEMS,
} from '../../data/services.data';
import { CheckListComponent } from '../../shared/components/check-list/check-list.component';
import { CredentialListComponent } from '../../shared/components/credential-list/credential-list.component';
import { CtaBandComponent } from '../../shared/components/cta-band/cta-band.component';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { SectionHeaderComponent } from '../../shared/components/section-header/section-header.component';

@Component({
  selector: 'app-loan-signing',
  imports: [
    RouterLink,
    CheckListComponent,
    CredentialListComponent,
    CtaBandComponent,
    IconComponent,
    PageHeroComponent,
    SectionHeaderComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './loan-signing.component.html',
  styleUrl: './loan-signing.component.scss',
})
export class LoanSigningComponent {
  protected readonly phone = BUSINESS.phones.primary;
  protected readonly nnaProfileUrl = EXTERNAL_LINKS.nnaSigningAgentProfile;
  protected readonly items = LOAN_SIGNING_ITEMS;
  protected readonly support = ADDITIONAL_SIGNING_SUPPORT;
  protected readonly officeItems = MOBILE_OFFICE_ITEMS;
  protected readonly credentialItems = [
    'NNA Certified Signing Agent',
    'Background Screened',
    '$1M E&O Insurance',
    'Mobile Printer & Scanner',
  ];
}
