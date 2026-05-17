/**
 * Memory Tree Hierarchy
 *
 * Canonicalizes data into ≤3k-token chunks, scores them,
 * and builds hierarchical summary trees.
 */
export interface MemoryChunk {
    id: string;
    content: string;
    score: number;
    parentId?: string;
    depth: number;
    createdAt: number;
    accessCount: number;
}
export interface TreeNode {
    id: string;
    chunks: MemoryChunk[];
    summary: string;
    children: TreeNode[];
    depth: number;
}
export declare class MemoryTree {
    private maxChunkSize;
    private root;
    private chunks;
    private idCounter;
    constructor(maxChunkSize?: number);
    private createNode;
    private generateId;
    /**
     * Add data to the memory tree
     */
    add(data: string): Promise<MemoryChunk[]>;
    /**
     * Split text into chunks of maxChunkSize
     */
    private chunk;
    /**
     * Score a chunk by relevance
     */
    private scoreChunk;
    /**
     * Insert chunk into tree hierarchy
     */
    private insertIntoTree;
    private getAverageScore;
    /**
     * Update summaries for tree nodes
     */
    private updateSummaries;
    private summarizeNode;
    /**
     * Search chunks by content
     */
    search(query: string): MemoryChunk[];
    /**
     * Get context for routing
     */
    getContext(maxTokens?: number): string;
    /**
     * Export as markdown for Obsidian
     */
    toMarkdown(): string;
    /**
     * Get tree stats
     */
    getStats(): {
        totalChunks: number;
        maxDepth: number;
        rootChunks: number;
        treeSize: number;
    };
    private getMaxDepth;
}
export default MemoryTree;
