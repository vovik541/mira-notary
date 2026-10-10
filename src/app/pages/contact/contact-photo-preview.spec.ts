import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  Scroll,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';
import { todayInBusinessZone } from '../../../shared/appointment-timing';
import { ContactComponent } from './contact.component';

type Fixture = ComponentFixture<ContactComponent>;

const tick = (ms = 40): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
const step = (f: Fixture): number =>
  (f.componentInstance as unknown as { step: () => number }).step();

function setup(): Fixture {
  TestBed.configureTestingModule({
    imports: [ContactComponent],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})) } },
    ],
  });
  const fixture = TestBed.createComponent(ContactComponent);
  fixture.detectChanges();
  document.body.appendChild(fixture.nativeElement);
  return fixture;
}

const el = (f: Fixture, id: string): HTMLInputElement =>
  f.nativeElement.querySelector(`#${id}`) as HTMLInputElement;
const set = (f: Fixture, id: string, value: string): void => {
  const control = el(f, id);
  control.dispatchEvent(new Event('focus'));
  control.dispatchEvent(new Event('beforeinput'));
  control.value = value;
  control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
  f.detectChanges();
};
const click = (f: Fixture, selector: string): void => {
  (f.nativeElement.querySelector(selector) as HTMLElement).click();
  f.detectChanges();
};

let weekday = '';
const futureWeekday = (): string => {
  if (!weekday) {
    const [y, m, d] = todayInBusinessZone().split('-').map(Number);
    let date = new Date(Date.UTC(y, m - 1, d + 9));
    while (date.getUTCDay() === 0) {
      date = new Date(date.getTime() + 86_400_000);
    }
    weekday = date.toISOString().slice(0, 10);
  }
  return weekday;
};

/** Walks the real wizard to step 3 (history entries 1 → 2 → 3) and leaves the data in place. */
function toStep3(f: Fixture): void {
  set(f, 'service', 'Loan Signing');
  set(f, 'zip', '95814');
  set(f, 'preferredDate', futureWeekday());
  set(f, 'timePreference', 'afternoon');
  click(f, 'form > .step:nth-of-type(1) .wizard-actions button');
  set(f, 'firstName', 'Jane');
  set(f, 'lastName', 'Doe');
  set(f, 'phone', '9165550100');
  set(f, 'email', 'jane.doe@example.com');
  click(f, 'form > .step:nth-of-type(2) .wizard-actions .btn--gold');
}

const pick = (f: Fixture, files: File[]): void => {
  const input = el(f, 'photos');
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
  f.detectChanges();
};
const photo = (name: string, type = 'image/jpeg'): File =>
  new File([new Uint8Array(1024)], name, { type });

const thumbs = (f: Fixture): HTMLButtonElement[] =>
  Array.from(f.nativeElement.querySelectorAll('.photo-list .thumb'));
const modal = (f: Fixture): HTMLElement | null =>
  document.querySelector('app-photo-lightbox .dialog');
const state = (): unknown => history.state;

