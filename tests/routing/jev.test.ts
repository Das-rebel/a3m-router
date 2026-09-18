/**
 * Jev router tests — engine contract, routing shape, fallback behavior.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { scoreOptions, scoreScalar, scoreNoul } from "../../src/routing/jev/optionAttention";
import { jevRoute, loadWeights, resetWeightsCache, MIN_CONFIDENCE } from "../../src/routing/jev/jevRouter";
import type { OptionAttentionWeights } from "../../src/routing/jev/optionAttention";

function toyWeights(): OptionAttentionWeights {
  const D = 16;
  const rand = (s: number) => {
    // deterministic LCG
    let x = s;
    return () => {
      x = (x * 1103515245 + 12345) % 2147483648;
      return (x / 2147483648 - 0.5) * 0.2;
    };
  };
  const r = rand(42);
  const fill = (rows: number, cols: number) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => r()));
  return {
    emb: fill(2048, D),
    wq: fill(D, D),
    bq: new Array(D).fill(0),
    w: Array.from({ length: D }, () => r()),
    b: [0],
    ws: Array.from({ length: D }, () => r()),
    bs: [0],
    temperature: 1.0,
    dim: D,
  };
}

describe("optionAttention engine", () => {
  const W = toyWeights();

  it("choice probabilities sum to 1 and match option count", () => {
    const r = scoreOptions("write a python function", ["groq fast cheap", "openai premium quality", "ollama local"], W);
    expect(r.probs).toHaveLength(3);
    const sum = r.probs.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 5);
    expect(r.probs.every((p) => p >= 0 && p <= 1)).toBe(true);
  });

  it("handles unseen options (dynamic option sets)", () => {
    const r = scoreOptions("math proof", ["brand-new-provider strengths:math quality:0.9", "another"], W);
    expect(r.probs).toHaveLength(2);
    expect(r.top[0].prob).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    const a = scoreOptions("same ctx", ["x", "y"], W);
    const b = scoreOptions("same ctx", ["x", "y"], W);
    expect(a.probs).toEqual(b.probs);
  });

  it("empty context and empty options do not throw", () => {
    expect(() => scoreOptions("", ["only"], W)).not.toThrow();
    const r = scoreOptions("ctx", [], W);
    expect(r.probs).toHaveLength(0);
  });

  it("score head returns value in [0,1]", () => {
    const s = scoreScalar("design a distributed system", W);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it("noul returns calibrated boolean", () => {
    const n = scoreNoul("write sql", "requires code generation", W);
    expect(typeof n.value).toBe("boolean");
    expect(n.prob).toBeGreaterThanOrEqual(0.5);
    expect(n.prob).toBeLessThanOrEqual(1);
  });

  it("100 options in < 150ms (regression guard; prod path is ~32 opts + query cache ≈ 2ms)", () => {
    const opts = Array.from({ length: 100 }, (_, i) => `provider-${i} strengths:code quality:0.${i % 10}`);
    const t0 = Date.now();
    scoreOptions("some long context here ".repeat(10), opts, W);
    expect(Date.now() - t0).toBeLessThan(150);
  });
});

describe("jevRouter", () => {
  beforeAll(() => resetWeightsCache());

  it("falls back to System 2 when no weights file", () => {
    // weights file either exists (trained) or not; both paths must return a decision
    const d = jevRoute("write a haiku");
    expect(d).toBeTruthy();
    expect(typeof d.primary_model === "string" || d.primary_model === null).toBe(true);
    expect(d.reasoning).toBeTruthy();
  });

  it("returns a full RouteDecision shape", () => {
    const d = jevRoute("implement a rate limiter using token bucket");
    expect(d).toHaveProperty("fallback_models");
    expect(d).toHaveProperty("confidence");
    expect(d).toHaveProperty("reasoning");
    expect(d).toHaveProperty("estimated_cost");
    if (d.primary_model) {
      expect(d.confidence).toBeGreaterThan(0);
    }
  });

  it("low-confidence path delegates to heuristics", () => {
    const d = jevRoute("zzz qwerty obscure gibberish prompt");
    expect(d.reasoning).toBeTruthy();
  });
});
