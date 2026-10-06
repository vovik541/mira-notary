import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LoanSigningComponent } from './loan-signing.component';

describe('LoanSigningComponent NNA profile link', () => {
  it('links to the NNA signing agent profile in a new tab, near the credentials', () => {
    TestBed.configureTestingModule({
      imports: [LoanSigningComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LoanSigningComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const link = Array.from(el.querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Verify NNA Signing Agent Profile'),
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://www.signingagent.com/profile/160327553');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    expect(link.textContent).not.toContain('https://');
    expect(link.closest('app-credential-list')).not.toBeNull();
    expect(el.textContent).not.toMatch(/government/i);
  });
});

describe('LoanSigningComponent services checklist', () => {
  const render = (): HTMLElement => {
    TestBed.configureTestingModule({
      imports: [LoanSigningComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(LoanSigningComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('lists the six signing types as compact checklist items without descriptions or cards', () => {
    const el = render();
    const section = el.querySelector('section[aria-labelledby="loan-heading"]') as HTMLElement;
    const primary = Array.from(section.querySelectorAll('.primary-list li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(primary).toEqual([
      'Buyer Packages',
      'Seller Packages',
      'Refinance',
      'HELOC',
      'Reverse Mortgage',
      'Loan Modification',
    ]);
    expect(section.querySelector('.card')).toBeNull();
    expect(section.textContent).not.toContain('Signing support for');
    expect(section.querySelectorAll('.primary-list app-icon')).toHaveLength(6);
  });

  it('shows Additional Signing Support as a compact secondary list', () => {
    const el = render();
    const support = Array.from(el.querySelectorAll('.support-list li')).map((li) =>
      li.textContent?.trim(),
    );
    expect(el.querySelector('.support h3')?.textContent).toBe('Additional Signing Support');
    expect(support).toEqual(['Scanbacks', 'Courier Drop-Offs']);
  });
});
