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
export interface CachedResponse {
    query: string;
    response: string;
    metadata?: any;
    cachedAt: number;
    hitCount: number;
}
export interface SemanticCacheOptions {
    maxSize?: number;
    similarityThreshold?: number;
    ttl?: number;
}
export interface SemanticCacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
}
export declare class SemanticCache {
    private entries;
    private maxSize;
    private similarityThreshold;
    private ttl;
    private hits;
    private misses;
    constructor(options?: SemanticCacheOptions);
    /**
     * Get cached response for a semantically similar query.
     * Returns the best match above the similarity threshold, or null.
     */
    get(query: string): Promise<CachedResponse | null>;
    /**
     * Store a query->response pair in the cache.
     */
    set(query: string, response: string, metadata?: any): Promise<void>;
    /**
     * Clear all cache entries.
     */
    clear(): void;
    /**
     * Get cache statistics.
     */
    getStats(): SemanticCacheStats;
    /**
     * Purge expired entries.
     */
    private evictExpired;
    /**
     * Evict the oldest (by cachedAt) entry.
     */
    private evictOldest;
}
