/**
 * TMLPD PI Tools
 *
 * Main tools exposed to the PI agent via the MCP bridge.
 * Features: streaming, caching, cost tracking, reliability.
 */
import { CacheConfig } from "../cache/responseCache";
import { BudgetConfig, CostSummary } from "../cost/costTracker";
import { RetryConfig } from "../utils/reliability";
export interface TMLPDConfig {
    cache?: Partial<CacheConfig>;
    budget?: BudgetConfig;
    retry?: Partial<RetryConfig>;
    maxConcurrent?: number;
}
export interface ExecuteResult {
    success: boolean;
    content?: string;
    error?: string;
    model: string;
    provider: string;
    tokens?: number;
    cost?: number;
    cached?: boolean;
    duration_ms?: number;
    attempts?: number;
}
export interface ParallelResult {
    responses: ExecuteResult[];
    total_models: number;
    successful_models: number;
    total_cost: number;
    duration_ms: number;
}
export interface StreamingConfig {
    enabled: boolean;
    chunk_size?: number;
    on_chunk?: (chunk: string) => void;
}
export declare class TMLPDTools {
    private cache;
    private costTracker;
    private registry;
    private circuitBreakers;
    private retryConfig;
    private maxConcurrent;
    constructor(config?: TMLPDConfig);
    /**
     * Get cost summary
     */
    getCostSummary(): CostSummary;
    /**
     * Get remaining budget
     */
    getRemainingBudget(): {
        daily: number | null;
        monthly: number | null;
        per_model: Record<string, number>;
    };
    /**
     * Get cache stats
     */
    getCacheStats(): {
        hits: number;
        misses: number;
        size: number;
        hit_rate: number;
    };
    /**
     * Get provider status
     */
    getProviderStatus(): Record<string, any>;
    /**
     * Execute single prompt with optional streaming
     */
    execute(prompt: string, model?: string, streaming?: StreamingConfig): Promise<ExecuteResult>;
    /**
     * Execute parallel across multiple models
     */
    executeParallel(prompt: string, models?: string[], streaming?: StreamingConfig): Promise<ParallelResult>;
    /**
     * Get circuit breaker for provider
     */
    private getCircuitBreaker;
    /**
     * Execute HTTP request to provider
     */
    private executeRequest;
    private executeOpenAI;
    private executeAnthropic;
    private executeGemini;
}
/**
 * Create a TMLPD instance
 */
export declare function createTMLPD(config?: TMLPDConfig): TMLPDTools;
/**
 * Get default singleton instance
 */
export declare function getDefault(): TMLPDTools;
//# sourceMappingURL=tmlpdTools.d.ts.map