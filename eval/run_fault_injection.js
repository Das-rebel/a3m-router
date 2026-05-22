#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { ProviderRetryHandler } = require('../dist/routing/providerRetry.js');
const { ProviderHealthManager } = require('../dist/routing/providerHealth.js');
const { appendExperimentRecord } = require('./lib/experiment_registry');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

async function scenarioRetryTransientThenSuccess() {
  const handler = new ProviderRetryHandler({
    openai: {
      timeout: 3000,
      retry: {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT', '503']
      }
    }
  });

  let callCount = 0;
  const result = await handler.executeWithRetry('openai', async () => {
    callCount += 1;
    if (callCount < 3) {
      const err = new Error('temporary timeout');
      err.code = 'ETIMEDOUT';
      throw err;
    }
    return 'ok';
  });

  return result === 'ok' && callCount === 3;
}

async function scenarioNoRetryOnBadRequest() {
  const handler = new ProviderRetryHandler({
    openai: {
      timeout: 3000,
      retry: {
        maxRetries: 5,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        retryableErrors: ['ETIMEDOUT', '503']
      }
    }
  });

  let callCount = 0;
  try {
    await handler.executeWithRetry('openai', async () => {
      callCount += 1;
      const err = new Error('bad request');
      err.status = 400;
      throw err;
    });
    return false;
  } catch {
    return callCount === 1;
  }
}

async function scenarioNoRetryOnChineseQuotaAccountErrors() {
  const handler = new ProviderRetryHandler({
    moonshot: {
      timeout: 3000,
      retry: {
        maxRetries: 5,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
        retryableErrors: ['429', '503', 'ETIMEDOUT']
      }
    }
  });

  let callCount = 0;
  try {
    await handler.executeWithRetry('moonshot', async () => {
      callCount += 1;
      const err = new Error('request reached organization TPD rate limit, current: 1501880, limit: 1500000');
      err.status = 429;
      err.code = 'rate_limit_reached_error';
      throw err;
    });
    return false;
  } catch {
    return callCount === 1;
  }
}

async function scenarioCircuitBreakerOpens() {
  const health = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 30000,
    windowSize: 10
  });

  const provider = 'mock/provider';
  health.recordFailure(provider, 'e1');
  health.recordFailure(provider, 'e2');
  health.recordFailure(provider, 'e3');

  const state = health.getHealth(provider);
  return state.isHealthy === false && state.consecutiveErrors >= 3 && state.cooldownUntil > Date.now();
}

async function scenarioFallbackOrdering() {
  const health = new ProviderHealthManager({ windowSize: 10 });

  health.recordSuccess('fast', 80);
  health.recordSuccess('fast', 90);

  health.recordSuccess('slow', 500);
  health.recordSuccess('slow', 600);

  health.recordFailure('broken', 'x1');
  health.recordFailure('broken', 'x2');
  health.recordFailure('broken', 'x3');

  const chain = health.getFallbackChain(['broken', 'slow', 'fast']);
  return chain[0] === 'fast' && chain[chain.length - 1] === 'broken';
}

async function main() {
  const thresholds = readJson(path.join(__dirname, 'fault_injection_thresholds.json'));
  const scenarios = [
    ['retry_transient_then_success', scenarioRetryTransientThenSuccess],
    ['no_retry_on_bad_request', scenarioNoRetryOnBadRequest],
    ['no_retry_on_chinese_quota_account_errors', scenarioNoRetryOnChineseQuotaAccountErrors],
    ['circuit_breaker_opens', scenarioCircuitBreakerOpens],
    ['fallback_ordering', scenarioFallbackOrdering]
  ];

  const results = [];
  for (const [name, fn] of scenarios) {
    try {
      const ok = await fn();
      results.push({ name, ok, error: null });
    } catch (error) {
      results.push({ name, ok: false, error: String(error) });
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const passRate = results.length ? passed / results.length : 0;
  const summary = {
    total: results.length,
    passed,
    failed: results.length - passed,
    pass_rate: Number(passRate.toFixed(4))
  };

  const output = {
    timestamp_utc: new Date().toISOString(),
    summary,
    thresholds,
    results
  };

  const outDir = path.join(__dirname, 'results');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'fault_injection_latest.json'), JSON.stringify(output, null, 2));

  console.log('\nFault Injection Summary');
  console.log('-----------------------');
  console.log(JSON.stringify(summary, null, 2));

  if (passRate < thresholds.required_pass_rate) {
    appendExperimentRecord({
      experiment_id: `fault_injection_${Date.now()}`,
      dataset_version: 'fault_scenarios_v1',
      run_type: 'fault_injection',
      metrics: summary,
      decision: 'fail',
      notes: results.filter((r) => !r.ok).map((r) => `${r.name}: ${r.error || 'failed'}`)
    });
    console.error(
      `\nFault injection gate FAILED: pass_rate ${summary.pass_rate} < ${thresholds.required_pass_rate}`
    );
    process.exit(1);
  }

  appendExperimentRecord({
    experiment_id: `fault_injection_${Date.now()}`,
    dataset_version: 'fault_scenarios_v1',
    run_type: 'fault_injection',
    metrics: summary,
    decision: 'pass',
    notes: []
  });

  console.log('\nFault injection gate PASSED');
}

main();
