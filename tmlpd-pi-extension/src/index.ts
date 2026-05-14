/**
 * TMLPD PI Extension - v1.1.0
 * 
 * Parallel Multi-LLM Processing with Streaming, Caching, Cost Tracking, Reliability
 * + Reference Architecture to Full TMLPD (Episodic Memory, MCTS, HALO)
 * 
 * @example
 * ```typescript
 * import { createTMLPD, HALOOrchestrator, EpisodicMemoryStore } from "tmlpd-pi";
 * 
 * // Lightweight usage (core features)
 * const tmlpd = createTMLPD({ cache: { ttl_seconds: 3600 } });
 * const result = await tmlpd.executeParallel(prompt, ["gpt-4o", "claude"]);
 * 
 * // Advanced: HALO orchestration with episodic memory
 * const halo = new HALOOrchestrator({ maxConcurrent: 3, enableMCTS: true });
 * const haloResult = await halo.execute("Build a REST API", async (subtask, agent) => {
 *   // Execute via agent
 * });
 * 
 * // Query episodic memory
 * const similar = memory.getSimilarTasks("Python async API", 5);
 * ```
 */

import { createTMLPD, TMLPDTools, TMLPDConfig, ExecuteResult, ParallelResult, StreamingConfig } from "./tools/tmlpdTools";
import { ResponseCache, CacheConfig, CacheEntry } from "./cache/responseCache";
import { CostTracker, BudgetConfig, CostAlert, CostSummary, CostSnapshot } from "./cost/costTracker";
import { ProviderRegistry, ProviderConfig, ProviderRegistryConfig } from "./providers/registry";
import { CircuitBreaker, withRetry, RetryConfig, CircuitState, calculateRetryDelay, isRetryableStatus, DEFAULT_RETRY_CONFIG } from "./utils/reliability";
import { EpisodicMemoryStore, EpisodicEntry, MemoryQuery } from "./memory/episodicMemory";
import { MCTSWorkflowOptimizer, WorkflowState, WorkflowAction, MCTSConfig } from "./orchestration/mctsWorkflow";
import { HALOOrchestrator, SubTask, AgentAssignment, ExecutionResult, HALOConfig } from "./orchestration/haloOrchestrator";
import { countTokens, estimateCost, estimateCostFromText, getModelCost, listModelsByCost, findCheapestModels, MODEL_COSTS, TokenCost } from "./utils/tokenUtils";
import { isonEncode, isonDecode, compressText, truncateMessages, truncateToTokenBudget, calculateCompressionRatio, Message, CompressionStrategy } from "./utils/compression";
import { LocalProvider, LocalProviderManager, createOllamaProvider, createVLLMProvider, createLMStudioProvider, LocalRuntime, LocalProviderConfig, LocalModelInfo, LocalGenerationResult, LocalParallelResult } from "./providers/localProvider";
import { BatchProcessor, executeBatch, BatchItem, BatchResult, BatchOptions, BatchProgress, ProgressCallback } from "./utils/batchProcessor";

// Re-exports
export { createTMLPD, TMLPDTools, TMLPDConfig, ExecuteResult, ParallelResult, StreamingConfig };
export { ResponseCache, CacheConfig, CacheEntry };
export { CostTracker, BudgetConfig, CostAlert, CostSummary, CostSnapshot };
export { ProviderRegistry, ProviderConfig, ProviderRegistryConfig };
export { CircuitBreaker, withRetry, RetryConfig, CircuitState, calculateRetryDelay, isRetryableStatus, DEFAULT_RETRY_CONFIG };
export { EpisodicMemoryStore, EpisodicEntry, MemoryQuery };
export { MCTSWorkflowOptimizer, WorkflowState, WorkflowAction, MCTSConfig };
export { HALOOrchestrator, SubTask, AgentAssignment, ExecutionResult, HALOConfig };

// Token utilities
export { countTokens, estimateCost, estimateCostFromText, getModelCost, listModelsByCost, findCheapestModels, MODEL_COSTS, TokenCost };

// Compression utilities
export { isonEncode, isonDecode, compressText, truncateMessages, truncateToTokenBudget, calculateCompressionRatio, Message, CompressionStrategy };

// Local provider support (Ollama, vLLM, LM Studio)
export { LocalProvider, LocalProviderManager, createOllamaProvider, createVLLMProvider, createLMStudioProvider, LocalRuntime, LocalProviderConfig, LocalModelInfo, LocalGenerationResult, LocalParallelResult };

// Batch processing
export { BatchProcessor, executeBatch, BatchItem, BatchResult, BatchOptions, BatchProgress, ProgressCallback };

