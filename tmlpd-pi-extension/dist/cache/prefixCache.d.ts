/**
 * TMLPD Prefix Cache - RadixAttention Style
 *
 * Inspired by SGLang's RadixAttention (arXiv:2312.07104)
 * Caches KV states for common prefixes (system prompts, etc.)
 * 5-10x speedup for repeated prompt patterns
 */
export interface CacheEntry {
    key: string;
    prefix: string;
    kv_state?: Buffer;
    response_hash?: string;
    hit_count: number;
    last_used: number;
    token_count: number;
    children: Map<string, string>;
}
export interface PrefixCacheStats {
    total_entries: number;
    total_hits: number;
    total_misses: number;
    hit_rate: number;
    memory_estimate_mb: number;
    oldest_entry_age_ms: number;
}
export declare class PrefixCache {
    private entries;
    private access_order;
    private max_entries;
    private max_memory_mb;
    constructor(options?: {
        max_entries?: number;
        max_memory_mb?: number;
    });
    /**
     * Generate cache key from text prefix
     */
    private generateKey;
    /**
     * Check if prefix is cached
     */
    has(prefix: string, model?: string): boolean;
    /**
     * Get cached entry
     */
    get(prefix: string, model?: string): CacheEntry | undefined;
    /**
     * Store a new prefix with its KV state
     */
    store(prefix: string, options?: {
        kv_state?: Buffer;
        response_hash?: string;
        model?: string;
        children?: Map<string, string>;
    }): string;
    /**
     * Extend cached prefix with completion
     */
    extend(prefix: string, completion: string, options?: {
        model?: string;
    }): string;
    /**
     * Find common prefix between two texts
     */
    findCommonPrefix(text1: string, text2: string): string;
    /**
     * Lookup with prefix matching
     * Returns cached entry if any prefix is found
     */
    lookup(text: string, model?: string): {
        cached: boolean;
        prefix?: string;
        remaining?: string;
    };
    /**
     * Batch lookup for multiple texts
     */
    lookupBatch(texts: string[], model?: string): Array<{
        cached: boolean;
        prefix?: string;
        remaining?: string;
    }>;
    /**
     * Get cache statistics
     */
    getStats(): PrefixCacheStats;
    /**
     * Get estimated memory usage
     */
    private getMemoryUsage;
    /**
     * Update LRU order
     */
    private updateLRU;
    /**
     * Evict least recently used entry
     */
    private evictLRU;
    /**
     * Clear all cache
     */
    clear(): void;
    /**
     * Invalidate entries matching pattern
     */
    invalidate(pattern?: string): number;
    /**
     * Warm up cache with common system prompts
     */
    warmup(common_prefixes: string[], model?: string): void;
}
export default PrefixCache;
export declare function createWarmedCache(): PrefixCache;
//# sourceMappingURL=prefixCache.d.ts.map