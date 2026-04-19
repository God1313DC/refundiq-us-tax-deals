import { describe, expect, it } from "vitest";

import { canAccessCase, canAccessRole } from "./access";

describe("access helpers", () => {
  it("allows preparer routes for preparer and admin roles", () => {
    expect(canAccessRole("preparer", ["preparer"])).toBe(true);
    expect(canAccessRole("admin", ["preparer"])).toBe(true);
    expect(canAccessRole("client", ["preparer"])).toBe(false);
  });

  it("restricts client case access to the owner", () => {
    expect(canAccessCase("client", "case-owner", "case-owner")).toBe(true);
    expect(canAccessCase("client", "case-owner", "other-user")).toBe(false);
    expect(canAccessCase("preparer", "case-owner", "other-user")).toBe(true);
  });
});
