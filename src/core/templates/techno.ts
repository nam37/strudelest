import type { TemplateDefinition } from "../../types/music";
import { seededRandom } from "../generator/rng";
import { clamp, toBoolean, toNumber } from "./utils";

function round(v: number): number {
  return Number(v.toFixed(3));
}

function pickOne(rng: () => number, options: string[]): string {
  if (options.length === 0) {
    return "";
  }
  return options[Math.floor(rng() * options.length)] ?? options[0];
}

function muteUnselected(
  options: string[],
  keep: string[]
): Record<string, { gain: number }> {
  const keepSet = new Set(keep);
  const out: Record<string, { gain: number }> = {};
  for (const option of options) {
    if (!keepSet.has(option)) {
      out[option] = { gain: 0 };
    }
  }
  return out;
}

export const technoTemplate: TemplateDefinition = {
  id: "techno",
  label: "Techno",
  description:
    "Generic techno word picture: additive groove with seed-varied optional layers, brief tension drop, cycle repeat, and stripped outro.",
  defaults: {
    bpm: 132,
    bars: 64,
    params: {
      rotate: true,
      drive: 0.8,
      brightness: 0.6
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "drive", type: "number", min: 0.2, max: 1, step: 0.05 },
    { key: "brightness", type: "number", min: 0, max: 1, step: 0.05 }
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
          { value: "bd*4", weight: 5 },
          { value: "bd bd bd bd", weight: 1 }
        ],
        base: { gain: 0.92 }
      },
      {
        id: "hat",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ hh ~ hh ~ hh ~ hh", weight: 4 },
          { value: "~ hh ~ hh [~ hh] ~ hh", weight: 2 }
        ],
        base: { gain: 0.3 }
      },
      {
        id: "clap",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ cp ~ cp", weight: 5 },
          { value: "~ cp ~ [~ cp]", weight: 1 }
        ],
        base: { gain: 0.52 }
      },
      {
        id: "bass",
        kind: "melodic",
        render: { type: "notes", instrument: "square" },
        patterns: [
          { value: "c2 ~ c2 ~ c2 ~ c2 ~", weight: 4 },
          { value: "c2 ~ ~ c2 c2 ~ ~ ~", weight: 2 }
        ],
        base: { gain: 0.24 }
      },
      {
        id: "perc",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ perc ~ ~ ~ ~ ~", weight: 3 },
          { value: "~ ~ ~ ~ perc ~ ~ ~", weight: 2 }
        ],
        base: { gain: 0.2 }
      },
      {
        id: "perc-alt",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ perc ~ ~ ~ ~ perc ~", weight: 2 },
          { value: "~ ~ ~ perc ~ ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.18 }
      },
      {
        id: "stab",
        kind: "melodic",
        render: { type: "notes", instrument: "sawtooth" },
        patterns: [
          { value: "~ c4 ~ ~ ~ ~ ~ ~", weight: 3 },
          { value: "~ ~ ~ eb4 ~ ~ ~ ~", weight: 2 }
        ],
        base: { gain: 0.18 }
      },
      {
        id: "stab-alt",
        kind: "melodic",
        render: { type: "notes", instrument: "square" },
        patterns: [
          { value: "~ ~ c4 ~ ~ ~ ~ ~", weight: 2 },
          { value: "~ ~ ~ ~ eb4 ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.16 }
      },
      {
        id: "rumble",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c1 ~ ~ ~ c1 ~ ~ ~", weight: 2 },
          { value: "c1 ~ c1 ~ ~ ~ c1 ~", weight: 1 }
        ],
        base: { gain: 0.12 }
      }
    ],
    phases: [
      { id: "01-kick-lock", bars: { start: 1, end: 4 }, activeLayers: ["kick"] },
      { id: "02-offbeat-hats", bars: { start: 5, end: 8 }, activeLayers: ["kick", "hat"] },
      {
        id: "03-clap-structure",
        bars: { start: 9, end: 12 },
        activeLayers: ["kick", "hat", "clap"]
      },
      {
        id: "04-bass-pulse",
        bars: { start: 13, end: 16 },
        activeLayers: ["kick", "hat", "clap", "bass"]
      },
      {
        id: "05-stab-hook",
        bars: { start: 17, end: 24 },
        activeLayers: ["kick", "hat", "clap", "bass", "stab", "stab-alt", "rumble"]
      },
      {
        id: "06-perc-accent",
        bars: { start: 25, end: 32 },
        activeLayers: ["kick", "hat", "clap", "bass", "stab", "stab-alt", "perc", "perc-alt", "rumble"]
      },
      {
        id: "07-tension-drop",
        bars: { start: 33, end: 34 },
        activeLayers: ["kick", "clap", "bass", "stab", "stab-alt", "perc", "perc-alt", "rumble"]
      },
      {
        id: "08-full-return",
        bars: { start: 35, end: 40 },
        activeLayers: ["kick", "hat", "clap", "bass", "stab", "stab-alt", "perc", "perc-alt", "rumble"]
      },
      {
        id: "09-cycle-variation",
        bars: { start: 41, end: 56 },
        activeLayers: ["kick", "hat", "clap", "bass", "stab", "stab-alt", "perc", "perc-alt", "rumble"]
      },
      {
        id: "10-outro-perc-out",
        bars: { start: 57, end: 58 },
        activeLayers: ["kick", "hat", "clap", "bass", "stab", "stab-alt", "rumble"]
      },
      {
        id: "11-outro-clap-out",
        bars: { start: 59, end: 60 },
        activeLayers: ["kick", "hat", "bass", "stab", "stab-alt", "rumble"]
      },
      {
        id: "12-outro-stab-out",
        bars: { start: 61, end: 62 },
        activeLayers: ["kick", "hat", "bass", "rumble"]
      },
      {
        id: "13-outro-bass-out",
        bars: { start: 63, end: 64 },
        activeLayers: ["kick", "hat"]
      }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const drive = clamp(0.2, 1, toNumber(input.params.drive, 0.8));
    const bright = clamp(0, 1, toNumber(input.params.brightness, 0.6));
    const rng = seededRandom(`${input.seed}:techno:optional`);
    const stabOptions = ["stab", "stab-alt"];
    const percOptions = ["perc", "perc-alt"];
    const chosenStab = pickOne(rng, stabOptions);
    const chosenPerc = pickOne(rng, percOptions);
    const useRumble = rng() < 0.45;

    return {
      variation: { rotatePatterns: rotate },
      layerBase: {
        kick: { gain: round(0.85 + drive * 0.11) },
        hat: { gain: round(0.17 + drive * 0.12 + bright * 0.09) },
        clap: { gain: round(0.32 + drive * 0.2) },
        bass: { gain: round(0.14 + drive * 0.14) },
        stab: { gain: round(0.07 + drive * 0.08 + bright * 0.09) },
        "stab-alt": { gain: round(0.06 + drive * 0.07 + bright * 0.08) },
        perc: { gain: round(0.08 + drive * 0.14 + bright * 0.04) },
        "perc-alt": { gain: round(0.07 + drive * 0.12 + bright * 0.03) },
        rumble: { gain: round(0.05 + drive * 0.08) }
      },
      phaseLayerBase: {
        "05-stab-hook": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "06-perc-accent": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...muteUnselected(percOptions, [chosenPerc]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "07-tension-drop": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...muteUnselected(percOptions, [chosenPerc]),
          ...(useRumble ? {} : { rumble: { gain: 0 } }),
          kick: { gain: round(0.9 + drive * 0.08) }
        },
        "08-full-return": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...muteUnselected(percOptions, [chosenPerc]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "09-cycle-variation": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...muteUnselected(percOptions, [chosenPerc]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "10-outro-perc-out": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "11-outro-clap-out": {
          ...muteUnselected(stabOptions, [chosenStab]),
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        },
        "12-outro-stab-out": {
          ...(useRumble ? {} : { rumble: { gain: 0 } })
        }
      }
    };
  }
};
