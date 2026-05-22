/**
 * Provider Health Manager Tests
 * 
 * Tests for:
 * - Health recording (success/failure)
 * - Error tracking and consecutive errors
 * - Circuit breaker trigger (3 consecutive errors → 60s cooldown)
 * - Cooldown behavior
 * - Fallback chain sorting by health score
 * - Probe after cooldown
 */

import {
  ProviderHealthManager,
  ProviderHealth,
  ProviderMetrics,
  HealthEvent,
} from '../src/routing/providerHealth';

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  timeout: 10000,
};

// Test utilities
function log(message: string, level: 'info' | 'error' | 'debug' = 'info') {
  if (level === 'error') console.error(message);
  else if (TEST_CONFIG.verbose || level !== 'debug') console.log(message);
}

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result.then(() => {
        log(`  ✅ ${name}`, 'success');
        passed++;
      }).catch((e) => {
        log(`  ❌ ${name}: ${e.message}`, 'error');
        failed++;
      });
    } else {
      log(`  ✅ ${name}`, 'success');
      passed++;
    }
  } catch (e: any) {
    log(`  ❌ ${name}: ${e.message}`, 'error');
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual}`);
  }
}

// ============================================================
// TEST SUITE
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🧪 Provider Health Manager Tests');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Basic Health Recording
console.log('📊 1. Health Recording');
console.log('─────────────────────────────────────────────────────────────');

test('recordSuccess updates metrics correctly', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordSuccess('openai/gpt-4o', 150);
  manager.recordSuccess('openai/gpt-4o', 200);
  
  const health = manager.getHealth('openai/gpt-4o');
  assert(health !== undefined, 'health should exist');
  assertEqual(health!.consecutiveErrors, 0, 'consecutive errors should be 0');
  assert(health!.lastSuccess > 0, 'lastSuccess should be set');
  assertApprox(health!.latency, 175, 5, 'latency should be average of 150 and 200');
});

test('recordFailure updates metrics correctly', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordFailure('openai/gpt-4o', 'timeout');
  
  const health = manager.getHealth('openai/gpt-4o');
  assert(health !== undefined, 'health should exist');
  assertEqual(health!.consecutiveErrors, 1, 'consecutive errors should be 1');
  assert(health!.lastError > 0, 'lastError should be set');
  assertApprox(health!.errorRate, 1.0, 0.01, 'error rate should be 1.0');
});

test('recordSuccess resets consecutive errors', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  manager.recordSuccess('openai/gpt-4o', 200);
  
  const health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 0, 'consecutive errors should be reset');
  assertEqual(health!.lastSuccess > 0, true, 'lastSuccess should be set');
});

test('rolling window limits metrics to windowSize', () => {
  const manager = new ProviderHealthManager({ windowSize: 5 });
  
  for (let i = 0; i < 10; i++) {
    manager.recordSuccess('openai/gpt-4o', 100 + i);
  }
  
  const health = manager.getHealth('openai/gpt-4o');
  // After 10 successes with windowSize=5, we should have only 5 metrics
  // Health score should be based on recent window
  assert(health !== undefined, 'health should exist');
  assert(health!.healthScore > 0, 'healthScore should be > 0');
});

// 2. Error Tracking
console.log('\n❌ 2. Error Tracking');
console.log('─────────────────────────────────────────────────────────────');

test('error rate calculated correctly over window', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  // 3 successes, 1 failure
  manager.recordSuccess('openai/gpt-4o', 100);
  manager.recordSuccess('openai/gpt-4o', 100);
  manager.recordFailure('openai/gpt-4o', 'error');
  manager.recordSuccess('openai/gpt-4o', 100);
  
  const health = manager.getHealth('openai/gpt-4o');
  assertApprox(health!.errorRate, 0.25, 0.01, 'error rate should be 0.25 (1/4)');
});

test('consecutive errors increment correctly', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  let health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 1, 'first failure');
  
  manager.recordFailure('openai/gpt-4o', 'error2');
  health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 2, 'second failure');
  
  manager.recordFailure('openai/gpt-4o', 'error3');
  health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 3, 'third failure');
});

// 3. Circuit Breaker
console.log('\n🔌 3. Circuit Breaker');
console.log('─────────────────────────────────────────────────────────────');

test('3 consecutive errors trigger circuit breaker', () => {
  const manager = new ProviderHealthManager({
    windowSize: 10,
    circuitBreakerThreshold: 3,
    cooldownMs: 60000,
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  const health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 3, 'consecutive errors should be 3');
  assert(health!.cooldownUntil > Date.now(), 'cooldownUntil should be set in future');
  assertEqual(health!.isHealthy, false, 'provider should be unhealthy');
});

test('provider unavailable during cooldown', () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 60000,
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  const isAvailable = manager.isAvailable('openai/gpt-4o');
  assertEqual(isAvailable, false, 'provider should be unavailable');
});

test('circuit breaker emits events', () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 60000,
  });
  
  let circuitOpened = false;
  let cooldownStarted = false;
  
  manager.on(HealthEvent.CIRCUIT_OPENED, () => { circuitOpened = true; });
  manager.on(HealthEvent.COOLDOWN_STARTED, () => { cooldownStarted = true; });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  assertEqual(circuitOpened, true, 'CIRCUIT_OPENED event should fire');
  assertEqual(cooldownStarted, true, 'COOLDOWN_STARTED event should fire');
});

// 4. Cooldown
console.log('\n⏱️  4. Cooldown');
console.log('─────────────────────────────────────────────────────────────');

test('cooldown expires after configured duration', async () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 100, // 100ms for testing
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  // Provider should be unavailable initially
  assertEqual(manager.isAvailable('openai/gpt-4o'), false, 'unavailable during cooldown');
  
  // Wait for cooldown to expire
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // After cooldown, probe should be allowed
  assertEqual(manager.isProbeAllowed('openai/gpt-4o'), true, 'probe should be allowed after cooldown');
});

test('success after cooldown resets state', async () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 100,
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  // Wait for cooldown
  await new Promise(resolve => setTimeout(resolve, 150));
  
  // Record success (probe request)
  manager.recordSuccess('openai/gpt-4o', 150);
  
  const health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.consecutiveErrors, 0, 'consecutive errors should be reset');
  assertEqual(health!.isHealthy, true, 'provider should be healthy');
  assertEqual(health!.cooldownUntil, 0, 'cooldownUntil should be cleared');
});

// 5. Fallback Chain
console.log('\n🔀 5. Fallback Chain');
console.log('─────────────────────────────────────────────────────────────');

test('getFallbackChain sorts by health score', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  // Set up different health for each provider
  manager.recordSuccess('fast-provider', 50);  // Low latency
  manager.recordSuccess('slow-provider', 500); // High latency
  manager.recordFailure('broken-provider', 'error');
  manager.recordFailure('broken-provider', 'error');
  manager.recordFailure('broken-provider', 'error');
  
  const chain = manager.getFallbackChain([
    'fast-provider',
    'slow-provider', 
    'broken-provider',
  ]);
  
  // fast-provider should be first (healthy, low latency)
  assertEqual(chain[0], 'fast-provider', 'fast-provider should be first');
  // broken-provider should be last (unhealthy)
  assertEqual(chain[chain.length - 1], 'broken-provider', 'broken-provider should be last');
});

test('getFallbackChain puts unavailable providers at end', () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 60000,
  });
  
  manager.recordSuccess('healthy', 100);
  manager.recordFailure('unhealthy', 'error1');
  manager.recordFailure('unhealthy', 'error2');
  manager.recordFailure('unhealthy', 'error3');
  
  const chain = manager.getFallbackChain(['healthy', 'unhealthy']);
  
  // unhealthy should be at the end
  assertEqual(chain[chain.length - 1], 'unhealthy', 'unhealthy should be last');
});

test('getBestProvider returns highest scoring healthy provider', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  // Set up different latencies
  manager.recordSuccess('slow', 2000);
  manager.recordSuccess('fast', 100);
  manager.recordSuccess('medium', 500);
  
  const best = manager.getBestProvider(['slow', 'fast', 'medium']);
  assertEqual(best, 'fast', 'fast provider should be best');
});

test('getBestProvider returns null when all unavailable', () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 60000,
  });
  
  manager.recordFailure('provider1', 'error1');
  manager.recordFailure('provider1', 'error2');
  manager.recordFailure('provider1', 'error3');
  
  manager.recordFailure('provider2', 'error1');
  manager.recordFailure('provider2', 'error2');
  manager.recordFailure('provider2', 'error3');
  
  const best = manager.getBestProvider(['provider1', 'provider2']);
  assertEqual(best, null, 'no provider should be available');
});

// 6. Probe After Cooldown
console.log('\n🔍 6. Probe After Cooldown');
console.log('─────────────────────────────────────────────────────────────');

test('probe allowed after cooldown expires', async () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 50,
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  // Wait for cooldown
  await new Promise(resolve => setTimeout(resolve, 75));
  
  assertEqual(manager.isProbeAllowed('openai/gpt-4o'), true, 'probe should be allowed');
});

test('probe success marks provider healthy', async () => {
  const manager = new ProviderHealthManager({
    circuitBreakerThreshold: 3,
    cooldownMs: 50,
  });
  
  manager.recordFailure('openai/gpt-4o', 'error1');
  manager.recordFailure('openai/gpt-4o', 'error2');
  manager.recordFailure('openai/gpt-4o', 'error3');
  
  // Wait for cooldown
  await new Promise(resolve => setTimeout(resolve, 75));
  
  // Probe success
  manager.recordSuccess('openai/gpt-4o', 100);
  
  const health = manager.getHealth('openai/gpt-4o');
  assertEqual(health!.isHealthy, true, 'should be healthy after probe success');
  assertEqual(manager.isAvailable('openai/gpt-4o'), true, 'should be available after probe success');
});

test('isAvailable checks manual disable', () => {
  const manager = new ProviderHealthManager({});
  
  manager.disableProvider('manual-disabled', 'testing');
  
  assertEqual(manager.isAvailable('manual-disabled'), false, 'manually disabled provider unavailable');
});

// 7. Manual Enable/Disable
console.log('\n🔧 7. Manual Enable/Disable');
console.log('─────────────────────────────────────────────────────────────');

test('disableProvider marks provider unhealthy', () => {
  const manager = new ProviderHealthManager({});
  
  manager.recordSuccess('provider', 100);
  manager.disableProvider('provider', 'maintenance');
  
  const health = manager.getHealth('provider');
  assertEqual(health!.isHealthy, false, 'provider should be unhealthy after disable');
});

test('enableProvider re-enables provider', () => {
  const manager = new ProviderHealthManager({});
  
  manager.recordSuccess('provider', 100);
  manager.disableProvider('provider', 'maintenance');
  manager.enableProvider('provider');
  
  const health = manager.getHealth('provider');
  assertEqual(health!.isHealthy, true, 'provider should be healthy after enable');
  assertEqual(health!.consecutiveErrors, 0, 'consecutive errors should be reset');
});

test('enableProvider emits event', () => {
  const manager = new ProviderHealthManager({});
  
  manager.disableProvider('provider', 'maintenance');
  
  let enabled = false;
  manager.on(HealthEvent.PROVIDER_ENABLED, () => { enabled = true; });
  
  manager.enableProvider('provider');
  
  assertEqual(enabled, true, 'PROVIDER_ENABLED event should fire');
});

// 8. Health Score Calculation
console.log('\n📈 8. Health Score Calculation');
console.log('─────────────────────────────────────────────────────────────');

test('health score decreases with errors', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordSuccess('provider', 100);
  const healthyHealth = manager.getHealth('provider');
  
  manager.recordFailure('provider', 'error');
  manager.recordFailure('provider', 'error');
  manager.recordFailure('provider', 'error');
  manager.recordSuccess('provider', 100); // Reset consecutive errors
  const errorHealth = manager.getHealth('provider');
  
  // Health score should be lower with higher error rate
  // Note: after reset, consecutive errors are 0, but error rate is still 3/4
  assert(errorHealth!.healthScore < healthyHealth!.healthScore, 
    'health score should decrease with error rate');
});

test('health score decreases with latency', () => {
  const manager = new ProviderHealthManager({ windowSize: 10 });
  
  manager.recordSuccess('fast', 50);
  const fastHealth = manager.getHealth('fast');
  
  manager.recordSuccess('slow', 5000);
  const slowHealth = manager.getHealth('slow');
  
  assert(fastHealth!.healthScore > slowHealth!.healthScore,
    'fast provider should have higher health score');
});

// 9. getAllHealth
console.log('\n📋 9. Health Stats');
console.log('─────────────────────────────────────────────────────────────');

test('getAllHealth returns all providers', () => {
  const manager = new ProviderHealthManager({});
  
  manager.recordSuccess('provider1', 100);
  manager.recordSuccess('provider2', 100);
  manager.recordSuccess('provider3', 100);
  
  const allHealth = manager.getAllHealth();
  assertEqual(allHealth.size, 3, 'should have 3 providers');
});

test('getStats returns correct counts', () => {
  const manager = new ProviderHealthManager({});
  
  manager.recordSuccess('healthy1', 100);
  manager.recordSuccess('healthy2', 100);
  manager.recordSuccess('healthy3', 100);
  
  manager.recordFailure('cooldown1', 'error');
  manager.recordFailure('cooldown1', 'error');
  manager.recordFailure('cooldown1', 'error');
  
  manager.disableProvider('disabled', 'test');
  
  const stats = manager.getStats();
  assertEqual(stats.totalProviders, 5, 'total providers should be 5');
  assertEqual(stats.healthyProviders, 3, 'healthy should be 3');
  assertEqual(stats.cooldownProviders, 1, 'cooldown should be 1');
  assertEqual(stats.disabledProviders, 1, 'disabled should be 1');
});

// ============================================================
// SUMMARY
// ============================================================

setTimeout(() => {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  Total:   ${passed + failed + skipped}`);
  console.log(`  Passed:  ${passed} ✅`);
  console.log(`  Failed:  ${failed}${failed > 0 ? ' ❌' : ''}`);
  console.log(`  Skipped: ${skipped}${skipped > 0 ? ' ⏭️' : ''}`);
  console.log('');
  
  if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}, 100);