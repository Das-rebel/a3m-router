#!/usr/bin/env python3
"""
train_jev.py — train the OptionAttention System One router (numpy only, vectorized).

Reads data/jev-distill.jsonl (from tools/distill.mjs), trains:
  - choice head: provider option → calibrated probability   (cross-entropy)
  - score head:  context → complexity in [0,1]              (MSE + sigmoid)
  - noul head:   context+"question" → boolean prob          (CE, 2-way)

Architecture (must match src/routing/jev/optionAttention.ts):
  q_i  = tanh(Wq · meanPool(trigrams(option)) + bq)
  a_ij = softmax_j(q_i · E_j / sqrt(D))
  c_i  = Σ_j a_ij E_j
  s_i  = w · (q_i ⊙ c_i) + b          →  softmax(s/T) = probs

Usage:
    python3 tools/train_jev.py [--epochs 200] [--dim 64] [--lr 0.5]
"""

import argparse
import json
import math
import os
import sys
import time

import numpy as np

VOCAB = 2048
CTX_CAP = 160

def trigram_hash(b0, b1, b2):
    h = 0x811C9DC5
    for c in (b0 & 0xFF, b1 & 0xFF, b2 & 0xFF):
        h = ((h ^ c) * 0x01000193) & 0xFFFFFFFF
    return h % VOCAB

def tokenize(text, cap=CTX_CAP):
    s = " " + text + " "
    out = []
    for i in range(len(s) - 2):
        out.append(trigram_hash(ord(s[i]), ord(s[i+1]), ord(s[i+2])))
        if len(out) >= cap:
            break
    return out or [trigram_hash(32, 32, 32)]

