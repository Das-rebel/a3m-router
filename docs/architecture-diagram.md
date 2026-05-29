# A3M Router Architecture: Parallel vs Sequential

## Traditional Router (Sequential Fallback)
```
Query → Try Provider A → ❌ Fail ($0.03)
      → Try Provider B → ❌ Fail ($0.02)
      → Try Provider C → ✅ Success ($0.01)
      
Total: 3 API calls, 3× latency, $0.06 cost
```

## A3M Router (Parallel Execution)
```
Query → Provider A ═╗
      → Provider B ═╣ → Score each → Pick best ✅
      → Provider C ═╝    response      (confidence)
      
Total: 1 round-trip, 1× latency, $0.01 cost
```

## Why A3M scores higher
- **Confidence scoring** catches when cheap models produce better answers
- **No fallback chain** means no accumulated latency
- **Budget enforcement** caps cost per query
- **Circuit breaker** skips failing providers automatically
```

## Memory Feature (Unique to A3M)
```
Session 1: "My name is Alice"     → stored in episodic memory
Session 2: "What's my name?"     → "Alice!" (recalled from memory)
```

## Query-Type Presets
```
fast:     15s timeout, temperature 0.3  → "What's 2+2?"
creative: 45s timeout, temperature 0.7  → "Write a poem"
deep:     60s timeout, temperature 0.5  → "Explain quantum mechanics"
code:     30s timeout, temperature 0.3  → "Write a Python sort function"
```
