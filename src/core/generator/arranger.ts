import type { TemplateDefinition, TemplateParamValue } from "../../types/music";
import { buildCode } from "./render";

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

const SECTION_ENERGY = [0.55, 0.75, 1, 0.7, 0.5];
const MIN_SECTION_BARS = 4;

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

function stripLeadingSetCps(code: string): string {
  return code.replace(/^\s*setcps\([^)]*\);?\s*/i, "").trim();
}

function allocateBars(totalBars: number, weights: number[]): number[] {
  const raw = weights.map((weight) => Math.max(MIN_SECTION_BARS, Math.round(totalBars * weight)));
  let sum = raw.reduce((acc, value) => acc + value, 0);

  while (sum > totalBars) {
    const index = raw.findIndex((value) => value > MIN_SECTION_BARS);
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

function chooseTemplateForSection(baseTemplate: TemplateDefinition): TemplateDefinition {
  // Keep tonal/style identity stable within one long-form piece.
  return baseTemplate;
}

function modulateParams(
  template: TemplateDefinition,
  baseParams: Record<string, TemplateParamValue>,
  sectionIndex: number
): Record<string, TemplateParamValue> {
  const energy = SECTION_ENERGY[sectionIndex] ?? 0.8;
  const output: Record<string, TemplateParamValue> = { ...baseParams };

  for (const schema of template.paramSchema) {
    const current = output[schema.key];
    if (schema.type === "number" && typeof current === "number") {
      const scaled = schema.min + (current - schema.min) * energy;
      output[schema.key] = Math.min(schema.max, Math.max(schema.min, Number(scaled.toFixed(4))));
      continue;
    }
    if (schema.type === "boolean") {
      output[schema.key] = energy > 0.85 ? true : Boolean(current);
    }
  }

  return output;
}

function indentLines(code: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return code
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
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

  const sections: ArrangedSection[] = barPlan.map((bars, sectionIndex) => {
    const sectionSeed = `${options.seed}-${sectionIndex}`;
    const template = chooseTemplateForSection(options.baseTemplate);
    const sectionParams = modulateParams(template, options.baseParams, sectionIndex);
    const sectionCode = buildCode(template, {
      bpm: options.bpm,
      bars,
      params: sectionParams,
      seed: sectionSeed
    });

    return {
      label: blueprint.labels[sectionIndex] ?? `Part ${sectionIndex + 1}`,
      templateId: template.id,
      bars,
      code: stripLeadingSetCps(sectionCode)
    };
  });

  const suiteExprs = sections.map((section) => {
    const expr = section.code.trim();
    if (!expr) {
      return "silence";
    }
    return `(${expr})`;
  });

  const code = `setcps(${(options.bpm / 120).toFixed(3)});\ncat(\n${indentLines(suiteExprs.join(",\n"), 2)}\n)`;

  return {
    code,
    totalBars,
    sections,
    titleTag: `${blueprint.name} ${totalBars}b`
  };
}
