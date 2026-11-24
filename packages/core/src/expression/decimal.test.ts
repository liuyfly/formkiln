import { describe, expect, it } from "vitest";
import { roundHalfAwayFromZero } from "./decimal";

describe("roundHalfAwayFromZero", () => {
  it.each([
    [1.005, 2, 1.01],
    [2.5, 0, 3],
    [-2.5, 0, -3],
    [0.5, 0, 1],
    [-0.4, 0, 0],
    [9.995, 2, 10],
    [99.5, 0, 100],
    [0.0004, 2, 0],
    [1e-7, 2, 0],
    [1.5e-7, 7, 2e-7],
    [123.456, 1, 123.5],
    [1e21, 2, 1e21],
    [42, 3, 42],
  ])("round(%d, %d) = %d", (x, digits, expected) => {
    expect(Object.is(roundHalfAwayFromZero(x, digits), expected)).toBe(true);
  });
});