// PI Tool definitions (for PI agent integration)
export const TMLPD_PI_TOOLS = [
  {
    name: "tmlpd_execute",
    description: "Execute prompt across multiple LLM providers in parallel. Optimizes for cost-quality tradeoff with automatic model selection. Use when comparing multiple AI responses or needing faster results via parallel execution.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The prompt to execute" },
        models: { type: "array", items: { type: "string" }, description: "Optional model list (auto-selects if omitted)" },
        streaming: { type: "object", properties: { enabled: { type: "boolean" }, chunk_size: { type: "number" } } }
      },
      required: ["prompt"]
    }
  },
  {
    name: "tmlpd_execute_single",
    description: "Execute with single model via smart routing. Analyzes prompt to select optimal agent based on task type (coding, explanation, analysis, etc.) with cost-quality optimization.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The prompt to execute" },
        model: { type: "string", description: "Optional specific model" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "tmlpd_cost_summary",
    description: "Get real-time cost tracking summary. Shows spending by provider, model, daily/monthly breakdowns, and remaining budget. Essential for cost monitoring in production.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "tmlpd_cache_stats",
    description: "Get response cache statistics. Shows hit rate, cache size, and effectiveness. Cache hits cost $0 and provide instant responses.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "tmlpd_provider_status",
    description: "Get status of all configured LLM providers. Shows readiness, cooldown status, failure counts. Use for debugging or selecting specific providers.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "tmlpd_invalidate_cache",
    description: "Invalidate cached responses. Use when prompt content has changed and fresh response needed, or to clear stale cache entries.",
    inputSchema: {
      type: "object",
      properties: { model: { type: "string", description: "Optional model to invalidate (all if omitted)" } }
    }
  },
  {
    name: "tmlpd_get_budget",
    description: "Get remaining budget for cost controls. Returns daily, monthly, and per-model limits. Use for budget enforcement and alerting.",
    inputSchema: { type: "object", properties: {} }
  },
  {
    name: "tmlpd_halo_execute",
    description: "Execute via HALO (Hierarchical Autonomous Logic-Oriented) orchestrator with 3-tier planning: decompose → assign → execute. Includes episodic memory for learning from past executions. For complex multi-step tasks.",
    inputSchema: {
      type: "object",
      properties: {
        task_description: { type: "string", description: "Task to execute" },
        max_concurrent: { type: "number", description: "Max parallel executions (default: 3)" },
        enable_mcts: { type: "boolean", description: "Enable MCTS optimization (slower but better)" }
      },
      required: ["task_description"]
    }
  },
  {
    name: "tmlpd_episodic_query",
    description: "Query episodic memory for similar past tasks. Useful for learning from past executions and improving future routing decisions.",
    inputSchema: {
      type: "object",
      properties: {
        task_description: { type: "string", description: "Task to find similar executions for" },
        limit: { type: "number", description: "Max results (default: 5)" }
      },
      required: ["task_description"]
    }
  },
  {
    name: "tmlpd_count_tokens",
    description: "Count tokens in text for cost estimation. Supports all major models (GPT-4, Claude, Gemini, Llama). Use for estimating costs before execution or calculating context window usage.",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to count tokens in" },
        model: { type: "string", description: "Model for tokenization (default: gpt-4o)" }
      },
      required: ["text"]
    }
  },
  {
    name: "tmlpd_compress_context",
    description: "Compress context/messages using ISON encoding for token reduction. Reduces context by ~20-40% while preserving meaning. Useful for fitting more content in context windows.",
    inputSchema: {
      type: "object",
      properties: {
        messages: { type: "array", description: "Messages to compress", items: { type: "object" } },
        strategy: { type: "string", enum: ["smart", "first", "last"], description: "Compression strategy (default: smart)" },
        max_tokens: { type: "number", description: "Target token budget" }
      },
      required: ["messages"]
    }
  },
  {
    name: "tmlpd_local_generate",
    description: "Generate using local LLM runtime (Ollama, vLLM, LM Studio). Zero cost, privacy-preserving. Use for development, testing, or when local GPU available. Falls back to cloud if local unavailable.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Prompt for generation" },
        runtime: { type: "string", enum: ["ollama", "vllm", "lmstudio"], description: "Local runtime type" },
        model: { type: "string", description: "Model name (default: llama-3.3-70b)" }
      },
      required: ["prompt", "runtime"]
    }
  },
  {
    name: "tmlpd_batch_execute",
    description: "Execute batch of prompts with concurrency control. Supports priority queuing, progress callbacks, rate limiting. Use for processing multiple prompts efficiently.",
    inputSchema: {
      type: "object",
      properties: {
        prompts: { type: "array", items: { type: "string" }, description: "Prompts to execute" },
        concurrency: { type: "number", description: "Max parallel executions (default: 5)" },
        model: { type: "string", description: "Model to use (default: gpt-4o)" }
      },
      required: ["prompts"]
    }
  }
];

/**
 * Reference to Full TMLPD
 * 
 * This package provides:
 * - Core: streaming, caching, cost tracking, reliability
 * - Reference: episodic memory, MCTS, HALO orchestrator
 * 
 * For production with full features:
 * - Python TMLPD: https://github.com/Das-rebel/tmlpd-skill
 * - Full memory: 3-tier (episodic + semantic + working)
 * - Full MCTS: UCB1, deterministic rollouts, strategy caching
 * - Full HALO: NLP decomposition, capability matching, verification
 */

export default {
  createTMLPD: createTMLPD,
  TMLPDTools: TMLPDTools,
  TMLPD_PI_TOOLS: TMLPD_PI_TOOLS
};