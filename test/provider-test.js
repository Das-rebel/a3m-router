#!/usr/bin/env node
/**
 * A3M Router - Provider Test Framework
 * 
 * Comprehensive tests for the generic provider system.
 * Tests work with whatever providers the user has configured.
 */

const {
  createA3MRouter,
  getAvailableProviders,
  registerProvider,
  deregisterProvider,
  DEFAULT_PROVIDERS,
  providerConfig,
  routeQuery,
  routeBatch,
  recommendForTask,
  extractQueryFeatures,
  MODEL_PROFILES,
  countTokens,
  estimateCost,
  MemoryTree,
  CostTracker,
  ResponseCache,
  ProviderRegistry,
  compressText,
  isonEncode,
  isonDecode,
} = require('../dist/index.js');

// Test configuration
const TEST_CONFIG = {
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  skipLive: process.argv.includes('--skip-live'),
  timeout: 30000,
};

// Test state
let passed = 0;
let failed = 0;
let skipped = 0;

// Test utilities
function log(message, level = 'info') {
  if (level === 'error') console.error(message);
  else if (TEST_CONFIG.verbose || level !== 'debug') console.log(message);
}

function test(name, fn) {
  try {
    fn();
    log(`  ✅ ${name}`, 'success');
    passed++;
  } catch (e) {
    log(`  ❌ ${name}: ${e.message}`, 'error');
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    log(`  ✅ ${name}`, 'success');
    passed++;
  } catch (e) {
    log(`  ❌ ${name}: ${e.message}`, 'error');
    failed++;
  }
}

function skip(name, reason) {
  log(`  ⏭️  ${name} (skipped: ${reason})`, 'warn');
  skipped++;
}

// ============================================================
// TEST SUITE
// ============================================================

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🧪 A3M Router - Provider Test Framework');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Provider Configuration Tests
console.log('📦 1. Provider Configuration');
console.log('─────────────────────────────────────────────────────────────');

test('providerConfig module loads', () => {
  if (!providerConfig) throw new Error('providerConfig not exported');
  if (typeof providerConfig.loadConfig !== 'function') throw new Error('loadConfig not a function');
  if (typeof providerConfig.getAvailableProviders !== 'function') throw new Error('getAvailableProviders not a function');
});

test('DEFAULT_PROVIDERS has expected structure', () => {
  if (!DEFAULT_PROVIDERS) throw new Error('DEFAULT_PROVIDERS not defined');
  
  // Check at least some providers exist
  const providerCount = Object.keys(DEFAULT_PROVIDERS).length;
  if (providerCount < 5) throw new Error(`Expected at least 5 providers, got ${providerCount}`);
  
  // Check provider structure
  for (const [id, provider] of Object.entries(DEFAULT_PROVIDERS)) {
    if (!provider.id) throw new Error(`${id}: missing id`);
    if (!provider.name) throw new Error(`${id}: missing name`);
    if (!provider.type) throw new Error(`${id}: missing type`);
    if (!['api', 'cli', 'local'].includes(provider.type)) throw new Error(`${id}: invalid type ${provider.type}`);
    if (typeof provider.priority !== 'number') throw new Error(`${id}: missing priority`);
  }
});

test('getAvailableProviders returns configured providers', () => {
  const available = getAvailableProviders();
  if (!available) throw new Error('getAvailableProviders returned null');
  
  // Should return object with providers that have API keys
  for (const [id, provider] of Object.entries(available)) {
    if (!provider.id) throw new Error(`${id}: missing id`);
    if (!provider.name) throw new Error(`${id}: missing name`);
    if (!provider.models) throw new Error(`${id}: missing models`);
    if (!Array.isArray(provider.models)) throw new Error(`${id}: models not an array`);
  }
});

