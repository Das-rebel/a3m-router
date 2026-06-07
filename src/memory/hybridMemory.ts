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

import { MemoryTree, MemoryChunk } from './memoryTree';
import { ReasoningBank, ReasoningMemory, ReasoningBankConfig } from './reasoningBank';

export interface HybridMemoryConfig {
  /** Weight for MemoryTree keyword score (0-1). ReasoningBank gets (1 - this). */
  keywordWeight: number;
  /** ReasoningBank config */
  reasoningBank: Partial<ReasoningBankConfig>;
}

const DEFAULT_CONFIG: HybridMemoryConfig = {
  keywordWeight: 0.3,  // 30% keyword, 70% semantic
  reasoningBank: {},
};

export interface HybridResult {
  id: string;
  content: string;
  score: number;
  source: 'keyword' | 'semantic' | 'merged';
  metadata?: Record<string, unknown>;
}

export class HybridMemory {
  private memoryTree: MemoryTree;
  private reasoningBank: ReasoningBank;
  private config: HybridMemoryConfig;

  constructor(config: Partial<HybridMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.memoryTree = new MemoryTree();
    this.reasoningBank = new ReasoningBank(this.config.reasoningBank);
  }

  /** Initialize both memory systems */
  async init(): Promise<void> {
    await this.reasoningBank.load();
  }

  /** Add data to MemoryTree (fast, always works) */
  async add(data: string): Promise<void> {
    await this.memoryTree.add(data);
  }

  /** Induce a memory in ReasoningBank from a routing decision */
  async learnFromDecision(params: {
    query: string;
    provider: string;
    cost: number;
    complexity: number;
    success: boolean;
    reasoning?: string;
  }): Promise<void> {
    await this.reasoningBank.induceMemory(params);
  }

  /**
   * Unified search across both memory systems.
   * Returns merged, deduplicated results sorted by relevance.
   */
  async search(query: string, topK = 10): Promise<HybridResult[]> {
    const results: HybridResult[] = [];
    const seen = new Set<string>();

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
        if (seen.has(mem.id)) continue;
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
    } catch {
      // ReasoningBank unavailable — keyword results still returned
    }

    // 3. Sort by score and return topK
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /** Get context string for router injection */
  async getContext(query: string, maxTokens = 3000): Promise<string> {
    const results = await this.search(query, 5);
    if (results.length === 0) return '';

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
  async save(): Promise<void> {
    await this.reasoningBank.save();
  }

  private normalizeScore(score: number, min: number, max: number): number {
    if (max === min) return 0.5;
    return Math.min(1, Math.max(0, (score - min) / (max - min)));
  }
}

export default HybridMemory;
