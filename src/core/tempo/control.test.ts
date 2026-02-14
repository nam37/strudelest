import { describe, expect, it } from "vitest";
import { computeEffectiveCps, extractBaseCps, rewriteCodeTempo, stripTempoDirectives } from "./control";

describe("tempo control helpers", () => {
  it("extracts base cps from setcps", () => {
    expect(extractBaseCps('setcps(0.5);\nstack(s("bd"))')).toBe(0.5);
  });

  it("extracts base cps from setbpm", () => {
    expect(extractBaseCps('setbpm(120);\nstack(s("bd"))')).toBe(0.5);
  });

  it("falls back to 1 cps when code has no tempo call", () => {
    expect(extractBaseCps('stack(s("bd"))')).toBe(1);
  });

  it("computes effective cps for multiplier path", () => {
    expect(computeEffectiveCps(0.5, 1.5, false, 120)).toBe(0.75);
  });

  it("computes effective cps for bpm override path", () => {
    expect(computeEffectiveCps(0.5, 1.5, true, 120)).toBe(0.75);
  });

  it("rewrites existing setcps call", () => {
    expect(rewriteCodeTempo('setcps(0.5);\nstack(s("bd"))', 0.75)).toContain("setcps(0.750);");
  });

  it("rewrites existing setbpm call", () => {
    expect(rewriteCodeTempo('setbpm(120);\nstack(s("bd"))', 0.75)).toContain("setcps(0.750);");
  });

  it("prepends setcps when code has no tempo call", () => {
    const next = rewriteCodeTempo('stack(s("bd"))', 0.75);
    expect(next.startsWith("setcps(0.750);")).toBe(true);
  });

  it("strips tempo directives for runtime-controlled playback", () => {
    const stripped = stripTempoDirectives('setcps(1.0);\nsetbpm(120);\nstack(s("bd"))');
    expect(stripped).toBe('stack(s("bd"))');
  });
});
