#!/usr/bin/env python3
"""
calibrate_temp.py — post-train temperature calibration + weight rounding.

Binary-searches temperature so mean(top_prob) on the distillation corpus ≈
TARGET (slightly below train accuracy → honest calibration), then rounds all
floats to 4 decimals (≈2× smaller JSON) and rewrites the weights file.

Usage: python3 tools/calibrate_temp.py [--target 0.90]
"""

import argparse
import json
import math
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from train_jev import tokenize, softmax  # reuse exact tokenizer

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default="data/jev-distill.jsonl")
    ap.add_argument("--weights", default="src/routing/jev/weights/jev-router-weights.json")
    ap.add_argument("--target", type=float, default=0.90)
    args = ap.parse_args()

    with open(args.weights) as f:
        W = json.load(f)
    emb = np.array(W["emb"]); wq = np.array(W["wq"]); bq = np.array(W["bq"])
    w = np.array(W["w"]); b = np.array(W["b"]); D = W["dim"]
    scale = 1.0 / math.sqrt(D)

    rows = [json.loads(l) for l in open(args.data) if l.strip()]
    ctx_tok = [np.array(tokenize(r["context"])) for r in rows]
    labels = np.array([r["label"] for r in rows])

    # precompute all scores once (temperature-independent)
    all_scores = []
    for i, r in enumerate(rows):
        E = emb[ctx_tok[i]]
        Ho = np.stack([emb[np.array(tokenize(o))].mean(axis=0) for o in r["options"]])
        Q = np.tanh(Ho @ wq.T + bq)
        A = softmax((Q @ E.T) * scale, axis=1)
        C = A @ E
        all_scores.append((Q * C) @ w + b[0])
    acc = float(np.mean([int(np.argmax(s)) == y for s, y in zip(all_scores, labels)]))
    print(f"train top-1 (T=1): {acc:.3f}")

    def mean_top_prob(T):
        ps = [softmax(s / T) for s in all_scores]
        return float(np.mean([p.max() for p in ps]))

    lo, hi = 0.1, 8.0
    for _ in range(40):
        mid = (lo + hi) / 2
        if mean_top_prob(mid) > args.target:
            lo = mid   # too confident → raise T
        else:
            hi = mid
    T = (lo + hi) / 2
    print(f"calibrated temperature: {T:.4f} → mean top-prob {mean_top_prob(T):.3f} (target {args.target})")

    # round to shrink file
    W["emb"] = np.round(emb, 4).tolist()
    W["wq"] = np.round(wq, 4).tolist()
    W["bq"] = np.round(bq, 4).tolist()
    W["w"] = np.round(w, 4).tolist()
    W["b"] = np.round(b, 4).tolist()
    W["ws"] = np.round(np.array(W["ws"]), 4).tolist()
    W["bs"] = np.round(np.array(W["bs"]), 4).tolist()
    W["temperature"] = round(T, 4)

    with open(args.weights, "w") as f:
        json.dump(W, f)
    print(f"rewrote {args.weights} ({os.path.getsize(args.weights)/1024:.0f} KB)")

if __name__ == "__main__":
    main()
