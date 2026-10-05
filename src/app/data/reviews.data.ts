export interface Review {
  readonly author: string;
  readonly rating: 5;
  readonly source: 'Google Review';
  readonly text: string;
}

export const REVIEWS: readonly Review[] = [
  {
    author: 'Liudmyla Petruk',
    rating: 5,
    source: 'Google Review',
    text: 'She is professional, attentive, and very knowledgeable in her work. The entire process was smooth, clear, and handled with great care and accuracy. Mira is punctual, friendly, and trustworthy, and she makes even complex notarizations easy and stress-free.',
  },
  {
    author: 'Vasya K',
    rating: 5,
    source: 'Google Review',
    text: 'Excellent customer service, goes above and beyond to help us lenders close on time. She has been doing signings for our lending team the last 7 years. Thank you Mira!',
  },
  {
    author: 'lara tessadri',
    rating: 5,
    source: 'Google Review',
    text: 'Mira is one of our top notaries most requested. She is trusted by our title companies and lenders and always takes great care of our clients. I cannot recommend Mira enough to anyone that requires a notary!',
  },
];
