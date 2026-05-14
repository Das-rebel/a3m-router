/**
 * TMLPD Local Provider Support
 *
 * Integration with local LLM runtimes:
 * - Ollama (localhost:11434)
 * - vLLM (localhost:8000)
 * - LM Studio (localhost:1234)
 *
 * Enables privacy-preserving, cost-free parallel LLM execution.
 */
export type LocalRuntime = "ollama" | "vllm" | "lmstudio";
export interface LocalProviderConfig {
    runtime: LocalRuntime;
    endpoint?: string;
    default_model?: string;
    timeout_ms?: number;
}
export interface LocalModelInfo {
    name: string;
    size?: string;
    quantization?: string;
    capabilities?: string[];
}
export declare class LocalProvider {
    private runtime;
    private endpoint;
    private default_model;
    private timeout_ms;
    constructor(config: LocalProviderConfig);
    /**
     * List available models on this runtime.
     */
    listModels(): Promise<LocalModelInfo[]>;
    private listOllamaModels;
    private listVLLMModels;
    private listLMStudioModels;
    /**
     * Generate completion (generic, works with all runtimes).
     */
    generate(prompt: string, model?: string, options?: Record<string, any>): Promise<LocalGenerationResult>;
    private ollamaGenerate;
    private vllmGenerate;
    private lmstudioGenerate;
    /**
     * Check if this runtime is available/healthy.
     */
    healthCheck(): Promise<boolean>;
    /**
     * Get runtime info.
     */
    getInfo(): {
        runtime: LocalRuntime;
        endpoint: string;
        default_model: string;
        timeout_ms: number;
    };
    private formatSize;
}
export interface LocalGenerationResult {
    success: boolean;
    error: string | null;
    model: string;
    provider: string;
    content: string;
    duration_ms: number;
    tokens: number;
    cost: number;
}
/**
 * Manager for multiple local providers.
 */
export declare class LocalProviderManager {
    private providers;
    addProvider(name: string, config: LocalProviderConfig): void;
    executeParallel(prompt: string, options?: {
        models?: string[];
        provider_priority?: string[];
        fallback_to_cloud?: boolean;
    }): Promise<LocalParallelResult>;
    healthCheckAll(): Promise<Record<string, boolean>>;
    listProviders(): string[];
}
export interface LocalParallelResult {
    success: boolean;
    responses: LocalGenerationResult[];
    total_models: number;
    successful_models: number;
    total_cost: number;
    duration_ms: number;
}
export declare function createOllamaProvider(model?: string): LocalProvider;
export declare function createVLLMProvider(endpoint?: string, model?: string): LocalProvider;
export declare function createLMStudioProvider(model?: string): LocalProvider;
declare const _default: {
    LocalProvider: typeof LocalProvider;
    LocalProviderManager: typeof LocalProviderManager;
    createOllamaProvider: typeof createOllamaProvider;
    createVLLMProvider: typeof createVLLMProvider;
    createLMStudioProvider: typeof createLMStudioProvider;
};
export default _default;
//# sourceMappingURL=localProvider.d.ts.map