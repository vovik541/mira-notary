export interface FaqItem {
  readonly question: string;
  readonly answer: string;
}

export const FAQ_ITEMS: readonly FaqItem[] = [
  {
    question: 'What should I bring to my notary appointment?',
    answer:
      'Please bring the document or documents that need notarization and an acceptable form of identification. If you are unsure what you need for your appointment, contact Mira before the meeting.',
  },
  {
    question: 'Does Mira travel to my location?',
    answer:
      'Yes. Mira provides mobile notary service throughout Sacramento County and selected surrounding communities in Placer and Yolo Counties. Contact Mira with your location or ZIP code to confirm availability.',
  },
  {
    question: 'Can I request a same-day appointment?',
    answer:
      'Same-day and short-notice appointments may be available. Call or submit an appointment request with your preferred time and location, and Mira will confirm availability.',
  },
  {
    question: 'What languages does Mira speak?',
    answer: 'Mira provides service in English, Ukrainian, and Russian.',
  },
  {
    question: 'How much does a mobile notary appointment cost?',
    answer:
      'Pricing may include both the applicable notarial service fee and a mobile travel fee. Common prices are listed on the Pricing page, and final pricing is confirmed before service.',
  },
  {
    question: 'How do I request apostille or document translation service?',
    answer:
      'Use the appointment request form or contact Mira directly. Include the type of document, the service you need, and any relevant destination country, language, or deadline. Mira will review the request and confirm availability and pricing.',
  },
];