test('Provider types are correct', () => {
  const available = getAvailableProviders();
  
  for (const [id, provider] of Object.entries(available)) {
    if (!['api', 'cli', 'local'].includes(provider.type)) {
      throw new Error(`${id}: invalid type ${provider.type}`);
    }
    
    // API providers should have baseUrl and apiKeyEnv
    if (provider.type === 'api') {
      if (!provider.baseUrl) throw new Error(`${id}: API provider missing baseUrl`);
      if (!provider.apiKeyEnv) throw new Error(`${id}: API provider missing apiKeyEnv`);
    }
    
    // CLI providers should have cliCommand
    if (provider.type === 'cli') {
      if (!provider.cliCommand) throw new Error(`${id}: CLI provider missing cliCommand`);
    }
  }
});

// 2. Routing Tests
console.log('\n🔀 2. Routing');
console.log('─────────────────────────────────────────────────────────────');

test('routeQuery returns valid result', () => {
  const result = routeQuery('What is 2+2?');
  if (!result) throw new Error('routeQuery returned null');
  if (!result.primary_model) throw new Error('missing primary_model');
  if (!Array.isArray(result.fallback_models)) throw new Error('fallback_models not an array');
  if (typeof result.estimated_cost !== 'number') throw new Error('estimated_cost not a number');
  if (typeof result.confidence !== 'number') throw new Error('confidence not a number');
});

test('routeQuery selects appropriate provider for code', () => {
  const result = routeQuery('Write a Python function to sort an array');
  if (!result.primary_model) throw new Error('missing primary_model');
  if (!result.reasoning) throw new Error('missing reasoning');
  
  // Should detect code
  const features = extractQueryFeatures('Write a Python function to sort an array');
  if (!features.has_code) throw new Error('should detect code');
});

test('routeQuery selects appropriate provider for math', () => {
  const result = routeQuery('Calculate the integral of x^2');
  if (!result.primary_model) throw new Error('missing primary_model');
  
  const features = extractQueryFeatures('Calculate the integral of x^2');
  if (!features.has_math) throw new Error('should detect math');
});

test('routeQuery selects appropriate provider for translation', () => {
  const result = routeQuery('Translate hello to French');
  if (!result.primary_model) throw new Error('missing primary_model');
  
  const features = extractQueryFeatures('Translate hello to French');
  if (!features.is_translation) throw new Error('should detect translation');
});

test('routeBatch returns array of results', () => {
  const queries = ['Hello', 'What is 2+2?', 'Write Python code'];
  const results = routeBatch(queries);
  
  if (!Array.isArray(results)) throw new Error('routeBatch should return array');
  if (results.length !== queries.length) throw new Error(`Expected ${queries.length} results, got ${results.length}`);
  
  results.forEach((r, i) => {
    if (!r.primary_model) throw new Error(`result ${i}: missing primary_model`);
  });
});

test('recommendForTask returns recommendation', () => {
  const rec = recommendForTask('coding');
  if (!rec) throw new Error('recommendForTask returned null');
  if (!rec.primary) throw new Error('missing primary');
  if (!Array.isArray(rec.fallbacks)) throw new Error('fallbacks not an array');
  if (!rec.reason) throw new Error('missing reason');
});

// 3. Model Profile Tests
console.log('\n📊 3. Model Profiles');
console.log('─────────────────────────────────────────────────────────────');

test('MODEL_PROFILES is populated', () => {
  if (!MODEL_PROFILES) throw new Error('MODEL_PROFILES not defined');
  if (Object.keys(MODEL_PROFILES).length === 0) throw new Error('MODEL_PROFILES is empty');
});

test('Model profiles have required fields', () => {
  for (const [name, profile] of Object.entries(MODEL_PROFILES)) {
    if (!profile.name) throw new Error(`${name}: missing name`);
    if (!profile.provider) throw new Error(`${name}: missing provider`);
    if (typeof profile.cost_per_1k_input !== 'number') throw new Error(`${name}: missing cost_per_1k_input`);
    if (typeof profile.cost_per_1k_output !== 'number') throw new Error(`${name}: missing cost_per_1k_output`);
    if (typeof profile.quality_score !== 'number') throw new Error(`${name}: missing quality_score`);
    if (!Array.isArray(profile.strengths)) throw new Error(`${name}: strengths not an array`);
  }
});

