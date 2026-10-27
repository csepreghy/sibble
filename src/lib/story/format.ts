/** Compact score formatting for tight HUD boxes: below 100K shows grouped digits, then K/M/B/T with up to 3 significant figures. */
export function compactNumber(value: number): string {
  const abs = Math.abs(value);
  if (abs < 100_000) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  const units: [number, string][] = [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]];
  for (const [size, suffix] of units) {
    if (abs >= size) {
      const n = value / size;
      const digits = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
      return `${Number(n.toFixed(digits))}${suffix}`;
    }
  }
  return String(value);
}
