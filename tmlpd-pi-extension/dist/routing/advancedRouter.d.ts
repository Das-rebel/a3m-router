/**
 * TMLPD Advanced Routing - RouteLLM Style
 *
 * Learned routing based on arXiv:2404.06035 (RouteLLM)
 * Balances cost-quality tradeoff with confidence-based model selection
 */
export interface QueryFeatures {
    complexity: number;
    length: number;
    has_code: boolean;
    has_math: boolean;
    is_multilingual: boolean;
    is_creative: boolean;
    requires_reasoning: boolean;
}
export interface ModelProfile {
    name: string;
    provider: string;
    cost_per_1k_input: number;
    cost_per_1k_output: number;
    latency_ms: number;
    quality_score: number;
    strengths: string[];
    context_window: number;
}
export interface RouteDecision {
    primary_model: string;
    fallback_models: string[];
    confidence: number;
    reasoning: string;
    estimated_cost: number;
    estimated_latency_ms: number;
}
export declare const MODEL_PROFILES: Record<string, ModelProfile>;
/**
 * Extract features from prompt for routing decision
 */
export declare function extractQueryFeatures(prompt: string): QueryFeatures;
/**
 * RouteLLM-style learned routing decision
 */
export declare function routeQuery(prompt: string, available_models?: string[], budget_multiplier?: number): RouteDecision;
/**
 * Batch routing for multiple prompts
 */
export declare function routeBatch(prompts: string[], options?: {
    same_model?: boolean;
    max_cost_per_prompt?: number;
    balance_cost?: boolean;
}): RouteDecision[];
/**
 * Get model recommendation for task type
 */
export declare function recommendForTask(task: string): string[];
/**
 * Update model profile from execution feedback (online learning)
 */
export declare function updateModelProfile(model_name: string, actual_latency_ms: number, actual_cost: number, quality_rating: number): void;
declare const _default: {
    extractQueryFeatures: typeof extractQueryFeatures;
    routeQuery: typeof routeQuery;
    routeBatch: typeof routeBatch;
    recommendForTask: typeof recommendForTask;
    updateModelProfile: typeof updateModelProfile;
    MODEL_PROFILES: Record<string, ModelProfile>;
};
export default _default;
//# sourceMappingURL=advancedRouter.d.ts.map