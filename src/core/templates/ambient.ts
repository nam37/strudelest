import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(v: number): number {
  return Number(v.toFixed(3));
}

export const ambientTemplate: TemplateDefinition = {
  id: "ambient",
  label: "Ambient",
  description:
    "Ambient word picture: pad-led drift, slow harmonic shifts, sparse sparkle, and a pad-only fade.",
  defaults: {
    bpm: 74,
    bars: 64,
    params: {
      rotate: true,
      air: 0.7,
      motion: 0.4
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "air", type: "number", min: 0.2, max: 1, step: 0.05 },
    { key: "motion", type: "number", min: 0, max: 1, step: 0.05 }
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
          { value: "c4 eb4 g4 bb4", weight: 4 },
          { value: "ab3 c4 eb4 g4", weight: 3 },
          { value: "f4 ab4 c5 eb5", weight: 2 },
          { value: "bb3 d4 f4 a4", weight: 1 }
        ],
        base: { gain: 0.24 }
      },
      {
        id: "bass",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c2 ~ ~ ~", weight: 4 },
          { value: "c2 ~ g1 ~", weight: 2 },
          { value: "f2 ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.12 }
      },
      {
        id: "texture",
        kind: "texture",
        render: { type: "drums" },
        patterns: [
          { value: "hiss:4*2", weight: 3 },
          { value: "hiss:4", weight: 2 },
          { value: "hiss", weight: 1 }
        ],
        base: { gain: 0.11, slow: 4 }
      },
      {
        id: "sparkle",
        kind: "melodic",
        render: { type: "notes", instrument: "triangle" },
        patterns: [
          { value: "~ c6 ~ ~ ~ g5 ~ ~", weight: 2 },
          { value: "~ ~ eb6 ~ ~ ~ bb5 ~", weight: 2 },
          { value: "~ ~ ~ g5 ~ ~ ~ eb6", weight: 1 }
        ],
        base: { gain: 0.06 }
      }
    ],
    phases: [
      { id: "01-pad-hold", bars: { start: 1, end: 8 }, activeLayers: ["pad"] },
      { id: "02-pad-shift", bars: { start: 9, end: 16 }, activeLayers: ["pad"] },
      { id: "03-bass-under", bars: { start: 17, end: 24 }, activeLayers: ["pad", "bass"] },
      {
        id: "04-texture-in",
        bars: { start: 25, end: 32 },
        activeLayers: ["pad", "bass", "texture"]
      },
      {
        id: "05-sparkle-in",
        bars: { start: 33, end: 40 },
        activeLayers: ["pad", "bass", "texture", "sparkle"]
      },
      {
        id: "06-drift-hold",
        bars: { start: 41, end: 46 },
        activeLayers: ["pad", "bass", "texture", "sparkle"]
      },
      {
        id: "07-sparkle-out",
        bars: { start: 47, end: 50 },
        activeLayers: ["pad", "bass", "texture"]
      },
      {
        id: "08-sparkle-back",
        bars: { start: 51, end: 54 },
        activeLayers: ["pad", "bass", "texture", "sparkle"]
      },
      {
        id: "09-bass-soften",
        bars: { start: 55, end: 58 },
        activeLayers: ["pad", "bass", "texture", "sparkle"]
      },
      {
        id: "10-sparkle-outro-off",
        bars: { start: 59, end: 60 },
        activeLayers: ["pad", "bass", "texture"]
      },
      { id: "11-texture-outro-off", bars: { start: 61, end: 62 }, activeLayers: ["pad", "bass"] },
      { id: "12-pad-only-outro", bars: { start: 63, end: 64 }, activeLayers: ["pad"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const air = clamp(0.2, 1, toNumber(input.params.air, 0.7));
    const motion = clamp(0, 1, toNumber(input.params.motion, 0.4));

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        pad: { gain: round(0.18 + air * 0.12) },
        bass: { gain: round(0.04 + motion * 0.09) },
        texture: { gain: round(0.04 + air * 0.08) },
        sparkle: { gain: round(0.01 + air * 0.03 + motion * 0.03) }
      },
      phaseLayerBase: {
        "09-bass-soften": {
          bass: { gain: round(0.02 + motion * 0.05) }
        },
        "12-pad-only-outro": {
          pad: { gain: round(0.14 + air * 0.07) }
        }
      }
    };
  }
};
