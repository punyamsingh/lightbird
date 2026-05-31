import { LightBirdPlayerElement } from './lightbird-player';

export { LightBirdPlayerElement } from './lightbird-player';
export type { SubtitleSource, LightBirdEventDetail } from './types';

let mainConstructorRegistered = false;

/**
 * Registers the `<lightbird-player>` custom element. Idempotent and safe to
 * call alongside the auto-registration below.
 *
 * The Custom Elements spec forbids defining the same constructor under two
 * different tag names (`NotSupportedError`). When called with an alternate
 * `tagName` after the main constructor is already registered, a fresh
 * subclass is defined instead so the new tag still works.
 *
 * @param tagName  Custom tag name to register under. Defaults to `lightbird-player`.
 */
export function register(tagName: string = LightBirdPlayerElement.tagName): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tagName)) return;

  if (mainConstructorRegistered) {
    class TaggedLightBirdPlayerElement extends LightBirdPlayerElement {}
    customElements.define(tagName, TaggedLightBirdPlayerElement);
    return;
  }
  customElements.define(tagName, LightBirdPlayerElement);
  mainConstructorRegistered = true;
}

// Auto-register so a bare `import '@lightbird/player'` is enough to use the element.
register();

declare global {
  interface HTMLElementTagNameMap {
    'lightbird-player': LightBirdPlayerElement;
  }
}
