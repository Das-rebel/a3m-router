/**
 * ProviderRetryHandler Tests
 */

import assert from 'assert';
import {
  ProviderRetryHandler,
  createRetryHandler,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_PROVIDER_CONFIG,
  PROVIDER_CONTEXT_LIMITS,
  RetryConfig,
  ProviderRetryConfig,
} from '../src/routing/providerRetry';

// ============================================================
// HELPERS
// ============================================================

function assertApproximatelyEqual(actual: number, expected: number, tolerance = 0.2): void {
  const diff = Math.abs(actual - expected);
  const acceptableRange = expected * tolerance;
  if (diff > acceptableRange) {
    throw new Error(`Expected ${actual} to be approximately ${expected} (tolerance: ${acceptableRange})`);
  }
}

// ============================================================
// TEST SUITE
// ============================================================

async function runTests() {
  console.log('Running ProviderRetryHandler tests...\n');

  await testBackoffDelayCalculation();
  await testRetryOnTransientErrors();
  await testNoRetryOnNonRetryableErrors();
  await test429HandlingWithRetryAfter();
  await testContextWindowValidation();
  await testProviderSpecificConfigs();
  await testConfigureProvider();
  await testRetryStats();
  await testRateLimitErrorDetection();

  console.log('\n✅ All tests passed!');
}

// ============================================================
// TEST CASES
// ============================================================

async function testBackoffDelayCalculation() {
  console.log('Test: Backoff delay calculation');

  const handler = new ProviderRetryHandler();

  // Test exponential backoff without jitter (we'll check bounds)
  const config: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: ['ECONNRESET'],
  };

  // Attempt 0: base = 1000 * 2^0 = 1000, jitter [500, 1000]
  let delay = handler.calculateBackoffDelay(0, config);
  assert(delay >= 500 && delay <= 1000, `Attempt 0: Expected delay in [500, 1000], got ${delay}`);
  console.log('  ✓ Attempt 0: delay in expected range [500, 1000]');

  // Attempt 1: base = 1000 * 2^1 = 2000, jitter [1000, 2000]
  delay = handler.calculateBackoffDelay(1, config);
  assert(delay >= 1000 && delay <= 2000, `Attempt 1: Expected delay in [1000, 2000], got ${delay}`);
  console.log('  ✓ Attempt 1: delay in expected range [1000, 2000]');

  // Attempt 2: base = 1000 * 2^2 = 4000, jitter [2000, 4000]
  delay = handler.calculateBackoffDelay(2, config);
  assert(delay >= 2000 && delay <= 4000, `Attempt 2: Expected delay in [2000, 4000], got ${delay}`);
  console.log('  ✓ Attempt 2: delay in expected range [2000, 4000]');

  // Attempt 3: base = 1000 * 2^3 = 8000, jitter [4000, 8000]
  delay = handler.calculateBackoffDelay(3, config);
  assert(delay >= 4000 && delay <= 8000, `Attempt 3: Expected delay in [4000, 8000], got ${delay}`);
  console.log('  ✓ Attempt 3: delay in expected range [4000, 8000]');

  // Test max delay cap
  const maxConfig: RetryConfig = { ...config, maxDelayMs: 5000 };
  delay = handler.calculateBackoffDelay(10, maxConfig);
  assert(delay <= 5000, `Should cap at maxDelayMs: ${delay} > 5000`);
  console.log('  ✓ Respects maxDelayMs cap');

  console.log('  ✅ Backoff delay calculation tests passed\n');
}

async function testRetryOnTransientErrors() {
  console.log('Test: Retry on transient errors');

  const handler = new ProviderRetryHandler();

  // Test that retryable errors trigger retries
  const retryableErrors = [
    { code: 'ECONNRESET', shouldRetry: true },
    { code: 'ETIMEDOUT', shouldRetry: true },
    { code: 'ECONNREFUSED', shouldRetry: true },
    { status: 503, shouldRetry: true },
    { status: 500, shouldRetry: true },
    { status: 502, shouldRetry: true },
    { status: 504, shouldRetry: true },
    { message: 'socket hang up', shouldRetry: true },
  ];

  for (const error of retryableErrors) {
    const result = handler.isRetryableError(error);
    assert(result === error.shouldRetry, 
      `Error ${JSON.stringify(error)} should${error.shouldRetry ? '' : ' NOT'} be retryable`);
  }
  console.log('  ✓ All configured retryable errors detected correctly');

  console.log('  ✅ Retry on transient errors tests passed\n');
}

