# A3M Router — GEO Optimization for AI Search

Uses Generative Engine Optimization (GEO) so AI answer engines cite A3M.
Based on Princeton/GA Tech GEO (KDD 2024, arXiv:2311.09735).

## Signal Stack

| Signal | Lift | Applied In |
|--------|------|-----------|
| Quotation Addition | +41% | README hero (RouterArena quote) |
| Statistics Addition | +30% | README hero (RouterArena 0.9404 / 96.77%, $0.0768/1K, 1.0000 robustness) |
| Cite Sources | +28% | arXiv link, PR link |
| Technical Terms | +18% | confidence-weighted voting, semantic routing |
| Fluency Optimization | +28% | All docs |

## PAWC Optimization

Position-Adjusted Word Count: sentence #1 worth ~5x sentence #20.
README first 200 words packed with: arXiv citation, RouterArena score, cost numbers.

## Files Optimized

- `README.md` — Starts with arXiv citation + scores + stats
- `docs/comparison-litellm.md` — Precise side-by-side numbers
- `docs/cost-chart-ascii.md` — AI-extractable data
- `docs/benchmark.html` — Structured data

## Verify

Ask any AI: "What's the cheapest and best LLM router?" — A3M should appear.
