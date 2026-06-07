/**
 * ReasoningBank — Experience-Based Memory Layer
 * 
 * Complements MemoryTree with semantic retrieval and experience-based learning.
 * Learns from both successful and failed routing decisions.
 * 
 * Based on: "ReasoningBank: Scaling Agent Self-Evolving with Reasoning Memory"
 * (Google Research, ICLR 2026) — github.com/google-research/reasoning-bank
 * 
 * Architecture:
 *   MemoryTree (keyword, fast, free) ←→ ReasoningBank (semantic, quality-scored)
 *   Merge: keyword_score * 0.3 + semantic_score * 0.7
 * 
 * Storage: JSONL files (no external vector DB required)
 * Embedding: Optional — falls back to keyword search when no embedding key configured
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// TYPES
// ============================================================

export interface ReasoningMemory {
  id: string;
  taskId: string;
  query: string;
  title: string;
  description: string;  // when to use this memory
  content: string;       // 1-3 sentences of actionable insight
  status: 'success' | 'failure';
  provider: string;      // which model was used
  cost: number;          // actual cost of the routing decision
  complexity: number;    // query complexity at time of routing
  timestamp: number;
  embedding?: number[];  // optional embedding vector
}

export interface ReasoningBankConfig {
  /** Directory to store reasoning bank files */
  dataDir: string;
  /** Max memories to retrieve per query */
  maxResults: number;
  /** Minimum similarity threshold (0-1) */
  minSimilarity: number;
  /** Embedding provider: 'gemini' | 'openai' | 'none' (keyword fallback) */
  embeddingProvider: 'gemini' | 'openai' | 'none';
  /** API key for embedding provider */
  embeddingApiKey?: string;
  /** Embedding model ID */
  embeddingModel?: string;
}

const DEFAULT_CONFIG: ReasoningBankConfig = {
  dataDir: './data/reasoning-bank',
  maxResults: 5,
  minSimilarity: 0.3,
  embeddingProvider: 'none',
};

// ============================================================
// REASONING BANK
// ============================================================

export class ReasoningBank {
  private config: ReasoningBankConfig;
  private memories: ReasoningMemory[] = [];
  private embeddings: Map<string, number[]> = new Map();
  private loaded = false;

  constructor(config: Partial<ReasoningBankConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ----------------------------------------------------------
  // STORAGE
  // ----------------------------------------------------------

  /** Load memories from disk */
  async load(): Promise<void> {
    const bankFile = path.join(this.config.dataDir, 'memories.jsonl');
    const embFile = path.join(this.config.dataDir, 'embeddings.jsonl');

    this.memories = [];
    this.embeddings = new Map();

    try {
      if (fs.existsSync(bankFile)) {
        const lines = fs.readFileSync(bankFile, 'utf8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try { this.memories.push(JSON.parse(line)); } catch { /* skip corrupt */ }
        }
      }
    } catch { /* no existing bank */ }

    try {
      if (fs.existsSync(embFile)) {
        const lines = fs.readFileSync(embFile, 'utf8').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const { id, embedding } = JSON.parse(line);
            if (id && embedding) this.embeddings.set(id, embedding);
          } catch { /* skip corrupt */ }
        }
      }
    } catch { /* no existing embeddings */ }

