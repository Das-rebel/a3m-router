/**
 * Ecosystem Routing — bio-inspired soft-failure machinery (P1 of docs/design/ECOSYSTEM_ROUTING.md)
 *
 * Three mechanisms, all validated in simulation before landing here:
 *
 * 1. AlcBreaker (Adaptive Limiter Control, Dey lab) — replaces the binary
 *    circuit latch (3 consecutive errors → hard cutoff) with continuous
 *    derating effort c ∈ [0, C_MAX], traffic share a = 1 − c:
 *        c ← clamp(c + k·(e_obs − e_ref), 0, C_MAX)
 *    Sim evidence (examples/alc-flap-sim.py): at borderline error rates the
 *    hard breaker LATCHES OFF permanently (−2.6% quality forever) while ALC
 *    holds oracle parity with 4.8× smoother load. C_MAX is capped at 0.95 so
 *    a saturated provider still receives ~5% probe traffic and self-heals —
 *    no manual resetCircuitBreaker() required.
 *
 * 2. PheromoneField (stigmergy, ACO) — per-provider success memory τ:
 *    on every event all providers evaporate by ρ; successes deposit Δ:
 *        τ_i ← (1−ρ)·τ_i  (+Δ for the successful one)
 *
 * 3. EXP3 mixing (anti-lockout) — final weights mix in a uniform floor:
 *        P = (1−γ)·w_i/Σw + γ/K
 *    Fixes the Gause competitive-exclusion lockout observed in
 *    examples/ecosystem-router-sim.py (a worker caste drove τ→0.00 and
 *    never recovered). Auer et al. 2002.
 *
 * All of this is INERT unless explicitly enabled — via constructor config or
 * env A3M_ECOSYSTEM_ROUTING=1. Flag OFF ⇒ callers keep identical legacy
 * behavior (hard circuit breaker, unmodified scoring).
 */

export interface EcosystemConfig {
  /** Master switch. Default: env A3M_ECOSYSTEM_ROUTING=1, else false. */
  enabled?: boolean;
  /** ALC control gain (sim: 0.8) */
  k?: number;
  /** Rational crossover error rate e_ref (sim: 1 − q_backup/q_good ≈ 0.318) */
  eRef?: number;
  /** Pheromone evaporation factor per event (sim: 0.97) */
  rho?: number;
  /** Pheromone deposit on success */
  delta?: number;
  /** EXP3 uniform exploration mix (default 0.05) */
  gamma?: number;
}

export const DEFAULT_ECOSYSTEM: Required<Omit<EcosystemConfig, 'enabled'>> = {
  k: 0.8,
  eRef: 0.318,
  rho: 0.97,
  delta: 0.35,
  gamma: 0.05,
};

/** Effort cap: a saturated provider keeps a 5% probe share and self-heals. */
export const EFFORT_MAX = 0.95;

const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));

/** ALC soft breaker: continuous derating effort per provider. */
export class AlcBreaker {
  private effort = new Map<string, number>();

  constructor(private k: number, private eRef: number) {}

  recordSuccess(provider: string): void {
    this.step(provider, 0);
  }

  recordFailure(provider: string): void {
    this.step(provider, 1);
  }

  private step(provider: string, eObs: number): void {
    const c = this.effort.get(provider) ?? 0;
    this.effort.set(provider, clamp(c + this.k * (eObs - this.eRef), 0, EFFORT_MAX));
  }

  /** Derated traffic share a = 1 − c ∈ [1−EFFORT_MAX, 1]. */
  getLoadFactor(provider: string): number {
    return 1 - (this.effort.get(provider) ?? 0);
  }

  getEffort(provider: string): number {
    return this.effort.get(provider) ?? 0;
  }

  reset(provider?: string): void {
    provider ? this.effort.delete(provider) : this.effort.clear();
  }
}

/** Stigmergic success memory per provider (τ ≥ 0 always). */
export class PheromoneField {
  private tau = new Map<string, number>();

  constructor(private rho: number, private delta: number) {}

  /** Every event: global evaporation; successes deposit on the chosen one. */
  record(provider: string, success: boolean): void {
    for (const [p, t] of this.tau) {
      this.tau.set(p, (1 - this.rho) * t);
    }
    if (success) {
      const decayed = (1 - this.rho) * (this.tau.get(provider) ?? 0);
      this.tau.set(provider, decayed + this.delta);
    }
  }

