/**
 * Shared drop shadow for every letter that flies: the drag ghost, discarded
 * letters, letters returning to the rack and the page fly-out. Applied inline
 * because the .tile-face utility sets its own box-shadow, which would otherwise
 * win over a Tailwind shadow utility.
 */
export const TILE_FLIGHT_SHADOW =
  "0 30px 60px -8px rgb(0 0 0 / 0.88), 0 12px 30px -6px rgb(0 0 0 / 0.72)";
