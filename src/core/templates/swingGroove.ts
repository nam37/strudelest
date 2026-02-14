import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(value: number): number {
  return Number(value.toFixed(3));
}

export const swingGrooveTemplate: TemplateDefinition = {
  id: "swing-groove",
  label: "Swing Groove",
  description: "Jazz-inspired swing feel, light kit, walking-ish bass hints.",
  defaults: {
    bpm: 120,
    bars: 64,
    params: {
      rotate: true,
      swing: 0.6
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "swing", type: "number", min: 0.52, max: 0.66, step: 0.01 }
  ],
  rules: {
    scalePhasesToBars: true,
    variation: { rotatePatterns: true },
    layers: [
      {
        id: "ride",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh ~ hh hh ~ hh ~ hh", weight: 2 },
          { value: "hh*8", weight: 1 }
        ],
        base: { gain: 0.22 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ sd ~ ~ ~ sd ~", weight: 2 },
          { value: "~ sd ~ ~ ~ ~ sd ~", weight: 1 }
        ],
        base: { gain: 0.28 }
      },
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd ~ ~ ~ ~ ~ ~ ~", weight: 2 },
          { value: "bd ~ ~ ~ bd ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.2 }
      },
      {
        id: "bass",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c2 d2 eb2 e2", weight: 2 },
          { value: "c2 ~ eb2 ~ g1 ~ bb1 ~", weight: 1 },
          { value: "c2 ~ g1 ~ c2 ~ bb1 ~", weight: 1 }
        ],
        base: { gain: 0.18 }
      }
    ],
    phases: [
      { id: "kit", pct: { start: 0, end: 0.3 }, activeLayers: ["ride", "kick"] },
      { id: "comp", pct: { start: 0.3, end: 0.65 }, activeLayers: ["ride", "kick", "snare"] },
      { id: "full", pct: { start: 0.65, end: 1 }, activeLayers: ["ride", "kick", "snare", "bass"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const swing = clamp(0.52, 0.66, toNumber(input.params.swing, 0.6));
    const swingNorm = (swing - 0.52) / 0.14;
    const swingAmount = round(0.2 + swingNorm * 0.25);

    return {
      variation: { rotatePatterns: rotate },
      groove: {
        swing: swingAmount,
        subdivision: 4,
        layers: ["ride"]
      },
      layerBase: {
        ride: {
          gain: round(0.16 + swingNorm * 0.1),
          fast: round(0.98 + swingNorm * 0.04)
        },
        snare: { gain: round(0.2 + swingNorm * 0.14) },
        kick: { gain: round(0.16 + swingNorm * 0.1) },
        bass: { gain: round(0.14 + swingNorm * 0.1) }
      },
      phaseLayerBase: {
        full: {
          bass: { gain: round(0.18 + swingNorm * 0.1) }
        }
      }
    };
  }
};
