/**
 * A3M Router - Semantic Cache Tests
 */

import assert from 'assert';
import { SemanticCache, SemanticCacheConfig } from '../src/cache/semanticCache';

// ============================================================
// Mock Embedder for testing
// ============================================================

/**
 * Simple mock embedder that produces deterministic vectors.
 * Each unique text gets a consistent embedding.
 */
class MockEmbedder {
  private embeddings = new Map<string, number[]>();
  private dimension: number;

  constructor(dimension = 4) {
    this.dimension = dimension;
  }

  // Seed-based random for deterministic vectors
  private seedRandom(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash = hash & hash;
    }
    return () => {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      return (hash / 0x7fffffff) * 2 - 1; // -1 to 1
    };
  }

  async embed(text: string): Promise<number[]> {
    if (this.embeddings.has(text)) {
      return this.embeddings.get(text)!;
    }

    const rng = this.seedRandom(text);
    const vector: number[] = [];
    for (let i = 0; i < this.dimension; i++) {
      vector.push(rng());
    }

    // Normalize to unit length for cosine similarity to work predictably
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    const normalized = vector.map(v => v / (norm || 1));

    this.embeddings.set(text, normalized);
    return normalized;
  }

  // Manually set an embedding for controlled testing
  setEmbedding(text: string, vector: number[]): void {
    this.embeddings.set(text, vector);
  }
}

// ============================================================
// Helper: Create cache with mock embedder
// ============================================================

function createTestCache(
  config: Partial<SemanticCacheConfig> = {},
  embedder?: MockEmbedder
): { cache: SemanticCache; mockEmbedder: MockEmbedder } {
  const mock = embedder || new MockEmbedder(4);

  // Create a custom cache class that uses our mock embedder
  const TestCache = class extends SemanticCache {
    constructor(cfg: SemanticCacheConfig) {
      super({
        ...cfg,
        embedder: 'nomic', // will be overridden
      });
      // Replace the embedder with our mock
      (this as any).embedder = mock;
    }
  } as any;

  const cacheConfig: SemanticCacheConfig = {
    similarityThreshold: config.similarityThreshold ?? 0.92,
    ttlSeconds: config.ttlSeconds ?? 60,
    maxEntries: config.maxEntries ?? 100,
    embedder: 'nomic',
  };

  const cache = new TestCache(cacheConfig);
  return { cache, mockEmbedder: mock };
}

// ============================================================
// Test Suite
// ============================================================

