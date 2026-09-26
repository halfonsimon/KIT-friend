// The phone Contact row's swipe-right-for-"We talked" gesture, as pure decisions.

/** How far a finger may wander before a tap becomes a swipe or a scroll. */
export const SWIPE_SLOP = 10;
/** How far right the row must be dragged for "We talked". */
export const SWIPE_TRIGGER = 110;
/** The row never moves further than this. */
export const SWIPE_MAX = 160;

type Point = { x: number; y: number };

/**
 * What a pointer move means. Before the row moves, jitter within the slop is
 * still a tap, and anything mostly vertical (or leftwards) is left to the
 * browser as a scroll. Once swiping, the row follows the finger.
 */
export function swipeMove(start: Point, point: Point, swiping: boolean): "tap" | "scroll" | { dx: number } {
  const x = point.x - start.x;
  const y = Math.abs(point.y - start.y);
  if (!swiping) {
    if (Math.abs(x) < SWIPE_SLOP && y < SWIPE_SLOP) return "tap";
    if (x <= 0 || y >= Math.abs(x)) return "scroll";
  }
  return { dx: Math.max(0, Math.min(x, SWIPE_MAX)) };
}

/** Whether letting go at `dx` records a Touch. */
export function swipeTalks(dx: number) {
  return dx >= SWIPE_TRIGGER;
}
