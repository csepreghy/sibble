/**
 * Shared drop shadow for every letter that flies: the drag ghost, discarded
 * letters, letters returning to the rack and the page fly-out. Applied inline
 * because the .tile-face utility sets its own box-shadow, which would otherwise
 * win over a Tailwind shadow utility.
 */
export const TILE_FLIGHT_SHADOW =
  "0 26px 54px -8px rgb(0 0 0 / 0.85), 0 10px 22px -5px rgb(0 0 0 / 0.7)";
