import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FAQ_ITEMS, FaqItem } from '../../../data/faq.data';
import { FaqAccordionComponent } from './faq-accordion.component';

describe('FaqAccordionComponent', () => {
  let fixture: ComponentFixture<FaqAccordionComponent>;
  let buttons: HTMLButtonElement[];

  const items: FaqItem[] = [
    { id: 'service-area', question: 'Q1?', answer: 'A1' },
    { id: 'same-day', question: 'Q2?', answer: 'A2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqAccordionComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(FaqAccordionComponent);
    fixture.componentRef.setInput('items', items);
    fixture.detectChanges();
    buttons = Array.from(fixture.nativeElement.querySelectorAll('button.trigger'));
  });

  const panels = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('.panel'));

  it('renders every answer in the DOM but keeps them collapsed initially', () => {
    expect(panels().length).toBe(2);
    expect(panels().every((p) => p.hidden)).toBe(true);
    expect(buttons.every((b) => b.getAttribute('aria-expanded') === 'false')).toBe(true);
  });

  it('opens one item at a time and toggles it closed again', () => {
    buttons[0].click();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true');
    expect(panels()[0].hidden).toBe(false);

    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[0].getAttribute('aria-expanded')).toBe('false');
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');

    buttons[1].click();
    fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
  });

  it('links each trigger to its panel', () => {
    const controls = buttons[0].getAttribute('aria-controls') as string;
    expect(fixture.nativeElement.querySelector(`#${controls}`)).toBe(panels()[0]);
  });

  describe('answers with links', () => {
    const full = (): ComponentFixture<FaqAccordionComponent> => {
      const f = TestBed.createComponent(FaqAccordionComponent);
      f.componentRef.setInput('items', FAQ_ITEMS);
      f.detectChanges();
      return f;
    };

    it('renders all ten answers and each answer text exactly (no stray spaces)', () => {
      const f = full();
      const answers = Array.from((f.nativeElement as HTMLElement).querySelectorAll('.panel p'));
      expect(answers).toHaveLength(10);
      answers.forEach((p, i) => {
        expect(p.textContent?.replace(/\s+/g, ' ').trim()).toBe(FAQ_ITEMS[i].answer);
      });
    });

    it('renders real internal and tel links with the right targets', () => {
      const f = full();
      const el = f.nativeElement as HTMLElement;
      const hrefs = Array.from(el.querySelectorAll('.panel a')).map((a) => a.getAttribute('href'));
      expect(hrefs).toEqual([
        '/service-area',
        'tel:+12795298754',
        'sms:+12795298754',
        'tel:+12795298754',
        'sms:+12795298754',
        '/pricing',
        '/services/translation',
      ]);
    });

    it('does not toggle the accordion when a link in an answer is clicked', () => {
      const f = full();
      const el = f.nativeElement as HTMLElement;
      const trigger = el.querySelector('button.trigger') as HTMLButtonElement;
      trigger.click();
      f.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      const link = el.querySelector('.panel a[href^="tel:"]') as HTMLAnchorElement;
      link.addEventListener('click', (event) => event.preventDefault());
      link.click();
      f.detectChanges();
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
    });

    it('keeps links inside the answer panel only (no nested interactive controls in the trigger)', () => {
      const f = full();
      const el = f.nativeElement as HTMLElement;
      expect(el.querySelectorAll('button.trigger a, button.trigger button')).toHaveLength(0);
    });
  });
});
