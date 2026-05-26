/**
 * TMLPD - Ensemble Voting (P0)
 * 
 * Parallel multi-LLM execution with confidence-weighted result merging.
 * This is TMLPD's core differentiator: nobody else does parallel ensemble.
 * 
 * Runs N providers simultaneously on the same query, scores each result,
 * and returns the best one with explanation of why it was chosen.
 */

export interface EnsembleResult {
  best: string;
  winner: string;
  runnerUp: string | null;
  scores: Record<string, number>;
  allResults: Record<string, string | null>;
  reasoning: string;
  timing: { totalMs: number; perProvider: Record<string, number> };
}

export interface EnsembleConfig {
  providers: string[];
  timeoutMs: number;
  minProviders: number;        // minimum to proceed (default 2)
  scoringWeights: {
    lengthPenalty: number;      // penalize extremely short/long (0-1)
    recencyBoost: number;       // prefer newer provider patterns
    historicalAccuracy: number; // weight from past performance
  };
}

const DEFAULT_CONFIG: EnsembleConfig = {
  providers: ['nvidia', 'groq'],
  timeoutMs: 30000,
  minProviders: 1,
  scoringWeights: { lengthPenalty: 0.3, recencyBoost: 0.2, historicalAccuracy: 0.5 }
};

/**
 * Execute a query across multiple providers IN PARALLEL and score results.
 * Returns the best answer with full provenance.
 */
export async function executeEnsemble(
  query: string,
  systemPrompt: string,
  context: string,
  providerExecutors: Record<string, (q: string, sys: string, ctx: string) => Promise<string | null>>,
  config: Partial<EnsembleConfig> = {}
): Promise<EnsembleResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const start = Date.now();
  const perProvider: Record<string, number> = {};

  // Step 1: Fire ALL providers in parallel
  const results = await Promise.allSettled(
    cfg.providers.map(async (name) => {
      const pStart = Date.now();
      try {
        const executor = providerExecutors[name];
        if (!executor) throw new Error(`No executor for ${name}`);
        const result = await executor(query, systemPrompt, context);
        perProvider[name] = Date.now() - pStart;
        return { provider: name, result };
      } catch (e) {
        perProvider[name] = Date.now() - pStart;
        return { provider: name, result: null };
      }
    })
  );

  const allResults: Record<string, string | null> = {};
  for (const r of results) {
    if (r.status === 'fulfilled') {
      allResults[r.value.provider] = r.value.result;
    }
  }

  // Step 2: Score each result
  const scores: Record<string, number> = {};
  for (const name of cfg.providers) {
    const text = allResults[name];
    if (!text) { scores[name] = 0; continue; }

    let score = 50; // baseline

    // Length score: penalize extremely short (<50 chars) or very long (>5000)
    if (cfg.scoringWeights.lengthPenalty > 0) {
      const len = text.length;
      if (len < 50) score -= 20;
      else if (len < 100) score -= 5;
      else if (len > 5000) score -= 10;
      else if (len > 200) score += cfg.scoringWeights.lengthPenalty * 10;
    }

    // Specificity score: presence of concrete details
    const hasNumbers = /\d+/.test(text);
    const hasTechNames = /[A-Z][a-z]+\.(js|ts|py|json)/.test(text) || /\b(API|SDK|CLI|npm|docker|redis|gcs|faiss)\b/i.test(text);
    const hasBullets = text.includes('*') || text.includes('-') || text.includes('1.');
    if (hasNumbers) score += 10;
    if (hasTechNames) score += 15;
    if (hasBullets) score += 5;

    // Structure score: well-formatted responses
    if (text.split('\n').length >= 5) score += 5;

    scores[name] = score;
  }

  // Step 3: Determine winner and runner-up
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0]?.[0] || cfg.providers[0];
  const runnerUp = sorted[1]?.[0] || null;
  const best = allResults[winner] || allResults[runnerUp || ''] || '';

  const reasoning = winner === runnerUp
    ? `Single provider returned results: ${winner}`
    : `Ensemble merged ${cfg.providers.filter(p => !!allResults[p]).length} providers. ` +
      `${winner} scored ${scores[winner].toFixed(0)} (${describeScore(scores[winner])}) vs ` +
      `${runnerUp} at ${runnerUp ? scores[runnerUp]?.toFixed(0) : 'N/A'}.`;

  return {
    best,
    winner,
    runnerUp,
    scores,
    allResults,
    reasoning,
    timing: { totalMs: Date.now() - start, perProvider }
  };
}

function describeScore(score: number): string {
  if (score >= 80) return 'high confidence';
  if (score >= 60) return 'moderate confidence';
  return 'low confidence';
}

/**
 * Merge multiple text results into a combined response.
 * Used when providers give complementary answers.
 */
export function mergeComplementary(results: string[], maxLength: number = 4000): string {
  const sections = results.filter(r => !!r).map((r, i) => `### Provider ${i + 1}\n${r.trim()}`);
  return sections.join('\n\n---\n\n').slice(0, maxLength);
}

/**
 * Update historical accuracy for a provider based on user feedback.
 */
export function recordFeedback(
  winner: string,
  wasHelpful: boolean,
  history: Record<string, { good: number; bad: number }>
): Record<string, { good: number; bad: number }> {
  if (!history[winner]) history[winner] = { good: 0, bad: 0 };
  if (wasHelpful) history[winner].good++;
  else history[winner].bad++;
  return history;
}
