const RETRY_KEY = "sibble:chunk-recovery";
const RETRY_WINDOW_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed/i.test(message);
}

/** Refresh the stale route manifest once, without deleting any game/session storage or looping offline. */
export function recoverChunkLoad(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error) || !navigator.onLine) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RETRY_KEY));
    if (last && Date.now() - last < RETRY_WINDOW_MS) return false;
    window.sessionStorage.setItem(RETRY_KEY, String(Date.now()));
  } catch {
    // Without a durable retry guard, leave recovery to the visible Refresh button.
    return false;
  }
  window.location.reload();
  return true;
}

export function installChunkRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const error = (event as Event & { payload?: unknown }).payload;
    if (recoverChunkLoad(error)) event.preventDefault();
  });
}