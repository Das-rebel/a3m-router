#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { routeQuery } = require('../dist/index.js');
const { appendExperimentRecord } = require('./lib/experiment_registry');

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function toFixed(n) {
  return Number(n.toFixed(6));
}

function main() {
  const evalDir = path.resolve(__dirname);
  const dataset = readJsonl(path.join(evalDir, 'benchmark_dataset.jsonl'));
  const candidateBudgetMultiplier = Number(process.env.A3M_SHADOW_BUDGET_MULTIPLIER || '0.85');

  let divergence = 0;
  let projectedCostDelta = 0;
  const comparisons = [];

  for (const row of dataset) {
    const primary = routeQuery(row.prompt);
    const shadow = routeQuery(row.prompt, undefined, candidateBudgetMultiplier);

    const changed = primary.primary_model !== shadow.primary_model;
    if (changed) divergence += 1;

    const costDelta = Number((shadow.estimated_cost || 0) - (primary.estimated_cost || 0));
    projectedCostDelta += costDelta;

    comparisons.push({
      id: row.id,
      primary_model: primary.primary_model,
      shadow_model: shadow.primary_model,
      changed,
      primary_cost: primary.estimated_cost,
      shadow_cost: shadow.estimated_cost,
      cost_delta: toFixed(costDelta)
    });
  }

  const summary = {
    dataset_size: dataset.length,
    candidate_budget_multiplier: candidateBudgetMultiplier,
    divergence_rate: toFixed(divergence / dataset.length),
    changed_cases: divergence,
    projected_total_cost_delta: toFixed(projectedCostDelta),
    projected_avg_cost_delta: toFixed(projectedCostDelta / dataset.length)
  };

  const out = {
    timestamp_utc: new Date().toISOString(),
    summary,
    comparisons
  };

  const outDir = path.join(evalDir, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'shadow_latest.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  appendExperimentRecord({
    experiment_id: `shadow_eval_${Date.now()}`,
    dataset_version: 'core_regression_v1',
    run_type: 'shadow_eval',
    metrics: summary,
    decision: 'informational',
    notes: []
  });

  console.log('\nShadow Eval Summary');
  console.log('-------------------');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Shadow output: ${outPath}`);
}

main();
