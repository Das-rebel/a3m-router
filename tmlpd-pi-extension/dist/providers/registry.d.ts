/**
 * TMLPD Provider Registry
 *
 * Manages provider configurations, API keys, and base URLs.
 */
export interface ProviderConfig {
    name: string;
    apiKey: string;
    baseUrl: string;
    mode: "openai" | "anthropic" | "gemini";
    priority: number;
    enabled: boolean;
    cooldownUntil: number;
    failureCount: number;
    lastError: string | null;
    lastStatus: number | null;
}
export interface ProviderRegistryConfig {
    providers: string[];
    modelPriority: string[];
    useOpenclawFallback: boolean;
    maxTokens: number;
}
export declare class ProviderRegistry {
    private providers;
    private config;
    private modelPriority;
    constructor(config?: Partial<ProviderRegistryConfig>);
    private initializeProviders;
    /**
     * Check if provider is ready (has API key, not in cooldown)
     */
    isProviderReady(name: string): boolean;
    /**
     * Get best available model from priority list
     */
    selectModel(): string | null;
    /**
     * Get all providers sorted by priority
     */
    getReadyProviders(): string[];
    /**
     * Record provider success
     */
    recordSuccess(name: string): void;
    /**
     * Record provider failure
     */
    recordFailure(name: string, statusCode: number | null, error: string): void;
    /**
     * Get provider status summary
     */
    getStatus(): Record<string, any>;
}
//# sourceMappingURL=registry.d.ts.map