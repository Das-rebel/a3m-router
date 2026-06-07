"use strict";
/**
 * Hybrid Memory — Merges MemoryTree (keyword) + ReasoningBank (semantic)
 *
 * Provides unified search across both memory systems with configurable
 * weighting. Falls back gracefully when ReasoningBank has no data or
 * no embedding keys configured.
 *
 * Merge formula: final_score = keyword_score * w1 + semantic_score * w2
 * where w1 + w2 = 1.0, configurable via config.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridMemory = void 0;
const memoryTree_1 = require("./memoryTree");
const reasoningBank_1 = require("./reasoningBank");
const DEFAULT_CONFIG = {
    keywordWeight: 0.3, // 30% keyword, 70% semantic
    reasoningBank: {},
};
class HybridMemory {
    memoryTree;
    reasoningBank;
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.memoryTree = new memoryTree_1.MemoryTree();
        this.reasoningBank = new reasoningBank_1.ReasoningBank(this.config.reasoningBank);
    }
    /** Initialize both memory systems */
    async init() {
        await this.reasoningBank.load();
    }
    /** Add data to MemoryTree (fast, always works) */
    async add(data) {
        await this.memoryTree.add(data);
    }
    /** Induce a memory in ReasoningBank from a routing decision */
    async learnFromDecision(params) {
        await this.reasoningBank.induceMemory(params);
    }
    /**
     * Unified search across both memory systems.
     * Returns merged, deduplicated results sorted by relevance.
     */
    async search(query, topK = 10) {
        const results = [];
        const seen = new Set();
        // 1. MemoryTree keyword search (always available)
        const keywordResults = this.memoryTree.search(query, topK * 2);
        for (const chunk of keywordResults) {
            const score = this.normalizeScore(chunk.score, 0, 1);
            results.push({
                id: chunk.id,
                content: chunk.content,
                score: score * this.config.keywordWeight,
                source: 'keyword',
                metadata: { accessCount: chunk.accessCount, depth: chunk.depth },
            });
            seen.add(chunk.id);
        }
        // 2. ReasoningBank semantic search (if available)
        try {
            const semanticResults = await this.reasoningBank.selectMemories(query);
            for (const mem of semanticResults) {
                if (seen.has(mem.id))
                    continue;
                results.push({
                    id: mem.id,
                    content: `[${mem.status.toUpperCase()}] ${mem.title}\n${mem.description}\n${mem.content}`,
                    score: 0.7 * (1 - this.config.keywordWeight), // semantic weight
                    source: 'semantic',
                    metadata: {
                        provider: mem.provider,
                        cost: mem.cost,
                        complexity: mem.complexity,
                        status: mem.status,
                    },
                });
                seen.add(mem.id);
            }
        }
        catch {
            // ReasoningBank unavailable — keyword results still returned
        }
        // 3. Sort by score and return topK
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, topK);
    }
    /** Get context string for router injection */
    async getContext(query, maxTokens = 3000) {
        const results = await this.search(query, 5);
        if (results.length === 0)
            return '';
        const parts = results.map((r, i) => {
            const prefix = r.source === 'semantic' ? `[Experience] ` : '';
            return `${prefix}${r.content}`;
        });
        let context = parts.join('\n\n');
        if (context.length > maxTokens) {
            context = context.slice(0, maxTokens) + '...';
        }
        return context;
    }
    /** Get combined stats */
    getStats() {
        return {
            memoryTree: this.memoryTree.getStats(),
            reasoningBank: this.reasoningBank.getStats(),
            keywordWeight: this.config.keywordWeight,
        };
    }
    /** Save both systems */
    async save() {
        await this.reasoningBank.save();
    }
    normalizeScore(score, min, max) {
        if (max === min)
            return 0.5;
        return Math.min(1, Math.max(0, (score - min) / (max - min)));
    }
}
exports.HybridMemory = HybridMemory;
exports.default = HybridMemory;
//# sourceMappingURL=hybridMemory.js.map