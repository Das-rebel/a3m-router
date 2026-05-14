/**
 * TMLPD Response Cache
 *
 * Caches LLM responses to avoid redundant API calls.
 * Uses content hash for cache key and supports TTL.
 */
export interface CacheEntry {
    content: string;
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    cached_at: number;
    expires_at: number;
}
export interface CacheConfig {
    enabled: boolean;
    ttl_seconds: number;
    max_entries: number;
    cache_dir?: string;
}
export declare class ResponseCache {
    private cache;
    private config;
    private hits;
    private misses;
    constructor(config?: Partial<CacheConfig>);
    /**
     * Generate cache key from prompt + model
     */
    generateKey(prompt: string, model: string): string;
    /**
     * Get cached response if available and not expired
     */
    get(prompt: string, model: string): CacheEntry | null;
    /**
     * Store response in cache
     */
    set(prompt: string, model: string, response: Partial<CacheEntry>): void;
    /**
     * Invalidate cache for specific model or all
     */
    invalidate(model?: string): void;
    /**
     * Get cache statistics
     */
    getStats(): {
        hits: number;
        misses: number;
        size: number;
        hit_rate: number;
    };
    /**
     * Evict oldest entry by cached_at timestamp
     */
    private evictOldest;
}
//# sourceMappingURL=responseCache.d.ts.map