import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(value: number): number {
  return Number(value.toFixed(3));
}

export const chillwaveVibesTemplate: TemplateDefinition = {
  id: "chillwave-vibes",
  label: "Chillwave Vibes",
  description: "Laid-back synths, soft drums, nostalgic haze.",
  defaults: {
    bpm: 96,
    bars: 64,
    params: {
      rotate: true,
      haze: 0.75
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "haze", type: "number", min: 0.2, max: 1, step: 0.05 }
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
          { value: "bd ~ bd ~ ~ ~ bd ~", weight: 1 }
        ],
        base: { gain: 0.55 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ sd ~ sd", weight: 3 },
          { value: "~ sd [~ sd] sd", weight: 1 }
        ],
        base: { gain: 0.4 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*8", weight: 2 },
          { value: "~ hh ~ hh ~ ~ hh ~", weight: 1 }
        ],
        base: { gain: 0.22 }
      },
      {
        id: "chords",
        kind: "melodic",
        render: { type: "notes", instrument: "sawtooth" },
        patterns: [
          { value: "c4 eb4 g4 bb4", weight: 2 },
          { value: "ab3 c4 eb4 g4", weight: 1 }
        ],
        base: { gain: 0.2, slow: 2 }
      },
      {
        id: "lead",
        kind: "melodic",
        render: { type: "notes", instrument: "triangle" },
        patterns: [
          { value: "~ g5 ~ ~ ~ eb5 ~ ~", weight: 2 },
          { value: "~ ~ bb5 ~ ~ ~ g5 ~", weight: 1 }
        ],
        base: { gain: 0.1 }
      },
      {
        id: "hiss",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "hiss:4*2", weight: 2 }, { value: "hiss:4", weight: 1 }],
        base: { gain: 0.14, slow: 4 }
      }
    ],
    phases: [
      { id: "bed", pct: { start: 0, end: 0.25 }, activeLayers: ["chords", "hiss"] },
      {
        id: "beat",
        pct: { start: 0.25, end: 0.6 },
        activeLayers: ["kick", "snare", "hats", "chords", "hiss"]
      },
      {
        id: "lift",
        pct: { start: 0.6, end: 1 },
        activeLayers: ["kick", "snare", "hats", "chords", "lead", "hiss"]
      }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const haze = clamp(0.2, 1, toNumber(input.params.haze, 0.75));
    const hazeNorm = (haze - 0.2) / 0.8;

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: round(0.62 - hazeNorm * 0.2) },
        snare: { gain: round(0.5 - hazeNorm * 0.15) },
        hats: { gain: round(0.3 - hazeNorm * 0.1) },
        chords: {
          gain: round(0.14 + hazeNorm * 0.12),
          slow: round(1.5 + hazeNorm * 1.5)
        },
        lead: { gain: round(0.06 + hazeNorm * 0.08) },
        hiss: {
          gain: round(0.09 + hazeNorm * 0.09),
          slow: round(2 + hazeNorm * 4)
        }
      }
    };
  }
};

