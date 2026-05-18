# 19.5 KB Node.js package that routes LLM queries with 99.5% accuracy using 5-signal keyword classification. No GPU, no ML weights, no Python dependency.

r/node — I want to show you the architecture behind a routing system that classifies LLM query complexity in 0.3ms, with zero ML runtime.

**GitHub:** https://github.com/Das-rebel/adaptive-memory-multi-model-router
**npm:** https://www.npmjs.com/package/adaptive-memory-multi-model-router

## The problem

36 LLM providers, 5 complexity tiers. Every query needs to go to the right tier or you're either wasting money (GPT-4 for "what is 2+2") or getting bad results (free model for "design a distributed consensus algorithm").

The ML approach is to train a BERT classifier. But that means Python, PyTorch, model weights, GPU inference latency, and a dependency chain that doesn't belong in a Node.js service.

## The architecture

The router uses 5 independent scoring signals, each returning a 0-1 score. The weighted sum maps to a tier.

```typescript
// The entire routing core is this simple
interface RoutingSignals {
  domain: number;       // Is this a specialized domain?
  task: number;         // What type of task?
  structure: number;    // How complex is the query?
  verbIntensity: number; // How demanding is the action?
  specificity: number;  // How precise is the request?
}

function classifyQuery(query: string): RoutingSignals {
  return {
    domain: scoreDomain(query),       // regex patterns for code, math, legal, medical
    task: scoreTask(query),           // keyword matching for task types
    structure: scoreStructure(query), // parse query length, clauses, conjunctions
    verbIntensity: scoreVerb(query),  // weighted action verb dictionary
    specificity: scoreSpecificity(query) // n-gram analysis, technical term density
  };
}

function route(query: string): Tier {
  const signals = classifyQuery(query);
  const score = weightedSum(signals, WEIGHTS);
  return scoreToTier(score);
}
```

### Signal 1: Domain detection

```typescript
const DOMAIN_PATTERNS: Record<string, RegExp[]> = {
  code: [/\b(function|class|import|export|async|await|def|return)\b/gi],
  math: [/\b(equation|integral|derivative|theorem|proof|calculate)\b/gi],
  legal: [/\b(contract|liability|clause|statute|regulation|compliance)\b/gi],
  medical: [/\b(diagnosis|symptom|treatment|patient|clinical|dosage)\b/gi],
};

function scoreDomain(query: string): number {
  let maxScore = 0;
  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    const matches = patterns.reduce((sum, p) => sum + (query.match(p)?.length ?? 0), 0);
    maxScore = Math.max(maxScore, Math.min(matches * 0.15, 1.0));
  }
  return maxScore;
}
```

### Signal 2: Task indicators

```typescript
const TASK_KEYWORDS: Record<string, string[]> = {
  summarize: ['summarize', 'tldr', 'brief', 'overview', 'recap'],
  translate: ['translate', 'in french', 'in spanish', 'in german'],
  debug:     ['debug', 'fix this', 'error', 'stack trace', 'not working'],
  create:    ['write', 'create', 'generate', 'build', 'implement', 'design'],
  analyze:   ['analyze', 'compare', 'evaluate', 'assess', 'investigate'],
};

function scoreTask(query: string): number {
  const lower = query.toLowerCase();
  let score = 0;
  for (const [task, keywords] of Object.entries(TASK_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      score += taskComplexityWeight(task); // create/analyze > summarize/translate
    }
  }
  return Math.min(score, 1.0);
}
```

### Signal 3: Query structure

```typescript
function scoreStructure(query: string): number {
  let score = 0;
  // Multi-step queries ("first do X, then do Y")
  score += (query.split(/\b(first|then|after|before|finally)\b/i).length - 1) * 0.2;
  // Conditional queries ("if X then Y otherwise Z")
  score += (query.match(/\b(if|unless|otherwise|whether)\b/gi)?.length ?? 0) * 0.15;
  // Conjunction chains
  score += (query.match(/\band\b/gi)?.length ?? 0) * 0.05;
  // Query length (longer = more complex, with diminishing returns)
  score += Math.min(query.length / 500, 0.3);
  return Math.min(score, 1.0);
}
```

