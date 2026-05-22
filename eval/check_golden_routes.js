#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { routeQuery } = require('../dist/index.js');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readJsonl(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function main() {
  const evalDir = __dirname;
  const dataset = readJsonl(path.join(evalDir, 'benchmark_dataset.jsonl'));
  const golden = readJson(path.join(evalDir, 'golden_routes.json'));
  const goldenMap = new Map(golden.map((g) => [g.id, g]));

  const failures = [];

  for (const row of dataset) {
    const decision = routeQuery(row.prompt);
    const expected = goldenMap.get(row.id);
    if (!expected) {
      failures.push(`${row.id}: missing expected golden row`);
      continue;
    }

    const checks = [
      ['primary_model', decision.primary_model, expected.primary_model],
      ['provider_type', decision.provider_type, expected.provider_type],
      ['detected_domain', decision.features?.detected_domain || '', expected.detected_domain || '']
    ];

    for (const [name, actual, exp] of checks) {
      if (actual !== exp) {
        failures.push(`${row.id}: ${name} mismatch (actual=${actual}, expected=${exp})`);
      }
    }

    const actualComplexity = decision.features?.complexity ?? 0;
    if (Math.abs(actualComplexity - expected.complexity) > 1e-9) {
      failures.push(
        `${row.id}: complexity mismatch (actual=${actualComplexity}, expected=${expected.complexity})`
      );
    }
  }

  if (failures.length) {
    console.error('\nGolden route check FAILED:');
    failures.forEach((f) => console.error(`- ${f}`));
    process.exit(1);
  }

  console.log(`Golden route check PASSED (${dataset.length} cases)`);
}

main();