  get(provider: string): number {
    return this.tau.get(provider) ?? 0;
  }

  reset(provider?: string): void {
    provider ? this.tau.delete(provider) : this.tau.clear();
  }
}

export interface Scored {
  provider: string;
  score: number;
  [key: string]: unknown;
}

/**
 * EcosystemRouter — composes ALC + pheromone + EXP3 mixing.
 * Consumed by ProviderHealthManager (soft breaker + derated health scores)
 * and advancedRouter.routeQuery (ecosystem rescore before final ranking).
 */
export class EcosystemRouter {
  readonly alc: AlcBreaker;
  readonly pheromone: PheromoneField;
  readonly cfg: Required<EcosystemConfig>;

  constructor(config: EcosystemConfig = {}) {
    this.cfg = {
      enabled: config.enabled ?? process.env.A3M_ECOSYSTEM_ROUTING === '1',
      k: config.k ?? DEFAULT_ECOSYSTEM.k,
      eRef: config.eRef ?? DEFAULT_ECOSYSTEM.eRef,
      rho: config.rho ?? DEFAULT_ECOSYSTEM.rho,
      delta: config.delta ?? DEFAULT_ECOSYSTEM.delta,
      gamma: config.gamma ?? DEFAULT_ECOSYSTEM.gamma,
    };
    this.alc = new AlcBreaker(this.cfg.k, this.cfg.eRef);
    this.pheromone = new PheromoneField(this.cfg.rho, this.cfg.delta);
  }

  recordSuccess(provider: string): void {
    this.alc.recordSuccess(provider);
    this.pheromone.record(provider, true);
  }

  recordFailure(provider: string): void {
    this.alc.recordFailure(provider);
    this.pheromone.record(provider, false);
  }

  /** Soft availability: available while any probe share remains (a > 0). */
  isAvailable(provider: string): boolean {
    return this.alc.getLoadFactor(provider) > 0;
  }

  /**
   * Rescore candidates: score × ALC load factor × bounded pheromone
   * reinforcement, then EXP3 uniform mixing so no available candidate can be
   * starved to zero. Non-positive or fully-derated candidates pass through
   * untouched. Output scores are re-normalized to the original max so
   * downstream consumers (sorts, confidence gaps) keep comparable magnitudes.
   */
  rescore<T extends Scored>(items: T[]): T[] {
    const available = items.filter((i) => i.score > 0 && this.isAvailable(i.provider));
    if (available.length === 0) return items;

    const tauMax = Math.max(...available.map((i) => this.pheromone.get(i.provider)), 1e-9);
    // Bounded pheromone factor ∈ [0.5, 1] — memory biases, never dominates.
    const weights = available.map(
      (i) =>
        i.score *
        this.alc.getLoadFactor(i.provider) *
        (0.5 + 0.5 * (this.pheromone.get(i.provider) / tauMax)),
    );
    const wSum = weights.reduce((s, w) => s + w, 0);
    if (wSum <= 0) return items;

    const K = available.length;
    const mixed = new Map<string, number>();
    available.forEach((item, idx) => {
      mixed.set(
        item.provider,
        (1 - this.cfg.gamma) * (weights[idx] / wSum) + this.cfg.gamma / K,
      );
    });

    const maxMixed = Math.max(...mixed.values());
    const maxScore = Math.max(...available.map((i) => i.score));
    return items.map((item) => {
      const m = mixed.get(item.provider);
      return m === undefined ? item : ({ ...item, score: (m / maxMixed) * maxScore } as T);
    });
  }

  state(provider: string): { effort: number; loadFactor: number; pheromone: number } {
    return {
      effort: this.alc.getEffort(provider),
      loadFactor: this.alc.getLoadFactor(provider),
      pheromone: this.pheromone.get(provider),
    };
  }

  resetProvider(provider: string): void {
    this.alc.reset(provider);
    this.pheromone.reset(provider);
  }

  resetAll(): void {
    this.alc.reset();
    this.pheromone.reset();
  }
}

/** Process-wide router; inert until enabled via env or explicit enable(). */
export const globalEcosystemRouter = new EcosystemRouter();
