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
  jitter: number; // 0-1, percentage of delay to randomize
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

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  max_attempts: 3,
  base_delay_ms: 500,
  max_delay_ms: 30000,
  jitter: 0.3,
  retryable_status_codes: [408, 429, 500, 502, 503, 504],
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failure_threshold: 5,
  recovery_timeout_ms: 60000,
  half_open_max_calls: 3,
};

/**
 * Calculate delay with exponential backoff and jitter
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
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
export function isRetryableStatus(statusCode: number | null, config: RetryConfig = DEFAULT_RETRY_CONFIG): boolean {
  if (statusCode === null) return true; // Network errors are retryable
  return config.retryable_status_codes.includes(statusCode);
}

/**
 * Circuit Breaker implementation
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState;
  private half_open_calls = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
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
  canExecute(): boolean {
    if (this.state.status === "closed") return true;

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
  recordSuccess(): void {
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
    } else {
      this.state.failure_count = 0;
    }
  }

  /**
   * Record a failed execution
   */
  recordFailure(): void {
    this.state.last_failure_time = Date.now();
    this.state.failure_count++;
    this.state.consecutive_successes = 0;

    if (this.state.status === "half_open") {
      // Trip circuit back open
      this.state.status = "open";
    } else if (this.state.failure_count >= this.config.failure_threshold) {
      this.state.status = "open";
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return { ...this.state };
  }

  /**
   * Force reset circuit
   */
  reset(): void {
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

/**
 * Enhanced retry wrapper with circuit breaker integration
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  circuitBreaker?: CircuitBreaker
): Promise<{ result: T | null; error: Error | null; attempts: number; circuit_tripped: boolean }> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | null = null;
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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if should retry
      const statusCode = (error as any).statusCode || (error as any).response?.statusCode || null;
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