import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(value: number): number {
  return Number(value.toFixed(3));
}

export const ambientDriftNewTemplate: TemplateDefinition = {
  id: "ambient-drift-new",
  label: "Ambient Drift NEW",
  description: "Ethereal soundscapes for meditation, slow movement, minimal rhythm.",
  defaults: {
    bpm: 80,
    bars: 64,
    params: {
      rotate: true,
      airy: 0.75
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "airy", type: "number", min: 0.2, max: 1, step: 0.05 }
  ],
  rules: {
    scalePhasesToBars: true,
    variation: { rotatePatterns: true },
    layers: [
      {
        id: "pad",
        kind: "melodic",
        render: { type: "notes", instrument: "sawtooth" },
        patterns: [
          { value: "c4 eb4 g4 bb4", weight: 2 },
          { value: "f4 g4 c5 eb5", weight: 1 }
        ],
        base: { gain: 0.22, slow: 4 }
      },
      {
        id: "sparkle",
        kind: "melodic",
        render: { type: "notes", instrument: "triangle" },
        patterns: [
          { value: "~ c6 ~ ~ ~ g5 ~ ~", weight: 2 },
          { value: "~ ~ eb6 ~ ~ ~ bb5 ~", weight: 1 }
        ],
        base: { gain: 0.1, slow: 2 }
      },
      {
        id: "softHits",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ ~ ~ cp ~ ~ ~", weight: 2 },
          { value: "~ ~ ~ ~ ~ ~ cp ~", weight: 1 }
        ],
        base: { gain: 0.08 }
      },
      {
        id: "air",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "hiss:4*2", weight: 2 }, { value: "hiss:4", weight: 1 }],
        base: { gain: 0.16, slow: 4 }
      }
    ],
    phases: [
      { id: "float", pct: { start: 0, end: 0.35 }, activeLayers: ["pad", "air"] },
      { id: "bloom", pct: { start: 0.35, end: 0.7 }, activeLayers: ["pad", "sparkle", "air"] },
      { id: "drift", pct: { start: 0.7, end: 1 }, activeLayers: ["pad", "sparkle", "softHits", "air"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const airy = clamp(0.2, 1, toNumber(input.params.airy, 0.75));
    const airyNorm = (airy - 0.2) / 0.8;

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        pad: {
          gain: round(0.12 + airyNorm * 0.16),
          slow: round(3 + airyNorm * 3)
        },
        sparkle: {
          gain: round(0.04 + airyNorm * 0.12),
          slow: round(1.5 + airyNorm * 2)
        },
        softHits: { gain: round(0.1 - airyNorm * 0.06) },
        air: {
          gain: round(0.08 + airyNorm * 0.14),
          slow: round(3 + airyNorm * 3)
        }
      }
    };
  }
};

