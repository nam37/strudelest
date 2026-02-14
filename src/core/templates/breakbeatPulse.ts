import type { TemplateDefinition } from "../../types/music";
import { toBoolean, toNumber } from "./utils";

export const breakbeatPulseTemplate: TemplateDefinition = {
  id: "breakbeat-pulse",
  label: "Breakbeat Pulse",
  description: "Punchy drums with shuffled hats.",
  defaults: {
    bpm: 120,
    bars: 8,
    params: {
      hatRate: "4",
      snareDrop: false,
      rotate: false
    }
  },
  paramSchema: [
    { key: "hatRate", type: "select", options: ["2", "4", "8"] },
    { key: "snareDrop", type: "boolean" },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    layers: [
      {
        id: "kick",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd*2 [~ bd] bd", weight: 3 },
          { value: "bd [~ bd] ~ bd", weight: 1 }
        ],
        base: { gain: 0.86 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "sd ~ sd ~", weight: 2 },
          { value: "~ sd ~ sd", weight: 1 }
        ],
        base: { gain: 0.56 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*4", weight: 3 },
          { value: "hh*8", weight: 1 }
        ],
        base: { gain: 0.5 }
      }
    ],
    phases: [
      { id: "core", pct: { start: 0, end: 0.4 }, activeLayers: ["kick", "hats"] },
      { id: "full", pct: { start: 0.4, end: 1 }, activeLayers: ["kick", "snare", "hats"] }
    ],
    variation: {
      rotatePatterns: false
    }
  },
  deriveRuntime: ({ input }) => {
    const hatRate = toNumber(input.params.hatRate, 4);
    const snareDrop = toBoolean(input.params.snareDrop);
    const rotate = toBoolean(input.params.rotate);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        hats: {
          fast: Number((hatRate / 4).toFixed(3))
        },
        snare: {
          gain: snareDrop ? 0 : 0.56
        }
      }
    };
  }
};

