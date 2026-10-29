// Builds public/third-party-licenses.txt (served at /third-party-licenses.txt) so the notices that the
// MIT / Apache-2.0 / 0BSD / OFL licenses require travel WITH the deployed site.
//
// Why: `ng build` writes the bundled-dependency licenses to dist/<app>/3rdpartylicenses.txt, one level
// ABOVE the served `browser/` directory, so they never reach the deployed assets on their own.
//
//   npm run build          (produces dist/mira-notary/3rdpartylicenses.txt)
//   npm run licenses       (this script; commit the regenerated public/third-party-licenses.txt)
//
// Re-run after changing dependencies, fonts or icons.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n').trim();

const bundled = join(root, 'dist/mira-notary/3rdpartylicenses.txt');
if (!existsSync(bundled)) {
  console.error('dist/mira-notary/3rdpartylicenses.txt not found — run `npm run build` first.');
  process.exit(1);
}

const rule = '='.repeat(80);
const sections = [
  `Third-party software and assets used by miranotary.com

This file reproduces the copyright and license notices that the licenses below require. It does not
change the ownership of the site's own code, text or images.`,
  `${rule}\n1. JavaScript bundled into the site (Angular, RxJS, tslib)\n${rule}\n\n${read('dist/mira-notary/3rdpartylicenses.txt')}`,
  `${rule}\n2. Icons — Heroicons v1.0.6 (MIT)\n${rule}\n\nThe following icons in src/app/shared/components/icon/icon.component.ts are Heroicons by Tailwind Labs\n(Refactoring UI Inc.): phone, document (document-text), building (office-building), flag, translate,\nchevron-down, chevron-left, chevron-right, menu, close (x), check, check-circle (solid), star (solid).\nSource: https://github.com/tailwindlabs/heroicons (tag v1.0.6)\n\n${read('scripts/licenses/heroicons-1.0.6-LICENSE.txt')}`,
  `${rule}\n3. Font — Inter (SIL Open Font License 1.1)\n${rule}\n\nSelf-hosted file: /fonts/inter-latin-wght-normal.woff2 (latin subset of the Inter variable font, as\npackaged by Fontsource @fontsource-variable/inter 5.3.0). Upstream: https://github.com/rsms/inter\n\n${read('public/fonts/OFL-Inter.txt')}`,
  `${rule}\n4. Font — Manrope (SIL Open Font License 1.1)\n${rule}\n\nSelf-hosted file: /fonts/manrope-latin-wght-normal.woff2 (latin subset of the Manrope variable font, as\npackaged by Fontsource @fontsource-variable/manrope 5.3.0).\nUpstream: https://github.com/googlefonts/manrope\n\n${read('public/fonts/OFL-Manrope.txt')}`,
];

writeFileSync(join(root, 'public/third-party-licenses.txt'), `${sections.join('\n\n')}\n`);
console.log('Wrote public/third-party-licenses.txt');
