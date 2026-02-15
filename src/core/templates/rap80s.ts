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

export const rap80sTemplate: TemplateDefinition = {
  id: "rap-80s",
  label: "80's Rap",
  description:
    "80's rap word picture: kick+snare anchor, seed-varied optional layers, locked hats/ghost swing, and a stripped drum outro.",
  defaults: {
    bpm: 92,
    bars: 64,
    params: {
      rotate: true,
      grit: 0.6,
      swing: 0.2
    }
  },
  paramSchema: [
    { key: "rotate", type: "boolean" },
    { key: "grit", type: "number", min: 0, max: 1, step: 0.05 },
    { key: "swing", type: "number", min: 0, max: 0.3, step: 0.05 }
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
          { value: "bd ~ bd ~ ~ ~ bd ~", weight: 3 },
          { value: "bd ~ ~ bd ~ ~ bd ~", weight: 2 }
        ],
        base: { gain: 0.86 }
      },
      {
        id: "snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ sd ~ sd", weight: 5 },
          { value: "~ sd [~ sd] sd", weight: 1 }
        ],
        base: { gain: 0.72 }
      },
      {
        id: "hats",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "hh*8", weight: 1 }
        ],
        base: { gain: 0.34 }
      },
      {
        id: "hats-feature",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "~ hh ~ hh ~ hh ~ hh", weight: 1 }],
        base: { gain: 0.3 }
      },
      {
        id: "hats-feature-alt",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "~ hh ~ [hh hh] ~ hh ~ hh", weight: 1 }],
        base: { gain: 0.28 }
      },
      {
        id: "bass",
        kind: "melodic",
        render: { type: "notes", instrument: "sine" },
        patterns: [
          { value: "c2 ~ c2 ~ eb2 ~ c2 ~", weight: 3 },
          { value: "c2 ~ ~ c2 g1 ~ c2 ~", weight: 2 }
        ],
        base: { gain: 0.3 }
      },
      {
        id: "ghost-snare",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ sd ~ ~ ~ ~ ~", weight: 3 },
          { value: "~ sd ~ ~ ~ ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.08 }
      },
      {
        id: "ghost-snare-alt",
        kind: "drums",
        render: { type: "drums" },
        patterns: [
          { value: "~ ~ ~ sd ~ ~ ~ ~", weight: 3 },
          { value: "~ ~ sd ~ ~ ~ ~ ~", weight: 1 }
        ],
        base: { gain: 0.08 }
      },
      {
        id: "clap",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "~ cp ~ cp", weight: 1 }],
        base: { gain: 0.28 }
      },
      {
        id: "clap-soft",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "~ ~ cp ~ ~ ~ cp ~", weight: 1 }],
        base: { gain: 0.2 }
      },
      {
        id: "adlib-hat",
        kind: "drums",
        render: { type: "drums" },
        patterns: [{ value: "~ ~ hh ~ ~ ~ ~ hh", weight: 1 }],
        base: { gain: 0.16 }
      },
      {
        id: "texture",
        kind: "texture",
        render: { type: "drums" },
        patterns: [
          { value: "hiss:4", weight: 2 },
          { value: "hiss", weight: 1 }
        ],
        base: { gain: 0.08, slow: 4 }
      },
      {
        id: "texture-alt",
        kind: "texture",
        render: { type: "drums" },
        patterns: [
          { value: "hiss:4*2", weight: 2 },
          { value: "hiss:8", weight: 1 }
        ],
        base: { gain: 0.07, slow: 4 }
      }
    ],
    phases: [
      { id: "01-kick-snare-anchor", bars: { start: 1, end: 8 }, activeLayers: ["kick", "snare"] },
      { id: "02-hats-in", bars: { start: 9, end: 16 }, activeLayers: ["kick", "snare", "hats"] },
      {
        id: "03-bass-a",
        bars: { start: 17, end: 24 },
        activeLayers: ["kick", "snare", "hats", "bass"]
      },
      {
        id: "04-bass-b",
        bars: { start: 25, end: 32 },
        activeLayers: ["kick", "snare", "hats", "bass"]
      },
      {
        id: "05-ghost-clap",
        bars: { start: 33, end: 40 },
        activeLayers: [
          "kick",
          "snare",
          "hats",
          "bass",
          "ghost-snare",
          "ghost-snare-alt",
          "clap",
          "clap-soft",
          "adlib-hat"
        ]
      },
      {
        id: "06-texture-in",
        bars: { start: 41, end: 56 },
        activeLayers: [
          "kick",
          "snare",
          "hats-feature",
          "hats-feature-alt",
          "bass",
          "ghost-snare",
          "ghost-snare-alt",
          "texture",
          "texture-alt",
          "adlib-hat"
        ]
      },
      {
        id: "07-outro-drums",
        bars: { start: 57, end: 64 },
        activeLayers: ["kick", "snare", "hats"]
      }
    ]
  },
  deriveRuntime: ({ input }) => {
    const rotate = toBoolean(input.params.rotate, true);
    const grit = clamp(0, 1, toNumber(input.params.grit, 0.6));
    const swing = clamp(0, 0.3, toNumber(input.params.swing, 0.2));
    const rng = seededRandom(`${input.seed}:rap80s:optional`);

    const ghostOptions = ["ghost-snare", "ghost-snare-alt"];
    const clapOptions = ["clap", "clap-soft"];
    const textureOptions = ["texture", "texture-alt"];
    const hatFeatureOptions = ["hats-feature", "hats-feature-alt"];
    const chosenGhost = pickOne(rng, ghostOptions);
    const chosenClap = pickOne(rng, clapOptions);
    const chosenHatFeature = pickOne(rng, hatFeatureOptions);
    const chosenTexture = pickOne(rng, textureOptions);
    const useDualTexture = rng() < 0.25;
    const keepTextures = useDualTexture ? textureOptions : [chosenTexture];
    const useAdlibHat = rng() < 0.45;

    return {
      variation: { rotatePatterns: rotate },
      groove: {
        swing: round(0.14 + swing * 0.4),
        subdivision: 8,
        layers: ["hats", "hats-feature", "hats-feature-alt", "ghost-snare", "ghost-snare-alt", "adlib-hat"]
      },
      layerBase: {
        kick: { gain: round(0.68 + grit * 0.24) },
        snare: { gain: round(0.48 + grit * 0.26) },
        hats: { gain: round(0.18 + grit * 0.16) },
        "hats-feature": { gain: round(0.16 + grit * 0.14) },
        "hats-feature-alt": { gain: round(0.15 + grit * 0.13) },
        bass: { gain: round(0.12 + grit * 0.2) },
        "ghost-snare": { gain: round(0.04 + grit * 0.04) },
        "ghost-snare-alt": { gain: round(0.03 + grit * 0.05) },
        clap: { gain: round(0.1 + grit * 0.12) },
        "clap-soft": { gain: round(0.07 + grit * 0.1) },
        "adlib-hat": { gain: round(0.06 + grit * 0.08) },
        texture: { gain: round(0.02 + grit * 0.07) },
        "texture-alt": { gain: round(0.02 + grit * 0.06) }
      },
      phaseLayerBase: {
        "04-bass-b": {
          bass: { gain: round(0.14 + grit * 0.18) }
        },
        "05-ghost-clap": {
          ...muteUnselected(ghostOptions, [chosenGhost]),
          ...muteUnselected(clapOptions, [chosenClap]),
          ...(useAdlibHat ? {} : { "adlib-hat": { gain: 0 } })
        },
        "06-texture-in": {
          ...muteUnselected(ghostOptions, [chosenGhost]),
          ...muteUnselected(hatFeatureOptions, [chosenHatFeature]),
          ...muteUnselected(textureOptions, keepTextures),
          ...(useAdlibHat ? {} : { "adlib-hat": { gain: 0 } }),
          bass: { gain: round(0.1 + grit * 0.16) }
        }
      }
    };
  }
};