async function testNoRetryOnNonRetryableErrors() {
  console.log('Test: No retry on non-retryable errors');

  const handler = new ProviderRetryHandler();

  // Test that non-retryable errors don't trigger retries
  const nonRetryableErrors = [
    { status: 400, message: 'Bad Request' },
    { status: 401, message: 'Unauthorized' },
    { status: 403, message: 'Forbidden' },
    { status: 404, message: 'Not Found' },
    { code: 'VALIDATION_ERROR', message: 'Invalid input' },
    { code: 'INVALID_API_KEY', message: 'API key invalid' },
  ];

  for (const error of nonRetryableErrors) {
    const result = handler.isRetryableError(error);
    assert(result === false, 
      `Error ${JSON.stringify(error)} should NOT be retryable`);
  }
  console.log('  ✓ All non-retryable errors correctly rejected');

  console.log('  ✅ No retry on non-retryable errors tests passed\n');
}

async function test429HandlingWithRetryAfter() {
  console.log('Test: 429 handling with Retry-After header');

  const handler = new ProviderRetryHandler();

  // Test with Retry-After in seconds
  const errorWithRetryAfterSeconds = {
    status: 429,
    headers: { 'retry-after': '5' },
  };
  
  const delay = handler.calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG, errorWithRetryAfterSeconds);
  assert(delay >= 4500 && delay <= 5500, 
    `Expected delay ~5000ms from Retry-After: 5, got ${delay}`);
  console.log('  ✓ Retry-After seconds correctly parsed and applied');

  // Test with Retry-After as HTTP date
  const futureDate = new Date(Date.now() + 10000).toUTCString();
  const errorWithRetryAfterDate = {
    status: 429,
    headers: { 'retry-after': futureDate },
  };
  
  const delayFromDate = handler.calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG, errorWithRetryAfterDate);
  assert(delayFromDate >= 8000 && delayFromDate <= 12000,
    `Expected delay ~10000ms from Retry-After date, got ${delayFromDate}`);
  console.log('  ✓ Retry-After HTTP date correctly parsed and applied');

  // Test without Retry-After falls back to backoff
  const errorWithoutRetryAfter = {
    status: 429,
    headers: {},
  };
  
  const fallbackDelay = handler.calculateBackoffDelay(0, DEFAULT_RETRY_CONFIG, errorWithoutRetryAfter);
  // Should use exponential backoff: 1000 * 2^0 * jitter = [500, 1000]
  assert(fallbackDelay >= 500 && fallbackDelay <= 1500,
    `Expected delay in backoff range [500, 1500], got ${fallbackDelay}`);
  console.log('  ✓ Falls back to exponential backoff when no Retry-After');

  console.log('  ✅ 429 handling tests passed\n');
}

async function testContextWindowValidation() {
  console.log('Test: Context window validation');

  const handler = new ProviderRetryHandler();

  // Test valid context window
  const shortPrompt = 'Hello, this is a short prompt.';
  const validResult = handler.validateContextWindow('openai', shortPrompt);
  assert(validResult.valid === true, 'Short prompt should be valid');
  console.log('  ✓ Short prompt passes validation');

  // Test invalid context window (very long prompt for small context provider)
  const longPrompt = 'Lorem ipsum '.repeat(10000);  // ~130K chars
  const invalidResult = handler.validateContextWindow('cerebras', longPrompt);
  assert(invalidResult.valid === false, 'Long prompt should fail for small context');
  assert(invalidResult.reason !== undefined, 'Should provide reason');
  assert(invalidResult.suggestedProvider !== undefined, 'Should suggest alternative');
  console.log(`  ✓ Long prompt correctly rejected with reason: ${invalidResult.reason?.substring(0, 50)}...`);

  // Test with known large context provider
  const largeContextResult = handler.validateContextWindow('anthropic', longPrompt);
  assert(largeContextResult.valid === true, 'Same prompt should fit in anthropic');
  console.log('  ✓ Long prompt fits in large context provider');

  console.log('  ✅ Context window validation tests passed\n');
}

async function testProviderSpecificConfigs() {
  console.log('Test: Provider-specific configs');

  const handler = new ProviderRetryHandler();

  // DeepSeek should have longer timeout and more retries
  const deepseekConfig = handler.getConfig('deepseek');
  assert(deepseekConfig.timeout === 30000, `DeepSeek timeout should be 30000, got ${deepseekConfig.timeout}`);
  assert(deepseekConfig.retry.maxRetries === 5, `DeepSeek maxRetries should be 5, got ${deepseekConfig.retry.maxRetries}`);
  assert(deepseekConfig.rateLimitRetries === 3, `DeepSeek rateLimitRetries should be 3, got ${deepseekConfig.rateLimitRetries}`);
  console.log('  ✓ DeepSeek config: timeout=30000, maxRetries=5, rateLimitRetries=3');

  // Groq should have shorter timeout and fewer retries
  const groqConfig = handler.getConfig('groq');
  assert(groqConfig.timeout === 10000, `Groq timeout should be 10000, got ${groqConfig.timeout}`);
  assert(groqConfig.retry.maxRetries === 2, `Groq maxRetries should be 2, got ${groqConfig.retry.maxRetries}`);
  assert(groqConfig.rateLimitRetries === 1, `Groq rateLimitRetries should be 1, got ${groqConfig.rateLimitRetries}`);
  console.log('  ✓ Groq config: timeout=10000, maxRetries=2, rateLimitRetries=1');

  // Unknown provider should fallback to default
  const unknownConfig = handler.getConfig('unknown-provider');
  assert(unknownConfig.timeout === 15000, `Unknown provider should use default timeout=15000, got ${unknownConfig.timeout}`);
  assert(unknownConfig.retry.maxRetries === 3, `Unknown provider should use default maxRetries=3, got ${unknownConfig.retry.maxRetries}`);
  console.log('  ✓ Unknown provider correctly falls back to default config');

  console.log('  ✅ Provider-specific config tests passed\n');
}

