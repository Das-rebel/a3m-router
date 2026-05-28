#!/usr/bin/env node
/**
 * basic-route.js — Route a query to the best provider.
 *
 * A3M Router analyzes the query and returns a RouteDecision:
 * which model to use, estimated cost, confidence, and reasoning.
 * This is a dry-run — no API call is made.
 *
 * Usage:
 *   node examples/basic-route.js
 *   QUERY="Explain quantum computing" node examples/basic-route.js
 */

const { routeQuery, extractQueryFeatures } = require('../dist/index.js');

const query = process.env.QUERY || 'Explain machine learning simply in 3 sentences';

function main() {
  console.log('Query:', query);
  console.log('');

  // 1. Extract query features for insight
  const features = extractQueryFeatures(query);
  console.log('-- Query Features --');
  console.log('  Complexity:      ', features.complexity.toFixed(2));
  console.log('  Has code:        ', features.has_code);
  console.log('  Has math:        ', features.has_math);
  console.log('  Requires reason: ', features.requires_reasoning);
  console.log('  Is creative:     ', features.is_creative);
  console.log('');

  // 2. Route the query (no API call — pure routing decision)
  const decision = routeQuery(query);

  console.log('-- Route Decision --');
  console.log('  Model:            ', decision.primary_model);
  console.log('  Fallback models:  ', decision.fallback_models.join(', '));
  console.log('  Confidence:       ', (decision.confidence * 100).toFixed(1) + '%');
  console.log('  Est. cost:        ', '$' + decision.estimated_cost.toFixed(6));
  console.log('  Est. latency:     ', decision.estimated_latency_ms + 'ms');
  console.log('  Reasoning:        ', decision.reasoning);
  console.log('');

  // 3. Route with a budget multiplier (1.0 = balanced, <1 = cost-focused, >1 = quality-focused)
  const cheap = routeQuery(query, undefined, 0.3);
  const premium = routeQuery(query, undefined, 2.0);

  console.log('-- Budget Tuning --');
  console.log('  Cost-focused (0.3):  ', cheap.primary_model, '($' + cheap.estimated_cost.toFixed(6) + ')');
  console.log('  Balanced (1.0):     ', decision.primary_model, '($' + decision.estimated_cost.toFixed(6) + ')');
  console.log('  Quality (2.0):      ', premium.primary_model, '($' + premium.estimated_cost.toFixed(6) + ')');
}

main();
