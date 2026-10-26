/** Presentation only: the game remains mounted when orientation changes. */
export function storyLayout(width: number, height: number, phone: boolean): "desktop" | "compact" | "rotate" {
  if (width <= height) return "compact";
  if (width >= 1100) return "desktop";
  return phone ? "rotate" : "compact";
}