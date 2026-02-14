import type {
  BuildInput,
  LayerBase,
  LayerRule,
  PatternOption,
  PhaseRule,
  RuleSet,
  RuntimeOverrides,
  TemplateDefinition
} from "../../types/music";

type NormalizedPhase = {
  id: string;
  start: number;
  end: number;
  activeLayers: string[];
  overrides?: PhaseRule["overrides"];
  gap: boolean;
  phaseIndex: number;
};

type AbsolutePhase = {
  id: string;
  start: number;
  end: number;
  activeLayers: string[];
  overrides?: PhaseRule["overrides"];
};

function hashSeedToUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return (): number => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeightedPattern(rng: () => number, items: PatternOption[]): string {
  if (items.length === 0) {
    return "~";
  }
  const total = items.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight ?? 1;
    if (roll <= 0) {
      return item.value;
    }
  }
  return items[items.length - 1].value;
}

function renderLayer(
  layer: LayerRule,
  pattern: string,
  base: LayerBase,
  runtime: RuntimeOverrides
): string {
  const gain = Number.isFinite(base.gain) ? Number(base.gain) : 0.7;
  const swingValue = runtime.groove?.swing;
  const swingLayers = runtime.groove?.layers;
  const swingSubdivision = runtime.groove?.subdivision ?? 4;
  const shouldSwing =
    typeof swingValue === "number" &&
    Number.isFinite(swingValue) &&
    swingValue > 0 &&
    (swingLayers ? swingLayers.includes(layer.id) : layer.kind === "drums");

  if (layer.render.type === "drums") {
    let expr = `s(${JSON.stringify(pattern)})`;
    expr += `.gain(${gain.toFixed(3)})`;
    if (base.slow !== undefined) {
      expr += `.slow(${base.slow})`;
    }
    if (base.fast !== undefined) {
      expr += `.fast(${base.fast})`;
    }
    if (shouldSwing) {
      expr += `.swingBy(${swingValue.toFixed(3)}, ${swingSubdivision})`;
    }
    return expr;
  }

  let expr = `note(${JSON.stringify(pattern)}).s(${JSON.stringify(layer.render.instrument)})`;
  expr += `.gain(${gain.toFixed(3)})`;
  if (base.slow !== undefined) {
    expr += `.slow(${base.slow})`;
  }
  if (base.fast !== undefined) {
    expr += `.fast(${base.fast})`;
  }
  if (shouldSwing) {
    expr += `.swingBy(${swingValue.toFixed(3)}, ${swingSubdivision})`;
  }
  return expr;
}

function clampBar(value: number, bars: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.min(Math.round(value), bars));
}

function toBarRange(phase: PhaseRule, bars: number, scale: number): { start: number; end: number } {
  if (phase.pct) {
    const start = Math.floor(phase.pct.start * bars) + 1;
    const end = Math.floor(phase.pct.end * bars);
    return { start, end: Math.max(start, end) };
  }

  if (!phase.bars) {
    throw new Error(`Phase ${phase.id} is missing bars/pct`);
  }

  if (scale === 1) {
    return {
      start: phase.bars.start,
      end: phase.bars.end
    };
  }

  return {
    start: Math.floor((phase.bars.start - 1) * scale) + 1,
    end: Math.floor(phase.bars.end * scale)
  };
}

function toAbsolutePhases(rules: RuleSet, bars: number): AbsolutePhase[] {
  const hasOnlyPct = rules.phases.length > 0 && rules.phases.every((phase) => phase.pct !== undefined);
  if (hasOnlyPct) {
    const pctPhases = [...rules.phases].sort((a, b) => {
      const aStart = a.pct?.start ?? 0;
      const bStart = b.pct?.start ?? 0;
      return aStart - bStart || a.id.localeCompare(b.id);
    });
    const absolute: AbsolutePhase[] = [];
    let cursor = 1;
    for (let index = 0; index < pctPhases.length; index += 1) {
      const phase = pctPhases[index];
      const next = pctPhases[index + 1];
      const end =
        next === undefined
          ? bars
          : Math.max(
              cursor,
              Math.min(
                bars,
                Math.max(cursor, Math.floor((next.pct?.start ?? 1) * bars) + 1) - 1
              )
            );
      absolute.push({
        id: phase.id,
        start: cursor,
        end,
        activeLayers: phase.activeLayers,
        overrides: phase.overrides
      });
      cursor = end + 1;
    }
    return absolute;
  }

  const scalePhasesToBars = rules.scalePhasesToBars ?? true;
  const maxEnd =
    rules.phases.reduce((max, phase) => {
      if (!phase.bars) {
        return max;
      }
      return Math.max(max, phase.bars.end);
    }, 0) || bars;
  const scale = scalePhasesToBars ? bars / maxEnd : 1;

  return rules.phases.map((phase) => {
    const range = toBarRange(phase, bars, scale);
    return {
      id: phase.id,
      start: clampBar(range.start, bars),
      end: clampBar(range.end, bars),
      activeLayers: phase.activeLayers,
      overrides: phase.overrides
    };
  });
}

