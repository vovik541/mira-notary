/**
 * Keeps the appointment wizard's current step in `history.state` so the browser Back / Forward
 * buttons move between steps instead of leaving the page. The URL never changes (no routes, no
 * query parameters, no hash): `/contact` stays `/contact`, and no form value is ever stored here —
 * only the step number (plus a boolean marker while a photo preview is open).
 *
 * Existing state (notably the Angular router's own `navigationId`) is preserved on every write.
 */
export const WIZARD_STATE_KEY = 'wizardStep';
/** Marks the history entry pushed while a photo preview is open (a boolean, never the photo). */
export const PREVIEW_STATE_KEY = 'photoPreviewOpen';

export type WizardStepNumber = 1 | 2 | 3;

const isStep = (value: unknown): value is WizardStepNumber =>
  value === 1 || value === 2 || value === 3;

export class WizardHistory {
  constructor(private readonly win: Window | null) {}

  /** The step recorded on the current history entry, if this entry belongs to the wizard. */
  current(): WizardStepNumber | null {
    const value = (this.win?.history.state as Record<string, unknown> | null)?.[WIZARD_STATE_KEY];
    return isStep(value) ? value : null;
  }

  /** Records the step on the current entry (no new entry). */
  replace(step: WizardStepNumber): void {
    this.win?.history.replaceState(this.withStep(step), '');
  }

  /** True when the current entry is the one pushed for an open photo preview. */
  isPreviewEntry(): boolean {
    return (
      (this.win?.history.state as Record<string, unknown> | null)?.[PREVIEW_STATE_KEY] === true
    );
  }

  /** Adds an entry for "this step, preview open" (same URL, only two small markers). */
  pushPreview(step: WizardStepNumber): void {
    this.win?.history.pushState({ ...this.withStep(step), [PREVIEW_STATE_KEY]: true }, '');
  }

  /** Adds a history entry for the step (same URL). */
  push(step: WizardStepNumber): void {
    this.win?.history.pushState(this.withStep(step), '');
  }

  back(): void {
    this.win?.history.back();
  }

  /** Calls back with the step of the entry that became current (`null` for foreign entries). */
  listen(callback: (step: WizardStepNumber | null) => void): () => void {
    const win = this.win;
    if (!win) {
      return () => undefined;
    }
    const handler = (): void => callback(this.current());
    win.addEventListener('popstate', handler);
    return () => win.removeEventListener('popstate', handler);
  }

  private withStep(step: WizardStepNumber): Record<string, unknown> {
    const { [PREVIEW_STATE_KEY]: _preview, ...existing } = (this.win?.history.state ??
      {}) as Record<string, unknown>;
    return { ...existing, [WIZARD_STATE_KEY]: step };
  }
}
