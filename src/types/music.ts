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
  version: 1;
}

export interface TemplateParam {
  key: string;
  type: "number" | "select" | "boolean";
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  description: string;
  defaults: {
    bpm: number;
    bars: number;
    params: Record<string, TemplateParamValue>;
  };
  paramSchema: TemplateParam[];
  buildCode: (input: {
    bpm: number;
    bars: number;
    params: Record<string, TemplateParamValue>;
    seed: string;
  }) => string;
}

export interface SharePayload {
  version: 1;
  templateId: TemplateId;
  bpm: number;
  bars: number;
  seed: string;
  params: Record<string, TemplateParamValue>;
  code?: string;
}