def softmax(x, axis=-1):
    x = x - np.max(x, axis=axis, keepdims=True)
    e = np.exp(x)
    return e / np.maximum(e.sum(axis=axis, keepdims=True), 1e-9)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/jev-distill.jsonl")
    ap.add_argument("--out", default="src/routing/jev/weights/jev-router-weights.json")
    ap.add_argument("--epochs", type=int, default=200)
    ap.add_argument("--dim", type=int, default=64)
    ap.add_argument("--lr", type=float, default=0.5)
    args = ap.parse_args()

    rows = []
    with open(args.data) as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    if not rows:
        sys.exit("no training rows — run tools/distill.mjs first")

    rng = np.random.default_rng(42)
    D = args.dim
    lr = args.lr
    lr_c = args.lr          # choice path
    lr_s = 0.20             # score path

    emb = rng.normal(0, 0.40, (VOCAB, D))
    wq = rng.normal(0, 0.40, (D, D))
    bq = np.zeros(D)
    w = rng.normal(0, 1.2, D)
    b = np.zeros(1)
    ws = rng.normal(0, 0.30, D)
    bs = np.array([0.0])
    temperature = 1.0

    NQ = "requires code generation"
    nq_yes_tok = np.array(tokenize(NQ + " — yes"))
    nq_no_tok = np.array(tokenize(NQ + " — no"))

    labels = np.array([r["label"] for r in rows])
    complexity = np.array([r["complexity"] for r in rows])
    needs_code = np.array([1.0 if r["needs_code"] else 0.0 for r in rows])
    n = len(rows)

    ctx_tok = [np.array(tokenize(r["context"])) for r in rows]
    opt_tok = [[np.array(tokenize(o)) for o in r["options"]] for r in rows]
    opt_lens = np.array([[len(t) for t in orow] for orow in opt_tok], dtype=float)

    scale = 1.0 / math.sqrt(D)
    M = len(rows[0]["options"])

    def forward_choice(i, opt_tokens):
        E = emb[ctx_tok[i]]                              # (T, D)
        Ho = np.stack([emb[ot].mean(axis=0) for ot in opt_tokens])  # (M, D)
        Q = np.tanh(Ho @ wq.T + bq)                      # (M, D)
        S = (Q @ E.T) * scale                            # (M, T)
        A = softmax(S, axis=1)
        C = A @ E                                        # (M, D)
        scores = (Q * C) @ w + b[0]
        return E, Ho, Q, A, C, scores

    print(f"rows={n} options={M} dim={D} epochs={args.epochs} lr={lr}")
    t_start = time.time()
    for epoch in range(args.epochs):
        ce = se = ne = 0.0
        correct = 0
        order = rng.permutation(n)
        for i in order:
            y = labels[i]
            E, Ho, Q, A, C, scores = forward_choice(i, opt_tok[i])
            probs = softmax(scores / temperature)
            ce += -math.log(max(probs[y], 1e-9))
            if int(np.argmax(probs)) == y:
                correct += 1

            # ---- backward (vectorized over options) ----
            ds = probs.copy()
            ds[y] -= 1.0
            ds /= temperature                              # (M,)

            w -= lr_c * ((Q * C) * ds[:, None]).sum(0)     # scoring vector
            b -= lr_c * 0.10 * ds.sum()

            dQ = ds[:, None] * (w * C) * (1 - Q * Q)       # (M, D)
            wq -= lr_c * 0.10 * dQ.T @ Ho
            bq -= lr_c * 0.10 * dQ.sum(0)
            dHo = dQ @ wq                                  # (M, D)

            # option-token embedding grads — one batched np.add.at per row
            flat_idx = np.concatenate([t for t in opt_tok[i]])
            flat_rep = np.concatenate([np.full(len(t), m) for m, t in enumerate(opt_tok[i])])
            vals = (dHo[flat_rep] / opt_lens[i][flat_rep, None])
            np.add.at(emb, flat_idx, -lr_c * 0.10 * vals)

            # context embedding grads: dE = A.T @ dC
            dC = ds[:, None] * (w * Q)                     # (M, D)
            dE = A.T @ dC                                  # (T, D)
            np.add.at(emb, ctx_tok[i], -lr_c * 0.10 * dE)

            # ---- score head ----
            p = E.mean(axis=0)
            z = float(ws @ p + bs[0])
            sig = 1 / (1 + math.exp(-z))
            se += (sig - complexity[i]) ** 2
            gz = (sig - complexity[i]) * sig * (1 - sig)
            ws -= lr_s * gz * p
            bs -= lr_s * gz * 0.10
            np.add.at(emb, ctx_tok[i], -lr_s * 0.05 * (gz * ws) / E.shape[0])

            # ---- noul head (every 4th epoch) ----
            if epoch % 4 == 0:
                yn = 0 if needs_code[i] > 0.5 else 1
                ntoks = [nq_yes_tok, nq_no_tok]
                Hn = np.stack([emb[ot].mean(axis=0) for ot in ntoks])
                Qn = np.tanh(Hn @ wq.T + bq)
                Sn = (Qn @ E.T) * scale
                An = softmax(Sn, axis=1)
                Cn = An @ E
                ns = (Qn * Cn) @ w + b[0]
                npr = softmax(ns)
                ne += -math.log(max(npr[yn], 1e-9))
                gn = npr.copy()
                gn[yn] -= 1.0
                dQn = gn[:, None] * (w * Cn) * (1 - Qn * Qn)
                wq -= lr_c * 0.05 * dQn.T @ Hn
                bq -= lr_c * 0.05 * dQn.sum(0)

        if epoch % 10 == 0 or epoch == args.epochs - 1:
            el = time.time() - t_start
            print(f"epoch {epoch:4d}  CE={ce/n:.4f} (chance={math.log(M):.3f})  "
                  f"SE={se/n:.5f}  NE={ne/n:.4f}  top1={correct/n:.3f}  [{el:.0f}s]")

    # ---------- final eval ----------
    correct = 0
    for i in range(n):
        _, _, _, _, _, scores = forward_choice(i, opt_tok[i])
        if int(np.argmax(scores)) == labels[i]:
            correct += 1
    print(f"FINAL train top-1: {correct/n:.3f}")

    # ---------- temperature calibration on train confidence ----------
    # scale T so mean top-prob lands near the observed accuracy (calibrated)
    gaps = []
    for i in range(0, n, 4):
        _, _, _, _, _, scores = forward_choice(i, opt_tok[i])
        srt = np.sort(scores)[::-1]
        gaps.append(srt[0] - srt[1])
    mean_gap = float(np.mean(gaps)) if gaps else 1.0
    temperature = max(0.25, min(4.0, mean_gap))
    print(f"calibrated temperature: {temperature:.3f}")

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    weights = {
        "emb": emb.tolist(), "wq": wq.tolist(), "bq": bq.tolist(),
        "w": w.tolist(), "b": b.tolist(),
        "ws": ws.tolist(), "bs": bs.tolist(),
        "temperature": temperature, "dim": D,
    }
    with open(args.out, "w") as f:
        json.dump(weights, f)
    print(f"wrote {args.out} ({os.path.getsize(args.out)/1024:.0f} KB)")

if __name__ == "__main__":
    main()
