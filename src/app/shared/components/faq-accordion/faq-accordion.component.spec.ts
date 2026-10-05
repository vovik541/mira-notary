import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FaqAccordionComponent } from './faq-accordion.component';

describe('FaqAccordionComponent', () => {
  let fixture: ComponentFixture<FaqAccordionComponent>;
  let buttons: HTMLButtonElement[];

  const items = [
    { question: 'Q1?', answer: 'A1' },
    { question: 'Q2?', answer: 'A2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [FaqAccordionComponent] }).compileComponents();
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
});