async function testConfigureProvider() {
  console.log('Test: configureProvider method');

  const handler = new ProviderRetryHandler();

  // Configure a new provider
  handler.configureProvider('custom-provider', {
    timeout: 5000,
    retry: {
      maxRetries: 10,
      initialDelayMs: 500,
      maxDelayMs: 60000,
      backoffMultiplier: 1.5,
    },
    rateLimitRetries: 5,
  });

  const customConfig = handler.getConfig('custom-provider');
  assert(customConfig.timeout === 5000, `Custom timeout should be 5000, got ${customConfig.timeout}`);
  assert(customConfig.retry.maxRetries === 10, `Custom maxRetries should be 10, got ${customConfig.retry.maxRetries}`);
  assert(customConfig.retry.initialDelayMs === 500, `Custom initialDelayMs should be 500, got ${customConfig.retry.initialDelayMs}`);
  assert(customConfig.rateLimitRetries === 5, `Custom rateLimitRetries should be 5, got ${customConfig.rateLimitRetries}`);
  console.log('  ✓ New custom provider configured correctly');

  // Override existing provider
  handler.configureProvider('deepseek', { timeout: 99999 });
  const updatedConfig = handler.getConfig('deepseek');
  assert(updatedConfig.timeout === 99999, `Updated timeout should be 99999, got ${updatedConfig.timeout}`);
  // Other settings should remain
  assert(updatedConfig.retry.maxRetries === 5, `maxRetries should remain 5`);
  console.log('  ✓ Existing provider correctly updated');

  console.log('  ✅ configureProvider tests passed\n');
}

async function testRetryStats() {
  console.log('Test: Retry statistics tracking');

  const handler = new ProviderRetryHandler();

  // Initially stats should be zeroed
  const initialStats = handler.getStats('openai');
  assert(initialStats.totalRequests === 0, 'Initial totalRequests should be 0');
  assert(initialStats.successfulRequests === 0, 'Initial successfulRequests should be 0');
  console.log('  ✓ Initial stats are zeroed');

  // Test stats after simulated operations
  handler.resetStats('openai');
  const resetStats = handler.getStats('openai');
  assert(resetStats.totalRequests === 0, 'After reset, totalRequests should be 0');
  console.log('  ✓ resetStats correctly resets provider stats');

  // Test getAllStats
  const allStats = handler.getAllStats();
  assert(typeof allStats === 'object', 'getAllStats should return an object');
  assert(allStats['openai'] !== undefined, 'getAllStats should include openai');
  console.log('  ✓ getAllStats returns all provider stats');

  console.log('  ✅ Retry statistics tests passed\n');
}

async function testRateLimitErrorDetection() {
  console.log('Test: Rate limit error detection');

  const handler = new ProviderRetryHandler();

  // Test various 429 error formats
  const rateLimitErrors = [
    { status: 429 },
    { statusCode: 429 },
    { code: '429', message: 'Rate limit exceeded' },
    { error: { status: 429 } },
  ];

  for (const error of rateLimitErrors) {
    assert(handler.isRateLimitError(error) === true,
      `Error ${JSON.stringify(error)} should be detected as rate limit`);
  }
  console.log('  ✓ All 429 variants correctly detected as rate limit');

  // Non-429 errors should not be rate limits
  const nonRateLimitErrors = [
    { status: 400 },
    { status: 500 },
    { code: 'ECONNRESET' },
  ];

  for (const error of nonRateLimitErrors) {
    assert(handler.isRateLimitError(error) === false,
      `Error ${JSON.stringify(error)} should NOT be detected as rate limit`);
  }
  console.log('  ✓ Non-429 errors correctly not marked as rate limit');

  console.log('  ✅ Rate limit error detection tests passed\n');
}

// ============================================================
// RUN TESTS
// ============================================================

runTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});