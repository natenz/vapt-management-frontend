import { describe, expect, it } from "vitest";
import { isOverLimit, MANDAYS_LIMIT } from "./workload";

describe("isOverLimit", () => {
  it("merah hanya bila LEBIH dari batas, tepat di batas masih aman", () => {
    expect(MANDAYS_LIMIT).toBe(20);
    expect(isOverLimit(20)).toBe(false);
    expect(isOverLimit(20.01)).toBe(true);
    expect(isOverLimit(0)).toBe(false);
  });
});
