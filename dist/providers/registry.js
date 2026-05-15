"use strict";
/**
 * TMLPD Provider Registry
 *
 * Manages provider configurations, API keys, and base URLs.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = void 0;
const DEFAULT_PROVIDER_CONFIG = {
    providers: ["openai", "openrouter", "groq", "cerebras", "mistral", "xai", "zai", "anthropic", "google", "deepseek", "fireworks", "perplexity", "cohere", "bedrock"],
    modelPriority: ["openai/gpt-4o", "groq/llama-3.3-70b-versatile", "cerebras/llama-3.3-70b", "deepseek/deepseek-chat", "fireworks/mixtral-8x7b-instruct", "perplexity/sonar", "cohere/command-r-plus"],
    useOpenclawFallback: false,
    maxTokens: 4096,
};
class ProviderRegistry {
    providers = new Map();
    config;
    modelPriority;
    constructor(config = {}) {
        this.config = { ...DEFAULT_PROVIDER_CONFIG, ...config };
        this.modelPriority = this.config.modelPriority;
        this.initializeProviders();
    }
    initializeProviders() {
        // Initialize from environment
        const envVars = {
            openai: { key: "OPENAI_API_KEY", url: "OPENAI_OPENAI_BASE_URL", mode: "openai" },
            openrouter: { key: "OPENROUTER_API_KEY", url: "OPENROUTER_OPENAI_BASE_URL", mode: "openai" },
            groq: { key: "GROQ_API_KEY", url: "GROQ_OPENAI_BASE_URL", mode: "openai" },
            cerebras: { key: "CEREBRAS_API_KEY", url: "CEREBRAS_OPENAI_BASE_URL", mode: "openai" },
            mistral: { key: "MISTRAL_API_KEY", url: "MISTRAL_OPENAI_BASE_URL", mode: "openai" },
            xai: { key: "XAI_API_KEY", url: "XAI_OPENAI_BASE_URL", mode: "openai" },
            zai: { key: "ZAI_API_KEY", url: "ZAI_OPENAI_BASE_URL", mode: "anthropic" },
            anthropic: { key: "ANTHROPIC_API_KEY", url: "ANTHROPIC_BASE_URL", mode: "anthropic" },
            google: { key: "GOOGLE_API_KEY", url: "GOOGLE_GEMINI_BASE_URL", mode: "gemini" },
            deepseek: { key: "DEEPSEEK_API_KEY", url: "DEEPSEEK_BASE_URL", mode: "openai" },
            fireworks: { key: "FIREWORKS_API_KEY", url: "FIREWORKS_BASE_URL", mode: "openai" },
            perplexity: { key: "PERPLEXITY_API_KEY", url: "PERPLEXITY_BASE_URL", mode: "openai" },
            cohere: { key: "COHERE_API_KEY", url: "COHERE_BASE_URL", mode: "openai" },
            bedrock: { key: "AWS_ACCESS_KEY_ID", url: "BEDROCK_BASE_URL", mode: "openai" },        };
        for (const [name, env] of Object.entries(envVars)) {
            const apiKey = process.env[env.key] || "";
            const baseUrl = process.env[env.url] || "";
            this.providers.set(name, {
                name,
                apiKey,
                baseUrl,
                mode: env.mode,
                priority: this.modelPriority.findIndex((m) => m.startsWith(name + "/")),
                enabled: Boolean(apiKey),
                cooldownUntil: 0,
                failureCount: 0,
                lastError: null,
                lastStatus: null,
            });
        }
    }
    /**
     * Check if provider is ready (has API key, not in cooldown)
     */
    isProviderReady(name) {
        const provider = this.providers.get(name);
        if (!provider || !provider.enabled)
            return false;
        if (Date.now() < provider.cooldownUntil)
            return false;
        return true;
    }
    /**
     * Get best available model from priority list
     */
    selectModel() {
        for (const model of this.modelPriority) {
            const providerName = model.split("/")[0];
            if (this.isProviderReady(providerName)) {
                return model;
            }
        }
        return null;
    }
    /**
     * Get all providers sorted by priority
     */
    getReadyProviders() {
        return Array.from(this.providers.entries())
            .filter(([_, p]) => this.isProviderReady(p.name))
            .sort((a, b) => a[1].priority - b[1].priority)
            .map(([name]) => name);
    }
    /**
     * Record provider success
     */
    recordSuccess(name) {
        const provider = this.providers.get(name);
        if (provider) {
            provider.cooldownUntil = 0;
            provider.failureCount = 0;
            provider.lastError = null;
            provider.lastStatus = null;
        }
    }
    /**
     * Record provider failure
     */
    recordFailure(name, statusCode, error) {
        const provider = this.providers.get(name);
        if (!provider)
            return;
        provider.failureCount++;
        provider.lastError = error;
        provider.lastStatus = statusCode;
        // Apply exponential backoff cooldown
        const baseDelay = statusCode === 429 ? 60000 : statusCode === 403 ? 300000 : 30000;
        const multiplier = Math.min(4, Math.pow(2, Math.max(0, provider.failureCount - 1)));
        provider.cooldownUntil = Date.now() + baseDelay * multiplier;
    }
    /**
     * Get provider status summary
     */
    getStatus() {
        const status = {};
        for (const [name, provider] of this.providers.entries()) {
            status[name] = {
                enabled: provider.enabled,
                mode: provider.mode,
                ready: this.isProviderReady(name),
                cooldownUntil: provider.cooldownUntil ? new Date(provider.cooldownUntil).toISOString() : null,
                lastError: provider.lastError,
                lastStatus: provider.lastStatus,
                failureCount: provider.failureCount,
            };
        }
        return {
            modelPriority: this.modelPriority,
            readyProviders: this.getReadyProviders(),
            providers: status,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.ProviderRegistry = ProviderRegistry;
//# sourceMappingURL=registry.js.map