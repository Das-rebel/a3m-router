"use strict";
/**
 * Memory Tree Hierarchy
 *
 * Canonicalizes data into ≤3k-token chunks, scores them,
 * and builds hierarchical summary trees.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryTree = void 0;
class MemoryTree {
    maxChunkSize;
    root;
    chunks;
    idCounter;
    constructor(maxChunkSize = 3000) {
        this.maxChunkSize = maxChunkSize;
        this.root = this.createNode('root');
        this.chunks = new Map();
        this.idCounter = 0;
    }
    createNode(id, depth = 0) {
        return { id, chunks: [], summary: '', children: [], depth };
    }
    generateId() {
        return `chunk_${Date.now()}_${this.idCounter++}`;
    }
    /**
     * Add data to the memory tree
     */
    async add(data) {
        const textChunks = this.chunk(data);
        const addedChunks = [];
        for (const text of textChunks) {
            const score = await this.scoreChunk(text);
            const chunk = {
                id: this.generateId(),
                content: text,
                score,
                depth: 0,
                createdAt: Date.now(),
                accessCount: 0
            };
            this.chunks.set(chunk.id, chunk);
            this.root.chunks.push(chunk);
            this.insertIntoTree(chunk);
            addedChunks.push(chunk);
        }
        await this.updateSummaries();
        return addedChunks;
    }
    /**
     * Split text into chunks of maxChunkSize
     */
    chunk(text) {
        const chunks = [];
        const words = text.split(/\s+/);
        let current = [];
        let currentSize = 0;
        for (const word of words) {
            currentSize += word.length + 1;
            if (currentSize > this.maxChunkSize) {
                chunks.push(current.join(' '));
                current = [word];
                currentSize = word.length + 1;
            }
            else {
                current.push(word);
            }
        }
        if (current.length > 0) {
            chunks.push(current.join(' '));
        }
        return chunks;
    }
    /**
     * Score a chunk by relevance
     */
    async scoreChunk(content) {
        // Simple scoring: length + unique words ratio
        const words = content.split(/\s+/);
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        const uniqueRatio = uniqueWords.size / words.length;
        // Base score + bonus for high unique ratio
        return Math.min(1, (content.length / this.maxChunkSize) * uniqueRatio * 1.5);
    }
    /**
     * Insert chunk into tree hierarchy
     */
    insertIntoTree(chunk) {
        let parent = this.root;
        while (parent.children.length > 0 && chunk.score < 0.5) {
            // Find best matching child
            let bestChild = parent.children[0];
            let bestScore = 0;
            for (const child of parent.children) {
                const avgScore = this.getAverageScore(child);
                if (avgScore > bestScore && avgScore >= chunk.score) {
                    bestScore = avgScore;
                    bestChild = child;
                }
            }
            if (bestScore >= chunk.score) {
                parent = bestChild;
                chunk.depth = parent.depth + 1;
                chunk.parentId = parent.id;
            }
            else {
                break;
            }
        }
        parent.chunks.push(chunk);
    }
    getAverageScore(node) {
        if (node.chunks.length === 0)
            return 0;
        return node.chunks.reduce((sum, c) => sum + c.score, 0) / node.chunks.length;
    }
    /**
     * Update summaries for tree nodes
     */
    async updateSummaries() {
        this.summarizeNode(this.root);
    }
    summarizeNode(node) {
        const allContent = node.chunks.map(c => c.content).join(' ');
        node.summary = allContent.slice(0, 200) + (allContent.length > 200 ? '...' : '');
        for (const child of node.children) {
            this.summarizeNode(child);
        }
    }
    /**
     * Score a chunk by word-level overlap with the query (TF-IDF inspired).
     * Returns a relevance score in [0, 1].
     */
    scoreChunkRelevance(query, content) {
        const queryWords = this.tokenize(query);
        const contentWords = this.tokenize(content);
        if (queryWords.length === 0 || contentWords.length === 0)
            return 0;
        const contentSet = new Set(contentWords);
        // Exact word matches (case-insensitive)
        const exactMatches = queryWords.filter(w => contentSet.has(w)).length;
        // Partial/fuzzy matches: query word is substring of content word or vice versa
        let partialMatches = 0;
        for (const qw of queryWords) {
            if (exactMatches > 0 && contentSet.has(qw))
                continue; // already counted
            for (const cw of contentSet) {
                if (cw.includes(qw) || qw.includes(cw)) {
                    partialMatches++;
                    break;
                }
            }
        }
        // Weighted score: exact matches worth more than partial
        const weightedMatch = exactMatches * 1.0 + partialMatches * 0.4;
        const coverage = weightedMatch / queryWords.length;
        // Normalize by length ratio to favor concise matches
        const lengthRatio = Math.min(1, contentWords.length / Math.max(queryWords.length, 1));
        return Math.min(1, coverage * (1 / lengthRatio) * 0.5 + coverage * 0.5);
    }
    /**
     * Simple word tokenizer — splits on whitespace and normalizes to lowercase.
     */
    tokenize(text) {
        return text
            .toLowerCase()
            .split(/\s+/)
            .map(w => w.replace(/[^a-z0-9\u00C0-\u024F]/g, ''))
            .filter(w => w.length > 1);
    }
    /**
     * Search chunks by relevance scoring.
     * - Word-level TF-IDF style overlap scoring
     * - Fuzzy partial word matching
     * - Returns top-K results sorted by relevance
     * - Recency fallback: if no word matches, returns most recently added chunks
     */
    search(query, topK = 10) {
        const scored = [];
        const queryWords = this.tokenize(query);
        for (const chunk of this.chunks.values()) {
            const relevance = this.scoreChunkRelevance(query, chunk.content);
            if (relevance > 0) {
                chunk.accessCount++;
                scored.push({ chunk, score: relevance });
            }
        }
        // Sort by score descending
        scored.sort((a, b) => b.score - a.score);
        // If we have results with relevance > 0, take topK
        if (scored.length > 0) {
            return scored.slice(0, topK).map(s => s.chunk);
        }
        // Recency fallback: return most recently added chunks
        const fallback = Array.from(this.chunks.values())
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, topK);
        for (const chunk of fallback) {
            chunk.accessCount++;
        }
        return fallback;
    }
    /**
     * Get context for routing
     */
    getContext(maxTokens = 3000) {
        const allChunks = Array.from(this.chunks.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        let context = allChunks.map(c => c.content).join('\n\n');
        if (context.length > maxTokens) {
            context = context.slice(0, maxTokens) + '...';
        }
        return context;
    }
    /**
     * Export as markdown for Obsidian
     */
    toMarkdown() {
        const lines = ['# Memory Tree\n'];
        const traverse = (node, prefix = '') => {
            for (const chunk of node.chunks) {
                lines.push(`${prefix}## ${chunk.id} (score: ${chunk.score.toFixed(2)})`);
                lines.push(chunk.content);
                lines.push('');
            }
            for (const child of node.children) {
                lines.push(`${prefix}### ${child.id}`);
                traverse(child, prefix + '#');
            }
        };
        traverse(this.root);
        return lines.join('\n');
    }
    /**
     * Get tree stats
     */
    getStats() {
        return {
            totalChunks: this.chunks.size,
            maxDepth: this.getMaxDepth(this.root),
            rootChunks: this.root.chunks.length,
            treeSize: JSON.stringify(this.root).length
        };
    }
    getMaxDepth(node) {
        if (node.children.length === 0)
            return node.depth;
        return Math.max(...node.children.map(c => this.getMaxDepth(c)));
    }
}
exports.MemoryTree = MemoryTree;
exports.default = MemoryTree;
//# sourceMappingURL=memoryTree.js.map