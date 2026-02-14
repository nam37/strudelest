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
      rotate: false,
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
          { value: "bd*2 [~ bd] bd", weight: 3 },
          { value: "bd [~ bd] ~ bd", weight: 1 },
          { value: "bd ~ [~ bd] bd ~ ~ bd ~", weight: 1 }
        ],
        base: { gain: 0.9 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ sd ~ sd", weight: 3 },
          { value: "~ sd [~ sd] sd", weight: 1 },
          { value: "~ sd ~ [~ sd] ~ sd ~ sd", weight: 1 }
        ],
        base: { gain: 0.75 }
      },
      {
        id: "ghostSnare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ sd ~ ~ ~ ~ ~", weight: 3 },
          { value: "~ sd ~ ~ ~ ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.12 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*8", weight: 3 },
          { value: "hh*16", weight: 1 },
          { value: "hh*8 ~ hh*8 ~", weight: 1 },
          { value: "hh*8 [~ oh] hh*8 ~", weight: 1 }
        ],
        base: { gain: 0.35 }
      },
      {
        id: "perc",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~", weight: 2 },
          { value: "~ perc ~ ~ perc ~ perc ~", weight: 2 },
          { value: "perc ~ ~ perc ~ ~ perc ~", weight: 1 },
          { value: "perc [~ perc] ~ perc ~ perc [~ perc] ~", weight: 1 }
        ],
        base: { gain: 0.3 }
      }
    ],
    phases: [
      { id: "intro", bars: { start: 1, end: 4 }, activeLayers: ["kick", "snare"] },
      {
        id: "drive",
        bars: { start: 5, end: 8 },
        activeLayers: ["kick", "snare", "hats"]
      },
      {
        id: "full",
        bars: { start: 9, end: 16 },
        activeLayers: ["kick", "snare", "ghostSnare", "hats", "perc"]
      }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, false);
    const edge = clamp(0.2, 1, toNumber(input.params.edge, 0.7));
    const edgeNorm = (edge - 0.2) / 0.8;
    const swing = round(0.08 + edgeNorm * 0.08);

    return {
      variation: { rotatePatterns: rotate },
      groove: {
        swing,
        subdivision: 4,
        layers: ["hats"]
      },
      layerBase: {
        kick: { gain: round(0.62 + edgeNorm * 0.32) },
        snare: { gain: round(0.45 + edgeNorm * 0.35) },
        ghostSnare: { gain: round(0.05 + edgeNorm * 0.08) },
        hats: { gain: round(0.2 + edgeNorm * 0.18) },
        perc: { gain: round(0.12 + edgeNorm * 0.2) }
      },
      phaseLayerBase: {
        intro: {
          snare: { gain: round(0.42 + edgeNorm * 0.22) }
        },
        drive: {
          hats: { gain: round(0.16 + edgeNorm * 0.15) }
        },
        full: {
          ghostSnare: { gain: round(0.06 + edgeNorm * 0.12) },
          perc: { gain: round(0.16 + edgeNorm * 0.24) }
        }
      }
    };
  }
};
