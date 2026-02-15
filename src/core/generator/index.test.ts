import { describe, expect, it } from "vitest";
import { generatePiece, resolveTemplateParams } from "./index";
import { templates } from "../templates";

describe("generator", () => {
  it("resolves params deterministically from seed", () => {
    const template = templates[0];
    const first = resolveTemplateParams(template, "seed-123");
    const second = resolveTemplateParams(template, "seed-123");
    expect(first).toEqual(second);
  });

  it("generates identical code for same seed and settings", () => {
    const template = templates[0];
    const first = generatePiece(template, { seed: "same-seed", bpm: 120, bars: 8 });
    const second = generatePiece(template, { seed: "same-seed", bpm: 120, bars: 8 });
    expect(first.params).toEqual(second.params);
    expect(first.code).toEqual(second.code);
  });

  it("clamps numeric overrides to schema limits", () => {
    const template = templates.find((item) => item.id === "ambient");
    expect(template).toBeDefined();
    const resolved = resolveTemplateParams(template!, "seed-123", {
      air: 99
    });
    expect(resolved.air).toBe(1);
  });
});
