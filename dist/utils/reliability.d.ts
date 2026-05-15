/**
 * TMLPD Reliability Engine
 *
 * Circuit breaker, retry with jitter, and enhanced cooldown logic.
 * Designed to handle flaky API calls gracefully.
 */
export interface RetryConfig {
    max_attempts: number;
    base_delay_ms: number;
    max_delay_ms: number;
    jitter: number;
    retryable_status_codes: number[];
}
export interface CircuitBreakerConfig {
    failure_threshold: number;
    recovery_timeout_ms: number;
    half_open_max_calls: number;
}
export interface CircuitState {
    status: "closed" | "open" | "half_open";
    failure_count: number;
    last_failure_time: number | null;
    last_success_time: number | null;
    consecutive_successes: number;
}
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
export declare const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig;
/**
 * Calculate delay with exponential backoff and jitter
 */
export declare function calculateRetryDelay(attempt: number, config?: RetryConfig): number;
/**
 * Check if status code is retryable
 */
export declare function isRetryableStatus(statusCode: number | null, config?: RetryConfig): boolean;
/**
 * Circuit Breaker implementation
 */
export declare class CircuitBreaker {
    private config;
    private state;
    private half_open_calls;
    constructor(config?: Partial<CircuitBreakerConfig>);
    /**
     * Check if circuit allows requests
     */
    canExecute(): boolean;
    /**
     * Record a successful execution
     */
    recordSuccess(): void;
    /**
     * Record a failed execution
     */
    recordFailure(): void;
    /**
     * Get current circuit state
     */
    getState(): CircuitState;
    /**
     * Force reset circuit
     */
    reset(): void;
}
/**
 * Enhanced retry wrapper with circuit breaker integration
 */
export declare function withRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>, circuitBreaker?: CircuitBreaker): Promise<{
    result: T | null;
    error: Error | null;
    attempts: number;
    circuit_tripped: boolean;
}>;
//# sourceMappingURL=reliability.d.ts.map