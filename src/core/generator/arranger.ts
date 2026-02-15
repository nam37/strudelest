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

const SECTION_ENERGY = [0.88, 0.95, 1, 0.94, 0.9];
const MIN_SECTION_BARS = 4;
const PHRASE_BARS = 8;

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
  return code
    .replace(/^\s*setcps\([^)]*\);?\s*/i, "")
    .replace(
      /^\s*const\s+rep\s*=\s*\(n,\s*p\)\s*=>\s*cat\(\.\.\.Array\.from\(\{\s*length:\s*n\s*\},\s*\(\)\s*=>\s*p\)\);\s*/i,
      ""
    )
    .trim();
}

function allocateBars(totalBars: number, weights: number[]): number[] {
  const raw = weights.map((weight) =>
    Math.max(MIN_SECTION_BARS, Math.round((totalBars * weight) / PHRASE_BARS) * PHRASE_BARS)
  );
  let sum = raw.reduce((acc, value) => acc + value, 0);

  while (sum > totalBars) {
    const index = raw.findIndex((value) => value > MIN_SECTION_BARS);
    if (index === -1) {
      break;
    }
    raw[index] -= PHRASE_BARS;
    sum -= PHRASE_BARS;
  }

  while (sum < totalBars) {
    raw[raw.length - 1] += PHRASE_BARS;
    sum += PHRASE_BARS;
  }

  if (sum !== totalBars) {
    raw[raw.length - 1] += totalBars - sum;
  }

  return raw;
}

function chooseTemplateForSection(baseTemplate: TemplateDefinition): TemplateDefinition {
  // Keep tonal/style identity stable within one long-form piece.
  return baseTemplate;
}

function phaseIndexForSection(sectionIndex: number, phaseCount: number): number {
  if (phaseCount <= 1) {
    return 0;
  }
  if (phaseCount === 2) {
    const map = [0, 1, 1, 1, 1];
    return map[sectionIndex] ?? 1;
  }
  const last = phaseCount - 1;
  const preLast = Math.max(1, last - 1);
  const map = [0, 1, last, preLast, last];
  return map[sectionIndex] ?? last;
}

function phaseFocusedTemplate(template: TemplateDefinition, sectionIndex: number): TemplateDefinition {
  const phases = template.rules.phases;
  if (phases.length <= 1) {
    return template;
  }
  const selectedIndex = phaseIndexForSection(sectionIndex, phases.length);
  const selectedPhase = phases[selectedIndex];
  const normalizedPhase =
    selectedPhase.bars !== undefined
      ? {
          ...selectedPhase,
          bars: {
            start: 1,
            end: Math.max(1, selectedPhase.bars.end - selectedPhase.bars.start + 1)
          },
          pct: undefined
        }
      : {
          ...selectedPhase,
          pct: { start: 0, end: 1 },
          bars: undefined
        };
  return {
    ...template,
    rules: {
      ...template.rules,
      phases: [normalizedPhase]
    }
  };
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
      const scaled = current * energy;
      const clamped = Math.min(schema.max, Math.max(schema.min, Number(scaled.toFixed(4))));
      const steps = Math.round((clamped - schema.min) / schema.step);
      const snapped = schema.min + steps * schema.step;
      output[schema.key] = Number(Math.min(schema.max, Math.max(schema.min, snapped)).toFixed(4));
      continue;
    }
    if (schema.type === "boolean") {
      output[schema.key] = Boolean(current);
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
  const motifSeed = `${options.seed}-motif`;

  const sections: ArrangedSection[] = barPlan.map((bars, sectionIndex) => {
    const sectionSeed = `${options.seed}-${sectionIndex}`;
    const template = chooseTemplateForSection(options.baseTemplate);
    const sectionTemplate = phaseFocusedTemplate(template, sectionIndex);
    const sectionParams = modulateParams(template, options.baseParams, sectionIndex);
    const sectionCode = buildCode(sectionTemplate, {
      bpm: options.bpm,
      bars,
      params: sectionParams,
      seed: sectionSeed,
      patternSeed: motifSeed
    });

    return {
      label: blueprint.labels[sectionIndex] ?? `Part ${sectionIndex + 1}`,
      templateId: sectionTemplate.id,
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

  const sectionBlocks = suiteExprs.map((expr, index) => {
    const section = sections[index];
    return `// SECTION ${index + 1}: ${section.label} (${section.bars} bars)\n${expr}`;
  });

  const code = `setcps(${(options.bpm / 120).toFixed(3)});\ncat(\n${indentLines(sectionBlocks.join(",\n\n"), 2)}\n)`;

  return {
    code,
    totalBars,
    sections,
    titleTag: `${blueprint.name} ${totalBars}b`
  };
}