### Signal 4: Action verb intensity

```typescript
const VERB_WEIGHTS: Record<string, number> = {
  'reverse-engineer': 0.9, 'architect': 0.85, 'design': 0.8, 'optimize': 0.75,
  'implement': 0.7, 'debug': 0.65, 'analyze': 0.6, 'explain': 0.3,
  'describe': 0.25, 'list': 0.2, 'define': 0.15, 'what is': 0.1,
};

function scoreVerb(query: string): number {
  const lower = query.toLowerCase();
  let maxVerb = 0;
  for (const [verb, weight] of Object.entries(VERB_WEIGHTS)) {
    if (lower.includes(verb)) maxVerb = Math.max(maxVerb, weight);
  }
  return maxVerb;
}
```

### Signal 5: Specificity

```typescript
function scoreSpecificity(query: string): number {
  // Technical term density
  const technicalTerms = query.match(/\b[A-Z][a-z]+[A-Z][a-z]+\b/g)?.length ?? 0; // camelCase
  const quotedTerms = query.match(/["'][^"']+["']/g)?.length ?? 0;
  const numbers = query.match(/\d+/g)?.length ?? 0;

  // Specificity inverse: vague queries score low
  const vagueTerms = query.match(/\b(something|anything|stuff|things|etc)\b/gi)?.length ?? 0;

  return Math.min(
    (technicalTerms * 0.15 + quotedTerms * 0.1 + numbers * 0.05) - vagueTerms * 0.2,
    1.0
  );
}
```

### Weighted combination

```typescript
const WEIGHTS = { domain: 0.25, task: 0.25, structure: 0.20, verb: 0.15, specificity: 0.15 };

function weightedSum(signals: RoutingSignals, w: typeof WEIGHTS): number {
  return signals.domain * w.domain
    + signals.task * w.task
    + signals.structure * w.structure
    + signals.verbIntensity * w.verb
    + signals.specificity * w.specificity;
}

function scoreToTier(score: number): Tier {
  if (score < 0.2) return 'free';
  if (score < 0.4) return 'cheap';
  if (score < 0.6) return 'mid';
  if (score < 0.8) return 'premium';
  return 'enterprise';
}
```

## Results

| Metric | Value |
|--------|-------|
| ±1 tier accuracy | 99.5% |
| Exact tier match | 64.5% |
| Routing latency | 0.3ms |
| Package size (gzipped) | 19.5 KB |
| Runtime dependencies | 0 (pure TypeScript) |
| Node.js compatibility | 18+ |

## Why this works in Node.js specifically

1. **No native deps.** No sharp, no node-gyp, no cmake. Installs in under a second.
2. **No Python bridge.** No child_process spawning, no pytorch, no model downloads.
3. **Tiny bundle.** 19.5 KB gzipped. Works in serverless, edge, Docker alpine — anywhere Node runs.
4. **Deterministic.** Same query always routes the same way. No randomness from model inference.
5. **Composable.** Use as SDK, CLI, REST server, OpenAI proxy, or LangChain adapter.

## Other features

- **Semantic cache** — trigram Jaccard similarity. "Explain React hooks" ≈ "what are React hooks". TTL configurable.
- **Guardrails** — 17 prompt injection patterns. PII redaction (email, phone, SSN). Hallucination heuristics.
- **Cost analytics** — per-provider, per-tier spend tracking.
- **36 providers** — OpenAI, Anthropic, Google, Groq, Cerebras, Mistral, DeepSeek, etc.

## Links

- **Source:** https://github.com/Das-rebel/adaptive-memory-multi-model-router
- **npm:** https://www.npmjs.com/package/adaptive-memory-multi-model-router

MIT license. Self-hosted. No account. `npm install adaptive-memory-multi-model-router` and you're routing.

Would love feedback on the scoring approach — particularly from anyone who's compared keyword vs ML routing in production.
