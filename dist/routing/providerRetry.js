"use strict";
/**
 * A3M Router - Per-Provider Retry Logic
 *
 * Implements exponential backoff with jitter for transient errors,
 * rate limit (429) handling with Retry-After header support,
 * and context window validation before sending requests.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROVIDER_CONTEXT_LIMITS = exports.DEFAULT_RETRY_CONFIG = exports.ProviderRetryHandler = exports.DEFAULT_PROVIDER_CONFIG = void 0;
exports.createRetryHandler = createRetryHandler;
exports.getDefaultRetryHandler = getDefaultRetryHandler;
const tokenUtils_1 = require("../utils/tokenUtils");
// ============================================================
// DEFAULT CONFIGURATION
// ============================================================
const DEFAULT_RETRY_CONFIG = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ECONNREFUSED',
        '503',
        '429',
        '500',
        '502',
        '504',
        'NETWORK_ERROR',
        'TIMEOUT',
        'SOCKET_HANG_UP',
        'EAI_AGAIN',
    ],
};
exports.DEFAULT_RETRY_CONFIG = DEFAULT_RETRY_CONFIG;
exports.DEFAULT_PROVIDER_CONFIG = {
    // Chinese providers need longer timeouts and more retries
    'deepseek': {
        timeout: 30000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 5,
            initialDelayMs: 2000,
        },
        rateLimitRetries: 3,
    },
    'zhipu': {
        timeout: 25000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 4,
            initialDelayMs: 1500,
        },
        rateLimitRetries: 3,
    },
    'qwen': {
        timeout: 25000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 4,
        },
        rateLimitRetries: 3,
    },
    'moonshot': {
        timeout: 25000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 4,
        },
        rateLimitRetries: 3,
    },
    'minimax': {
        timeout: 20000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 3,
        },
        rateLimitRetries: 2,
    },
    'yi': {
        timeout: 20000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 3,
        },
        rateLimitRetries: 2,
    },
    // US providers are faster
    'openai': {
        timeout: 15000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 3,
        },
        rateLimitRetries: 2,
    },
    'anthropic': {
        timeout: 15000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 3,
        },
        rateLimitRetries: 2,
    },
    'groq': {
        timeout: 10000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 2,
        },
        rateLimitRetries: 1,
    },
    'cerebras': {
        timeout: 10000,
        retry: {
            ...DEFAULT_RETRY_CONFIG,
            maxRetries: 2,
        },
        rateLimitRetries: 1,
    },
    // Default fallback for unknown providers
    'default': {
        timeout: 15000,
        retry: { ...DEFAULT_RETRY_CONFIG },
        rateLimitRetries: 2,
    },
};
// Provider context window limits (approximate)
const PROVIDER_CONTEXT_LIMITS = {
    'openai': 128000,
    'anthropic': 200000,
    'deepseek': 64000,
    'qwen': 32000,
    'zhipu': 128000,
    'moonshot': 128000,
    'minimax': 1000000,
    'yi': 16000,
    'groq': 32000,
    'cerebras': 8000,
    'default': 8192,
};
exports.PROVIDER_CONTEXT_LIMITS = PROVIDER_CONTEXT_LIMITS;
// ============================================================
// PROVIDER RETRY HANDLER
// ============================================================
class ProviderRetryHandler {
    configs;
    stats;
    customProviders;
    constructor(customConfigs) {
        this.configs = new Map();
        this.stats = new Map();
        this.customProviders = new Set();
        // Initialize with defaults
        for (const [provider, config] of Object.entries(exports.DEFAULT_PROVIDER_CONFIG)) {
            this.configs.set(provider, {
                timeout: config.timeout,
                retry: { ...config.retry },
                rateLimitRetries: config.rateLimitRetries ?? 2,
            });
            this.initStats(provider);
        }
        // Apply custom configs
        if (customConfigs) {
            for (const [provider, config] of Object.entries(customConfigs)) {
                this.configureProvider(provider, config);
            }
        }
    }
    initStats(provider) {
        this.stats.set(provider, {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            totalRetries: 0,
            rateLimitRetries: 0,
            averageLatencyMs: 0,
        });
    }
    /**
     * Configure or update a provider's retry settings
     */
    configureProvider(provider, config) {
        const existing = this.configs.get(provider) || {
            timeout: 15000,
            retry: { ...DEFAULT_RETRY_CONFIG },
            rateLimitRetries: 2,
        };
        this.configs.set(provider, {
            timeout: config.timeout ?? existing.timeout,
            retry: {
                ...existing.retry,
                ...config.retry,
                retryableErrors: config.retry?.retryableErrors ?? existing.retry.retryableErrors,
            },
            rateLimitRetries: config.rateLimitRetries ?? existing.rateLimitRetries,
        });
        if (!this.stats.has(provider)) {
            this.initStats(provider);
        }
        this.customProviders.add(provider);
    }
    /**
     * Get current config for a provider
     */
    getConfig(provider) {
        return (this.configs.get(provider) ||
            this.configs.get('default'));
    }
    /**
     * Execute a function with retry logic
     */
    async executeWithRetry(provider, fn, options) {
        const config = this.getConfig(provider);
        const timeout = options?.timeout ?? config.timeout;
        let lastError;
        let attempts = 0;
        for (let retryAttempt = 0; retryAttempt <= config.retry.maxRetries; retryAttempt++) {
            attempts++;
            try {
                const result = await this.executeWithTimeout(fn, timeout);
                // Success - update stats
                this.recordSuccess(provider, 0);
                return result;
            }
            catch (error) {
                lastError = error;
                // Check if we've exhausted retries
                if (retryAttempt >= config.retry.maxRetries) {
                    break;
                }
                // Check if error is retryable
                if (!this.isRetryableError(error)) {
                    this.recordFailure(provider, attempts - 1);
                    throw error;
                }
                // Handle rate limiting (429)
                const isRateLimit = this.isRateLimitError(error);
                const rateLimitRetries = isRateLimit ? config.rateLimitRetries : 0;
                if (isRateLimit && retryAttempt >= rateLimitRetries) {
                    // Exceeded rate limit retries
                    this.recordFailure(provider, attempts - 1);
                    throw error;
                }
                // Calculate delay
                const delayMs = this.calculateBackoffDelay(retryAttempt, config.retry, error);
                // Notify callback if provided
                if (options?.onRetry) {
                    options.onRetry(retryAttempt + 1, error, delayMs);
                }
                // Wait before retry
                await this.sleep(delayMs);
                this.recordRetry(provider, isRateLimit);
            }
        }
        this.recordFailure(provider, attempts - 1);
        throw lastError;
    }
    /**
     * Execute with custom timeout wrapper
     */
    async executeWithTimeout(fn, timeoutMs) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(this.createTimeoutError(timeoutMs));
            }, timeoutMs);
            fn()
                .then((result) => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch((error) => {
                clearTimeout(timer);
                reject(error);
            });
        });
    }
    /**
     * Check if an error should trigger a retry
     */
    isRetryableError(error) {
        if (!error)
            return false;
        const config = this.configs.get('default').retry;
        const retryableErrors = config.retryableErrors || DEFAULT_RETRY_CONFIG.retryableErrors;
        // Check error code/message
        const errorCode = error.code || error.status || error.statusCode || '';
        const errorMessage = error.message || '';
        const errorString = String(errorCode).toUpperCase();
        for (const retryable of retryableErrors) {
            if (errorString.includes(retryable) ||
                errorMessage.includes(retryable)) {
                return true;
            }
        }
        // Check for specific error patterns
        if (error.status === 429)
            return true;
        if (error.status >= 500 && error.status < 600)
            return true;
        if (error.errno === 'ETIMEDOUT' || error.errno === 'ECONNRESET')
            return true;
        return false;
    }
    /**
     * Check if error is a rate limit (429)
     */
    isRateLimitError(error) {
        return error?.status === 429 || error?.statusCode === 429;
    }
    /**
     * Calculate backoff delay with exponential increase and jitter
     */
    calculateBackoffDelay(attempt, config, error) {
        // Check for Retry-After header on 429
        if (error && this.isRateLimitError(error)) {
            const retryAfter = error.headers?.['retry-after'] || error.headers?.['Retry-After'];
            if (retryAfter) {
                const retryAfterMs = parseInt(String(retryAfter), 10) * 1000;
                if (!isNaN(retryAfterMs) && retryAfterMs > 0) {
                    return Math.min(retryAfterMs, config.maxDelayMs);
                }
                // Could also be a date string - handle that case too
                const retryAfterDate = new Date(retryAfter);
                if (!isNaN(retryAfterDate.getTime())) {
                    const diffMs = retryAfterDate.getTime() - Date.now();
                    if (diffMs > 0) {
                        return Math.min(diffMs, config.maxDelayMs);
                    }
                }
            }
        }
        // Exponential backoff: initialDelay * (multiplier ^ attempt)
        const baseDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);
        // Cap at max delay
        const cappedDelay = Math.min(baseDelay, config.maxDelayMs);
        // Add jitter: delay *= (0.5 + random * 0.5) = delay * [0.5, 1.0]
        const jitter = 0.5 + Math.random() * 0.5;
        return Math.floor(cappedDelay * jitter);
    }
    /**
     * Validate context window size before sending request
     */
    validateContextWindow(provider, prompt, expectedTokens) {
        // Use actual token count or estimate
        const actualTokens = expectedTokens || (0, tokenUtils_1.estimateTokens)(prompt);
        // Get provider's context limit
        const contextLimit = PROVIDER_CONTEXT_LIMITS[provider] || PROVIDER_CONTEXT_LIMITS['default'];
        // Estimate output tokens (rough guess: 25% of input for responses)
        const estimatedOutputTokens = Math.floor(actualTokens * 0.25);
        const totalTokens = actualTokens + estimatedOutputTokens;
        if (totalTokens > contextLimit) {
            // Find alternative providers with larger context
            const largerProviders = Object.entries(PROVIDER_CONTEXT_LIMITS)
                .filter(([name, limit]) => name !== provider && limit > contextLimit)
                .sort(([, a], [, b]) => b - a);
            const suggested = largerProviders.length > 0 ? largerProviders[0][0] : undefined;
            return {
                valid: false,
                reason: `Context window exceeded: ${totalTokens} tokens (estimated) > ${contextLimit} limit for ${provider}`,
                suggestedProvider: suggested,
            };
        }
        return { valid: true };
    }
    /**
     * Get retry statistics for a provider
     */
    getStats(provider) {
        return this.stats.get(provider) || this.initStats(provider);
    }
    /**
     * Get all provider stats
     */
    getAllStats() {
        const result = {};
        for (const [provider, stats] of this.stats.entries()) {
            result[provider] = stats;
        }
        return result;
    }
    /**
     * Reset stats for a provider
     */
    resetStats(provider) {
        if (provider) {
            this.initStats(provider);
        }
        else {
            for (const provider of this.configs.keys()) {
                this.initStats(provider);
            }
        }
    }
    // ============================================================
    // PRIVATE HELPERS
    // ============================================================
    createTimeoutError(timeoutMs) {
        const error = new Error(`Request timed out after ${timeoutMs}ms`);
        error.code = 'ETIMEDOUT';
        error.status = 408;
        error.statusCode = 408;
        return error;
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    recordSuccess(provider, latencyMs) {
        const stats = this.stats.get(provider);
        if (!stats)
            return;
        stats.totalRequests++;
        stats.successfulRequests++;
        // Running average for latency
        if (latencyMs > 0) {
            const totalLatency = stats.averageLatencyMs * (stats.totalRequests - 1) + latencyMs;
            stats.averageLatencyMs = totalLatency / stats.totalRequests;
        }
    }
    recordFailure(provider, retryCount) {
        const stats = this.stats.get(provider);
        if (!stats)
            return;
        stats.totalRequests++;
        stats.failedRequests++;
        stats.totalRetries += retryCount;
    }
    recordRetry(provider, isRateLimit) {
        const stats = this.stats.get(provider);
        if (!stats)
            return;
        stats.totalRetries++;
        if (isRateLimit) {
            stats.rateLimitRetries++;
        }
    }
}
exports.ProviderRetryHandler = ProviderRetryHandler;
// ============================================================
// CONVENIENCE FUNCTIONS
// ============================================================
/**
 * Create a retry handler with optional custom configs
 */
function createRetryHandler(customConfigs) {
    return new ProviderRetryHandler(customConfigs);
}
/**
 * Default retry handler instance (singleton)
 */
let defaultHandler = null;
function getDefaultRetryHandler() {
    if (!defaultHandler) {
        defaultHandler = new ProviderRetryHandler();
    }
    return defaultHandler;
}
//# sourceMappingURL=providerRetry.js.map