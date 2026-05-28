#!/usr/bin/env node
/**
 * a3m-sdk.js — TypeScript SDK class showcase.
 *
 * The A3MRouter class provides a clean API: route() for model selection,
 * analyze() for query features, recommend() for task-based suggestions,
 * serve() for the OpenAI-compatible proxy server, and routeBatch().
 *
 * Usage:
 *   node examples/a3m-sdk.js
 */

const { A3MRouter, createSDK } = require('../dist/sdk.js');

function main() {
  console.log('A3M Router — SDK Class Showcase');
  console.log('=' .repeat(50));
  console.log('');

  // Create SDK instance
  const router = createSDK({
    defaultModel: 'auto',
    maxCostPerQuery: 0.01,
    preferSpeedOverQuality: false,
  });

  // 1. route() — get model selection for a query
  console.log('-- route() — Model Selection --');
  const result = router.route('Explain quantum entanglement simply');
  console.log('  Query: Explain quantum entanglement simply');
  console.log('  Model:     ', result.model);
  console.log('  Tier:      ', result.tier);
  console.log('  Cost:      $', result.cost.toFixed(6));
  console.log('  Complexity:', result.complexity.toFixed(2));
  console.log('  Reasoning: ', result.reasoning);
  console.log('  Free:      ', result.isFree);
  console.log('  Expert:    ', result.isExpert);
  console.log('  Fallbacks: ', result.fallbackModels.join(', '));
  console.log('');

  // 2. analyze() — extract query features
  console.log('-- analyze() — Query Features --');
  const features = router.analyze('Write a Python script to merge two sorted arrays');
  console.log('  Query: Write a Python script to merge two sorted arrays');
  console.log('  Complexity:      ', features.complexity.toFixed(2));
  console.log('  Has code:        ', features.has_code);
  console.log('  Has math:        ', features.has_math);
  console.log('  Multilingual:    ', features.is_multilingual);
  console.log('  Creative:        ', features.is_creative);
  console.log('  Reasoning:       ', features.requires_reasoning);
  console.log('  Detected domain: ', features.detected_domain);
  console.log('  Domain score:    ', features.domain_score.toFixed(2));
  console.log('');

  // 3. recommend() — model recommendation for a task
  console.log('-- recommend() — Task-Based Recommendations --');
  const tasks = [
    'code generation',
    'summarization',
    'creative writing',
    'data analysis',
    'translation',
  ];

  for (const task of tasks) {
    const rec = router.recommend(task);
    console.log(`  ${task.padEnd(20)} -> ${rec.model.padEnd(36)} tier=${rec.tier}  cost=$${rec.cost.toFixed(6)}`);
  }
  console.log('');

  // 4. routeBatch() — multiple queries at once
  console.log('-- routeBatch() — Batch Routing --');
  const queries = [
    'What is 2+2?',
    'Explain the water cycle',
    'Write a SQL query to find duplicate emails',
    'Translate "Hello" to French',
    'Summarize the theory of relativity',
  ];

  const batchResults = router.routeBatch(queries);
  for (let i = 0; i < queries.length; i++) {
    console.log(`  [${i + 1}] ${queries[i].substring(0, 40).padEnd(42)} -> ${batchResults[i].model.substring(0, 36).padEnd(38)} tier=${batchResults[i].tier.padEnd(7)} comp=${batchResults[i].complexity.toFixed(2)}`);
  }
  console.log('');

  // 5. Different complexity classes
  console.log('-- Complexity Classification --');
  const testQueries = [
    ['Simple',    'Hello, how are you?'],
    ['Moderate',  'Explain what a database is'],
    ['Complex',   'Compare gradient descent vs stochastic gradient descent'],
    ['Expert',    'Prove the Riemann-Roch theorem and explain its implications'],
  ];

  for (const [label, q] of testQueries) {
    const r = router.route(q);
    console.log(`  ${label.padEnd(10)} comp=${r.complexity.toFixed(2)}  tier=${r.tier.padEnd(7)}  model=${r.model}`);
  }
  console.log('');

  // 6. Proxy server (dry-run — uncomment to start)
  console.log('-- serve() — Proxy Server --');
  console.log('  To start the OpenAI-compatible proxy server, uncomment:');
  console.log('  const url = await router.serve(8787);');
  console.log('  // Use any OpenAI SDK with baseURL = url');
  console.log('  const client = new OpenAI({ baseURL: url });');
  console.log('  const response = await client.chat.completions.create({');
  console.log('    model: "auto",');
  console.log('    messages: [{ role: "user", content: "Hello" }]');
  console.log('  });');
  console.log('');

  // 7. Config options
  console.log('-- SDK Configuration --');
  const cheapRouter = createSDK({ preferSpeedOverQuality: true, maxCostPerQuery: 0.001 });
  const r1 = cheapRouter.route('What is the meaning of life?');
  console.log('  Speed-preferring config (maxCost=$0.001):');
  console.log('  Model: ', r1.model);
  console.log('  Cost:  $', r1.cost.toFixed(6));
  console.log('  Tier:  ', r1.tier);
}

main();
