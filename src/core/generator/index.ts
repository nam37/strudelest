import type {
  PieceSpec,
  TemplateDefinition,
  TemplateParam,
  TemplateParamValue
} from "../../types/music";
import { seededRandom } from "./rng";

function nowIso(): string {
  return new Date().toISOString();
}

export function createSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clampNumber(value: number, schema: TemplateParam): number {
  if (schema.min !== undefined && value < schema.min) {
    return schema.min;
  }
  if (schema.max !== undefined && value > schema.max) {
    return schema.max;
  }
  return value;
}

function sampleParam(schema: TemplateParam, random: () => number): TemplateParamValue {
  if (schema.type === "number") {
    const min = schema.min ?? 0;
    const max = schema.max ?? 1;
    const step = schema.step ?? 0.1;
    const steps = Math.max(1, Math.round((max - min) / step));
    const index = Math.floor(random() * (steps + 1));
    const value = min + index * step;
    return Number(clampNumber(value, schema).toFixed(4));
  }
  if (schema.type === "select") {
    const options = schema.options ?? [];
    if (options.length === 0) {
      return "";
    }
    return options[Math.floor(random() * options.length)];
  }
  return random() > 0.5;
}

export function resolveTemplateParams(
  template: TemplateDefinition,
  seed: string,
  overrides: Partial<Record<string, TemplateParamValue>> = {}
): Record<string, TemplateParamValue> {
  const random = seededRandom(seed);
  const resolved: Record<string, TemplateParamValue> = { ...template.defaults.params };

  for (const schema of template.paramSchema) {
    const override = overrides[schema.key];
    if (override !== undefined) {
      resolved[schema.key] =
        schema.type === "number" && typeof override === "number"
          ? clampNumber(override, schema)
          : override;
      continue;
    }
    resolved[schema.key] = sampleParam(schema, random);
  }

  return resolved;
}

export interface GeneratePieceOptions {
  seed?: string;
  bpm?: number;
  bars?: number;
  params?: Partial<Record<string, TemplateParamValue>>;
}

export function generatePiece(
  template: TemplateDefinition,
  options: GeneratePieceOptions = {}
): PieceSpec {
  const seed = options.seed ?? createSeed();
  const bpm = options.bpm ?? template.defaults.bpm;
  const bars = options.bars ?? template.defaults.bars;
  const params = resolveTemplateParams(template, seed, options.params);
  const code = template.buildCode({
    bpm,
    bars,
    params,
    seed
  });

  const timestamp = nowIso();
  return {
    id: crypto.randomUUID(),
    name: `${template.label} Sketch`,
    templateId: template.id,
    bpm,
    bars,
    seed,
    params,
    code,
    createdAt: timestamp,
    updatedAt: timestamp,
    version: 1
  };
}
