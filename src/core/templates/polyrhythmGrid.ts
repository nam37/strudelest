import type { TemplateDefinition } from "../../types/music";
import { toBoolean, toNumber } from "./utils";

export const polyrhythmGridTemplate: TemplateDefinition = {
  id: "polyrhythm-grid",
  label: "Polyrhythm Grid",
  description: "Interlocked cycles with metric contrast.",
  defaults: {
    bpm: 120,
    bars: 8,
    params: {
      cycleA: "3",
      cycleB: "5",
      rotate: false
    }
  },
  paramSchema: [
    { key: "cycleA", type: "select", options: ["3", "4", "5"] },
    { key: "cycleB", type: "select", options: ["5", "7", "9"] },
    { key: "rotate", type: "boolean" }
  ],
  rules: {
    layers: [
      {
        id: "cycle-a",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "bd*4", weight: 2 },
          { value: "bd bd ~ bd", weight: 1 }
        ],
        base: { gain: 0.85 }
      },
      {
        id: "cycle-b",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "cp*4", weight: 2 },
          { value: "cp ~ cp ~", weight: 1 }
        ],
        base: { gain: 0.55 }
      }
    ],
    phases: [{ id: "grid", pct: { start: 0, end: 1 }, activeLayers: ["cycle-a", "cycle-b"] }],
    variation: {
      rotatePatterns: false
    }
  },
  deriveRuntime: ({ input }) => {
    const cycleA = toNumber(input.params.cycleA, 3);
    const cycleB = toNumber(input.params.cycleB, 5);
    const rotate = toBoolean(input.params.rotate);
    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        "cycle-a": {
          fast: Number((cycleA / 4).toFixed(3))
        },
        "cycle-b": {
          fast: Number((cycleB / 4).toFixed(3))
        }
      }
    };
  }
};

