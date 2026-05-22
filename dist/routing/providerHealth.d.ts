/**
 * Provider Health Manager with Circuit Breaker
 *
 * Intelligent failover system for A3M Router providing:
 * - Rolling window metrics tracking (latency, error rate)
 * - Health scoring based on latency percentile + error rate
 * - Circuit breaker: 3 consecutive errors → 60s cooldown
 * - Probe mode after cooldown for recovery
 * - Sorted fallback chain based on health scores
 *
 * Usage:
 *   import { ProviderHealthManager, ProviderHealth } from './routing/providerHealth';
 *
 *   const healthManager = new ProviderHealthManager();
 *
 *   // Record outcomes
 *   healthManager.recordSuccess('openai/gpt-4o', 150);
 *   healthManager.recordFailure('anthropic/claude-3-5-sonnet', 'rate_limit');
 *
 *   // Get health status
 *   const health = healthManager.getHealth('openai/gpt-4o');
 *
 *   // Get sorted fallback chain
 *   const chain = healthManager.getFallbackChain(['openai/gpt-4o', 'anthropic/claude-3-5-sonnet']);
 */
import { EventEmitter } from 'events';
export interface ProviderHealth {
    /** Provider name (e.g., "openai/gpt-4o") */
    name: string;
    /** Rolling average latency in ms */
    latency: number;
    /** Error rate 0-1 */
    errorRate: number;
    /** Timestamp of last successful request */
    lastSuccess: number;
    /** Timestamp of last failed request */
    lastError: number;
    /** Consecutive error count */
    consecutiveErrors: number;
    /** Whether provider is healthy (not in cooldown) */
    isHealthy: boolean;
    /** Timestamp when cooldown ends (0 if not in cooldown) */
    cooldownUntil: number;
    /** Health score 0-1 (higher is better) */
    healthScore: number;
}
export interface ProviderMetrics {
    /** Provider name */
    name: string;
    /** Total requests sent */
    totalRequests: number;
    /** Successful requests */
    successfulRequests: number;
    /** Failed requests */
    failedRequests: number;
    /** Sum of latencies for averaging */
    totalLatency: number;
    /** Last measured latency */
    lastLatency: number;
}
export interface HealthManagerConfig {
    /** Window size for rolling metrics (default: 100 requests) */
    windowSize?: number;
    /** Consecutive errors before circuit break (default: 3) */
    circuitBreakerThreshold?: number;
    /** Cooldown duration in ms (default: 60000 = 60s) */
    cooldownMs?: number;
    /** Latency percentile for health scoring (default: 95) */
    latencyPercentile?: number;
    /** Weights for health score components */
    weights?: {
        latency: number;
        errorRate: number;
        consecutiveErrors: number;
    };
}
export declare enum HealthEvent {
    HEALTH_CHANGED = "healthChanged",
    CIRCUIT_OPENED = "circuitOpened",
    CIRCUIT_CLOSED = "circuitClosed",
    COOLDOWN_STARTED = "cooldownStarted",
    COOLDOWN_ENDED = "cooldownEnded",
    PROVIDER_DISABLED = "providerDisabled",
    PROVIDER_ENABLED = "providerEnabled",
    PROBE_ALLOWED = "probeAllowed"
}
export declare class ProviderHealthManager extends EventEmitter {
    private metrics;
    private health;
    private disabled;
    private config;
    constructor(config?: HealthManagerConfig);
    /**
     * Record a successful request
     */
    recordSuccess(provider: string, latencyMs: number): void;
    /**
     * Record a failed request
     */
    recordFailure(provider: string, error: string): void;
    /**
     * Get current health for a provider
     */
    getHealth(provider: string): ProviderHealth | undefined;
    /**
     * Get all provider health statuses
     */
    getAllHealth(): Map<string, ProviderHealth>;
    /**
     * Check if a provider is available (healthy and not in cooldown/manual disable)
     */
    isAvailable(provider: string): boolean;
    /**
     * Check if cooldown has expired and probe is allowed
     */
    isProbeAllowed(provider: string): boolean;
    /**
     * Get the best provider from a list based on health scores
     */
    getBestProvider(providers: string[]): string | null;
    /**
     * Get sorted fallback chain based on health scores
     * Returns providers sorted by health score (descending)
     */
    getFallbackChain(providers: string[]): string[];
    /**
     * Mark provider as disabled (manual circuit breaker)
     */
    disableProvider(provider: string, reason: string): void;
    /**
     * Enable a previously disabled provider
     */
    enableProvider(provider: string): void;
    /**
     * Clear cooldown and reset circuit breaker for a provider
     */
    resetCircuitBreaker(provider: string): void;
    /**
     * Get health stats for monitoring
     */
    getStats(): {
        totalProviders: number;
        healthyProviders: number;
        cooldownProviders: number;
        disabledProviders: number;
        avgHealthScore: number;
    };
    private ensureProviderExists;
    private getMetricsWindow;
    private recalculateHealthScore;
    private calculateLatencyScore;
}
export { ProviderHealthManager };
export default ProviderHealthManager;
