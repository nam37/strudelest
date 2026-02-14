import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(value: number): number {
  return Number(value.toFixed(3));
}

export const minimalGrooveNewTemplate: TemplateDefinition = {
  id: "minimal-groove-new",
  label: "Minimal Groove NEW",
  description: "Low-key, minimal pulse with lots of space.",
  defaults: {
    bpm: 112,
    bars: 64,
    params: {
      rotate: true,
      space: 0.8
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "space", type: "number", min: 0.2, max: 1, step: 0.05 }
  ],
  rules: {
    scalePhasesToBars: true,
    variation: { rotatePatterns: true },
    layers: [
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd ~ ~ ~ bd ~ ~ ~", weight: 3 },
          { value: "bd ~ ~ bd ~ ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.65 }
      },
      {
        id: "click",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ cp ~ ~ ~ cp ~", weight: 2 },
          { value: "~ cp ~ ~ ~ ~ cp ~", weight: 1 }
        ],
        base: { gain: 0.28 }
      },
      {
        id: "hat",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ hh ~ ~ ~ hh ~ ~", weight: 3 },
          { value: "~ ~ hh ~ ~ ~ hh ~", weight: 1 }
        ],
        base: { gain: 0.18 }
      },
      {
        id: "sub",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c2 ~ ~ ~ c2 ~ ~ ~", weight: 2 },
          { value: "c2 ~ g1 ~ c2 ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.22 }
      },
      {
        id: "texture",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "hiss:4*2", weight: 2 }, { value: "hiss:4", weight: 1 }],
        base: { gain: 0.14, slow: 4 }
      }
    ],
    phases: [
      { id: "intro", pct: { start: 0, end: 0.22 }, activeLayers: ["kick", "texture"] },
      { id: "groove", pct: { start: 0.22, end: 0.55 }, activeLayers: ["kick", "click", "texture"] },
      { id: "full", pct: { start: 0.55, end: 1 }, activeLayers: ["kick", "click", "hat", "sub", "texture"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const space = clamp(0.2, 1, toNumber(input.params.space, 0.8));
    const occupancy = 1 - (space - 0.2) / 0.8;
    const gainScale = 0.45 + occupancy * 0.55;

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: round(0.65 * gainScale) },
        click: { gain: round(0.28 * gainScale) },
        hat: { gain: round(0.18 * gainScale) },
        sub: { gain: round(0.22 * gainScale) },
        texture: {
          gain: round(0.14 * (0.65 + space * 0.35)),
          slow: round(2 + space * 4)
        }
      }
    };
  }
};

