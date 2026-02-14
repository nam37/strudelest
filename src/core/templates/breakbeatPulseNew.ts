import type { TemplateDefinition } from "../../types/music";
import { clamp, toBoolean, toNumber } from "./utils";

function round(value: number): number {
  return Number(value.toFixed(3));
}

export const breakbeatPulseNewTemplate: TemplateDefinition = {
  id: "breakbeat-pulse-new",
  label: "Breakbeat Pulse NEW",
  description: "Energetic chopped rhythms with syncopation and fills.",
  defaults: {
    bpm: 132,
    bars: 64,
    params: {
      rotate: true,
      edge: 0.7
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "edge", type: "number", min: 0.2, max: 1, step: 0.05 }
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
          { value: "bd*2 [~ bd] bd", weight: 2 },
          { value: "bd [~ bd] ~ bd", weight: 1 }
        ],
        base: { gain: 0.9 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ sd ~ sd", weight: 2 },
          { value: "~ sd [~ sd] sd", weight: 1 }
        ],
        base: { gain: 0.75 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*16", weight: 2 },
          { value: "[hh*8 ~ hh*8]", weight: 1 }
        ],
        base: { gain: 0.35 }
      },
      {
        id: "perc",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ perc ~ ~ perc ~ perc ~", weight: 2 },
          { value: "perc ~ ~ perc ~ ~ perc ~", weight: 1 }
        ],
        base: { gain: 0.3 }
      }
    ],
    phases: [
      { id: "intro", pct: { start: 0, end: 0.2 }, activeLayers: ["kick", "snare"] },
      { id: "drive", pct: { start: 0.2, end: 0.55 }, activeLayers: ["kick", "snare", "hats"] },
      { id: "full", pct: { start: 0.55, end: 1 }, activeLayers: ["kick", "snare", "hats", "perc"] }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const edge = clamp(0.2, 1, toNumber(input.params.edge, 0.7));
    const edgeNorm = (edge - 0.2) / 0.8;

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: round(0.62 + edgeNorm * 0.32) },
        snare: { gain: round(0.45 + edgeNorm * 0.35) },
        hats: {
          gain: round(0.2 + edgeNorm * 0.2),
          fast: round(0.85 + edgeNorm * 0.9)
        },
        perc: { gain: round(0.16 + edgeNorm * 0.22) }
      }
    };
  }
};