function normalizePhases(rules: RuleSet, bars: number): NormalizedPhase[] {
  const absolute = toAbsolutePhases(rules, bars)
    .sort((a, b) => a.start - b.start || a.end - b.end || a.id.localeCompare(b.id));

  const normalized: NormalizedPhase[] = [];
  let cursor = 1;
  let phaseIndex = 0;

  for (const phase of absolute) {
    const start = Math.max(cursor, phase.start);
    const end = phase.end;
    if (start > bars) {
      continue;
    }
    if (end < start) {
      continue;
    }

    if (start > cursor) {
      normalized.push({
        id: `gap-${cursor}-${start - 1}`,
        start: cursor,
        end: start - 1,
        activeLayers: [],
        gap: true,
        phaseIndex
      });
    }

    normalized.push({
      id: phase.id,
      start,
      end,
      activeLayers: phase.activeLayers,
      overrides: phase.overrides,
      gap: false,
      phaseIndex
    });
    phaseIndex += 1;
    cursor = end + 1;
  }

  if (cursor <= bars) {
    normalized.push({
      id: `gap-${cursor}-${bars}`,
      start: cursor,
      end: bars,
      activeLayers: [],
      gap: true,
      phaseIndex
    });
  }

  return normalized;
}

function mergeLayerBase(
  layer: LayerRule,
  phase: NormalizedPhase,
  runtime: RuntimeOverrides
): LayerBase {
  return {
    ...layer.base,
    ...(runtime.layerBase?.[layer.id] ?? {}),
    ...(phase.overrides?.[layer.id] ?? {}),
    ...(runtime.phaseLayerBase?.[phase.id]?.[layer.id] ?? {})
  };
}

function toSafeBars(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.max(1, Math.round(value));
}

export function buildCode(template: TemplateDefinition, input: BuildInput): string {
  const bars = toSafeBars(input.bars);
  const cps = (input.bpm / 120).toFixed(3);
  const rng = mulberry32(hashSeedToUint32(input.seed));
  const runtime = template.deriveRuntime?.({ template, input }) ?? {};
  const phases = normalizePhases(template.rules, bars);
  const rotatePatterns =
    runtime.variation?.rotatePatterns ?? template.rules.variation?.rotatePatterns ?? false;

  const layerById = new Map(template.rules.layers.map((layer) => [layer.id, layer]));
  const basePatternByLayerId: Record<string, string> = {};

  for (const layer of template.rules.layers) {
    basePatternByLayerId[layer.id] = pickWeightedPattern(rng, layer.patterns);
  }

  const phaseExprs = phases.map((phase) => {
    const spanBars = Math.max(1, phase.end - phase.start + 1);
    if (phase.gap) {
      return `silence.slow(${spanBars})`;
    }

    const lines: string[] = [];
    for (const layerId of phase.activeLayers) {
      const layer = layerById.get(layerId);
      if (!layer) {
        continue;
      }
      let pattern = basePatternByLayerId[layer.id] ?? "~";
      if (rotatePatterns && layer.patterns.length > 0) {
        pattern = layer.patterns[phase.phaseIndex % layer.patterns.length].value;
      }
      const mergedBase = mergeLayerBase(layer, phase, runtime);
      lines.push(`  ${renderLayer(layer, pattern, mergedBase, runtime)}`);
    }

    if (lines.length === 0) {
      return `silence.slow(${spanBars})`;
    }
    return `stack(\n${lines.join(",\n")}\n).slow(${spanBars})`;
  });

  if (phaseExprs.length === 0) {
    phaseExprs.push(`silence.slow(${bars})`);
  }

  return `setcps(${cps});
cat(
  ${phaseExprs.join(",\n  ")}
)`;
}