async function runTests() {
  console.log('🧪 Running SemanticCache Tests...\n');

  let passed = 0;
  let failed = 0;

  // ----------------------------------------
  // Test 1: Basic set/get
  // ----------------------------------------
  try {
    const { cache } = createTestCache({ ttlSeconds: 60 });

    await cache.set('What is Python?', 'Python is a programming language.', {
      provider: 'openai',
      model: 'gpt-4',
      cost: 0.01,
    });

    const result = await cache.get('What is Python?');

    assert(result.hit === true, 'Should be a hit');
    assert(result.response === 'Python is a programming language.', 'Response should match');
    assert(result.provider === 'openai', 'Provider should match');
    assert(result.model === 'gpt-4', 'Model should match');

    console.log('  ✅ Test 1: Basic set/get');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 1: Basic set/get -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 2: Similarity threshold - similar queries
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(8);

    // Set two vectors that are similar (cosine sim ~0.95)
    const vec1 = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
    const vec2 = [0.11, 0.21, 0.31, 0.41, 0.51, 0.61, 0.71, 0.81]; // slightly different

    // Normalize
    const norm1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
    const norm2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
    const n1 = vec1.map(v => v / norm1);
    const n2 = vec2.map(v => v / norm2);

    mock.setEmbedding('query A', n1);
    mock.setEmbedding('query B', n2);

    const { cache } = createTestCache({ similarityThreshold: 0.92 }, mock);

    await cache.set('query A', 'Response for A', {
      provider: 'groq',
      model: 'llama-3.3-70b',
      cost: 0.001,
    });

    const result = await cache.get('query B');

    assert(result.hit === true, 'Should be a hit for similar query');
    assert(result.similarity !== undefined && result.similarity > 0.99, 'Should have high similarity');

    console.log('  ✅ Test 2: Similarity threshold - similar queries');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 2: Similarity threshold -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 3: Similarity threshold - dissimilar queries (should miss)
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(8);

    // Two very different vectors
    const vec1 = [1, 0, 0, 0, 0, 0, 0, 0]; // along x-axis
    const vec2 = [0, 1, 0, 0, 0, 0, 0, 0]; // along y-axis

    mock.setEmbedding('very different A', vec1);
    mock.setEmbedding('very different B', vec2);

    const { cache } = createTestCache({ similarityThreshold: 0.92 }, mock);

    await cache.set('very different A', 'Response A', {
      provider: 'openai',
      model: 'gpt-4',
      cost: 0.01,
    });

    const result = await cache.get('very different B');

    assert(result.hit === false, 'Should be a miss for dissimilar queries');

    console.log('  ✅ Test 3: Similarity threshold - dissimilar queries miss');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 3: Similarity threshold - dissimilar -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 4: TTL expiration
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 1 }, mock); // 1 second TTL

    await cache.set('Expiring query', 'This will expire', {
      provider: 'openai',
      model: 'gpt-4',
      cost: 0.01,
    });

    // Immediate get should work
    let result = await cache.get('Expiring query');
    assert(result.hit === true, 'Should be a hit before expiration');

    // Wait for TTL to pass
    await new Promise(resolve => setTimeout(resolve, 1500));

    result = await cache.get('Expiring query');
    assert(result.hit === false, 'Should be a miss after TTL expiration');

    console.log('  ✅ Test 4: TTL expiration');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 4: TTL expiration -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 5: LRU eviction when maxEntries reached
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ maxEntries: 3, ttlSeconds: 60 }, mock);

    // Fill up to max
    await cache.set('Query 1', 'Response 1', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Query 2', 'Response 2', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Query 3', 'Response 3', { provider: 'a', model: 'm1', cost: 0.001 });

    let stats = cache.getStats();
    assert(stats.size === 3, `Should have 3 entries, got ${stats.size}`);

    // Add one more - should evict oldest (Query 1)
    await cache.set('Query 4', 'Response 4', { provider: 'a', model: 'm1', cost: 0.001 });

    stats = cache.getStats();
    assert(stats.size === 3, `Should still have 3 entries after eviction, got ${stats.size}`);

    // Query 1 should be gone, others should remain
    const r1 = await cache.get('Query 1');
    const r2 = await cache.get('Query 2');
    const r3 = await cache.get('Query 3');
    const r4 = await cache.get('Query 4');

    assert(r1.hit === false, 'Query 1 should be evicted');
    assert(r2.hit === true, 'Query 2 should still be present');
    assert(r3.hit === true, 'Query 3 should still be present');
    assert(r4.hit === true, 'Query 4 should be present');

    console.log('  ✅ Test 5: LRU eviction when maxEntries reached');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 5: LRU eviction -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 6: Access order update (recently accessed stays)
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ maxEntries: 3, ttlSeconds: 60 }, mock);

    await cache.set('Query A', 'Response A', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Query B', 'Response B', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Query C', 'Response C', { provider: 'a', model: 'm1', cost: 0.001 });

    // Access Query A (makes it most recent)
    await cache.get('Query A');

    // Add new entry - should evict B (least recent)
    await cache.set('Query D', 'Response D', { provider: 'a', model: 'm1', cost: 0.001 });

    const rA = await cache.get('Query A');
    const rB = await cache.get('Query B');
    const rC = await cache.get('Query C');
    const rD = await cache.get('Query D');

    assert(rA.hit === true, 'Query A should still be present (was accessed recently)');
    assert(rB.hit === false, 'Query B should be evicted (least recent)');
    assert(rC.hit === true, 'Query C should still be present');
    assert(rD.hit === true, 'Query D should be present');

    console.log('  ✅ Test 6: LRU access order update');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 6: LRU access order -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 7: Statistics tracking - hits and misses
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 60 }, mock);

    await cache.set('Stat Query 1', 'Response 1', { provider: 'a', model: 'm1', cost: 0.001 });

    // Miss (query not in cache)
    await cache.get('Non-existent query');

    // Hit
    const hitResult = await cache.get('Stat Query 1');
    assert(hitResult.hit === true, 'Should be a hit');

    // Another miss
    await cache.get('Another non-existent');

    const stats = cache.getStats();

    assert(stats.hits === 1, `Should have 1 hit, got ${stats.hits}`);
    assert(stats.misses === 2, `Should have 2 misses, got ${stats.misses}`);
    assert(stats.hitRate === 1 / 3, `Hit rate should be ~0.333, got ${stats.hitRate}`);

    console.log('  ✅ Test 7: Statistics tracking');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 7: Statistics tracking -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 8: Clear all entries
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 60 }, mock);

    await cache.set('Clear 1', 'Response 1', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Clear 2', 'Response 2', { provider: 'a', model: 'm1', cost: 0.001 });
    await cache.set('Clear 3', 'Response 3', { provider: 'a', model: 'm1', cost: 0.001 });

    let stats = cache.getStats();
    assert(stats.size === 3, `Should have 3 entries before clear`);

    cache.clear();

    stats = cache.getStats();
    assert(stats.size === 0, 'Should have 0 entries after clear');
    assert(stats.hits === 0, 'Hits should be reset');
    assert(stats.misses === 0, 'Misses should be reset');

    console.log('  ✅ Test 8: Clear all entries');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 8: Clear all entries -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 9: Update existing entry
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 60 }, mock);

    await cache.set('Update Test', 'Original Response', {
      provider: 'groq',
      model: 'llama-3.1',
      cost: 0.001,
    });

    // Update the same query with new response
    await cache.set('Update Test', 'Updated Response', {
      provider: 'openai',
      model: 'gpt-4o',
      cost: 0.02,
    });

    const stats = cache.getStats();
    assert(stats.size === 1, 'Should still have only 1 entry (updated, not new)');

    const result = await cache.get('Update Test');
    assert(result.hit === true, 'Should be a hit');
    assert(result.response === 'Updated Response', 'Should have updated response');
    assert(result.provider === 'openai', 'Should have updated provider');

    console.log('  ✅ Test 9: Update existing entry');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 9: Update existing entry -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 10: Delete specific entry
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 60 }, mock);

    await cache.set('Delete Me', 'Response', { provider: 'a', model: 'm1', cost: 0.001 });

    let result = await cache.get('Delete Me');
    assert(result.hit === true, 'Should be a hit before delete');

    await cache.delete('Delete Me');

    result = await cache.get('Delete Me');
    assert(result.hit === false, 'Should be a miss after delete');

    console.log('  ✅ Test 10: Delete specific entry');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 10: Delete specific entry -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 11: Custom TTL per entry
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(4);
    const { cache } = createTestCache({ ttlSeconds: 60 }, mock); // default 60s

    // Set with custom TTL of 1 second
    await cache.set('Custom TTL', 'Expiring soon', {
      provider: 'a',
      model: 'm1',
      cost: 0.001,
      ttl: 1, // 1 second
    });

    let result = await cache.get('Custom TTL');
    assert(result.hit === true, 'Should be a hit initially');

    await new Promise(resolve => setTimeout(resolve, 1500));

    result = await cache.get('Custom TTL');
    assert(result.hit === false, 'Should be a miss after custom TTL');

    console.log('  ✅ Test 11: Custom TTL per entry');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 11: Custom TTL per entry -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Test 12: Different similarity thresholds
  // ----------------------------------------
  try {
    const mock = new MockEmbedder(8);

    // Create two moderately similar vectors (cosine ~0.85)
    const vec1 = [0.8, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.1];
    const vec2 = [0.7, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.2];

    const norm1 = Math.sqrt(vec1.reduce((s, v) => s + v * v, 0));
    const norm2 = Math.sqrt(vec2.reduce((s, v) => s + v * v, 0));
    const n1 = vec1.map(v => v / norm1);
    const n2 = vec2.map(v => v / norm2);

    mock.setEmbedding('moderate A', n1);
    mock.setEmbedding('moderate B', n2);

    // Test with high threshold (should miss)
    const { cache: highThresholdCache } = createTestCache(
      { similarityThreshold: 0.95, ttlSeconds: 60 },
      mock
    );
    await highThresholdCache.set('moderate A', 'Response', { provider: 'a', model: 'm1', cost: 0.001 });
    let result = await highThresholdCache.get('moderate B');
    assert(result.hit === false, 'Should miss with high threshold');

    // Test with low threshold (should hit)
    const { cache: lowThresholdCache } = createTestCache(
      { similarityThreshold: 0.80, ttlSeconds: 60 },
      mock
    );
    await lowThresholdCache.set('moderate A', 'Response', { provider: 'a', model: 'm1', cost: 0.001 });
    result = await lowThresholdCache.get('moderate B');
    assert(result.hit === true, 'Should hit with low threshold');

    console.log('  ✅ Test 12: Different similarity thresholds');
    passed++;
  } catch (e: any) {
    console.log('  ❌ Test 12: Different similarity thresholds -', e.message);
    failed++;
  }

  // ----------------------------------------
  // Summary
  // ----------------------------------------
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => {
  console.error('Test runner error:', e);
  process.exit(1);
});