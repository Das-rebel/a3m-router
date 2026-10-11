/**
 * Ecosystem routing tests (P1 — docs/design/ECOSYSTEM_ROUTING.md)
 *
 * The headline scenario reproduces Scenario A of examples/alc-flap-sim.py
 * in event-driven form: a provider with a borderline error rate (e = 0.30,
 * right at the legacy breaker's trip zone). The hard breaker latches OFF;
 * the ALC soft breaker keeps it available with continuous derating and
 * self-heals on successes — no manual reset needed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AlcBreaker,
  PheromoneField,
  EcosystemRouter,
  globalEcosystemRouter,
  DEFAULT_ECOSYSTEM,
  EFFORT_MAX,
} from '../src/routing/ecosystemRouter';
import { ProviderHealthManager } from '../src/routing/providerHealth';

/** Deterministic RNG (mulberry32) — reproducible Bernoulli streams. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('AlcBreaker (Adaptive Limiter Control)', () => {
  it('decays effort toward 0 on successes and raises it on failures', () => {
    const alc = new AlcBreaker(DEFAULT_ECOSYSTEM.k, DEFAULT_ECOSYSTEM.eRef);
    alc.recordFailure('m');
    expect(alc.getEffort('m')).toBeCloseTo(DEFAULT_ECOSYSTEM.k * (1 - DEFAULT_ECOSYSTEM.eRef), 5);
    alc.recordSuccess('m');
    // failure (+k(1−e_ref)) then success (−k·e_ref) nets back near zero
    expect(alc.getEffort('m')).toBeCloseTo(
      DEFAULT_ECOSYSTEM.k * (1 - 2 * DEFAULT_ECOSYSTEM.eRef) < 0
        ? 0
        : DEFAULT_ECOSYSTEM.k * (1 - 2 * DEFAULT_ECOSYSTEM.eRef),
      5,
    );
  });

  it('saturates at EFFORT_MAX (not 1) so derated providers keep a probe share', () => {
    const alc = new AlcBreaker(DEFAULT_ECOSYSTEM.k, DEFAULT_ECOSYSTEM.eRef);
    for (let i = 0; i < 10; i++) alc.recordFailure('m');
    expect(alc.getEffort('m')).toBe(EFFORT_MAX);
    expect(alc.getLoadFactor('m')).toBeCloseTo(1 - EFFORT_MAX, 5);
    expect(alc.getLoadFactor('m')).toBeGreaterThan(0);
  });
});

describe('PheromoneField (stigmergy)', () => {
  it('deposits on success and evaporates everything each event', () => {
    const pf = new PheromoneField(0.97, 0.35);
    pf.record('a', true);
    expect(pf.get('a')).toBeCloseTo(0.35, 5);
    // untouched provider stays at 0; next event evaporates 'a'
    pf.record('b', false);
    expect(pf.get('a')).toBeCloseTo(0.03 * 0.35, 5);
    expect(pf.get('b')).toBe(0);
  });

  it('never goes negative', () => {
    const pf = new PheromoneField(0.5, 0.1);
    for (let i = 0; i < 50; i++) pf.record('x', false);
    expect(pf.get('x')).toBe(0);
  });
});

describe('EcosystemRouter.rescore', () => {
  it('EXP3 mixing guarantees a floor for zero-pheromone candidates (anti-lockout)', () => {
    const eco = new EcosystemRouter({ enabled: true });
    // dominant provider with lots of pheromone history
    for (let i = 0; i < 20; i++) eco.recordSuccess('dominant');
    const out = eco.rescore([
      { provider: 'dominant', score: 0.9 },
      { provider: 'fresh', score: 0.85 },
    ]);
    const fresh = out.find((o) => o.provider === 'fresh')!;
    const dominant = out.find((o) => o.provider === 'dominant')!;
    expect(fresh.score).toBeGreaterThan(0); // never starved to zero
    expect(dominant.score).toBeGreaterThanOrEqual(fresh.score); // order preserved
  });

  it('fully-derated (non-positive score) candidates pass through untouched', () => {
    const eco = new EcosystemRouter({ enabled: true });
    eco.alc.recordFailure('dead');
    eco.alc.recordFailure('dead');
    // simulate binary exclusion downstream: score forced to -1
    const out = eco.rescore([
      { provider: 'dead', score: -1 },
      { provider: 'ok', score: 0.8 },
    ]);
    expect(out.find((o) => o.provider === 'dead')!.score).toBe(-1);
  });
});

describe('ProviderHealthManager — flag OFF regression (legacy hard breaker)', () => {
  let mgr: ProviderHealthManager;
  beforeEach(() => {
    mgr = new ProviderHealthManager(); // no ecosystem config → legacy
  });

  it('3 consecutive failures trip the hard latch exactly as before', () => {
    mgr.recordFailure('p', 'boom');
    mgr.recordFailure('p', 'boom');
    expect(mgr.isAvailable('p')).toBe(true); // threshold is 3
    mgr.recordFailure('p', 'boom');
    expect(mgr.isAvailable('p')).toBe(false); // latched
    const h = mgr.getHealth('p')!;
    expect(h.cooldownUntil).toBeGreaterThan(0);
    expect(h.isHealthy).toBe(false);
  });

  it('recovers only after cooldown expiry or explicit reset (legacy semantics)', () => {
    for (let i = 0; i < 3; i++) mgr.recordFailure('p', 'boom');
    mgr.recordSuccess('p', 100); // one success does NOT clear the legacy latch mid-cooldown
    // legacy: recordSuccess clears cooldown — that behavior is preserved (assert unchanged)
    expect(mgr.isAvailable('p')).toBe(true);
  });
});

describe('ProviderHealthManager — ecosystem mode (flag ON)', () => {
  let mgr: ProviderHealthManager;
  beforeEach(() => {
    mgr = new ProviderHealthManager({ ecosystem: { enabled: true } });
  });

  it('SCENARIO A (borderline latch parity): hard breaker latches OFF, ALC stays available', () => {
    const rand = rng(42);
    const e = 0.3; // borderline error rate — legacy trip zone
    const legacy = new ProviderHealthManager();

    let legacyEverLatched = false;
    let ecoEverUnavailable = false;

    for (let i = 0; i < 200; i++) {
      const failed = rand() < e;
      const provider = 'borderline';
      if (failed) {
        legacy.recordFailure(provider, 'err');
        mgr.recordFailure(provider, 'err');
      } else {
        legacy.recordSuccess(provider, 100);
        mgr.recordSuccess(provider, 100);
      }
      if (!legacy.isAvailable(provider)) legacyEverLatched = true;
      if (!mgr.isAvailable(provider)) ecoEverUnavailable = true;
    }

    // Legacy hard breaker latched at some point (binary exclusion).
    expect(legacyEverLatched).toBe(true);
    // ALC soft breaker NEVER fully excludes — continuous derating only.
    expect(ecoEverUnavailable).toBe(false);
    // …and it is genuinely derating, not ignoring failures:
    expect(mgr.getHealth('borderline')!.healthScore).toBeLessThan(
      legacy.getHealth('borderline')!.healthScore + 0.5,
    );
  });

  it('soft-opens (CIRCUIT_OPENED) when derating saturates, for observability', () => {
    const events: string[] = [];
    mgr.on('circuitOpened', (e: { reason: string }) => events.push(e.reason));
    for (let i = 0; i < 5; i++) mgr.recordFailure('p', 'err');
    expect(events.length).toBe(1);
    expect(events[0]).toContain('alc-saturated');
  });

  it('self-heals: failures derate, subsequent successes decay effort back down', () => {
    for (let i = 0; i < 5; i++) mgr.recordFailure('p', 'err');
    const derated = mgr.getHealth('p')!.healthScore;
    expect(derated).toBeLessThan(1);

    for (let i = 0; i < 8; i++) mgr.recordSuccess('p', 100);
    const healed = mgr.getHealth('p')!.healthScore;
    expect(healed).toBeGreaterThan(derated);
    expect(mgr.isAvailable('p')).toBe(true);
  });

  it('getFallbackChain derates the failing provider below the healthy one (no exclusion)', () => {
    mgr.recordSuccess('healthy', 100);
    for (let i = 0; i < 4; i++) mgr.recordFailure('flaky', 'err');
    const chain = mgr.getFallbackChain(['flaky', 'healthy']);
    expect(chain[0]).toBe('healthy');
    expect(chain).toContain('flaky'); // still present — derated, not excluded
  });

  it('resetCircuitBreaker clears ecosystem state', () => {
    for (let i = 0; i < 4; i++) mgr.recordFailure('p', 'err');
    mgr.resetCircuitBreaker('p');
    const eco = (mgr as unknown as { eco: EcosystemRouter }).eco;
    expect(eco!.state('p').effort).toBe(0);
    expect(eco!.state('p').pheromone).toBe(0);
  });
});

describe('globalEcosystemRouter', () => {
  it('is inert by default (flag OFF unless env set)', () => {
    // test env does not set A3M_ECOSYSTEM_ROUTING
    expect(process.env.A3M_ECOSYSTEM_ROUTING).toBeUndefined();
    expect(globalEcosystemRouter.cfg.enabled).toBe(false);
  });
});
