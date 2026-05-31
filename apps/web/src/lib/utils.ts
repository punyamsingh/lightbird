/**
 * Minimal className joiner — keeps the playground free of extra dependencies
 * (clsx/tailwind-merge live in the UI package, not the web app). Falsy values
 * are dropped; the playground never relies on Tailwind conflict resolution.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
