# Multi-Model Routing → Hallucination Reduction

## Research Question
How much does parallel multi-LLM routing + confidence-scored voting reduce hallucination rates?

## Hypotheses
1. **Diversity beats consensus**: Different models hallucinate on different inputs. Cross-model voting catches errors.
2. **Confidence scoring**: Models that are uncertain on a task get lower weight.
3. **Domain specialization**: Code models on code, math models on math = fewer hallucinations.
4. **Adversarial detection**: When models disagree strongly, flag for human review.

## Key Metrics
- Hallucination rate (single model vs multi-model)
- Confidence correlation with correctness
- Domain-specific accuracy improvement
- False positive rate (multi-model still wrong)

## Sources
- RouterArena benchmark (our submission)
- SimpleQA / TruthfulQA
- MMLU disaggregated
- HumanEval for code

## Research Plan
1. Literature review: existing multi-model ensemble papers
2. Run benchmarks: compare single vs multi-model on hallucination-prone datasets
3. Publish findings incrementally
