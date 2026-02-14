import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

export const minimalGrooveTemplate: TemplateDefinition = {
  id: "minimal-groove",
  label: "Minimal Groove",
  description: "Sparse pulse with light variation.",
  defaults: {
    bpm: 120,
    bars: 8,
    params: {
      density: 0.4,
      swing: 0.1,
      rotate: false
    }
  },
  paramSchema: [
    { key: "density", type: "number", min: 0.1, max: 1, step: 0.1 },
    { key: "swing", type: "number", min: 0, max: 0.5, step: 0.05 },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    layers: [
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd ~ bd ~", weight: 3 },
          { value: "bd [~ bd] bd ~", weight: 1 }
        ],
        base: { gain: 0.75 }
      },
      {
        id: "clap",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ cp ~ cp", weight: 3 },
          { value: "~ ~ cp ~", weight: 1 }
        ],
        base: { gain: 0.35 }
      }
    ],
    phases: [
      { id: "foundation", pct: { start: 0, end: 0.5 }, activeLayers: ["kick"] },
      { id: "groove", pct: { start: 0.5, end: 1 }, activeLayers: ["kick", "clap"] }
    ],
    variation: {
      rotatePatterns: false
    }
  },
  deriveRuntime: ({ input }) => {
    const density = clamp(0.1, 1, toNumber(input.params.density, 0.4));
    const swing = clamp(0, 0.5, toNumber(input.params.swing, 0.1));
    const rotate = toBoolean(input.params.rotate);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: {
          gain: Number((0.5 + density * 0.5).toFixed(3))
        },
        clap: {
          gain: Number((0.2 + density * 0.45).toFixed(3)),
          fast: Number((1 + swing).toFixed(3))
        }
      }
    };
  }
};