    this.loaded = true;
  }

  /** Save memories to disk */
  async save(): Promise<void> {
    if (!fs.existsSync(this.config.dataDir)) {
      fs.mkdirSync(this.config.dataDir, { recursive: true });
    }

    const bankFile = path.join(this.config.dataDir, 'memories.jsonl');
    const embFile = path.join(this.config.dataDir, 'embeddings.jsonl');

    // Save memories
    const memLines = this.memories.map(m => JSON.stringify(m)).join('\n');
    fs.writeFileSync(bankFile, memLines + '\n');

    // Save embeddings
    const embLines = Array.from(this.embeddings.entries())
      .map(([id, emb]) => JSON.stringify({ id, embedding: emb }))
      .join('\n');
    fs.writeFileSync(embFile, embLines + '\n');
  }

  // ----------------------------------------------------------
  // MEMORY INDUCTION (Phase 3 of ReasoningBank pipeline)
  // ----------------------------------------------------------

  /**
   * Extract a memory from a routing decision.
   * Called after a query is routed and the outcome is known.
   */
  async induceMemory(params: {
    query: string;
    provider: string;
    cost: number;
    complexity: number;
    success: boolean;
    reasoning?: string;
  }): Promise<ReasoningMemory> {
    const { query, provider, cost, complexity, success, reasoning } = params;

    // Generate structured memory content
    const status = success ? 'success' : 'failure';
    const title = success
      ? `Successful routing for: ${query.slice(0, 50)}`
      : `Failed routing for: ${query.slice(0, 50)}`;

    const description = success
      ? `Use ${provider} for queries with complexity ${complexity.toFixed(2)} and similar patterns`
      : `Avoid ${provider} for queries with complexity ${complexity.toFixed(2)} — consider higher-tier model`;

    const content = reasoning || (success
      ? `Routing to ${provider} (cost $${cost.toFixed(4)}) was successful for this ${complexity.toFixed(2)}-complexity query.`
      : `Routing to ${provider} (cost $${cost.toFixed(4)}) underperformed for this ${complexity.toFixed(2)}-complexity query.`);

    const memory: ReasoningMemory = {
      id: `rb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId: `task_${Date.now()}`,
      query,
      title,
      description,
      content,
      status,
      provider,
      cost,
      complexity,
      timestamp: Date.now(),
    };

    // Generate embedding if provider is configured
    if (this.config.embeddingProvider !== 'none' && this.config.embeddingApiKey) {
      try {
        memory.embedding = await this.embed(query);
      } catch {
        // Embedding failed — memory still usable via keyword search
      }
    }

    this.memories.push(memory);
    if (memory.embedding) {
      this.embeddings.set(memory.id, memory.embedding);
    }

    // Auto-save every 10 memories
    if (this.memories.length % 10 === 0) {
      await this.save();
    }

    return memory;
  }

  // ----------------------------------------------------------
  // RETRIEVAL (Phase 1 of ReasoningBank pipeline)
  // ----------------------------------------------------------

  /**
   * Select relevant memories for a query.
   * Uses embedding similarity if available, falls back to keyword search.
   */
  async selectMemories(query: string): Promise<ReasoningMemory[]> {
    if (!this.loaded) await this.load();

    if (this.memories.length === 0) return [];

    // Try embedding-based retrieval first
    if (this.config.embeddingProvider !== 'none' && this.config.embeddingApiKey) {
      try {
        const queryEmbedding = await this.embed(query);
        const scored = this.memories.map(m => ({
          memory: m,
          score: m.embedding ? this.cosineSimilarity(queryEmbedding, m.embedding) : 0,
        }));
        scored.sort((a, b) => b.score - a.score);
        return scored
          .filter(s => s.score >= this.config.minSimilarity)
          .slice(0, this.config.maxResults)
          .map(s => s.memory);
      } catch {
        // Fall through to keyword search
      }
    }

    // Keyword fallback: TF-IDF style overlap
    const queryWords = this.tokenize(query);
    if (queryWords.length === 0) return [];

    const scored = this.memories.map(m => {
      const contentWords = this.tokenize(m.query + ' ' + m.content);
      const contentSet = new Set(contentWords);
      const matches = queryWords.filter(w => contentSet.has(w)).length;
      const score = matches / queryWords.length;
      return { memory: m, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored
      .filter(s => s.score >= this.config.minSimilarity)
      .slice(0, this.config.maxResults)
      .map(s => s.memory);
  }

  // ----------------------------------------------------------
  // EMBEDDING (optional)
  // ----------------------------------------------------------

  private async embed(text: string): Promise<number[]> {
    if (this.config.embeddingProvider === 'gemini' && this.config.embeddingApiKey) {
      return this.embedGemini(text);
    }
    if (this.config.embeddingProvider === 'openai' && this.config.embeddingApiKey) {
      return this.embedOpenAI(text);
    }
    throw new Error('No embedding provider configured');
  }

  private async embedGemini(text: string): Promise<number[]> {
    const model = this.config.embeddingModel || 'gemini-embedding-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${this.config.embeddingApiKey}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_QUERY',
      }),
    });
    const data = await resp.json() as any;
    return data.embedding?.values || [];
  }

  private async embedOpenAI(text: string): Promise<number[]> {
    const model = this.config.embeddingModel || 'text-embedding-3-small';
    const resp = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.embeddingApiKey}`,
      },
      body: JSON.stringify({ model, input: text }),
    });
    const data = await resp.json() as any;
    return data.data?.[0]?.embedding || [];
  }

  // ----------------------------------------------------------
  // UTILITIES
  // ----------------------------------------------------------

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(w => w.replace(/[^a-z0-9\u00C0-\u024F]/g, ''))
      .filter(w => w.length > 2);
  }

  /** Get bank statistics */
  getStats() {
    return {
      totalMemories: this.memories.length,
      successes: this.memories.filter(m => m.status === 'success').length,
      failures: this.memories.filter(m => m.status === 'failure').length,
      withEmbeddings: this.embeddings.size,
      providers: [...new Set(this.memories.map(m => m.provider))],
    };
  }

  /** Clear all memories */
  async clear(): Promise<void> {
    this.memories = [];
    this.embeddings = new Map();
    await this.save();
  }
}

export default ReasoningBank;