describe('photo preview (lightbox)', () => {
  const created: string[] = [];
  const revoked: string[] = [];
  let original: { create: typeof URL.createObjectURL; revoke: typeof URL.revokeObjectURL };

  beforeEach(() => {
    history.replaceState(null, '');
    created.length = 0;
    revoked.length = 0;
    original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    URL.createObjectURL = (): string => {
      const url = `blob:test/${created.length}`;
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url: string): void => {
      revoked.push(url);
    };
  });
  afterEach(() => {
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
    document.body.replaceChildren();
    TestBed.inject(HttpTestingController).verify();
  });

  const open = (f: Fixture, index = 0): HTMLButtonElement => {
    const trigger = thumbs(f)[index];
    trigger.focus();
    trigger.click();
    f.detectChanges();
    return trigger;
  };

  describe('thumbnails', () => {
    it.each([
      ['a.jpg', 'image/jpeg'],
      ['b.png', 'image/png'],
      ['c.webp', 'image/webp'],
    ])('%s is a real, labelled button', (name, type) => {
      const f = setup();
      toStep3(f);
      pick(f, [photo(name, type)]);
      const [thumb] = thumbs(f);
      expect(thumb.tagName).toBe('BUTTON');
      expect(thumb.getAttribute('type')).toBe('button');
      expect(thumb.getAttribute('aria-label')).toBe(`Preview ${name}`);
      expect(thumb.getAttribute('title')).toBe('Preview photo');
      expect(thumb.querySelector('img')?.getAttribute('alt')).toBe('');
    });

    it('HEIC / HEIF keep the IMG placeholder: not a button, no broken preview', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('IMG_1.HEIC', 'image/heic'), photo('IMG_2.heif', 'image/heif')]);
      expect(thumbs(f)).toHaveLength(0);
      expect(f.nativeElement.querySelectorAll('.thumb-fallback')).toHaveLength(2);
      expect(modal(f)).toBeNull();
    });
  });

  describe('opening', () => {
    it('opens a labelled modal dialog with the clicked photo, using the existing object URL', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png')]);
      open(f, 1);
      const dialog = modal(f) as HTMLElement;
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.getAttribute('aria-label')).toBe('Preview b.png');
      expect(dialog.querySelector('img')?.getAttribute('src')).toBe('blob:test/1');
      expect(dialog.querySelector('img')?.getAttribute('alt')).toBe('');
      expect(created).toEqual(['blob:test/0', 'blob:test/1']); // no second copy was created
    });

    it('each thumbnail opens its own photo', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png'), photo('c.webp', 'image/webp')]);
      for (const [index, name] of ['a.jpg', 'b.png', 'c.webp'].entries()) {
        open(f, index);
        expect(modal(f)?.getAttribute('aria-label')).toBe(`Preview ${name}`);
        (document.querySelector('.close') as HTMLButtonElement).click();
        f.detectChanges();
      }
    });

    it('moves focus into the dialog (Close button) and keeps it there on Tab', async () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg')]);
      open(f);
      await tick();
      const close = document.querySelector('.close') as HTMLButtonElement;
      expect(document.activeElement).toBe(close);
      const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      modal(f)?.dispatchEvent(tab);
      expect(tab.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(close);
    });

    it('Remove stays a separate action: it removes the photo and never opens the preview', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png')]);
      click(f, '.photo-list li:first-child .photo-remove');
      expect(modal(f)).toBeNull();
      expect(thumbs(f)).toHaveLength(1);
      expect(revoked).toEqual(['blob:test/0']);
    });

    it('opening and closing the preview never revokes the object URL', async () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg')]);
      open(f);
      (document.querySelector('.close') as HTMLButtonElement).click();
      await tick();
      f.detectChanges();
      expect(revoked).toEqual([]);
      expect(thumbs(f)[0].querySelector('img')?.getAttribute('src')).toBe('blob:test/0');
    });

    it('existing cleanup still revokes on destroy', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg')]);
      open(f);
      f.destroy();
      expect(revoked).toEqual(['blob:test/0']);
    });
  });

  describe('closing and browser history', () => {
    const openAtStep3 = (): { f: Fixture; trigger: HTMLButtonElement } => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png')]);
      const trigger = open(f, 1);
      return { f, trigger };
    };

    it('opening pushes ONE same-URL entry with only small markers (no photo data / PII)', () => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png')]);
      const before = history.length;
      open(f, 1);
      expect(step(f)).toBe(3);
      expect(history.length).toBe(before + 1);
      expect(state()).toEqual({ wizardStep: 3, photoPreviewOpen: true });
      const json = JSON.stringify(state());
      expect(json).not.toMatch(/b\.png|blob:|Jane|Doe|jane\.doe|916/);
      expect(location.search).toBe('');
      expect(location.hash).toBe('');
    });

    it('browser Back closes the preview first; still step 3 with data and photos; Back again → step 2', async () => {
      const { f, trigger } = openAtStep3();
      history.back();
      await tick();
      f.detectChanges();
      expect(modal(f)).toBeNull();
      expect(step(f)).toBe(3);
      expect(el(f, 'firstName').value).toBe('Jane');
      expect(thumbs(f)).toHaveLength(2);
      expect(state()).toEqual({ wizardStep: 3 });
      expect(document.activeElement).toBe(trigger);

      history.back();
      await tick();
      f.detectChanges();
      expect(step(f)).toBe(2);
      expect(modal(f)).toBeNull();
    });

    it.each([
      [
        'the Close button',
        (f: Fixture) => (document.querySelector('.close') as HTMLElement).click(),
        true,
      ],
      [
        'Escape',
        () =>
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
        true,
      ],
      [
        'a backdrop click',
        () => (document.querySelector('.backdrop') as HTMLElement).click(),
        true,
      ],
    ])(
      'closing with %s leaves no phantom preview entry and returns focus to the thumbnail',
      async (_label, close) => {
        const { f, trigger } = openAtStep3();
        const length = history.length;
        close(f);
        await tick();
        f.detectChanges();
        expect(modal(f)).toBeNull();
        expect(state()).toEqual({ wizardStep: 3 });
        expect(document.activeElement).toBe(trigger);
        expect(history.length).toBe(length); // went back over the entry, nothing new added

        history.back(); // one Back = one action: previous wizard step, no modal reopens
        await tick();
        f.detectChanges();
        expect(step(f)).toBe(2);
        expect(modal(f)).toBeNull();
      },
    );

    it('clicking the image itself does not close the preview', async () => {
      const { f } = openAtStep3();
      (document.querySelector('app-photo-lightbox img') as HTMLElement).click();
      await tick();
      f.detectChanges();
      expect(modal(f)).not.toBeNull();
      expect(state()).toEqual({ wizardStep: 3, photoPreviewOpen: true });
    });

    it('Back (closes) then Forward reopens the same photo; Back / Back then returns to step 2', async () => {
      const { f } = openAtStep3();
      history.back();
      await tick();
      history.forward();
      await tick();
      f.detectChanges();
      expect(modal(f)?.getAttribute('aria-label')).toBe('Preview b.png');
      expect(step(f)).toBe(3);
      expect(state()).toEqual({ wizardStep: 3, photoPreviewOpen: true });

      history.back();
      await tick();
      f.detectChanges();
      expect(modal(f)).toBeNull();
      expect(step(f)).toBe(3);
      history.back();
      await tick();
      f.detectChanges();
      expect(step(f)).toBe(2);
    });

    it('Back (closes), remove that photo, Forward: no modal for a missing photo, no stale state', async () => {
      const { f } = openAtStep3();
      history.back();
      await tick();
      f.detectChanges();
      click(f, '.photo-list li:nth-child(2) .photo-remove');
      history.forward();
      await tick(150); // forward, then the programmatic back over the stale entry
      f.detectChanges();
      expect(modal(f)).toBeNull();
      expect(step(f)).toBe(3);
      expect(thumbs(f)).toHaveLength(1);
      expect(state()).toEqual({ wizardStep: 3 });
    });

    it('opening Photo A, closing, then Photo B does not accumulate history entries', async () => {
      const { f } = openAtStep3();
      const base = history.length;
      (document.querySelector('.close') as HTMLElement).click();
      await tick();
      f.detectChanges();
      open(f, 0);
      expect(history.length).toBe(base); // back over A's entry, then B's entry replaced it
      expect(modal(f)?.getAttribute('aria-label')).toBe('Preview a.jpg');
      expect(state()).toEqual({ wizardStep: 3, photoPreviewOpen: true });
    });

    it('wizard history still works: 1 → 2 → 3, Back 3 → 2 → 1, Forward 1 → 2 → 3', async () => {
      const f = setup();
      toStep3(f);
      expect(step(f)).toBe(3);
      history.back();
      await tick();
      expect(step(f)).toBe(2);
      history.back();
      await tick();
      expect(step(f)).toBe(1);
      history.forward();
      await tick();
      expect(step(f)).toBe(2);
      history.forward();
      await tick();
      expect(step(f)).toBe(3);
    });

    it('Step 3 → open photo → Back closes it → Back again goes 3 → 2', async () => {
      const { f } = openAtStep3();
      history.back();
      await tick();
      f.detectChanges();
      expect(step(f)).toBe(3);
      history.back();
      await tick();
      f.detectChanges();
      expect(step(f)).toBe(2);
    });
  });

  describe('page scroll position', () => {
    // The real router scrolls to the top on every popstate (scroll restoration). jsdom has no
    // layout, so scrolling is simulated and the router's reset is replayed through its Scroll event.
    let y = 0;
    let scrollSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      y = 0;
      Object.defineProperty(window, 'scrollY', { get: () => y, configurable: true });
      scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(((a: unknown, b?: number) => {
        y = typeof a === 'object' && a !== null ? ((a as { top?: number }).top ?? 0) : (b ?? 0);
      }) as never);
    });
    afterEach(() => {
      scrollSpy.mockRestore();
      delete (window as { scrollY?: number }).scrollY;
    });

    const routerResetsScrollToTop = async (f: Fixture): Promise<void> => {
      y = 0; // what the router's scroller does after a popstate
      const events = Reflect.get(TestBed.inject(Router), 'navigationTransitions').events;
      events.next(new Scroll(new NavigationEnd(1, '/contact', '/contact'), null, null));
      await tick();
      f.detectChanges();
    };

    const prepare = (): Fixture => {
      const f = setup();
      toStep3(f);
      pick(f, [photo('a.jpg'), photo('b.png', 'image/png')]);
      y = 900; // the user has scrolled down to the attached photos
      return f;
    };
    const openPhoto = (f: Fixture, index = 0): HTMLButtonElement => {
      const trigger = thumbs(f)[index];
      trigger.focus();
      trigger.click();
      f.detectChanges();
      return trigger;
    };

    it.each([
      ['the Close button', () => (document.querySelector('.close') as HTMLElement).click()],
      ['Escape', () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))],
      ['a backdrop click', () => (document.querySelector('.backdrop') as HTMLElement).click()],
      ['browser Back', () => history.back()],
    ])('closing with %s leaves the page exactly where it was', async (_label, close) => {
      const f = prepare();
      openPhoto(f);
      expect(y).toBe(900); // opening never moves the page
      close();
      await tick();
      await routerResetsScrollToTop(f);
      expect(modal(f)).toBeNull();
      expect(y).toBe(900);
    });

    it('returns focus to the thumbnail without scrolling the page', async () => {
      const f = prepare();
      const trigger = openPhoto(f);
      const focus = vi.spyOn(trigger, 'focus');
      (document.querySelector('.close') as HTMLElement).click();
      await tick();
      expect(focus).toHaveBeenCalledWith({ preventScroll: true });
      expect(document.activeElement).toBe(trigger);
    });

    it('Step 3 → preview → Back keeps step and scroll; the second Back is the normal wizard Back (no restore)', async () => {
      const f = prepare();
      openPhoto(f);
      history.back();
      await tick();
      await routerResetsScrollToTop(f);
      expect(step(f)).toBe(3);
      expect(y).toBe(900);

      history.back();
      await tick();
      await routerResetsScrollToTop(f);
      expect(step(f)).toBe(2);
      expect(y).toBe(0); // the router's normal behavior for wizard navigation is untouched
    });

    it('Forward reopens the preview without jumping the page', async () => {
      const f = prepare();
      openPhoto(f);
      history.back();
      await tick();
      await routerResetsScrollToTop(f);
      expect(y).toBe(900);

      y = 700; // the user scrolled a little before pressing Forward
      history.forward();
      await tick();
      await routerResetsScrollToTop(f);
      expect(modal(f)?.getAttribute('aria-label')).toBe('Preview a.jpg');
      expect(y).toBe(700);
    });

    it("every opening captures the current position: photo B never reuses photo A's", async () => {
      const f = prepare();
      openPhoto(f, 0);
      (document.querySelector('.close') as HTMLElement).click();
      await tick();
      await routerResetsScrollToTop(f);
      expect(y).toBe(900);

      y = 300; // scrolled elsewhere before opening the second photo
      openPhoto(f, 1);
      (document.querySelector('.close') as HTMLElement).click();
      await tick();
      await routerResetsScrollToTop(f);
      expect(y).toBe(300);
    });

    it('stores no scroll position in the URL, history.state or web storage', () => {
      const f = prepare();
      openPhoto(f);
      expect(JSON.stringify(history.state)).not.toMatch(/900|scroll/i);
      expect(location.search + location.hash).toBe('');
      expect(sessionStorage.length + localStorage.length).toBe(0);
    });
  });
});
