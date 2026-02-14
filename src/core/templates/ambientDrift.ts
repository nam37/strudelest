import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

export const ambientDriftTemplate: TemplateDefinition = {
  id: "ambient-drift",
  label: "Ambient Drift",
  description: "Slow pads and sparse high texture.",
  defaults: {
    bpm: 120,
    bars: 8,
    params: {
      airy: 0.5,
      texture: "soft",
      rotate: false
    }
  },
  paramSchema: [
    { key: "airy", type: "number", min: 0.2, max: 1, step: 0.1 },
    { key: "texture", type: "select", options: ["soft", "glass", "hiss"] },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    layers: [
      {
        id: "pad",
        kind: "melodic",
        render: { type: "notes", instrument: "sawtooth" },
        patterns: [
          { value: "c3 eb3 g3 bb3", weight: 2 },
          { value: "d3 f3 a3 c4", weight: 1 }
        ],
        base: { gain: 0.5, slow: 2 }
      },
      {
        id: "tex-soft",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "soft:4*2" }],
        base: { gain: 0.25, slow: 4 }
      },
      {
        id: "tex-glass",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "glass:4*2" }],
        base: { gain: 0.25, slow: 4 }
      },
      {
        id: "tex-hiss",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "hiss:4*2" }],
        base: { gain: 0.25, slow: 4 }
      }
    ],
    phases: [{ id: "wash", pct: { start: 0, end: 1 }, activeLayers: ["pad", "tex-soft", "tex-glass", "tex-hiss"] }],
    variation: {
      rotatePatterns: false
    }
  },
  deriveRuntime: ({ input }) => {
    const airy = clamp(0.2, 1, toNumber(input.params.airy, 0.5));
    const texture = String(input.params.texture ?? "soft");
    const rotate = toBoolean(input.params.rotate);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        pad: {
          gain: Number(airy.toFixed(3))
        },
        "tex-soft": {
          gain: texture === "soft" ? 0.25 : 0.02
        },
        "tex-glass": {
          gain: texture === "glass" ? 0.25 : 0.02
        },
        "tex-hiss": {
          gain: texture === "hiss" ? 0.25 : 0.02
        }
      }
    };
  }
};

