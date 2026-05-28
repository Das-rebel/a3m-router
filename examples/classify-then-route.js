#!/usr/bin/env node
/**
 * classify-then-route.js — Classify a query's domain first, then route to optimal provider.
 *
 * A3M Router's extractQueryFeatures() analyzes the query for code, math,
 * creativity, reasoning needs, and more. Use this to make smarter routing
 * decisions or to surface domain info to the user.
 *
 * Usage:
 *   node examples/classify-then-route.js
 *   QUERY="Write a Python function to sort a list" node examples/classify-then-route.js
 */

const { routeQuery, extractQueryFeatures, MODEL_PROFILES, getAvailableProviders } = require('../dist/index.js');

const query = process.env.QUERY || 'Write a poem about artificial intelligence in the style of Shakespeare';

function classifyAndRoute(query) {
  // 1. Extract features
  const features = extractQueryFeatures(query);

  // 2. Determine domain
  const domain = features.has_code ? 'code' :
                 features.has_math ? 'math' :
                 features.is_creative ? 'creative' :
                 features.requires_reasoning ? 'reasoning' :
                 'general';

  // 3. Find the best model for this domain using MODEL_PROFILES
  const profiles = Object.entries(MODEL_PROFILES)
    .filter(([_, p]) => p.strengths?.length > 0)
    .map(([name, p]) => ({
      name,
      provider: p.provider,
      cost: p.cost_per_1k_input + p.cost_per_1k_output,
      quality: p.quality_score,
      strengths: p.strengths,
      domainMatch: p.strengths.some(s => s.toLowerCase().includes(domain)),
    }))
    .sort((a, b) => {
      // Prefer domain-matched, then higher quality, then lower cost
      if (a.domainMatch !== b.domainMatch) return a.domainMatch ? -1 : 1;
      if (a.quality !== b.quality) return b.quality - a.quality;
      return a.cost - b.cost;
    });

  // 4. Get A3M's route decision
  const decision = routeQuery(query);

  return { features, domain, bestProfiles: profiles.slice(0, 5), decision };
}

function printResult(result) {
  console.log('Query:', query);
  console.log('');

  console.log('-- Classification --');
  console.log('  Domain:           ', result.domain);
  console.log('  Complexity:       ', result.features.complexity.toFixed(2));
  console.log('  Has code:         ', result.features.has_code);
  console.log('  Has math:         ', result.features.has_math);
  console.log('  Creative:         ', result.features.is_creative);
  console.log('  Needs reasoning:  ', result.features.requires_reasoning);
  console.log('  Multilingual:     ', result.features.is_multilingual);
  console.log('');

  console.log('-- Top Domain-Matched Models --');
  for (const p of result.bestProfiles) {
    const matchStar = p.domainMatch ? ' *' : '  ';
    console.log(`  ${matchStar} ${p.name.padEnd(36)} quality=${p.quality.toFixed(2)}  cost=$${p.cost.toFixed(6)}  [${p.strengths.slice(0, 3).join(', ')}]`);
  }
  console.log('');

  console.log('-- A3M Route Decision --');
  console.log('  Selected model:   ', result.decision.primary_model);
  console.log('  Confidence:       ', (result.decision.confidence * 100).toFixed(1) + '%');
  console.log('  Est. cost:        ', '$' + result.decision.estimated_cost.toFixed(6));
  console.log('  Reasoning:        ', result.decision.reasoning);
}

function main() {
  const result = classifyAndRoute(query);
  printResult(result);

  // Demo: show how routing differs per domain
  console.log('');
  console.log('-- Domain Routing Comparison --');
  const testQueries = [
    ['code',      'Write a binary search tree in Python'],
    ['math',      'Solve for x: 3x^2 + 5x - 2 = 0'],
    ['creative',  'Write a haiku about the ocean'],
    ['reasoning', 'If all A are B and some B are C, can we conclude some A are C?'],
    ['general',   'What is the weather like today?'],
  ];

  for (const [domain, q] of testQueries) {
    const r = classifyAndRoute(q);
    console.log(`  ${domain.padEnd(12)} -> ${r.decision.primary_model.padEnd(36)} cost=$${r.decision.estimated_cost.toFixed(6)}  conf=${(r.decision.confidence * 100).toFixed(0)}%`);
  }
}

main();
