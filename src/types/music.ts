export type TemplateId = string;
export type PieceId = string;
export type TemplateParamValue = number | string | boolean;

export interface PieceSpec {
  id: PieceId;
  name: string;
  templateId: TemplateId;
  bpm: number;
  bars: number;
  seed: string;
  params: Record<string, TemplateParamValue>;
  code: string;
  createdAt: string;
  updatedAt: string;
  version: 2;
}

export type NumberParamSchemaItem = {
  key: string;
  type: "number";
  min: number;
  max: number;
  step: number;
};

export type SelectParamSchemaItem = {
  key: string;
  type: "select";
  options: string[];
};

export type BooleanParamSchemaItem = {
  key: string;
  type: "boolean";
};

export type ParamSchemaItem = NumberParamSchemaItem | SelectParamSchemaItem | BooleanParamSchemaItem;

export type LayerBase = {
  gain?: number;
  slow?: number;
  fast?: number;
};

export type DrumRender = {
  type: "drums";
};

export type NoteRender = {
  type: "notes";
  instrument: string;
};

export type PatternOption = {
  value: string;
  weight?: number;
};

export type LayerRule = {
  id: string;
  kind: "drums" | "melodic" | "texture";
  render: DrumRender | NoteRender;
  patterns: PatternOption[];
  base: LayerBase;
};

export type PhaseRule = {
  id: string;
  bars?: {
    start: number;
    end: number;
  };
  pct?: {
    start: number;
    end: number;
  };
  activeLayers: string[];
  overrides?: Record<string, Partial<LayerBase>>;
};

export type RuleSet = {
  scalePhasesToBars?: boolean;
  layers: LayerRule[];
  phases: PhaseRule[];
  variation?: {
    rotatePatterns?: boolean;
  };
};

export interface BuildInput {
  bpm: number;
  bars: number;
  params: Record<string, TemplateParamValue>;
  seed: string;
}

export interface BuildContext {
  template: TemplateDefinition;
  input: BuildInput;
}

export type RuntimeOverrides = {
  layerBase?: Record<string, Partial<LayerBase>>;
  phaseLayerBase?: Record<string, Record<string, Partial<LayerBase>>>;
  variation?: {
    rotatePatterns?: boolean;
  };
  groove?: {
    swing?: number;
    subdivision?: number;
    layers?: string[];
  };
};

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  description: string;
  defaults: {
    bpm: number;
    bars: number;
    params: Record<string, TemplateParamValue>;
  };
  paramSchema: ParamSchemaItem[];
  rules: RuleSet;
  deriveRuntime?: (context: BuildContext) => RuntimeOverrides | undefined;
}

export interface SharePayload {
  version: 2;
  templateId: TemplateId;
  bpm: number;
  bars: number;
  seed: string;
  params: Record<string, TemplateParamValue>;
  code?: string;
}
