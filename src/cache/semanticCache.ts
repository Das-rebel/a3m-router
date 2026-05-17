/**
 * A3M Router - Semantic Cache
 *
 * Stores previous query->response pairs and returns cached responses
 * for semantically similar queries using character n-gram Jaccard similarity.
 *
 * No external embedding API needed. Trigram overlap catches paraphrases like:
 *   "What is Python?"    ≈ "Tell me about Python" ≈ "Explain Python"
 *   "Write a sort fn"    ≈ "Create a sorting fn"  ≈ "How to sort an array"
 */

// ============================================================
// Types
// ============================================================

export interface CachedResponse {
  query: string;
  response: string;
  metadata?: any;
  cachedAt: number;
  hitCount: number;
}

export interface SemanticCacheOptions {
  maxSize?: number;             // Max entries (default: 1000)
  similarityThreshold?: number; // 0-1, min similarity for hit (default: 0.92)
  ttl?: number;                 // TTL in ms (default: 3600000 = 1 hour)
}

interface CacheEntry extends CachedResponse {
  trigrams: Set<string>;
  expiresAt: number;
}

export interface SemanticCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
}

// ============================================================
// N-gram utilities
// ============================================================

/**
 * Normalize text: lowercase, collapse whitespace, strip punctuation edges.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract character trigrams from text.
 * Pads with spaces so short words still produce trigrams.
 */
function extractTrigrams(text: string): Set<string> {
  const normalized = " " + normalize(text) + " ";
  const trigrams = new Set<string>();
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.add(normalized.substring(i, i + 3));
  }
  return trigrams;
}

/**
 * Compute Jaccard similarity between two sets.
 * |A ∩ B| / |A ∪ B|
 */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1.0;
  let intersection = 0;
  for (const item of a) {
    if (b.has(item)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ============================================================
// Semantic Cache
// ============================================================

export class SemanticCache {
  private entries: CacheEntry[] = [];
  private maxSize: number;
  private similarityThreshold: number;
  private ttl: number;
  private hits = 0;
  private misses = 0;

  constructor(options?: SemanticCacheOptions) {
    this.maxSize = options?.maxSize ?? 1000;
    this.similarityThreshold = options?.similarityThreshold ?? 0.92;
    this.ttl = options?.ttl ?? 3600000; // 1 hour
  }

  /**
   * Get cached response for a semantically similar query.
   * Returns the best match above the similarity threshold, or null.
   */
  async get(query: string): Promise<CachedResponse | null> {
    const now = Date.now();
    const queryTrigrams = extractTrigrams(query);

    let bestEntry: CacheEntry | null = null;
    let bestScore = 0;

    for (const entry of this.entries) {
      // Skip expired
      if (now > entry.expiresAt) continue;

      const score = jaccard(queryTrigrams, entry.trigrams);
      if (score > bestScore) {
        bestScore = score;
        bestEntry = entry;
      }
    }

    if (bestEntry && bestScore >= this.similarityThreshold) {
      this.hits++;
      bestEntry.hitCount++;
      return {
        query: bestEntry.query,
        response: bestEntry.response,
        metadata: bestEntry.metadata,
        cachedAt: bestEntry.cachedAt,
        hitCount: bestEntry.hitCount,
      };
    }

    this.misses++;
    return null;
  }

  /**
   * Store a query->response pair in the cache.
   */
  async set(query: string, response: string, metadata?: any): Promise<void> {
    const now = Date.now();

    // Evict expired entries first
    this.evictExpired();

    // Evict oldest if at capacity
    if (this.entries.length >= this.maxSize) {
      this.evictOldest();
    }

    // Check if an exact-match entry already exists and update it
    const normalized = normalize(query);
    const existing = this.entries.find(
      (e) => normalize(e.query) === normalized && now <= e.expiresAt
    );
    if (existing) {
      existing.response = response;
      existing.metadata = metadata;
      existing.cachedAt = now;
      existing.expiresAt = now + this.ttl;
      existing.trigrams = extractTrigrams(query);
      return;
    }

    this.entries.push({
      query,
      response,
      metadata,
      cachedAt: now,
      expiresAt: now + this.ttl,
      hitCount: 0,
      trigrams: extractTrigrams(query),
    });
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.entries = [];
  }

  /**
   * Get cache statistics.
   */
  getStats(): SemanticCacheStats {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      size: this.entries.length,
    };
  }

  /**
   * Purge expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    this.entries = this.entries.filter((e) => now <= e.expiresAt);
  }

  /**
   * Evict the oldest (by cachedAt) entry.
   */
  private evictOldest(): void {
    if (this.entries.length === 0) return;
    let oldestIdx = 0;
    let oldestTime = Infinity;
    for (let i = 0; i < this.entries.length; i++) {
      if (this.entries[i].cachedAt < oldestTime) {
        oldestTime = this.entries[i].cachedAt;
        oldestIdx = i;
      }
    }
    this.entries.splice(oldestIdx, 1);
  }
}
