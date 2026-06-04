#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { routeQuery } = require('../dist/index.js');
const { appendExperimentRecord } = require('./lib/experiment_registry');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${idx + 1}: ${error.message}`);
      }
    });
}

function safeGet(obj, key, fallback = false) {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
}

function toFixed(n) {
  return Number(n.toFixed(4));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function evaluateCase(item) {
  const decision = routeQuery(item.prompt);
  const expected = item.expected || {};
  const checks = [];

  if (expected.complexity) {
    const c = decision.features?.complexity ?? 0;
    const ok = c >= expected.complexity.min && c <= expected.complexity.max;
    checks.push({ type: 'complexity', ok, actual: c, expected: expected.complexity });
  }

  if (expected.flags) {
    for (const [flag, expectedValue] of Object.entries(expected.flags)) {
      const actual = safeGet(decision.features || {}, flag, false);
      checks.push({ type: 'flag', flag, ok: actual === expectedValue, actual, expected: expectedValue });
    }
  }

  if (expected.domain) {
    const actual = decision.features?.domain || '';
    checks.push({ type: 'domain', ok: actual === expected.domain, actual, expected: expected.domain });
  }

  if (expected.provider_type) {
    const actual = decision.provider_type || '';
    checks.push({ type: 'provider_type', ok: actual === expected.provider_type, actual, expected: expected.provider_type });
  }

  return {
    id: item.id,
    prompt: item.prompt,
    decision: {
      primary_model: decision.primary_model,
      provider_type: decision.provider_type,
      estimated_cost: decision.estimated_cost,
      complexity: decision.features?.complexity,
      detected_domain: decision.features?.detected_domain || ''
    },
    checks
  };
}

function summarize(results) {
  const allChecks = results.flatMap((r) => r.checks);
  const byType = (type) => allChecks.filter((c) => c.type === type);
  const rate = (arr) => (arr.length ? arr.filter((x) => x.ok).length / arr.length : 1);

  const complexity = rate(byType('complexity'));
  const flags = rate(byType('flag'));
  const domain = rate(byType('domain'));
  const providerType = rate(byType('provider_type'));

  const weighted = [complexity, flags, domain, providerType];
  const overall = weighted.reduce((a, b) => a + b, 0) / weighted.length;

  return {
    dataset_size: results.length,
    checks_count: allChecks.length,
    complexity_accuracy: toFixed(complexity),
    flag_accuracy: toFixed(flags),
    domain_accuracy: toFixed(domain),
    provider_type_accuracy: toFixed(providerType),
    overall_score: toFixed(overall)
  };
}

function gate(summary, thresholds, baseline) {
  const failures = [];

  if (summary.dataset_size < thresholds.min_dataset_size) {
    failures.push(`dataset_size ${summary.dataset_size} < min_dataset_size ${thresholds.min_dataset_size}`);
  }
  if (summary.complexity_accuracy < thresholds.min_complexity_accuracy) {
    failures.push(`complexity_accuracy ${summary.complexity_accuracy} < ${thresholds.min_complexity_accuracy}`);
  }
  if (summary.flag_accuracy < thresholds.min_flag_accuracy) {
    failures.push(`flag_accuracy ${summary.flag_accuracy} < ${thresholds.min_flag_accuracy}`);
  }
  if (summary.domain_accuracy < thresholds.min_domain_accuracy) {
    failures.push(`domain_accuracy ${summary.domain_accuracy} < ${thresholds.min_domain_accuracy}`);
  }
  if (summary.provider_type_accuracy < thresholds.min_provider_type_accuracy) {
    failures.push(`provider_type_accuracy ${summary.provider_type_accuracy} < ${thresholds.min_provider_type_accuracy}`);
  }
  if (summary.overall_score < thresholds.min_overall_score) {
    failures.push(`overall_score ${summary.overall_score} < ${thresholds.min_overall_score}`);
  }

  if (baseline?.summary) {
    const delta = baseline.summary.overall_score - summary.overall_score;
    if (delta > thresholds.max_regression_delta) {
      failures.push(
        `overall_score regression ${toFixed(delta)} > max_regression_delta ${thresholds.max_regression_delta}`
      );
    }
  }

  return failures;
}

function main() {
  const evalDir = path.resolve(__dirname);
  const datasetPath = path.join(evalDir, 'benchmark_dataset.jsonl');
  const thresholdsPath = path.join(evalDir, 'thresholds.json');
  const baselinePath = path.join(evalDir, 'baselines', 'main.json');
  const resultsPath = path.join(evalDir, 'results', 'latest.json');

  const dataset = readJsonl(datasetPath);
  const thresholds = readJson(thresholdsPath);
  const results = dataset.map(evaluateCase);
  const summary = summarize(results);
  const baseline = fs.existsSync(baselinePath) ? readJson(baselinePath) : null;
  const failures = gate(summary, thresholds, baseline);

  const output = {
    timestamp_utc: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || null,
    summary,
    failures,
    baseline_used: Boolean(baseline),
    results
  };

  ensureDir(path.dirname(resultsPath));
  fs.writeFileSync(resultsPath, JSON.stringify(output, null, 2));

  console.log('\nA3M Routing Eval Summary');
  console.log('------------------------');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Results file: ${resultsPath}`);

  if (failures.length) {
    appendExperimentRecord({
      experiment_id: `routing_eval_${Date.now()}`,
      dataset_version: 'core_regression_v1',
      run_type: 'routing_eval',
      metrics: summary,
      decision: 'fail',
      notes: failures
    });
    console.error('\nEval gate FAILED:');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  appendExperimentRecord({
    experiment_id: `routing_eval_${Date.now()}`,
    dataset_version: 'core_regression_v1',
    run_type: 'routing_eval',
    metrics: summary,
    decision: 'pass',
    notes: []
  });

  console.log('\nEval gate PASSED');
}

main();
