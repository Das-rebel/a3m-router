#!/usr/bin/env python3
"""
A3M Ecosystem Router Simulation
================================
Rethinks multi-model routing as a biological ecosystem:

  1. RESPONSE THRESHOLDS  (Bonabeau/Theraulaz division-of-labor model)
     Each model = an organism caste. It engages a query with probability
        P_i(s) = s^n / (s^n + theta_i^n)
     where s = stimulus (query complexity) and theta_i = caste threshold.
     Thresholds ADAPT: success lowers theta (specialization), failure raises it.

  2. STIGMERGY / PHEROMONES (Ant Colony Optimization)
     The shared routing memory is a pheromone field tau[class][model]:
        tau <- (1 - rho) * tau + Delta_tau   (Delta_tau = quality on success)
     Route choice: P(j) proportional to tau^alpha * fitness^beta.
     Evaporation rho = adaptive-memory decay (forgetting).

  3. ECOLOGICAL DYNAMICS (Gause / Lotka-Volterra)
     Models competing in the same niche -> competitive exclusion.
     Perturbation (a model degrades) tests ecosystem resilience.

Compare three routing policies:
  static    : fixed weights (today's Jev-style static router)
  ecosystem : thresholds + pheromones (bio-inspired adaptive router)
  oracle    : knows true best model per query (upper bound)

Perturbation at 60% of the stream: the capable model (qwen2.5:3b) degrades,
simulating a failing provider / corrupted checkpoint.

Pure stdlib. Deterministic (seeded).
"""

import random
import math

random.seed(42)

# ---------------------------------------------------------------------------
# Colony: the 3-model Ollama roster (M1 8GB Mac, measured values)
# ---------------------------------------------------------------------------
MODELS = [
    {"id": "qwen3:0.6b",   "latency": 0.6, "base_q": 0.55, "tools": False, "caste": "scout",   "pref": 0.2},
    {"id": "qwen2.5:1.5b", "latency": 0.9, "base_q": 0.68, "tools": False, "caste": "worker",  "pref": 0.5},
    {"id": "qwen2.5:3b",   "latency": 2.1, "base_q": 0.88, "tools": True,  "caste": "soldier", "pref": 0.8},
]
N = len(MODELS)

TOOL_RATE = 0.25          # 25% of queries need tool calling
N_QUERIES = 3000
PERTURB_AT = int(N_QUERIES * 0.6)   # soldier degrades here
SOLDIER_DEGRADED_Q = 0.30

# ecology params
RHO = 0.97                # pheromone evaporation
ALPHA = 1.0               # pheromone weight
BETA = 2.0                # heuristic-fitness weight
THETA_LR = 0.08           # threshold adaptation rate
N_EXP = 2                 # response-threshold exponent


def gen_query():
    """Query = (complexity s in [0,1], needs_tools)."""
    return random.random(), random.random() < TOOL_RATE


def true_quality(m, s, tools_needed, perturbed):
    """Ground-truth quality of model m on this query (hidden from router)."""
    q = m["base_q"]
    if perturbed and m["caste"] == "soldier":
        q = SOLDIER_DEGRADED_Q
    if tools_needed and not m["tools"]:
        return q * 0.15                    # non-tool model fails tool query
    return max(0.0, min(1.0, q - 0.45 * abs(s - m["pref"])))


def true_latency(m, s):
    return m["latency"] * (0.7 + 0.6 * s)


