#!/usr/bin/env python3
"""
ALC-Damped Circuit Breaker vs Hard-Threshold Breaker (corrected experiment)
===========================================================================
Validates P2 of docs/design/ECOSYSTEM_ROUTING.md.

Biology: Dey-lab Adaptive Limiter Control (ALC) — a small proportional
control removes fluctuations of an oscillating biological population.
Router translation: replace the hard cut/restore circuit breaker with a
continuous derating effort c(t), traffic share a = 1 - c.

Two scenarios expose the two regimes separately:

  A. FLAP TEST (borderline provider) — true error is CONSTANT at e=0.30,
     exactly on the classic threshold. Only observation noise (sigma=0.03)
     moves the estimate. A hard breaker chatters (cut/restore storms);
     ALC settles. Oracle keeps full traffic (0.88*0.70 > 0.60 backup).

  B. TRACKING TEST (degrading provider) — true error sweeps sinusoidally
     0.10..0.40 across the rational crossover (~0.318). The oracle MUST
     toggle (~32 necessary switches over 2000 steps); chatter beyond that
     is wasted switching. ALC should track smoothly with load swings far
     below the hard breaker's square wave.

ALC law:  c_{t+1} = clamp(c_t + k*(e_obs - e_ref), 0, 1),  k = 0.8,
          e_ref = 1 - Q_backup/Q_good ≈ 0.318 (rational crossover).
"""

import math
import random

random.seed(7)

T          = 2000
SIGMA_OBS  = 0.03
Q_GOOD     = 0.88
Q_BACKUP   = 0.60
HARD_CUT, HARD_RESTORE = 0.30, 0.25
EMA_ALPHA  = 0.25
ALC_K      = 0.8
E_REF      = 1 - Q_BACKUP / Q_GOOD


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def e_true_a(t):            # scenario A: constant borderline
    return 0.30


def e_true_b(t):            # scenario B: sinusoidal sweep
    return 0.25 + 0.15 * math.sin(t / 20.0)


def run(policy, e_true):
    q_series, load_series = [], []
    c, ema, cut = 0.0, e_true(0), False
    flaps, prev_on = 0, True
    for t in range(T):
        e = e_true(t)
        e_obs = clamp(e + random.gauss(0, SIGMA_OBS), 0, 1)
        ema += EMA_ALPHA * (e_obs - ema)

        if policy == "none":
            a = 1.0
        elif policy == "hard":
            if ema > HARD_CUT:
                cut = True
            elif ema < HARD_RESTORE:
                cut = False
            a = 0.0 if cut else 1.0
        elif policy == "alc":
            c = clamp(c + ALC_K * (e_obs - E_REF), 0, 1)
            a = 1.0 - c
        else:  # oracle
            a = 1.0 if Q_GOOD * (1 - e) > Q_BACKUP else 0.0

        on = a > 0.5
        if t > 0 and on != prev_on:
            flaps += 1
        prev_on = on
        q_series.append(a * Q_GOOD * (1 - e) + (1 - a) * Q_BACKUP)
        load_series.append(a)
    return q_series, load_series, flaps


def stats(xs):
    m = sum(xs) / len(xs)
    v = sum((x - m) ** 2 for x in xs) / len(xs)
    return m, math.sqrt(v)


for name, e_fn, note in (
    ("A: FLAP TEST  (e = 0.30 constant, noise only)", e_true_a,
     "oracle switches 0x — any switching here is pure chatter"),
    ("B: TRACKING TEST (e sweeps 0.10..0.40 sinusoidally)", e_true_b,
     "oracle switches ~32x — necessary crossings only"),
):
    print("=" * 79)
    print(name)
    print(f"  {note}")
    print("=" * 79)
    print(f"{'policy':<8}{'mean quality':>13}{'quality std':>12}{'switches':>10}{'load std':>10}")
    print("-" * 79)
    base_q = None
    for policy in ("none", "hard", "alc", "oracle"):
        q, load, flaps = run(policy, e_fn)
        mq, sq = stats(q)
        _, sl = stats(load)
        if policy == "oracle":
            base_q = mq
        print(f"{policy:<8}{mq:>13.4f}{sq:>12.4f}{flaps:>10}{sl:>10.4f}")
    print(f"  (oracle mean quality = {base_q:.4f}; gap = policy quality lost vs oracle)")
    print()
