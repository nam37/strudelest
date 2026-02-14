import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

export const oldSchoolHipHopTemplate: TemplateDefinition = {
  id: "old-school-hiphop",
  label: "Old School Hip Hop",
  description: "Classic boom bap with hats and light texture.",
  defaults: {
    bpm: 88,
    bars: 64,
    params: {
      grit: 0.55,
      rotate: true
    }
  },
  paramSchema: [
    { key: "grit", type: "number", min: 0, max: 1, step: 0.05 },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    scalePhasesToBars: true,
    variation: { rotatePatterns: true },
    layers: [
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ sd ~ sd", weight: 4 },
          { value: "[~ sd] sd ~ sd", weight: 1 }
        ],
        base: { gain: 0.7 }
      },
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd ~ ~ ~ bd ~ ~ ~", weight: 2 },
          { value: "bd ~ bd ~ ~ ~ bd ~", weight: 2 },
          { value: "bd ~ ~ bd ~ ~ bd ~", weight: 1 }
        ],
        base: { gain: 0.85 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*8", weight: 2 },
          { value: "hh*16", weight: 1 }
        ],
        base: { gain: 0.35 }
      },
      {
        id: "bass",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c2 ~ c2 ~ eb2 ~ c2 ~", weight: 2 },
          { value: "c2 ~ ~ c2 g1 ~ c2 ~", weight: 1 }
        ],
        base: { gain: 0.35 }
      },
      {
        id: "texture",
        kind: "texture",
        render: { type: "drums" },
        patterns: [{ value: "hiss:4*2", weight: 2 }, { value: "hiss:4", weight: 1 }],
        base: { gain: 0.16, slow: 4 }
      }
    ],
    phases: [
      { id: "core", pct: { start: 0, end: 0.2 }, activeLayers: ["kick", "snare", "hats"] },
      { id: "bass", pct: { start: 0.2, end: 0.35 }, activeLayers: ["kick", "snare", "hats", "bass"] },
      { id: "full", pct: { start: 0.35, end: 1 }, activeLayers: ["kick", "snare", "hats", "bass", "texture"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const grit = clamp(0, 1, toNumber(input.params.grit, 0.55));
    const rotate = toBoolean(input.params.rotate, true);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: Number((0.6 + grit * 0.32).toFixed(3)) },
        snare: { gain: Number((0.42 + grit * 0.34).toFixed(3)) },
        hats: { gain: Number((0.18 + grit * 0.24).toFixed(3)) },
        bass: { gain: Number((0.2 + grit * 0.3).toFixed(3)) },
        texture: { gain: Number((0.06 + grit * 0.18).toFixed(3)) }
      },
      phaseLayerBase: {
        core: {
          hats: { gain: Number((0.12 + grit * 0.2).toFixed(3)) }
        },
        full: {
          texture: { gain: Number((0.1 + grit * 0.18).toFixed(3)) }
        }
      }
    };
  }
};

