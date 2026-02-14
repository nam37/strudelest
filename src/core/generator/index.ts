import type {
  NumberParamSchemaItem,
  ParamSchemaItem,
  PieceSpec,
  TemplateDefinition,
  TemplateParamValue
} from "../../types/music";
import { buildCode } from "./render";
import { seededRandom } from "./rng";

function nowIso(): string {
  return new Date().toISOString();
}

export function createSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clampNumber(value: number, schema: NumberParamSchemaItem): number {
  if (value < schema.min) {
    return schema.min;
  }
  if (value > schema.max) {
    return schema.max;
  }
  return value;
}

function sampleParam(schema: ParamSchemaItem, random: () => number): TemplateParamValue {
  if (schema.type === "number") {
    const min = schema.min;
    const max = schema.max;
    const step = schema.step;
    const steps = Math.max(1, Math.round((max - min) / step));
    const index = Math.floor(random() * (steps + 1));
    const value = min + index * step;
    return Number(clampNumber(value, schema).toFixed(4));
  }
  if (schema.type === "select") {
    const options = schema.options;
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
      if (schema.type === "number") {
        if (typeof override === "number") {
          resolved[schema.key] = clampNumber(override, schema);
          continue;
        }
        resolved[schema.key] = sampleParam(schema, random);
        continue;
      }
      if (schema.type === "select") {
        const candidate = String(override);
        resolved[schema.key] = schema.options.includes(candidate) ? candidate : schema.options[0] ?? "";
        continue;
      }
      resolved[schema.key] = Boolean(override);
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
  const code = buildCode(template, {
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
    version: 2
  };
}
