import { describe, expect, it } from "vitest";
import { templates } from "../templates";
import { generateLongFormPiece } from "./arranger";

describe("arranger", () => {
  it("builds deterministic long-form code for same options", () => {
    const options = {
      baseTemplate: templates[0],
      templates,
      seed: "suite-seed",
      bpm: 120,
      style: "arc" as const,
      length: "long" as const,
      baseParams: {
        ...templates[0].defaults.params
      }
    };
    const first = generateLongFormPiece(options);
    const second = generateLongFormPiece(options);
    expect(first.code).toBe(second.code);
    expect(first.totalBars).toBe(96);
    expect(first.sections).toHaveLength(5);
    expect(first.code.startsWith("setcps(")).toBe(true);
    expect(first.code).toContain("\ncat(\n");
    expect((first.code.match(/setcps\(/g) ?? []).length).toBe(1);
  });

  it("re-bases focused section phases to avoid leading silence gaps", () => {
    const techno = templates.find((template) => template.id === "techno");
    expect(techno).toBeDefined();

    const result = generateLongFormPiece({
      baseTemplate: techno!,
      templates,
      seed: "suite-seed",
      bpm: 132,
      style: "arc",
      length: "short",
      baseParams: {
        ...techno!.defaults.params
      }
    });

    expect(result.code).not.toContain("silence");
  });
});
