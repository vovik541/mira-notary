import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

interface IconDefinition {
  readonly paths: readonly string[];
  readonly filled?: boolean;
  readonly viewBox?: string;
}

const ICONS = {
  phone: {
    paths: [
      'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    ],
  },
  mail: {
    paths: ['M3 7l9 6 9-6', 'M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z'],
  },
  document: {
    paths: [
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    ],
  },
  building: {
    paths: [
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    ],
  },
  flag: {
    paths: ['M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9'],
  },
  translate: {
    paths: [
      'M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129',
    ],
  },
  home: { paths: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M10 20v-6h4v6'] },
  sign: { paths: ['M3 12V4h8l10 10-8 8L3 12z', 'M7.5 8.5h.01'] },
  refresh: { paths: ['M4 4v6h6', 'M20 20v-6h-6', 'M5.6 15A8 8 0 0019 14', 'M18.4 9A8 8 0 005 10'] },
  bank: { paths: ['M4 10h16', 'M4 10l8-6 8 6', 'M6 10v8M10 10v8M14 10v8M18 10v8', 'M4 20h16'] },
  key: { paths: ['M15 7a4 4 0 11-3.9 4.9L4 19v2h3v-2h2v-2h2l1.9-1.9A4 4 0 0115 7z', 'M16 9h.01'] },
  edit: { paths: ['M4 20h4L19 9l-4-4L4 16v4z', 'M13 7l4 4'] },
  scan: {
    paths: [
      'M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3',
      'M4 12h16',
    ],
  },
  package: { paths: ['M3 7l9-4 9 4v10l-9 4-9-4V7z', 'M3 7l9 4 9-4', 'M12 11v10'] },
  printer: {
    paths: [
      'M7 9V3h10v6',
      'M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2',
      'M7 14h10v7H7z',
    ],
  },
  'map-pin': {
    paths: [
      'M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z',
      'M12 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
    ],
  },
  'chevron-down': { paths: ['M19 9l-7 7-7-7'] },
  'chevron-left': { paths: ['M15 19l-7-7 7-7'] },
  'chevron-right': { paths: ['M9 5l7 7-7 7'] },
  menu: { paths: ['M4 6h16M4 12h16M4 18h16'] },
  close: { paths: ['M6 18L18 6M6 6l12 12'] },
  check: { paths: ['M5 13l4 4L19 7'] },
  shield: {
    paths: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z', 'M9 12l2 2 4-4'],
  },
  'check-circle': {
    filled: true,
    viewBox: '0 0 20 20',
    paths: [
      'M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z',
    ],
  },
  star: {
    filled: true,
    viewBox: '0 0 20 20',
    paths: [
      'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z',
    ],
  },
} as const satisfies Record<string, IconDefinition>;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      aria-hidden="true"
      focusable="false"
      [attr.viewBox]="definition().viewBox ?? '0 0 24 24'"
      [attr.fill]="definition().filled ? 'currentColor' : 'none'"
      [attr.stroke]="definition().filled ? 'none' : 'currentColor'"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      @for (d of definition().paths; track d) {
        <path [attr.d]="d" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: var(--icon-size, 1.25rem);
      height: var(--icon-size, 1.25rem);
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
    }
  `,
})
export class IconComponent {
  readonly name = input.required<IconName>();
  protected readonly definition = computed<IconDefinition>(() => ICONS[this.name()]);
}
