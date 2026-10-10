import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FAQ_ITEMS } from '../../data/faq.data';
import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  it('renders all ten FAQ items from the shared dataset', () => {
    TestBed.configureTestingModule({ imports: [FaqComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(FaqComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const questions = Array.from(el.querySelectorAll('button.trigger')).map((b) =>
      b.textContent?.trim(),
    );
    expect(questions).toEqual(FAQ_ITEMS.map((item) => item.question));
    expect(questions).toHaveLength(10);
  });

  it('adds no structured data of its own (FAQ rich results no longer exist)', () => {
    TestBed.configureTestingModule({ imports: [FaqComponent], providers: [provideRouter([])] });
    TestBed.createComponent(FaqComponent).detectChanges();
    expect(document.getElementById('ld-faq')).toBeNull();
  });
});
