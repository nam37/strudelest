import type { TemplateDefinition, TemplateParamValue } from "../../types/music";
import { generatePiece } from "./index";
import { seededRandom } from "./rng";

export type LengthPreset = "short" | "medium" | "long" | "xl";
export type ArrangementStyle = "arc" | "club" | "cinematic";

interface ArrangementBlueprint {
  name: string;
  weights: number[];
  labels: string[];
}

const BLUEPRINTS: Record<ArrangementStyle, ArrangementBlueprint> = {
  arc: {
    name: "Arc",
    weights: [0.16, 0.2, 0.28, 0.2, 0.16],
    labels: ["Intro", "Lift", "Peak", "Break", "Outro"]
  },
  club: {
    name: "Club",
    weights: [0.2, 0.26, 0.14, 0.26, 0.14],
    labels: ["Intro", "Groove", "Break", "Drop", "Outro"]
  },
  cinematic: {
    name: "Cinematic",
    weights: [0.24, 0.2, 0.2, 0.2, 0.16],
    labels: ["Opening", "Theme", "Pulse", "Surge", "Dissolve"]
  }
};

const LENGTH_TO_BARS: Record<LengthPreset, number> = {
  short: 32,
  medium: 64,
  long: 96,
  xl: 128
};

const DRUM_MOTIFS = [
  "<bd ~ sd ~>*2",
  "<bd [~ bd] sd ~>*2",
  "<bd*2 ~ sd [~ bd]>*2",
  "<~ bd [sd ~] [bd ~]>*2",
  "<bd*2 ~ sd*2 ~>*2"
];

const BASS_MOTIFS = [
  "<0 ~ 0 ~ 0 ~ 2 ~>/2",
  "<0@3 ~ 2 ~ 0 ~ 2 ~>/2",
  "<0 ~ 0 ~ 3 ~ 2 ~>/2",
  "<0 ~ 2 ~ 0 ~ 4 ~>/2",
  "<0 ~ [0 2] ~ 0 ~ 2 ~>/2"
];

const LEAD_MOTIFS = [
  "<~ 0 2 4 ~ 2 0 ~>/2",
  "<0@2 [2 4] 2 [4 2] 0 ~>/2",
  "<~ 4 2 0 ~ 2 4 2>/2",
  "<0 2 4 2 4 2 0 ~>/2",
  "<~ 0 ~ 2 ~ 4 ~ 2>/2"
];

const PAD_MOTIFS = [
  "<[0,2,4] [0,2,4] [1,3,5] [0,2,4]>/2",
  "<[0,2,4] [1,3,5] [0,2,4] [1,3,5]>/2",
  "<[0,2,4] [0,3,5] [1,3,5] [0,2,4]>/2",
  "<[0,2,4] ~ [1,3,5] ~>/2"
];

const ARP_MOTIFS = [
  "<0 2 4 2 0 2 4 2>/2",
  "<0 2 4 5 4 2 0 ~>/2",
  "<0 ~ 2 ~ 4 ~ 2 ~>/2",
  "<0 4 2 4 0 2 4 2>/2",
  "<0 2 ~ 4 2 ~ 0 ~>/2"
];

export interface ArrangedSection {
  label: string;
  templateId: string;
  bars: number;
  code: string;
}

export interface LongFormResult {
  code: string;
  totalBars: number;
  sections: ArrangedSection[];
  titleTag: string;
}

function stripSetCps(code: string): string {
  return code.replace(/^setcps\([^)]+\);\s*/m, "").trim();
}

function allocateBars(totalBars: number, weights: number[]): number[] {
  const raw = weights.map((weight) => Math.max(4, Math.round(totalBars * weight)));
  let sum = raw.reduce((acc, value) => acc + value, 0);
  while (sum > totalBars) {
    const index = raw.findIndex((value) => value > 4);
    if (index === -1) {
      break;
    }
    raw[index] -= 1;
    sum -= 1;
  }
  while (sum < totalBars) {
    raw[raw.length - 1] += 1;
    sum += 1;
  }
  return raw;
}

function energyForSection(index: number): number {
  return [0.45, 0.7, 1, 0.72, 0.5][index] ?? 0.7;
}

function chooseTemplateForSection(
  _templates: TemplateDefinition[],
  baseTemplate: TemplateDefinition,
  _style: ArrangementStyle,
  _sectionIndex: number,
  _random: () => number
): TemplateDefinition {
  // Keep tonal identity stable across long-form sections.
  return baseTemplate;
}

function modulateParams(
  template: TemplateDefinition,
  baseParams: Record<string, TemplateParamValue>,
  sectionIndex: number
): Record<string, TemplateParamValue> {
  const sectionEnergy = [0.55, 0.75, 1, 0.7, 0.5][sectionIndex] ?? 0.8;
  const output: Record<string, TemplateParamValue> = { ...baseParams };

  for (const schema of template.paramSchema) {
    const current = output[schema.key];
    if (schema.type === "number" && typeof current === "number") {
      const min = schema.min ?? 0;
      const max = schema.max ?? 1;
      const scaled = min + (current - min) * sectionEnergy;
      output[schema.key] = Math.min(max, Math.max(min, Number(scaled.toFixed(4))));
      continue;
    }
    if (schema.type === "boolean") {
      output[schema.key] = sectionEnergy > 0.85 ? true : current;
    }
  }
  return output;
}

export interface GenerateLongFormOptions {
  baseTemplate: TemplateDefinition;
  templates: TemplateDefinition[];
  seed: string;
  bpm: number;
  style: ArrangementStyle;
  length: LengthPreset;
  baseParams: Record<string, TemplateParamValue>;
}