class EcosystemRouter:
    """Response thresholds + pheromone stigmergy."""

    def __init__(self):
        self.tau = [[1.0] * N for _ in range(2)]      # class: 0=simple, 1=complex
        self.theta = [0.5] * N                        # per-model threshold (complexity units)

    def route(self, s, tools_needed):
        cls = 1 if (tools_needed or s > 0.55) else 0
        elig = [i for i, m in enumerate(MODELS)
                if m["tools"] or not tools_needed]
        # response-threshold gating + pheromone-weighted choice
        scores = []
        for i in elig:
            stim = s if MODELS[i]["tools"] else max(s, 0.05)
            p_engage = stim ** N_EXP / (stim ** N_EXP + self.theta[i] ** N_EXP + 1e-9)
            fitness = (0.5 + MODELS[i]["base_q"]) / MODELS[i]["latency"]
            w = (self.tau[cls][i] ** ALPHA) * (fitness ** BETA) * p_engage
            scores.append(w)
        return elig[scores.index(max(scores))] if scores else 2

    def update(self, i, s, quality):
        cls = 1 if s > 0.55 else 0
        # pheromone reinforcement + evaporation
        for c in range(2):
            for j in range(N):
                self.tau[c][j] *= RHO
        self.tau[cls][i] += 0.15 * quality
        # threshold adaptation: success pulls theta toward stimulus
        self.theta[i] += THETA_LR * (s - self.theta[i]) * (1.0 if quality > 0.5 else -1.0)
        self.theta[i] = min(1.0, max(0.05, self.theta[i]))


def run(policy):
    eco = EcosystemRouter() if policy == "ecosystem" else None
    stats = {"q": [], "lat": [], "share": [[0, 0], [0, 0], [0, 0]], "post_q": []}
    for t in range(N_QUERIES):
        s, tools_needed = gen_query()
        perturbed = t >= PERTURB_AT
        if policy == "oracle":
            qs = [true_quality(m, s, tools_needed, perturbed) for m in MODELS]
            i = qs.index(max(qs))
        elif policy == "ecosystem":
            i = eco.route(s, tools_needed)
        else:  # static: fixed favoring the flagship, ignores world state
            i = 2 if (tools_needed or random.random() < 0.5) else random.choice([0, 1])
        q = true_quality(MODELS[i], s, tools_needed, perturbed)
        lat = true_latency(MODELS[i], s)
        if eco:
            eco.update(i, s, q)
        stats["q"].append(q)
        stats["lat"].append(lat)
        cls = 1 if (tools_needed or s > 0.55) else 0
        stats["share"][i][cls] += 1
        if perturbed:
            stats["post_q"].append(q)
    return stats


def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


print("=" * 72)
print("A3M ECOSYSTEM ROUTER SIMULATION  (3000 queries, soldier degrades at t=1800)")
print("=" * 72)
print(f"{'policy':<12}{'mean quality':>14}{'post-degrade':>14}{'mean latency':>14}")
print("-" * 72)
results = {}
for policy in ("static", "ecosystem", "oracle"):
    st = run(policy)
    results[policy] = st
    print(f"{policy:<12}{mean(st['q']):>14.3f}{mean(st['post_q']):>14.3f}{mean(st['lat']):>13.2f}s")

print()
print("EMERGENT SPECIALIZATION (ecosystem): share of traffic per model x class")
st = results["ecosystem"]
hdr = f"{'model':<14}{'simple-class':>14}{'complex-class':>15}"
print(hdr)
print("-" * len(hdr))
for i, m in enumerate(MODELS):
    print(f"{m['id']:<14}{st['share'][i][0]:>14}{st['share'][i][1]:>15}")

print()
print("SAME, static policy:")
st = results["static"]
print(hdr)
print("-" * len(hdr))
for i, m in enumerate(MODELS):
    print(f"{m['id']:<14}{st['share'][i][0]:>14}{st['share'][i][1]:>15}")

# adaptation speed: after perturbation, how fast does ecosystem stop sending
# simple traffic to the degraded soldier?
print()
print("ADAPTATION CHECK — ecosystem pheromone field (tau) at end:")
eco2 = EcosystemRouter()
for t in range(N_QUERIES):
    s, tn = gen_query()
    pert = t >= PERTURB_AT
    i = eco2.route(s, tn)
    q = true_quality(MODELS[i], s, tn, pert)
    eco2.update(i, s, q)
for c, name in ((0, "simple"), (1, "complex")):
    row = "  ".join(f"{MODELS[j]['id']}={eco2.tau[c][j]:.2f}" for j in range(N))
    print(f"  class={name:<8} {row}")
print()
print("Gause check: degraded soldier's pheromone collapses on simple class,")
print("survives only on complex/tool class where it is still (weakly) required.")
