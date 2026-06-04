/**
 * Run labeled benchmark to test routing accuracy
 * Uses ACTUAL model tiers from our router
 */

import { routeQuery } from '../dist/index.js';
import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync('./data/labeled-benchmark.json', 'utf-8'));
const queries = data.queries;

console.log('=== A3M Router Labeled Benchmark (Fixed) ===\n');

// Map actual model names to tiers based on our router's behavior
function getTierFromModel(modelName) {
  if (!modelName) return 'cheap';
  const m = modelName.toLowerCase();
  
  // Free tier: local models via ollama
  if (m.includes('ollama') || m.includes('llama3') || m.includes('mistral') || 
      m.includes('qwen2') || m.includes('codellama') || m.includes('phi3') || 
      m.includes('gemma2') || m.includes('commandcode') || m.includes('taste')) {
    return 'free';
  }
  
  // Cheap tier: cloud budget models
  if (m.includes('groq') || m.includes('cerebras') || m.includes('minimax') ||
      m.includes('abab')) {
    return 'cheap';
  }
  
  // Mid tier: mistral-small, vllm models
  if (m.includes('mistral-small') || m.includes('vllm')) {
    return 'mid';
  }
  
  // Premium tier: gemini, claude, gpt-4
  if (m.includes('gemini') || m.includes('claude') || m.includes('gpt-4')) {
    return 'premium';
  }
  
  // Default based on complexity features (debug)
  return 'cheap';
}

const confusion = {
  free: {}, cheap: {}, mid: {}, premium: {}
};
const tierStats = {
  free: { correct: 0, total: 0 },
  cheap: { correct: 0, total: 0 },
  mid: { correct: 0, total: 0 },
  premium: { correct: 0, total: 0 }
};

let totalCorrect = 0;

for (const item of queries) {
  const { query, actualTier } = item;
  
  const result = routeQuery(query);
  const predictedTier = getTierFromModel(result.primary_model);
  
  const isCorrect = predictedTier === actualTier;
  if (isCorrect) totalCorrect++;
  
  // Update confusion
  confusion[actualTier][predictedTier] = (confusion[actualTier][predictedTier] || 0) + 1;
  tierStats[actualTier].total++;
  if (isCorrect) tierStats[actualTier].correct++;
}

console.log(`Overall: ${totalCorrect}/${queries.length} = ${(100*totalCorrect/queries.length).toFixed(1)}%\n`);

console.log('Tier Accuracy:');
for (const [tier, stats] of Object.entries(tierStats)) {
  const pct = (100 * stats.correct / stats.total).toFixed(0);
  console.log(`  ${tier}: ${stats.correct}/${stats.total} = ${pct}%`);
}

console.log('\nConfusion Matrix (rows=actual, cols=predicted):');
console.log('       free  cheap   mid  prem');
for (const actual of ['free', 'cheap', 'mid', 'premium']) {
  const row = confusion[actual];
  const free = (row.free || 0).toString().padStart(5);
  const cheap = (row.cheap || 0).toString().padStart(5);
  const mid = (row.mid || 0).toString().padStart(5);
  const prem = (row.premium || 0).toString().padStart(5);
  console.log(`${actual.padEnd(8)}${free} ${cheap} ${mid} ${prem}`);
}

console.log('\n=== Failure Analysis ===');
for (const actual of ['free', 'cheap', 'mid', 'premium']) {
  const row = confusion[actual];
  const total = Object.entries(row).reduce((a, b) => a + b[1], 0);
  const correct = row[actual] || 0;
  const misroutes = Object.entries(row).filter(([k, v]) => k !== actual && v > 0);
  if (misroutes.length > 0) {
    console.log(`\n${actual.toUpperCase()} (${correct}/${total} correct):`);
    for (const [pred, count] of misroutes) {
      console.log(`  → ${pred}: ${count}`);
    }
  }
}
