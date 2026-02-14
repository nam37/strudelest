import type { TemplateParamValue } from "../../types/music";

export function toNumber(value: TemplateParamValue | undefined, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function toBoolean(value: TemplateParamValue | undefined, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

