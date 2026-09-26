import { describe, expect, it } from "vitest";
import { SWIPE_MAX, SWIPE_SLOP, SWIPE_TRIGGER, swipeMove, swipeTalks } from "./swipe";

const start = { x: 100, y: 100 };
const at = (dx: number, dy = 0) => ({ x: start.x + dx, y: start.y + dy });

describe("swipeMove, before the row moves", () => {
  it("stays a tap while the finger jitters within the slop", () => {
    expect(swipeMove(start, at(SWIPE_SLOP - 1, 2), false)).toBe("tap");
    expect(swipeMove(start, at(3, -4), false)).toBe("tap");
  });

  it("gives up for a mostly vertical move, so the list scrolls", () => {
    expect(swipeMove(start, at(8, 20), false)).toBe("scroll");
  });

  it("gives up for a move to the left", () => {
    expect(swipeMove(start, at(-SWIPE_SLOP - 5, 0), false)).toBe("scroll");
  });

  it("starts swiping once the finger moves right past the slop", () => {
    expect(swipeMove(start, at(SWIPE_SLOP + 2, 3), false)).toEqual({ dx: SWIPE_SLOP + 2 });
  });
});

describe("swipeMove, once swiping", () => {
  it("follows the finger, even if it drifts vertically", () => {
    expect(swipeMove(start, at(60, 40), true)).toEqual({ dx: 60 });
  });

  it("never goes left of the start or past the cap", () => {
    expect(swipeMove(start, at(-30), true)).toEqual({ dx: 0 });
    expect(swipeMove(start, at(SWIPE_MAX + 50), true)).toEqual({ dx: SWIPE_MAX });
  });
});

describe("swipeTalks", () => {
  it("records a Touch only when released past the trigger", () => {
    expect(swipeTalks(SWIPE_TRIGGER - 1)).toBe(false);
    expect(swipeTalks(SWIPE_TRIGGER)).toBe(true);
  });
});
