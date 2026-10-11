# Ecosystem Routing: Rethinking Multi-Model Routing as a Biological Ecosystem

**Status:** Design synthesis (v0.1) · **Repos studied:** [orchestra-research/AI-research-SKILLs](https://github.com/orchestra-research/AI-research-SKILLs) (98 research skills), [openai/miniF2F](https://github.com/openai/miniF2F) (formal math benchmark), [biosimulators/Biosimulators](https://github.com/biosimulators/Biosimulators) (SBML/SED-ML/OMEX simulation standards), plus our own `ARTICLE_Biology_Inspired_Routing.md` and the experimental-evolution literature (S. Dey lab: metapopulation stability, Adaptive Limiter Control, dispersal evolution; M. Mangalam, LBS: movement ecology, scaling laws).

---

## 1. The Gap

Today A3M routes with **static learned weights** (Jev router) + heuristics (diversity penalty, circuit breaker). Three structural gaps remain:

| Gap | Symptom |
|-----|---------|
| **No self-organization** | Routing tables are trained offline; they don't *adapt in-place* to live degradation the way colonies re-task after a nest collapse |
| **No formal guarantees** | Nothing machine-checks that tool queries never hit non-tool models, or that cost stays under budget |
| **No reproducible dynamics lab** | We benchmark end-decisions (RouterArena) but never *simulate the router as a dynamical system* under stress (provider flap, load spikes) |

## 2. The Rethink: router = ecosystem, proofs = theorems, simulation = standardized biology

Each model is an **organism**; query traffic is **resource flux**; the adaptive memory is a **pheromone field**; the provider pool is a **metapopulation**. Three repos supply the three missing layers:

1. **Ecobio layer (collective behavior)** — division of labor, stigmergy, metapopulation stability, dispersal economics → *self-organizing routing*.
2. **Maths layer (miniF2F-style)** — routing invariants become Lean 4 theorems, kernel-checked like olympiad problems → *formal guarantees*. See `formal/RouterInvariants.lean`.
3. **ML + simulation layer (BioSimulators-style)** — router dynamics encoded as SBML/SED-ML, stress studies shipped as COMBINE/OMEX archives → *reproducible router lab*. See `examples/ecosystem-router-sim.py`.

The **Orchestra 98-skill library** provides the research loop that drives all three: ideation → autoresearch → evaluation → paper.

## 3. Mechanism map (biology → router)

Already in A3M (from `ARTICLE_Biology_Inspired_Routing.md` — keep, they were right):

| Biological principle | Router mechanism | Status |
|---|---|---|
| Gause competitive exclusion + plankton paradox | EXP3 diversity penalty on traffic share | ✅ shipped |
| Zahavi handicap principle | cost-as-credible-signal, MVT (mean–variance) tiering | ✅ shipped |
| Ant colony optimization | path reinforcement in adaptive memory | ✅ partial |

New mechanisms from this synthesis:

| Biological principle | Source | Router mechanism |
|---|---|---|
| **Response-threshold division of labor** Pᵢ(s)=sⁿ/(sⁿ+θᵢⁿ) | Bonabeau/Theraulaz ant castes | qwen3:0.6b = *scout caste* (low θ on simple stimuli), qwen2.5:3b = *soldier caste* (tools). θ adapts: success pulls θ toward the stimulus → emergent specialization without a central controller |
| **Stigmergy (pheromone field)** τ←(1−ρ)τ+Δτ | ants; ACO convergence (Dorigo–Gutjahr) | adaptive memory **is** the pheromone matrix τ[class][model]; ρ = memory decay; Δτ = quality-weighted reinforcement |
| **Metapopulation resilience to local perturbation** | Dey lab (arXiv: local perturbations do not affect stability of fruitfly metapopulations) | provider pool = metapopulation; a dead provider is a lost *local population*, not an ecosystem collapse — keep migration corridors (fallback routes) and the fleet self-heals |
| **Adaptive Limiter Control (ALC)** | Dey lab (arXiv: stabilizing populations by ALC) | damped circuit breaker: scale cuts by recent error trend instead of hard thresholds → prevents **routing flap oscillation** when a provider sits near the failure boundary |
| **Density-dependent dispersal** | Dey lab (dispersal kernel / density-dependence in Drosophila) | cloud offloading only at high local *density* (queue depth); dispersal cost = latency + $; non-monotonic kernel warns: both too little and too much offloading lose |
| **Niche expansion & trade-off dilution** | Dey lab (population size dilutes trade-offs) | larger provider fleets dilute specialist trade-offs — generalist routes emerge naturally as the fleet grows; predicts *when* adding providers still helps |
| **Movement ecology / heavy-tailed search** | Mangalam (LBS) themes: Lévy-like vs Brownian search | exploration in model choice should be **heavy-tailed** (rare long probes to distant models), not uniform ε — faster escape from stale optima after distribution shift |
| **Sublinear scaling laws** | Mangalam/West scaling tradition | expect fleet benefit ∝ n^β, β<1 — routing quality saturates; stops over-provisioning providers |

## 4. Mathematical core

- **Threshold dynamics:** θᵢ ← θᵢ + η(s − θᵢ)·σ, σ=+1 on success, −1 on failure.
- **Pheromone routing:** P(j|class) ∝ τ[class][j]^α · fⱼ^β, fⱼ = quality/(latency·cost).
- **Load as Lotka–Volterra with ALC damping:** L̇ᵢ = rᵢLᵢ(1 − ΣLₖ/K) − μᵢEᵢLᵢ, cut cᵢ(t) = cᵢ(t−1)+k·(Eᵢ−E*)·Lᵢ, μᵢ clamped by ALC — oscillation-free degradation response.
- **Convergence:** pheromone dynamics inherit ACO convergence results (stigmergic gradient ascent on route quality).

## 5. Simulation evidence (`examples/ecosystem-router-sim.py`, 3,000 queries, soldier model degrades at t=1800)

| policy | mean quality | **post-degrade quality** | mean latency |
|---|---|---|---|
| static (Jev-style) | 0.487 | **0.271** | 1.58s |
| **ecosystem (thresholds+pheromones)** | 0.420 | **0.336 (+24%)** | **0.97s (−39%)** |
| oracle (upper bound) | 0.624 | 0.466 | 1.69s |

Emergent findings:
1. **Caste specialization without central control** — scout absorbed simple-class traffic (1222), soldier concentrated on complex/tool class (736).
2. **Gause lockout is real:** the mid caste (qwen2.5:1.5b) received zero traffic (τ→0.00) — pheromone greediness alone locks it out. This is precisely why the EXP3 **negative frequency-dependence** (already in A3M) must be layered on top: rarer castes get a fitness credit. Biology predicted the bug and its fix.
3. **Resilience beats raw quality:** ecosystem lost less quality after the soldier degraded and recovered latency 39% faster than static routing — the metapopulation effect in miniature.

## 5.1 ALC circuit-breaker validation (`examples/alc-flap-sim.py`)

Scenario A — borderline provider (true error constant 0.30, observation noise only):

| policy | mean quality | switches | load std |
|---|---|---|---|
| hard breaker | 0.6001 (**latched OFF** — −2.6% forever) | 1 | 0.0804 |
| **ALC** | **0.6159 (oracle parity, −0.02%)** | **0** | **0.0169 (4.8× smoother)** |
| oracle | 0.6160 | 0 | 0 |

Scenario B — degrading provider (error sweeps 0.10→0.40 sinusoidally): all policies make
exactly the 32 *necessary* switches; ALC ramps **15% smoother** (load std 0.4201 vs 0.4968
square wave) at a +0.4% mean-quality premium — the bet-hedging cost of variance reduction.

**Dey-lab ALC claim transfers to routing:** the wide-hysteresis hard breaker has a *sticky
latch* pathology (cut at e>0.30, restore needs e<0.25 — never arrives at borderline), while
narrow hysteresis would chatter. ALC's continuous derating has neither failure mode.

## 6. Formal layer (miniF2F-style) — `formal/RouterInvariants.lean`

Statements to machine-check (miniF2F template: statements are the contract):

- `tool_safety` — queries needing tools never route to non-tool models.
- `no_starvation` — every healthy model receives work infinitely often.
- `bounded_cost` — cumulative spend ≤ budget under pheromone routing.
- `pheromone_positive` — τ>0 preserved by evaporation+reinforcement (dischargeable by induction).
- CI gate: **no kernel-checked proof → no deploy** (proof-carrying routing policy).

## 7. Standardized simulation lab (BioSimulators-style)

- Encode §4 ODEs as **SBML**; stress experiments (provider flap at t=X, 2× load, budget shock) as **SED-ML**; ship results as **COMBINE/OMEX** archives with the RouterArena query mix as the in-silico diet.
- Registry rule borrowed from BioSimulators: any router build must reproduce the OMEX reference trajectories within tolerance to be publishable — same trick that made 100+ biosimulators interoperable.

## 8. Research loop (Orchestra skills mapping)

Ideation → `autoresearch` skill · Hypotheses → this doc §3 · Experiments → OMEX archives · Evaluation → RouterArena + Lean checker · Publication → `ml-paper-writing` skill.

## 9. Roadmap

| Phase | Deliverable |
|---|---|
| P1 | **✅ LANDED (v2.17.0)** — `src/routing/ecosystemRouter.ts`: ALC soft breaker replaces the hard 3-error latch behind `ecosystem.enabled` / `A3M_ECOSYSTEM_ROUTING=1`; pheromone τ + EXP3 anti-lockout mixed into `routeQuery` rescore; effort capped at 0.95 so derated providers self-heal; 14 vitest tests incl. borderline-latch parity (hard latches OFF, ALC never excludes) |
| P2 | ALC-damped circuit breaker (replaces hard threshold) |
| P3 | `RouterInvariants.lean` in CI with Lean 4 + Mathlib; prove `pheromone_positive` first |
| P4 | SBML/SED-ML router lab; publish first OMEX stress study |
| P5 | Scaling-law audit: measure β of fleet-size vs RouterArena score; stop over-provisioning |
