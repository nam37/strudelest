const SET_CPS_REGEX = /setcps\(\s*([0-9]*\.?[0-9]+)\s*\)\s*;?/i;
const SET_BPM_REGEX = /setbpm\(\s*([0-9]*\.?[0-9]+)\s*\)\s*;?/i;
const SET_CPS_GLOBAL_REGEX = /setcps\(\s*[0-9]*\.?[0-9]+\s*\)\s*;?\s*/gi;
const SET_BPM_GLOBAL_REGEX = /setbpm\(\s*[0-9]*\.?[0-9]+\s*\)\s*;?\s*/gi;

function formatCps(value: number): string {
  return value.toFixed(3);
}

export function extractBaseCps(code: string): number {
  const cpsMatch = SET_CPS_REGEX.exec(code);
  if (cpsMatch) {
    return Number(cpsMatch[1]);
  }

  const bpmMatch = SET_BPM_REGEX.exec(code);
  if (bpmMatch) {
    return Number(bpmMatch[1]) / 240;
  }

  return 1;
}

export function computeEffectiveCps(
  baseCps: number,
  speed: number,
  bpmOverrideEnabled: boolean,
  bpmOverride: number
): number {
  if (bpmOverrideEnabled) {
    return (bpmOverride / 240) * speed;
  }
  return baseCps * speed;
}

export function rewriteCodeTempo(code: string, nextCps: number): string {
  const normalized = `setcps(${formatCps(nextCps)});`;

  if (SET_CPS_REGEX.test(code)) {
    return code.replace(SET_CPS_REGEX, normalized);
  }

  if (SET_BPM_REGEX.test(code)) {
    return code.replace(SET_BPM_REGEX, normalized);
  }

  if (!code.trim()) {
    return normalized;
  }

  return `${normalized}\n${code}`;
}

export function stripTempoDirectives(code: string): string {
  return code.replace(SET_CPS_GLOBAL_REGEX, "").replace(SET_BPM_GLOBAL_REGEX, "").trim();
}