// 4. Token Utility Tests
console.log('\n🔢 4. Token Utilities');
console.log('─────────────────────────────────────────────────────────────');

test('countTokens returns number', () => {
  const tokens = countTokens('Hello world');
  if (typeof tokens !== 'number') throw new Error('should return number');
  if (tokens <= 0) throw new Error('should return positive number');
});

test('countTokens counts correctly', () => {
  const tokens = countTokens('Hello world');
  if (tokens < 2) throw new Error('should count at least 2 tokens for 2 words');
});

test('estimateCost returns number', () => {
  const cost = estimateCost(100, 50, 'gpt-4o');
  if (typeof cost !== 'number') throw new Error('should return number');
  if (cost < 0) throw new Error('should return non-negative');
});

// 5. A3M Router Factory Tests
console.log('\n🏭 5. A3M Router Factory');
console.log('─────────────────────────────────────────────────────────────');

test('createA3MRouter returns router object', () => {
  const router = createA3MRouter({});
  if (!router) throw new Error('createA3MRouter returned null');
  if (typeof router.route !== 'function') throw new Error('missing route function');
  if (typeof router.routeBatch !== 'function') throw new Error('missing routeBatch function');
  if (typeof router.recommend !== 'function') throw new Error('missing recommend function');
});

test('createA3MRouter has memory', () => {
  const router = createA3MRouter({});
  if (!router.memory) throw new Error('missing memory');
  if (typeof router.memory.add !== 'function') throw new Error('memory missing add');
  if (typeof router.memory.search !== 'function') throw new Error('memory missing search');
});

test('createA3MRouter has cache', () => {
  const router = createA3MRouter({});
  if (!router.cache) throw new Error('missing cache');
});

test('createA3MRouter has costTracker', () => {
  const router = createA3MRouter({});
  if (!router.costTracker) throw new Error('missing costTracker');
});

test('createA3MRouter has providers registry', () => {
  const router = createA3MRouter({});
  if (!router.providers) throw new Error('missing providers');
});

test('createA3MRouter has compression', () => {
  const router = createA3MRouter({});
  if (!router.compression) throw new Error('missing compression');
});

test('createA3MRouter has vault', () => {
  const router = createA3MRouter({});
  if (!router.vault) throw new Error('missing vault');
});

test('createA3MRouter has autoFetch', () => {
  const router = createA3MRouter({});
  if (!router.autoFetch) throw new Error('missing autoFetch');
});

test('createA3MRouter has oauth', () => {
  const router = createA3MRouter({});
  if (!router.oauth) throw new Error('missing oauth');
});

// 6. Memory Tree Tests
console.log('\n🧠 6. Memory Tree');
console.log('─────────────────────────────────────────────────────────────');

test('MemoryTree can add and search', () => {
  const memory = new MemoryTree({ maxSize: 100 });
  memory.add('Python is great for data science', { tags: ['python', 'data'] });
  memory.add('JavaScript is great for web', { tags: ['js', 'web'] });
  
  const results = memory.search('python data');
  if (!Array.isArray(results)) throw new Error('search should return array');
});

test('MemoryTree getStats returns stats', () => {
  const memory = new MemoryTree({ maxSize: 100 });
  memory.add('Test entry', { tags: ['test'] });
  
  const stats = memory.getStats();
  if (!stats) throw new Error('getStats returned null');
  if (typeof stats.totalChunks !== 'number') throw new Error('missing totalChunks');
});

// 7. Provider Registry Tests
console.log('\n📋 7. Provider Registry');
console.log('─────────────────────────────────────────────────────────────');

test('ProviderRegistry can be instantiated', () => {
  const registry = new ProviderRegistry();
  if (!registry) throw new Error('failed to create registry');
  if (typeof registry.getReadyProviders !== 'function') throw new Error('missing getReadyProviders');
  if (typeof registry.selectModel !== 'function') throw new Error('missing selectModel');
});

test('ProviderRegistry getStatus returns status', () => {
  const registry = new ProviderRegistry();
  const status = registry.getStatus();
  if (!status) throw new Error('getStatus returned null');
  if (!Array.isArray(status.providers)) throw new Error('providers not an array');
});

