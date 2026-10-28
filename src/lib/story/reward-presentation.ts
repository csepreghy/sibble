/** Actual excess Ink percentage; independent of reward tiers and their cap. */
export function pageExcessPercent(ink: number, target: number): number {
  if (target <= 0) return 0;
  return (Math.max(0, ink - target) * 100) / target;
}