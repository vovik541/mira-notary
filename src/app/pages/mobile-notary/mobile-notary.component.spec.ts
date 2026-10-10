import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MobileNotaryComponent } from './mobile-notary.component';

describe('MobileNotaryComponent travel fee', () => {
  it('shows ~$50 for the Sacramento travel fee and the location-dependent note', () => {
    TestBed.configureTestingModule({
      imports: [MobileNotaryComponent],
      providers: [provideRouter([])],
    });
    const fixture = TestBed.createComponent(MobileNotaryComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const text = el.textContent ?? '';
    expect(text).toMatch(/Sacramento Travel Fee[\s\S]{0,40}~\$50/);
    expect(text).not.toMatch(/Sacramento Travel Fee[\s\S]{0,40}\$70/);
    expect(el.querySelector('.fee-note')?.textContent?.trim()).toBe(
      'Travel fees may vary based on the meeting location. Mira & Team will confirm the applicable travel fee before the appointment.',
    );
  });
});
