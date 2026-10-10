import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { CredentialListComponent } from './credential-list.component';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

describe('NNA badges', () => {
  it('renders exactly the two new badges, with alt text and the verification link', () => {
    TestBed.configureTestingModule({ imports: [CredentialListComponent] });
    const fixture = TestBed.createComponent(CredentialListComponent);
    fixture.componentRef.setInput('items', ['NNA Certified Signing Agent']);
    fixture.componentRef.setInput('profileUrl', 'https://www.signingagent.com/profile/160327553');
    fixture.componentRef.setInput('profileLabel', 'Verify NNA Signing Agent Profile');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const imgs = Array.from(el.querySelectorAll('img'));
    expect(imgs.map((i) => [i.getAttribute('src'), i.getAttribute('alt')])).toEqual([
      ['assets/credentials/nna_certified_global.webp', 'NNA Certified Notary Signing Agent badge'],
      [
        'assets/credentials/national_notary_association.webp',
        'National Notary Association member badge',
      ],
    ]);
    expect(el.querySelector('a.profile-link')?.textContent).toContain(
      'Verify NNA Signing Agent Profile',
    );
  });

  it('the old single badge asset is gone and referenced nowhere', () => {
    expect(readdirSync(join('public', 'assets', 'credentials')).sort()).toEqual([
      'national_notary_association.webp',
      'nna_certified_global.webp',
    ]);
    const referenced = [...files('src'), ...files('docs'), 'README.md']
      .filter(
        (f) =>
          /\.(ts|html|scss|css|md|json)$/.test(f) &&
          !f.endsWith('credential-list.component.spec.ts'),
      )
      .filter((f) => readFileSync(f, 'utf8').includes('nna-certified-2026'));
    expect(referenced).toEqual([]);
  });
});
