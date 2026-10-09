import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StructuredDataService } from '../../core/seo/structured-data.service';
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

  it('emits FAQPage structured data from the same ten items', () => {
    const schema = TestBed.inject(StructuredDataService).faqSchema() as {
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(schema.mainEntity).toHaveLength(10);
    schema.mainEntity.forEach((entry, i) => {
      expect(entry.name).toBe(FAQ_ITEMS[i].question);
      expect(entry.acceptedAnswer.text).toBe(FAQ_ITEMS[i].answer);
    });
  });
});