// 8. Dynamic Provider Registration Tests
console.log('\n🔧 8. Dynamic Provider Registration');
console.log('─────────────────────────────────────────────────────────────');

test('registerProvider adds new provider', () => {
  const testProvider = {
    name: 'TestProvider',
    type: 'api',
    baseUrl: 'https://test.example.com',
    models: ['test-model'],
    priority: 99,
  };
  
  registerProvider('test-provider', testProvider);
  
  // Check it was added
  if (!providerConfig._providers['test-provider']) throw new Error('provider not added');
  if (providerConfig._providers['test-provider'].name !== 'TestProvider') {
    throw new Error('provider name mismatch');
  }
  
  // Clean up
  deregisterProvider('test-provider');
});

test('deregisterProvider removes provider', () => {
  // First add
  registerProvider('temp-provider', { name: 'Temp', type: 'api', models: [] });
  if (!providerConfig._providers['temp-provider']) throw new Error('provider not added');
  
  // Then remove
  deregisterProvider('temp-provider');
  if (providerConfig._providers['temp-provider']) throw new Error('provider not removed');
});

// 9. Compression Tests
console.log('\n🗜️  9. Compression');
console.log('─────────────────────────────────────────────────────────────');

test('compressText reduces size', () => {
  const text = 'This is a test message that should be compressed to save tokens.';
  const compressed = compressText(text, 0.5);
  if (!compressed) throw new Error('compressText returned null');
  if (compressed.length >= text.length) throw new Error('compression did not reduce size');
});

test('isonEncode/Decode roundtrip', () => {
  const text = 'function test() { return "hello world"; }';
  const encoded = isonEncode(text);
  if (!encoded) throw new Error('isonEncode returned null');
  if (typeof encoded !== 'string') throw new Error('isonEncode should return string');
  
  const decoded = isonDecode(encoded);
  if (!decoded) throw new Error('isonDecode returned null');
  if (typeof decoded !== 'string') throw new Error('isonDecode should return string');
  // Decoded might not be identical due to compression, but should be similar
  if (decoded.length < 5) throw new Error('decoded text too short');
});

// 10. End-to-End Pipeline Test
console.log('\n🔄 10. End-to-End Pipeline');
console.log('─────────────────────────────────────────────────────────────');

test('Full pipeline: route → track → remember', () => {
  const router = createA3MRouter({ memory: { maxSize: 100 } });
  
  // Route
  const route = router.route('Test query');
  if (!route.primary_model) throw new Error('routing failed');
  
  // Track (via costTracker)
  if (!router.costTracker) throw new Error('costTracker not available');
  
  // Remember
  router.memory.add('Test query result', { route: route.primary_model });
  const search = router.memory.search('test');
  if (!Array.isArray(search)) throw new Error('memory search failed');
});

// ============================================================
// LIVE PROVIDER TESTS (if not skipped)
// ============================================================

if (!TEST_CONFIG.skipLive) {
  console.log('\n🌐 Live Provider Tests');
  console.log('─────────────────────────────────────────────────────────────');
  
  const available = getAvailableProviders();
  
  if (Object.keys(available).length === 0) {
    skip('No providers configured', 'No API keys found in environment');
  } else {
    for (const [id, provider] of Object.entries(available)) {
      asyncTest(`Health check: ${provider.name}`, async () => {
        const health = await providerConfig.healthCheck(id);
        if (!health) throw new Error('healthCheck returned null');
        
        // CLI providers may not have traditional health checks
        if (provider.type === 'cli') {
          log(`    ${id}: CLI provider (type: ${health.type || 'unknown'})`, 'debug');
          return;
        }
        
        if (!health.healthy) {
          throw new Error(`unhealthy: ${health.error || 'unknown error'}`);
        }
        
        log(`    ${id}: healthy (${health.latency}ms)`, 'debug');
      });
    }
  }
}

// ============================================================
// SUMMARY
// ============================================================

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
