#!/usr/bin/env node
/**
 * cost-compare.js — Compare costs across providers for the same prompt.
 *
 * A3M Router provides MODEL_PROFILES with cost-per-token data for every model.
 * Use CostTracker to estimate real costs, and findCheapestAvailableProvider /
 * findFastestAvailableProvider to make data-driven decisions.
 *
 * Usage:
 *   node examples/cost-compare.js
 *   INPUT_TOKENS=500 OUTPUT_TOKENS=200 node examples/cost-compare.js
 */

const {
  routeQuery,
  CostTracker,
  MODEL_PROFILES,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
  MODEL_COSTS,
  countTokens,
  extractQueryFeatures,
} = require('../dist/index.js');

const INPUT_TOKENS = parseInt(process.env.INPUT_TOKENS || '150', 10);
const OUTPUT_TOKENS = parseInt(process.env.OUTPUT_TOKENS || '100', 10);

function main() {
  console.log('A3M Router — Cost Comparison');
  console.log('=' .repeat(50));
  console.log('Input tokens: ', INPUT_TOKENS);
  console.log('Output tokens:', OUTPUT_TOKENS);
  console.log('');

  // 1. Find cheapest and fastest available providers
  const cheapest = findCheapestAvailableProvider();
  const fastest = findFastestAvailableProvider();

  console.log('-- Provider Recommendations --');
  if (cheapest) {
    const cost = new CostTracker().calculateCost(cheapest.models[0] || 'unknown', INPUT_TOKENS, OUTPUT_TOKENS);
    console.log(`  Cheapest:  ${cheapest.id.padEnd(16)} ${cheapest.models[0] || 'N/A'.padEnd(30)} $${cost.total.toFixed(6)}/req  (tier: ${cheapest.tier})`);
  }
  if (fastest) {
    const cost = new CostTracker().calculateCost(fastest.models[0] || 'unknown', INPUT_TOKENS, OUTPUT_TOKENS);
    console.log(`  Fastest:   ${fastest.id.padEnd(16)} ${fastest.models[0] || 'N/A'.padEnd(30)} $${cost.total.toFixed(6)}/req  (tier: ${fastest.tier})`);
  }
  console.log('');

  // 2. Compare costs across all major model profiles
  console.log('-- All Model Profiles --');
  console.log('  Model'.padEnd(38) + 'Provider'.padEnd(14) + 'Input/1K'.padEnd(12) + 'Output/1K'.padEnd(12) + 'Est. Cost'.padEnd(12) + 'Quality');
  console.log('  ' + '-'.repeat(90));

  const profiles = Object.entries(MODEL_PROFILES)
    .map(([name, p]) => ({
      name,
      provider: p.provider,
      cost_input: p.cost_per_1k_input,
      cost_output: p.cost_per_1k_output,
      estimated: (p.cost_per_1k_input * INPUT_TOKENS / 1000) + (p.cost_per_1k_output * OUTPUT_TOKENS / 1000),
      quality: p.quality_score,
      latency: p.latency_ms,
      context: p.context_window,
    }))
    .sort((a, b) => a.estimated - b.estimated);

  for (const p of profiles) {
    console.log(`  ${p.name.padEnd(36)} ${p.provider.padEnd(12)} $${p.cost_input.toFixed(6).padEnd(8)} $${p.cost_output.toFixed(6).padEnd(8)} $${p.estimated.toFixed(6).padEnd(8)} ${p.quality.toFixed(2)}`);
  }
  console.log('');

  // 3. Compare A3M routing at different budget multipliers
  console.log('-- A3M Routing Cost Comparison --');
  const testQuery = process.env.QUERY || 'Write a short story about a robot learning to paint';
  const features = extractQueryFeatures(testQuery);
  console.log('  Query:', testQuery);
  console.log('  Complexity:', features.complexity.toFixed(2));
  console.log('');

  const budgets = [
    { label: 'Cost-Focused',  multiplier: 0.2 },
    { label: 'Budget',        multiplier: 0.5 },
    { label: 'Balanced',      multiplier: 1.0 },
    { label: 'Quality',       multiplier: 1.5 },
    { label: 'Max Quality',   multiplier: 2.0 },
  ];

  console.log('  ' + 'Strategy'.padEnd(16) + 'Model'.padEnd(36) + 'Cost'.padEnd(14) + 'Latency'.padEnd(12) + 'Confidence');
  console.log('  ' + '-'.repeat(80));

  for (const b of budgets) {
    const decision = routeQuery(testQuery, undefined, b.multiplier);
    console.log(`  ${b.label.padEnd(14)} ${decision.primary_model.padEnd(34)} $${decision.estimated_cost.toFixed(6).padEnd(10)} ${decision.estimated_latency_ms}ms  ${(decision.confidence * 100).toFixed(0)}%`);
  }

  // 4. CostTracker usage example
  console.log('');
  console.log('-- CostTracker Session Example --');
  const tracker = new CostTracker({ daily_limit: 5.0 });

  // Simulate 3 requests
  tracker.record('openai', 'gpt-4o-mini', 150, 100);
  tracker.record('groq', 'llama-3.3-70b-versatile', 200, 150);
  tracker.record('anthropic', 'claude-3-5-sonnet-latest', 180, 120);

  const summary = tracker.getSummary();
  console.log('  Requests tracked:    ', summary.request_count);
  console.log('  Total cost:          $' + summary.total_cost.toFixed(6));
  console.log('  Avg cost/request:    $' + summary.average_cost_per_request.toFixed(6));
  console.log('  Total tokens:        ', summary.token_count.input + summary.token_count.output);
  console.log('  Daily remaining:     $' + (tracker.getRemainingBudget().daily !== null ? tracker.getRemainingBudget().daily.toFixed(6) : 'unlimited'));
  console.log('');
  console.log('  By provider:');
  for (const [prov, cost] of Object.entries(summary.by_provider)) {
    console.log(`    ${prov}: $${cost.toFixed(6)}`);
  }
}

main();
