"use strict";
/**
 * A3M Router - Semantic Cache (Embedding-based)
 *
 * Stores previous query->response pairs and returns cached responses
 * for semantically similar queries using cosine similarity on embeddings.
 *
 * Supports embedders: nomic (via Ollama), openai, or local Ollama.
 * Uses nomic-embed-text by default via local Ollama.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemanticCache = void 0;
class NomicEmbedder {
    url;
    constructor(url = 'http://127.0.0.1:11434/api/embeddings') {
        this.url = url;
    }
    async embed(text) {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'nomic-embed-text',
                prompt: text,
            }),
        });
        if (!response.ok) {
            throw new Error(`Nomic embedder error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.embedding;
    }
}
class OpenAIEmbedder {
    apiKey;
    url;
    constructor(apiKey, url = 'https://api.openai.com/v1/embeddings') {
        this.apiKey = apiKey;
        this.url = url;
    }
    async embed(text) {
        const response = await fetch(this.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text,
            }),
        });
        if (!response.ok) {
            throw new Error(`OpenAI embedder error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.data[0]?.embedding ?? [];
    }
}
class LocalOllamaEmbedder {
    baseUrl;
    model;
    constructor(baseUrl = 'http://127.0.0.1:11434/api/embeddings', model = 'nomic-embed-text') {
        this.baseUrl = baseUrl;
        this.model = model;
    }
    async embed(text) {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                prompt: text,
            }),
        });
        if (!response.ok) {
            throw new Error(`Local Ollama embedder error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return data.embedding;
    }
}
// ============================================================
// Utilities
// ============================================================
/**
 * Compute cosine similarity between two vectors.
 */
function cosineSimilarity(a, b) {
    if (a.length !== b.length)
        return 0;
    if (a.length === 0)
        return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
}
/**
 * Normalize text for hashing: lowercase, collapse whitespace.
 */
function normalize(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Simple hash for cache key (deterministic, fast).
 */
function hashKey(text) {
    let hash = 0;
    const normalized = normalize(text);
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36) + '_' + normalized.slice(0, 20);
}
// ============================================================
// Semantic Cache
// ============================================================
class SemanticCache {
    entries = new Map();
    accessOrder = []; // track LRU order
    embedder;
    similarityThreshold;
    ttlMs;
    maxEntries;
    hits = 0;
    misses = 0;
    constructor(config) {
        this.similarityThreshold = config.similarityThreshold;
        this.ttlMs = (config.ttlSeconds || 3600) * 1000;
        this.maxEntries = config.maxEntries || 1000;
        // Initialize embedder based on config
        switch (config.embedder) {
            case 'openai':
                if (!config.embedderApiKey) {
                    throw new Error('OpenAI embedder requires apiKey in config.embedderApiKey');
                }
                this.embedder = new OpenAIEmbedder(config.embedderApiKey, config.embedderUrl);
                break;
            case 'local':
                this.embedder = new LocalOllamaEmbedder(config.embedderUrl || 'http://127.0.0.1:11434/api/embeddings', 'nomic-embed-text');
                break;
            case 'nomic':
            default:
                this.embedder = new NomicEmbedder(config.embedderUrl || 'http://127.0.0.1:11434/api/embeddings');
                break;
        }
    }
    /**
     * Get cached response for a semantically similar query.
     * Returns the best match above the similarity threshold, or { hit: false }.
     */
    async get(query) {
        const now = Date.now();
        // Generate embedding for the query
        let queryEmbedding;
        try {
            queryEmbedding = await this.embedder.embed(query);
        }
        catch (error) {
            console.warn('SemanticCache: Failed to generate embedding for query:', error);
            this.misses++;
            return { hit: false };
        }
        let bestEntry = null;
        let bestSimilarity = 0;
        for (const entry of this.entries.values()) {
            // Skip expired entries
            if (now > entry.createdAt + entry.ttl)
                continue;
            const similarity = cosineSimilarity(queryEmbedding, entry.embedding);
            if (similarity > bestSimilarity) {
                bestSimilarity = similarity;
                bestEntry = entry;
            }
        }
        if (bestEntry && bestSimilarity >= this.similarityThreshold) {
            this.hits++;
            bestEntry.hitCount++;
            bestEntry.lastAccessedAt = now;
            this.updateAccessOrder(bestEntry.key);
            return {
                hit: true,
                response: bestEntry.response,
                provider: bestEntry.provider,
                model: bestEntry.model,
                cost: bestEntry.cost,
                similarity: bestSimilarity,
            };
        }
        this.misses++;
        return { hit: false };
    }
    /**
     * Store a query->response pair in the cache.
     */
    async set(query, response, metadata) {
        const now = Date.now();
        const key = hashKey(query);
        // Generate embedding
        let embedding;
        try {
            embedding = await this.embedder.embed(query);
        }
        catch (error) {
            console.warn('SemanticCache: Failed to generate embedding for set:', error);
            return;
        }
        // Evict expired entries
        this.evictExpired();
        // Evict oldest if at capacity (LRU)
        if (this.entries.size >= this.maxEntries) {
            this.evictLRU();
        }
        // Check if entry already exists and update it
        if (this.entries.has(key)) {
            const existing = this.entries.get(key);
            existing.response = response;
            existing.embedding = embedding;
            existing.provider = metadata.provider;
            existing.model = metadata.model;
            existing.cost = metadata.cost;
            existing.createdAt = now;
            existing.ttl = (metadata.ttl !== undefined ? metadata.ttl : this.ttlMs / 1000) * 1000;
            existing.lastAccessedAt = now;
            existing.hitCount = existing.hitCount; // preserve hit count
            return;
        }
        const entry = {
            key,
            embedding,
            response,
            provider: metadata.provider,
            model: metadata.model,
            cost: metadata.cost,
            createdAt: now,
            ttl: (metadata.ttl !== undefined ? metadata.ttl : this.ttlMs / 1000) * 1000,
            hitCount: 0,
            lastAccessedAt: now,
        };
        this.entries.set(key, entry);
        this.accessOrder.push(key);
    }
    /**
     * Delete a specific query from the cache.
     */
    async delete(query) {
        const key = hashKey(query);
        if (this.entries.has(key)) {
            this.entries.delete(key);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        }
    }
    /**
     * Clear all cache entries.
     */
    clear() {
        this.entries.clear();
        this.accessOrder = [];
    }
    /**
     * Get cache statistics.
     */
    getStats() {
        const total = this.hits + this.misses;
        return {
            size: this.entries.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: total > 0 ? this.hits / total : 0,
        };
    }
    /**
     * Update access order for LRU tracking.
     */
    updateAccessOrder(key) {
        this.accessOrder = this.accessOrder.filter(k => k !== key);
        this.accessOrder.push(key);
    }
    /**
     * Purge expired entries.
     */
    evictExpired() {
        const now = Date.now();
        for (const [key, entry] of this.entries.entries()) {
            if (now > entry.createdAt + entry.ttl) {
                this.entries.delete(key);
                this.accessOrder = this.accessOrder.filter(k => k !== key);
            }
        }
    }
    /**
     * Evict the least recently used entry.
     */
    evictLRU() {
        if (this.accessOrder.length === 0)
            return;
        const lruKey = this.accessOrder.shift();
        if (lruKey && this.entries.has(lruKey)) {
            this.entries.delete(lruKey);
        }
    }
}
exports.SemanticCache = SemanticCache;
// ============================================================
// Exports
// ============================================================
exports.default = SemanticCache;
//# sourceMappingURL=semanticCache.js.map