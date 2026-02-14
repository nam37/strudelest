import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

export const technoDriveTemplate: TemplateDefinition = {
  id: "techno-drive",
  label: "Techno Drive",
  description: "High-energy electronic beats with gradual layering.",
  defaults: {
    bpm: 132,
    bars: 64,
    params: {
      intensity: 0.85,
      hatEnergy: 0.7,
      rotate: true
    }
  },
  paramSchema: [
    { key: "intensity", type: "number", min: 0.2, max: 1, step: 0.05 },
    { key: "hatEnergy", type: "number", min: 0.2, max: 1, step: 0.05 },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    scalePhasesToBars: true,
    variation: { rotatePatterns: true },
    layers: [
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "bd*4", weight: 3 }, { value: "bd bd bd bd", weight: 1 }],
        base: { gain: 0.95 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ hh ~ hh ~ hh ~ hh", weight: 3 },
          { value: "hh*8", weight: 1 }
        ],
        base: { gain: 0.45 }
      },
      {
        id: "clap",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ cp ~ cp", weight: 3 },
          { value: "~ cp [~ cp] cp", weight: 1 }
        ],
        base: { gain: 0.55 }
      },
      {
        id: "perc",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ perc ~ ~ perc ~ ~", weight: 2 },
          { value: "perc ~ ~ perc ~ perc ~ ~", weight: 1 }
        ],
        base: { gain: 0.32 }
      },
      {
        id: "stab",
        kind: "melodic",
        render: { type: "notes", instrument: "sawtooth" },
        patterns: [
          { value: "c4 ~ ~ ~ eb4 ~ ~ ~", weight: 2 },
          { value: "~ g4 ~ ~ ~ bb4 ~ ~", weight: 1 }
        ],
        base: { gain: 0.28 }
      }
    ],
    phases: [
      { id: "foundation", pct: { start: 0, end: 0.12 }, activeLayers: ["kick"] },
      { id: "groove", pct: { start: 0.12, end: 0.35 }, activeLayers: ["kick", "hats", "clap"] },
      { id: "expand", pct: { start: 0.35, end: 1 }, activeLayers: ["kick", "hats", "clap", "perc", "stab"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const intensity = clamp(0.2, 1, toNumber(input.params.intensity, 0.85));
    const hatEnergy = clamp(0.2, 1, toNumber(input.params.hatEnergy, 0.7));
    const rotate = toBoolean(input.params.rotate, true);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: Number((0.65 + intensity * 0.3).toFixed(3)) },
        hats: {
          gain: Number((0.2 + hatEnergy * 0.45).toFixed(3)),
          fast: Number((0.8 + hatEnergy * 0.5).toFixed(3))
        },
        clap: { gain: Number((0.22 + intensity * 0.4).toFixed(3)) },
        perc: { gain: Number((0.12 + intensity * 0.3).toFixed(3)) },
        stab: { gain: Number((0.08 + intensity * 0.28).toFixed(3)) }
      },
      phaseLayerBase: {
        foundation: {
          kick: { gain: Number((0.5 + intensity * 0.25).toFixed(3)) }
        },
        groove: {
          hats: { gain: Number((0.18 + hatEnergy * 0.32).toFixed(3)) }
        },
        expand: {
          stab: { gain: Number((0.12 + intensity * 0.22).toFixed(3)) }
        }
      }
    };
  }
};

