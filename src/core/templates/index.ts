import type { TemplateDefinition } from "../../types/music";

export const templates: TemplateDefinition[] = [
  {
    id: "minimal-groove",
    label: "Minimal Groove",
    description: "Sparse pulse with light variation.",
    defaults: {
      bpm: 120,
      bars: 8,
      params: {
        density: 0.4,
        swing: 0.1
      }
    },
    paramSchema: [
      { key: "density", type: "number", min: 0.1, max: 1, step: 0.1 },
      { key: "swing", type: "number", min: 0, max: 0.5, step: 0.05 }
    ],
    buildCode: ({ bpm, params }) =>
      `setcps(${(bpm / 120).toFixed(3)});\nstack(\n  s("bd ~ bd ~").gain(${params.density}),\n  s("~ cp ~ cp").gain(${(0.35 + Number(params.swing) * 0.8).toFixed(3)})\n)`
  },
  {
    id: "ambient-drift",
    label: "Ambient Drift",
    description: "Slow pads and sparse high texture.",
    defaults: {
      bpm: 120,
      bars: 8,
      params: {
        airy: 0.5,
        texture: "soft"
      }
    },
    paramSchema: [
      { key: "airy", type: "number", min: 0.2, max: 1, step: 0.1 },
      { key: "texture", type: "select", options: ["soft", "glass", "hiss"] }
    ],
    buildCode: ({ bpm, params }) =>
      `setcps(${(bpm / 120).toFixed(3)});\nstack(\n  note("c3 eb3 g3 bb3").slow(2).s("sawtooth").gain(${params.airy}),\n  s("${params.texture}:4*2").slow(4).gain(0.25)\n)`
  },
  {
    id: "breakbeat-pulse",
    label: "Breakbeat Pulse",
    description: "Punchy drums with shuffled hats.",
    defaults: {
      bpm: 120,
      bars: 8,
      params: {
        hatRate: 4,
        snareDrop: false
      }
    },
    paramSchema: [
      { key: "hatRate", type: "select", options: ["2", "4", "8"] },
      { key: "snareDrop", type: "boolean" }
    ],
    buildCode: ({ bpm, params }) =>
      `setcps(${(bpm / 120).toFixed(3)});\nstack(\n  s("bd*2 [~ bd] bd"),\n  s("${params.snareDrop ? "~" : "sd"} ~ sd ~"),\n  s("hh*${params.hatRate}").gain(0.5)\n)`
  },
  {
    id: "polyrhythm-grid",
    label: "Polyrhythm Grid",
    description: "Interlocked cycles with metric contrast.",
    defaults: {
      bpm: 120,
      bars: 8,
      params: {
        cycleA: "3",
        cycleB: "5"
      }
    },
    paramSchema: [
      { key: "cycleA", type: "select", options: ["3", "4", "5"] },
      { key: "cycleB", type: "select", options: ["5", "7", "9"] }
    ],
    buildCode: ({ bpm, params }) =>
      `setcps(${(bpm / 120).toFixed(3)});\nstack(\n  s("bd*${params.cycleA}").gain(0.85),\n  s("cp*${params.cycleB}").gain(0.55)\n)`
  }
];
