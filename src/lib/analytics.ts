/**
 * Custom event tracking for Vercel Web Analytics.
 * Safe to call anywhere on the client: it does nothing until the
 * analytics script has loaded (production on Vercel only).
 */
type Props = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    va?: (...args: unknown[]) => void;
    vaq?: unknown[];
  }
}

export function track(name: string, data?: Props) {
  if (typeof window === "undefined") return;
  try {
    window.va?.("event", { name, data });
  } catch {
    // analytics must never break the app
  }
}
