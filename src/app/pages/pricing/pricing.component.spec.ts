import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PricingComponent } from './pricing.component';

describe('PricingComponent payment methods', () => {
  it('lists Zelle, Cash App, Venmo and cash only', () => {
    TestBed.configureTestingModule({ imports: [PricingComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(PricingComponent);
    fixture.detectChanges();
    const methods = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.methods li'),
    ).map((li) => li.textContent?.trim());
    expect(methods).toEqual(['Zelle', 'Cash App', 'Venmo', 'Cash']);
  });
});
