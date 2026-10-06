import { REVIEWS } from './reviews.data';

describe('REVIEWS', () => {
  it('holds exactly five real Google reviews in the approved order', () => {
    expect(REVIEWS.map((review) => review.author)).toEqual([
      'Liudmyla Petruk',
      'Vasya K',
      'lara tessadri',
      'Alex Lubic',
      'Galina Izyurova',
    ]);
    for (const review of REVIEWS) {
      expect(review.rating).toBe(5);
      expect(review.source).toBe('Google Review');
    }
  });

  it('keeps the new Alex Lubic review verbatim, including its original wording', () => {
    const alex = REVIEWS[3];
    expect(alex.text).toContain('Mira was a total superstar!!!');
    expect(alex.text).toContain('Did every thing she could to help');
    expect(alex.text).toContain('updated Deed of trust');
    expect(alex.text).toContain('Thank you for being the best Mira!');
  });

  it('uses the supplied English translation for Galina Izyurova', () => {
    expect(REVIEWS[4].text).toBe(
      'Mira is a highly qualified professional—patient, responsible, compassionate, and respectful. I wish her and her family joy and success every day. I recommend reaching out to her. — Galina Vasilievna, retiree and person with a disability.',
    );
  });
});
