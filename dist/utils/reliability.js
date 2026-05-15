"use strict";
/**
 * TMLPD Reliability Engine
 *
 * Circuit breaker, retry with jitter, and enhanced cooldown logic.
 * Designed to handle flaky API calls gracefully.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CircuitBreaker = exports.DEFAULT_CIRCUIT_BREAKER_CONFIG = exports.DEFAULT_RETRY_CONFIG = void 0;
exports.calculateRetryDelay = calculateRetryDelay;
exports.isRetryableStatus = isRetryableStatus;
exports.withRetry = withRetry;
exports.DEFAULT_RETRY_CONFIG = {
    max_attempts: 3,
    base_delay_ms: 500,
    max_delay_ms: 30000,
    jitter: 0.3,
    retryable_status_codes: [408, 429, 500, 502, 503, 504],
};
exports.DEFAULT_CIRCUIT_BREAKER_CONFIG = {
    failure_threshold: 5,
    recovery_timeout_ms: 60000,
    half_open_max_calls: 3,
};
/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateRetryDelay(attempt, config = exports.DEFAULT_RETRY_CONFIG) {
    // Exponential backoff
    const exponential_delay = config.base_delay_ms * Math.pow(2, attempt - 1);
    // Cap at max delay
    const capped_delay = Math.min(exponential_delay, config.max_delay_ms);
    // Add jitter
    const jitter_range = capped_delay * config.jitter;
    const jitter = (Math.random() * 2 - 1) * jitter_range;
    return Math.round(capped_delay + jitter);
}
/**
 * Check if status code is retryable
 */
function isRetryableStatus(statusCode, config = exports.DEFAULT_RETRY_CONFIG) {
    if (statusCode === null)
        return true; // Network errors are retryable
    return config.retryable_status_codes.includes(statusCode);
}
/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
    config;
    state;
    half_open_calls = 0;
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
        this.state = {
            status: "closed",
            failure_count: 0,
            last_failure_time: null,
            last_success_time: null,
            consecutive_successes: 0,
        };
    }
    /**
     * Check if circuit allows requests
     */
    canExecute() {
        if (this.state.status === "closed")
            return true;
        if (this.state.status === "open") {
            // Check if recovery timeout has passed
            if (this.state.last_failure_time && Date.now() - this.state.last_failure_time >= this.config.recovery_timeout_ms) {
                this.state.status = "half_open";
                this.half_open_calls = 0;
                return true;
            }
            return false;
        }
        // half_open
        return this.half_open_calls < this.config.half_open_max_calls;
    }
    /**
     * Record a successful execution
     */
    recordSuccess() {
        this.state.last_success_time = Date.now();
        this.half_open_calls++;
        if (this.state.status === "half_open") {
            this.state.consecutive_successes++;
            if (this.state.consecutive_successes >= this.config.half_open_max_calls) {
                // Circuit recovered
                this.state.status = "closed";
                this.state.failure_count = 0;
                this.state.consecutive_successes = 0;
            }
        }
        else {
            this.state.failure_count = 0;
        }
    }
    /**
     * Record a failed execution
     */
    recordFailure() {
        this.state.last_failure_time = Date.now();
        this.state.failure_count++;
        this.state.consecutive_successes = 0;
        if (this.state.status === "half_open") {
            // Trip circuit back open
            this.state.status = "open";
        }
        else if (this.state.failure_count >= this.config.failure_threshold) {
            this.state.status = "open";
        }
    }
    /**
     * Get current circuit state
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Force reset circuit
     */
    reset() {
        this.state = {
            status: "closed",
            failure_count: 0,
            last_failure_time: null,
            last_success_time: null,
            consecutive_successes: 0,
        };
        this.half_open_calls = 0;
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Enhanced retry wrapper with circuit breaker integration
 */
async function withRetry(fn, config = {}, circuitBreaker) {
    const retryConfig = { ...exports.DEFAULT_RETRY_CONFIG, ...config };
    let lastError = null;
    let attempts = 0;
    let circuit_tripped = false;
    for (let i = 0; i < retryConfig.max_attempts; i++) {
        attempts++;
        try {
            // Check circuit breaker before attempt
            if (circuitBreaker && !circuitBreaker.canExecute()) {
                circuit_tripped = true;
                throw new Error("Circuit breaker is open");
            }
            const result = await fn();
            if (circuitBreaker) {
                circuitBreaker.recordSuccess();
            }
            return { result, error: null, attempts, circuit_tripped };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Check if should retry
            const statusCode = error.statusCode || error.response?.statusCode || null;
            if (!isRetryableStatus(statusCode, retryConfig)) {
                return { result: null, error: lastError, attempts, circuit_tripped };
            }
            if (circuitBreaker) {
                circuitBreaker.recordFailure();
            }
            // Don't wait after last attempt
            if (i < retryConfig.max_attempts - 1) {
                const delay = calculateRetryDelay(i + 1, retryConfig);
                await new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
    }
    return { result: null, error: lastError, attempts, circuit_tripped };
}
//# sourceMappingURL=reliability.js.map