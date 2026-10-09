import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { FAQ_ITEMS, HOME_FAQ_IDS, faqSegments, selectFaqItems } from './faq.data';
import { PAYMENT_METHODS } from './pricing.data';

const byId = (id: string) => FAQ_ITEMS.find((item) => item.id === id)!;

describe('FAQ_ITEMS', () => {
  it('has exactly the ten approved questions, in order', () => {
    expect(FAQ_ITEMS.map((item) => item.question)).toEqual([
      'What should I bring to my notary appointment?',
      'Does Mira travel to my location?',
      'Can I request a same-day appointment?',
      'What are your service hours?',
      'How much does a mobile notary appointment cost?',
      'How can I pay?',
      'What languages does Mira speak?',
      'Can a notary notarize a foreign-language document?',
      'How long does a California apostille take?',
      'Do I need the original document for an apostille?',
    ]);
    expect(FAQ_ITEMS.map((item) => item.id)).toEqual([
      'bring-to-appointment',
      'service-area',
      'same-day',
      'service-hours',
      'pricing',
      'payment-methods',
      'languages',
      'foreign-language-document',
      'apostille-timing',
      'apostille-original-document',
    ]);
  });

  it('has unique ids and questions, and none of the merged or removed questions', () => {
    expect(new Set(FAQ_ITEMS.map((item) => item.id)).size).toBe(10);
    expect(new Set(FAQ_ITEMS.map((item) => item.question)).size).toBe(10);
    const questions = FAQ_ITEMS.map((item) => item.question).join('\n');
    expect(questions).not.toMatch(/request apostille or document translation/i);
    expect(questions).not.toMatch(/what id do i need/i);
    expect(questions).not.toMatch(/what areas do you cover/i);
    expect(questions).not.toMatch(/ukrainian or russian/i);
  });

  it('answers the ID question inside "what should I bring"', () => {
    expect(byId('bring-to-appointment').answer).toContain('government-issued photo ID');
  });

  it('does not duplicate the service-area list (no city names or ZIP codes)', () => {
    const answer = byId('service-area').answer;
    for (const community of ['Roseville', 'Rocklin', 'Loomis', 'Davis', 'El Dorado Hills']) {
      expect(answer).not.toContain(community);
    }
    expect(answer).not.toMatch(/\b9\d{4}\b/);
  });

  it('uses the primary phone number and tel link, never the old one', () => {
    for (const id of ['same-day', 'service-hours']) {
      const item = byId(id);
      expect(item.answer).toContain('(279) 529-8754');
      expect(item.links).toContainEqual({ text: '(279) 529-8754', href: 'tel:+12795298754' });
    }
    expect(JSON.stringify(FAQ_ITEMS)).not.toMatch(/916|759-0383/);
  });

  it('keeps same-day phone-only and Sunday availability non-guaranteed', () => {
    const sameDay = byId('same-day').answer;
    expect(sameDay).toContain('must be booked by phone');
    expect(sameDay).not.toMatch(/form|online|website|submit|request form/i);

    const hours = byId('service-hours').answer;
    expect(hours).toContain('Monday through Saturday');
    expect(hours).toContain('Sunday appointments may be available for urgent requests');
    expect(hours).toContain('arranged by phone');
    expect(hours).not.toMatch(/24\/7|guarantee|every sunday/i);
  });

  it('lists the current payment methods and no card / check wording', () => {
    expect(byId('payment-methods').answer).toBe('Mira accepts Zelle, Cash App, Venmo, and cash.');
    expect(PAYMENT_METHODS).toEqual(['Zelle', 'Cash App', 'Venmo', 'Cash']);
    for (const text of [byId('payment-methods').answer, ...PAYMENT_METHODS]) {
      expect(text).not.toMatch(/check|visa|mastercard|american express|credit|debit/i);
    }
  });

  it('keeps the foreign-language and language answers conservative', () => {
    const foreign = byId('foreign-language-document').answer;
    expect(foreign).toContain('communicate directly with the signer');
    expect(foreign).toContain('the document must appear complete');
    expect(foreign).not.toMatch(/interpreter|every|any document/i);

    const languages = byId('languages').answer;
    expect(languages).toContain('may be able to refer you');
    expect(languages).not.toMatch(/interpreter|guarantee/i);
  });

  it('describes the apostille answers without fixed times or "Central California"', () => {
    const timing = byId('apostille-timing').answer;
    expect(timing).not.toMatch(
      /Central California|\d+\s*(business\s*)?(days?|hours?|weeks?)|same-day/i,
    );
    const original = byId('apostille-original-document').answer;
    expect(original.startsWith('It depends on the document.')).toBe(true);
    expect(original).not.toMatch(/always required/i);
    expect(JSON.stringify(FAQ_ITEMS)).not.toContain('Central California');
  });

  it('links Service Area, Pricing and translation to internal pages', () => {
    expect(byId('service-area').links).toEqual([
      { text: 'Service Area page', href: '/service-area' },
    ]);
    expect(byId('pricing').links).toEqual([{ text: 'Pricing page', href: '/pricing' }]);
    expect(byId('foreign-language-document').links).toEqual([
      { text: 'translation services', href: '/services/translation' },
    ]);
  });
});

describe('Home FAQ selection', () => {
  it('is exactly service-area, same-day, pricing — the very same shared objects', () => {
    expect(HOME_FAQ_IDS).toEqual(['service-area', 'same-day', 'pricing']);
    const selected = selectFaqItems(HOME_FAQ_IDS);
    expect(selected).toHaveLength(3);
    expect(selected[0]).toBe(byId('service-area'));
    expect(selected[1]).toBe(byId('same-day'));
    expect(selected[2]).toBe(byId('pricing'));
    expect(selected.map((item) => item.id)).not.toContain('bring-to-appointment');
  });
});

describe('faqSegments', () => {
  it('splits an answer into text and link segments that rebuild the original text', () => {
    for (const item of FAQ_ITEMS) {
      const segments = faqSegments(item);
      expect(segments.map((segment) => segment.text).join('')).toBe(item.answer);
      expect(segments.filter((segment) => segment.href)).toHaveLength(item.links?.length ?? 0);
    }
  });
});

describe('production-facing payment copy', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        return sourceFiles(path);
      }
      return /\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts') ? [path] : [];
    });
  }

  it('no longer mentions cards or checks as accepted payment anywhere in src/', () => {
    const offenders = sourceFiles('src').filter((file) =>
      /Mastercard|American Express|\bVisa\b|'Check'/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
