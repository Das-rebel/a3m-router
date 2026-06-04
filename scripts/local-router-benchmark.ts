/**
 * Local Router Benchmark - Test routing decisions without API calls
 * 
 * Uses the test dataset to evaluate routing accuracy per tier.
 * Focuses on understanding WHERE the router fails.
 */

import * as fs from 'fs';
import * as path from 'path';

// Load test data
const TEST_DATA_PATH = './data/test/standup_word_level.json';
const RESULTS_PATH = './benchmark-results.json';

interface QueryFeature {
  actualTier: 'free' | 'cheap' | 'mid' | 'premium';
  query: string;
  routingReason: string;
}

interface ConfusionEntry {
  actual: string;
  predicted: string;
  query: string;
  correct: boolean;
}

interface BenchmarkResult {
  timestamp: string;
  version: string;
  total: number;
  correct: number;
  accuracy: number;
  confusion: { [actual: string]: { [predicted: string]: number } };
  failures: ConfusionEntry[];
  tierAccuracy: { [tier: string]: { correct: number; total: number; accuracy: number } };
  failureAnalysis: {
    underRoutes: { [tier: string]: number };
    overRoutes: { [tier: string]: number };
  };
}

function loadTestData(): QueryFeature[] {
  const data = JSON.parse(fs.readFileSync(TEST_DATA_PATH, 'utf-8'));
  return data.queries || data;
}

function analyzeFailures(failures: ConfusionEntry[]): { [key: string]: number } {
  const analysis: { [key: string]: number } = {};
  
  for (const f of failures) {
    if (!f.correct) {
      const key = `${f.actual}→${f.predicted}`;
      analysis[key] = (analysis[key] || 0) + 1;
    }
  }
  
  return analysis;
}

async function runBenchmark(): Promise<BenchmarkResult> {
  const queries = loadTestData();
  const { routeQuery, createRouterContext } = await import('../src/index');
  
  // Create context once
  const context = await createRouterContext();
  
  const confusion: { [key: string]: { [key: string]: number } } = {
    'free': {}, 'cheap': {}, 'mid': {}, 'premium': {}
  };
  
  const failures: ConfusionEntry[] = [];
  let correct = 0;
  
  for (const item of queries) {
    const query = item.query || item.text || item.input || String(item);
    const actualTier = item.actualTier || item.tier || item.optimalTier || 'mid';
    
    try {
      // Route the query
      const result = await routeQuery(query, context);
      const predictedTier = result.model.startsWith('deepseek') ? 'free' :
                           result.model.includes('ministral') ? 'mid' :
                           result.model.includes('gemini') ? 'premium' : 'cheap';
      
      const isCorrect = predictedTier === actualTier;
      if (isCorrect) correct++;
      
      // Record confusion
      if (!confusion[actualTier][predictedTier]) {
        confusion[actualTier][predictedTier] = 0;
      }
      confusion[actualTier][predictedTier]++;
      
      if (!isCorrect) {
        failures.push({
          actual: actualTier,
          predicted: predictedTier,
          query: query.substring(0, 200),
          correct: false
        });
      }
    } catch (e) {
      console.error(`Error routing query: ${e}`);
    }
  }
  
  // Calculate tier accuracy
  const tierAccuracy: { [key: string]: { correct: number; total: number; accuracy: number } } = {};
  for (const tier of Object.keys(confusion)) {
    const total = Object.values(confusion[tier]).reduce((a, b) => a + b, 0);
    const tierCorrect = confusion[tier][tier] || 0;
    tierAccuracy[tier] = {
      correct: tierCorrect,
      total,
      accuracy: total > 0 ? tierCorrect / total : 0
    };
  }
  
  // Analyze failures
  const failureAnalysis = analyzeFailures(failures);
  
  const result: BenchmarkResult = {
    timestamp: new Date().toISOString(),
    version: 'local-benchmark',
    total: queries.length,
    correct,
    accuracy: correct / queries.length,
    confusion,
    failures: failures.slice(0, 50), // Keep top 50 failures
    tierAccuracy,
    failureAnalysis
  };
  
  // Save results
  fs.writeFileSync(RESULTS_PATH, JSON.stringify(result, null, 2));
  
  console.log(`\n=== Benchmark Results ===`);
  console.log(`Total: ${result.total}, Correct: ${result.correct}`);
  console.log(`Accuracy: ${(result.accuracy * 100).toFixed(1)}%`);
  console.log(`\nTier Accuracy:`);
  for (const [tier, stats] of Object.entries(result.tierAccuracy)) {
    console.log(`  ${tier}: ${stats.correct}/${stats.total} = ${(stats.accuracy * 100).toFixed(0)}%`);
  }
  console.log(`\nTop Failures:`);
  const sortedFailures = Object.entries(failureAnalysis).sort((a, b) => b[1] - a[1]);
  for (const [key, count] of sortedFailures.slice(0, 10)) {
    console.log(`  ${key}: ${count}`);
  }
  
  return result;
}

runBenchmark().catch(console.error);