export function generateLongFormPiece(options: GenerateLongFormOptions): LongFormResult {
  const blueprint = BLUEPRINTS[options.style];
  const totalBars = LENGTH_TO_BARS[options.length];
  const barPlan = allocateBars(totalBars, blueprint.weights);
  const random = seededRandom(options.seed);

  const sections: ArrangedSection[] = barPlan.map((bars, sectionIndex) => {
    const sectionSeed = `${options.seed}-${sectionIndex}`;
    const template = chooseTemplateForSection(
      options.templates,
      options.baseTemplate,
      options.style,
      sectionIndex,
      random
    );
    const sectionParams = modulateParams(template, options.baseParams, sectionIndex);
    const piece = generatePiece(template, {
      seed: sectionSeed,
      bpm: options.bpm,
      bars,
      params: sectionParams
    });
    return {
      label: blueprint.labels[sectionIndex] ?? `Part ${sectionIndex + 1}`,
      templateId: template.id,
      bars,
      code: stripSetCps(piece.code)
    };
  });

  const scaleByTemplate = options.baseTemplate.id.includes("ambient") ? "d4:major" : "e4:minor";
  const bassScale = options.baseTemplate.id.includes("ambient") ? "d2:major" : "e2:minor";
  const harmonyByStyle: Record<ArrangementStyle, string[]> = {
    arc: ["Em", "C", "G", "D", "Em"],
    club: ["Em", "Em", "G", "D", "Em"],
    cinematic: ["Dm", "Bb", "F", "C", "Dm"]
  };

  const drumBySection = sections.map((_, index) => {
    const energy = energyForSection(index);
    if (energy < 0.55) {
      return DRUM_MOTIFS[0];
    }
    if (energy > 0.9) {
      return DRUM_MOTIFS[4];
    }
    return DRUM_MOTIFS[(index + Math.floor(random() * 2)) % DRUM_MOTIFS.length];
  });

  const bassBySection = sections.map((_, index) => BASS_MOTIFS[(index + 1) % BASS_MOTIFS.length]);
  const leadBySection = sections.map((_, index) =>
    energyForSection(index) < 0.6 ? "~" : LEAD_MOTIFS[(index + 2) % LEAD_MOTIFS.length]
  );
  const arpBySection = sections.map((_, index) =>
    energyForSection(index) < 0.7 ? "~" : ARP_MOTIFS[(index + 1) % ARP_MOTIFS.length]
  );
  const padBySection = sections.map((_, index) => PAD_MOTIFS[index % PAD_MOTIFS.length]);
  const harmonyBySection = sections.map((_, index) => harmonyByStyle[options.style][index % 5]);

  const form = `<${sections.map((section, index) => `${index}@${section.bars}`).join(" ")}>`;
  const sectionDefinitions = sections
    .map(
      (section, index) =>
        `const arr${index} = (${section.code}).slow(${(section.bars / 8).toFixed(3)}).gain(${(0.55 + energyForSection(index) * 0.45).toFixed(2)});`
    )
    .join("\n");
  const arrangementRefs = `[${sections.map((_, index) => `arr${index}`).join(", ")}]`;

  return {
    code:
      `setcps(${(options.bpm / 120).toFixed(3)});\n` +
      `${sectionDefinitions}\n` +
      `const form = "${form}";\n` +
      `const arrangements = ${arrangementRefs};\n` +
      `const drumMotifs = ${JSON.stringify(drumBySection)};\n` +
      `const bassMotifs = ${JSON.stringify(bassBySection)};\n` +
      `const leadMotifs = ${JSON.stringify(leadBySection)};\n` +
      `const arpMotifs = ${JSON.stringify(arpBySection)};\n` +
      `const padMotifs = ${JSON.stringify(padBySection)};\n` +
      `const harmonySections = ${JSON.stringify(harmonyBySection)};\n` +
      `stack(\n` +
      `  form.pickRestart(arrangements),\n` +
      `  form.pickRestart(drumMotifs).s().bank("Linn9000").gain(0.18).room(0.12),\n` +
      `  n(form.pickRestart(bassMotifs))\n` +
      `    .chord(form.pickRestart(harmonySections))\n` +
      `    .mode("root:${bassScale.split(":")[0]}").voicing()\n` +
      `    .s("gm_electric_bass_finger")\n` +
      `    .lpf(360).lpa(.09).lpd(.14).lpenv(2)\n` +
      `    .release(0.08).gain(0.27),\n` +
      `  n(form.pickRestart(arpMotifs))\n` +
      `    .chord(form.pickRestart(harmonySections))\n` +
      `    .mode("above:${scaleByTemplate.split(":")[0]}").voicing()\n` +
      `    .s("triangle")\n` +
      `    .lpf(980).lpa(.05).lpd(.1).lpenv(3)\n` +
      `    .release(0.12).gain(0.09),\n` +
      `  n(form.pickRestart(leadMotifs))\n` +
      `    .chord(form.pickRestart(harmonySections))\n` +
      `    .mode("above:${scaleByTemplate.split(":")[0]}").voicing()\n` +
      `    .s("sawtooth")\n` +
      `    .lpf(1200).lpa(.04).lpd(.08).lpenv(2)\n` +
      `    .release(0.09).gain(0.06),\n` +
      `  n(form.pickRestart(padMotifs))\n` +
      `    .chord(form.pickRestart(harmonySections))\n` +
      `    .anchor("${scaleByTemplate.split(":")[0]}").mode("above").voicing()\n` +
      `    .s("gm_pad_warm")\n` +
      `    .lpf(700).gain(0.09)\n` +
      `)\n` +
      `.room(0.24)`,
    totalBars,
    sections,
    titleTag: `${blueprint.name} ${totalBars}b`
  };
}
