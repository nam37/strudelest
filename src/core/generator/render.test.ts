import { describe, expect, it } from "vitest";
import type { TemplateDefinition } from "../../types/music";
import { buildCode } from "./render";

function makeBaseTemplate(): TemplateDefinition {
  return {
    id: "test-template",
    label: "Test Template",
    description: "test",
    defaults: {
      bpm: 120,
      bars: 8,
      params: {}
    },
    paramSchema: [],
    rules: {
      layers: [
        {
          id: "main",
          kind: "drums",
          render: { type: "drums" },
          patterns: [
            { value: "bd ~ bd ~", weight: 2 },
            { value: "bd bd ~ ~", weight: 1 }
          ],
          base: { gain: 0.5 }
        }
      ],
      phases: [{ id: "phase-1", bars: { start: 1, end: 4 }, activeLayers: ["main"] }]
    }
  };
}

describe("rules renderer", () => {
  it("is deterministic for same seed and inputs", () => {
    const template = makeBaseTemplate();
    const first = buildCode(template, { bpm: 120, bars: 8, params: {}, seed: "same-seed" });
    const second = buildCode(template, { bpm: 120, bars: 8, params: {}, seed: "same-seed" });
    expect(first).toBe(second);
  });

  it("auto-scales absolute phase bars by default", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        phases: [
          { id: "a", bars: { start: 1, end: 2 }, activeLayers: ["main"] },
          { id: "b", bars: { start: 3, end: 4 }, activeLayers: ["main"] }
        ]
      }
    };
    const code = buildCode(template, { bpm: 120, bars: 8, params: {}, seed: "seed-x" });
    expect((code.match(/\.slow\(4\)/g) ?? []).length).toBe(2);
    expect(code).not.toContain("silence.slow");
  });

  it("fills uncovered bar ranges with silence", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        phases: [
          { id: "a", bars: { start: 1, end: 2 }, activeLayers: ["main"] },
          { id: "b", bars: { start: 7, end: 8 }, activeLayers: ["main"] }
        ]
      }
    };
    const code = buildCode(template, { bpm: 120, bars: 8, params: {}, seed: "seed-x" });
    expect(code).toContain("silence.slow(4)");
    expect((code.match(/\.slow\(2\)/g) ?? []).length).toBe(2);
  });

  it("tiles pct phases deterministically without off-by-one gaps", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        phases: [
          { id: "a", pct: { start: 0, end: 0.3 }, activeLayers: ["main"] },
          { id: "b", pct: { start: 0.3, end: 0.65 }, activeLayers: ["main"] },
          { id: "c", pct: { start: 0.65, end: 1 }, activeLayers: ["main"] }
        ]
      }
    };
    const code = buildCode(template, { bpm: 120, bars: 64, params: {}, seed: "seed-x" });
    expect((code.match(/\.slow\(19\)/g) ?? []).length).toBe(1);
    expect((code.match(/\.slow\(22\)/g) ?? []).length).toBe(1);
    expect((code.match(/\.slow\(23\)/g) ?? []).length).toBe(1);
    expect(code).not.toContain("silence.slow");
  });

  it("resolves overlaps by advancing phase start to cursor", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        scalePhasesToBars: false,
        phases: [
          { id: "a", bars: { start: 1, end: 4 }, activeLayers: ["main"] },
          { id: "b", bars: { start: 3, end: 6 }, activeLayers: ["main"] }
        ]
      }
    };
    const code = buildCode(template, { bpm: 120, bars: 6, params: {}, seed: "seed-x" });
    expect(code).toContain(".slow(4)");
    expect(code).toContain(".slow(2)");
    expect(code).not.toContain("silence.slow");
  });

  it("applies override precedence to layer base values", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        scalePhasesToBars: false,
        layers: [
          {
            id: "main",
            kind: "drums",
            render: { type: "drums" },
            patterns: [{ value: "bd" }],
            base: { gain: 0.1 }
          }
        ],
        phases: [
          {
            id: "a",
            bars: { start: 1, end: 1 },
            activeLayers: ["main"],
            overrides: {
              main: { gain: 0.2 }
            }
          }
        ]
      },
      deriveRuntime: () => ({
        layerBase: {
          main: { gain: 0.3 }
        },
        phaseLayerBase: {
          a: {
            main: { gain: 0.4 }
          }
        }
      })
    };
    const code = buildCode(template, { bpm: 120, bars: 1, params: {}, seed: "seed-x" });
    expect(code).toContain(".gain(0.4)");
  });

  it("uses runtime variation override for rotatePatterns", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        scalePhasesToBars: false,
        variation: { rotatePatterns: false },
        layers: [
          {
            id: "main",
            kind: "drums",
            render: { type: "drums" },
            patterns: [{ value: "bd" }, { value: "cp" }],
            base: { gain: 0.5 }
          }
        ],
        phases: [
          { id: "a", bars: { start: 1, end: 1 }, activeLayers: ["main"] },
          { id: "b", bars: { start: 2, end: 2 }, activeLayers: ["main"] }
        ]
      },
      deriveRuntime: () => ({
        variation: { rotatePatterns: true }
      })
    };
    const code = buildCode(template, { bpm: 120, bars: 2, params: {}, seed: "seed-x" });
    expect(code).toContain('s("bd")');
    expect(code).toContain('s("cp")');
  });

  it("applies groove swingBy only to targeted layers", () => {
    const template: TemplateDefinition = {
      ...makeBaseTemplate(),
      rules: {
        ...makeBaseTemplate().rules,
        scalePhasesToBars: false,
        layers: [
          {
            id: "ride",
            kind: "drums",
            render: { type: "drums" },
            patterns: [{ value: "hh*8" }],
            base: { gain: 0.3 }
          },
          {
            id: "kick",
            kind: "drums",
            render: { type: "drums" },
            patterns: [{ value: "bd*2" }],
            base: { gain: 0.4 }
          }
        ],
        phases: [{ id: "a", bars: { start: 1, end: 1 }, activeLayers: ["ride", "kick"] }]
      },
      deriveRuntime: () => ({
        groove: {
          swing: 0.33,
          subdivision: 4,
          layers: ["ride"]
        }
      })
    };
    const code = buildCode(template, { bpm: 120, bars: 1, params: {}, seed: "seed-x" });
    expect(code).toContain('s("hh*8").gain(0.3).swingBy(0.34, 4)');
    expect(code).toContain('s("bd*2").gain(0.4)');
  });
});
