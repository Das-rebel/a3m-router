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

// ============================================================
// Types
// ============================================================

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

// ============================================================
// Events
// ============================================================

export enum HealthEvent {
  HEALTH_CHANGED = 'healthChanged',
  CIRCUIT_OPENED = 'circuitOpened',
  CIRCUIT_CLOSED = 'circuitClosed',
  COOLDOWN_STARTED = 'cooldownStarted',
  COOLDOWN_ENDED = 'cooldownEnded',
  PROVIDER_DISABLED = 'providerDisabled',
  PROVIDER_ENABLED = 'providerEnabled',
  PROBE_ALLOWED = 'probeAllowed',
}

// ============================================================
// ProviderHealthManager
// ============================================================

export class ProviderHealthManager extends EventEmitter {
  // Rolling window metrics per provider
  private metrics: Map<string, ProviderMetrics[]> = new Map();
  
  // Current health state per provider
  private health: Map<string, ProviderHealth> = new Map();
  
  // Disabled providers (manual disable)
  private disabled: Map<string, { reason: string; until: number }> = new Map();
  
  // Config
  private config: Required<HealthManagerConfig>;

  constructor(config: HealthManagerConfig = {}) {
    super();
    this.config = {
      windowSize: config.windowSize ?? 100,
      circuitBreakerThreshold: config.circuitBreakerThreshold ?? 3,
      cooldownMs: config.cooldownMs ?? 60000,
      latencyPercentile: config.latencyPercentile ?? 95,
      weights: {
        latency: config.weights?.latency ?? 0.3,
        errorRate: config.weights?.errorRate ?? 0.5,
        consecutiveErrors: config.weights?.consecutiveErrors ?? 0.2,
      },
    };
  }

  /**
   * Record a successful request
   */
  recordSuccess(provider: string, latencyMs: number): void {
    this.ensureProviderExists(provider);
    
    const now = Date.now();
    const window = this.getMetricsWindow(provider);
    window.push({
      name: provider,
      totalRequests: 1,
      successfulRequests: 1,
      failedRequests: 0,
      totalLatency: latencyMs,
      lastLatency: latencyMs,
    });
    
    // Trim to window size
    while (window.length > this.config.windowSize) {
      window.shift();
    }
    
    // Update health state
    const health = this.health.get(provider)!;
    health.lastSuccess = now;
    health.consecutiveErrors = 0;
    health.cooldownUntil = 0;
    health.isHealthy = true;
    
    // Recalculate health score
    this.recalculateHealthScore(provider);
    
    this.emit(HealthEvent.HEALTH_CHANGED, health);
  }

  /**
   * Record a failed request
   */
  recordFailure(provider: string, error: string): void {
    this.ensureProviderExists(provider);
    
    const now = Date.now();
    const window = this.getMetricsWindow(provider);
    window.push({
      name: provider,
      totalRequests: 1,
      successfulRequests: 0,
      failedRequests: 1,
      totalLatency: 0,
      lastLatency: 0,
    });
    
    // Trim to window size
    while (window.length > this.config.windowSize) {
      window.shift();
    }
    
    // Update health state
    const health = this.health.get(provider)!;
    health.lastError = now;
    health.consecutiveErrors++;
    
    // Check circuit breaker
    if (health.consecutiveErrors >= this.config.circuitBreakerThreshold) {
      health.cooldownUntil = now + this.config.cooldownMs;
      health.isHealthy = false;
      this.emit(HealthEvent.CIRCUIT_OPENED, {
        provider,
        consecutiveErrors: health.consecutiveErrors,
        cooldownUntil: health.cooldownUntil,
        reason: error,
      });
      this.emit(HealthEvent.COOLDOWN_STARTED, {
        provider,
        duration: this.config.cooldownMs,
        reason: error,
      });
    }
    
    this.recalculateHealthScore(provider);
    this.emit(HealthEvent.HEALTH_CHANGED, health);
  }

  /**
   * Get current health for a provider
   */
  getHealth(provider: string): ProviderHealth | undefined {
    this.ensureProviderExists(provider);
    return { ...this.health.get(provider)! };
  }

  /**
   * Get all provider health statuses
   */
  getAllHealth(): Map<string, ProviderHealth> {
    const result = new Map<string, ProviderHealth>();
    for (const [name, health] of this.health.entries()) {
      result.set(name, { ...health });
    }
    return result;
  }

  /**
   * Check if a provider is available (healthy and not in cooldown/manual disable)
   */
  isAvailable(provider: string): boolean {
    const health = this.health.get(provider);
    if (!health) return false;
    
    // Check manual disable
    const disabled = this.disabled.get(provider);
    if (disabled && disabled.until > Date.now()) {
      return false;
    }
    
    // Check cooldown
    if (health.cooldownUntil > Date.now()) {
      return false;
    }
    
    return health.isHealthy;
  }

  /**
   * Check if cooldown has expired and probe is allowed
   */
  isProbeAllowed(provider: string): boolean {
    const health = this.health.get(provider);
    if (!health) return false;
    
    // If not in cooldown, no probe needed
    if (health.cooldownUntil === 0) return true;
    
    // If cooldown has expired
    if (health.cooldownUntil <= Date.now()) {
      // Only allow one probe request per cooldown period
      // After probe (marked by consecutiveErrors reset), normal requests allowed
      return true;
    }
    
    return false;
  }

  /**
   * Get the best provider from a list based on health scores
   */
  getBestProvider(providers: string[]): string | null {
    const available = providers.filter(p => this.isAvailable(p));
    if (available.length === 0) return null;
    
    return available.reduce((best, current) => {
      const health = this.health.get(current);
      const bestHealth = this.health.get(best);
      if (!health || !bestHealth) return current;
      return health.healthScore >= bestHealth.healthScore ? current : best;
    });
  }

  /**
   * Get sorted fallback chain based on health scores
   * Returns providers sorted by health score (descending)
   */
  getFallbackChain(providers: string[]): string[] {
    // Score each provider
    const scored = providers.map(p => ({
      provider: p,
      score: this.isAvailable(p) ? (this.health.get(p)?.healthScore ?? 0) : -1,
    }));
    
    // Sort by health score (descending), unavailable at end
    scored.sort((a, b) => {
      if (a.score === -1 && b.score === -1) return 0;
      if (a.score === -1) return 1;
      if (b.score === -1) return -1;
      return b.score - a.score;
    });
    
    return scored.map(s => s.provider);
  }

  /**
   * Mark provider as disabled (manual circuit breaker)
   */
  disableProvider(provider: string, reason: string): void {
    const until = Number.MAX_SAFE_INTEGER; // Manual disable until explicitly enabled
    this.disabled.set(provider, { reason, until });
    
    const health = this.health.get(provider);
    if (health) {
      health.isHealthy = false;
    }
    
    this.emit(HealthEvent.PROVIDER_DISABLED, { provider, reason });
  }

  /**
   * Enable a previously disabled provider
   */
  enableProvider(provider: string): void {
    this.disabled.delete(provider);
    
    const health = this.health.get(provider);
    if (health) {
      health.isHealthy = true;
      health.consecutiveErrors = 0;
      health.cooldownUntil = 0;
    }
    
    this.emit(HealthEvent.PROVIDER_ENABLED, { provider });
  }

  /**
   * Clear cooldown and reset circuit breaker for a provider
   */
  resetCircuitBreaker(provider: string): void {
    const health = this.health.get(provider);
    if (health) {
      health.consecutiveErrors = 0;
      health.cooldownUntil = 0;
      health.isHealthy = true;
      this.emit(HealthEvent.CIRCUIT_CLOSED, { provider });
    }
  }

  /**
   * Get health stats for monitoring
   */
  getStats(): {
    totalProviders: number;
    healthyProviders: number;
    cooldownProviders: number;
    disabledProviders: number;
    avgHealthScore: number;
  } {
    let healthyCount = 0;
    let cooldownCount = 0;
    let disabledCount = 0;
    let totalScore = 0;
    
    for (const [name, health] of this.health.entries()) {
      totalScore += health.healthScore;
      
      if (!health.isHealthy && health.cooldownUntil > Date.now()) {
        cooldownCount++;
      } else if (health.isHealthy) {
        healthyCount++;
      }
      
      if (this.disabled.has(name)) {
        disabledCount++;
      }
    }
    
    const total = this.health.size;
    return {
      totalProviders: total,
      healthyProviders: healthyCount,
      cooldownProviders: cooldownCount,
      disabledProviders: disabledCount,
      avgHealthScore: total > 0 ? totalScore / total : 0,
    };
  }

  // ============================================================
  // Private Methods
  // ============================================================

  private ensureProviderExists(provider: string): void {
    if (!this.health.has(provider)) {
      const now = Date.now();
      this.health.set(provider, {
        name: provider,
        latency: 0,
        errorRate: 0,
        lastSuccess: 0,
        lastError: 0,
        consecutiveErrors: 0,
        isHealthy: true,
        cooldownUntil: 0,
        healthScore: 1.0,
      });
      this.metrics.set(provider, []);
    }
  }

  private getMetricsWindow(provider: string): ProviderMetrics[] {
    return this.metrics.get(provider) ?? [];
  }

  private recalculateHealthScore(provider: string): void {
    const window = this.getMetricsWindow(provider);
    const health = this.health.get(provider);
    if (!health || window.length === 0) return;
    
    // Calculate error rate
    const totalRequests = window.reduce((sum, m) => sum + m.totalRequests, 0);
    const failedRequests = window.reduce((sum, m) => sum + m.failedRequests, 0);
    const errorRate = totalRequests > 0 ? failedRequests / totalRequests : 0;
    health.errorRate = errorRate;
    
    // Calculate latency metrics
    const latencies = window.filter(m => m.totalLatency > 0).map(m => m.lastLatency);
    const avgLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    health.latency = avgLatency;
    
    // Percentile latency (simplified: use avg latency as proxy)
    // For true percentile, we'd need raw data points
    const latencyScore = this.calculateLatencyScore(avgLatency);
    
    // Health score: weighted combination
    // Higher error rate = lower score, higher latency = lower score
    const errorScore = 1 - errorRate;
    const consecutiveScore = Math.max(0, 1 - (health.consecutiveErrors / this.config.circuitBreakerThreshold));
    
    const score =
      this.config.weights.latency * latencyScore +
      this.config.weights.errorRate * errorScore +
      this.config.weights.consecutiveErrors * consecutiveScore;
    
    health.healthScore = Math.max(0, Math.min(1, score));
  }

  private calculateLatencyScore(avgLatency: number): number {
    // Latency score: 1 at 0ms, 0 at 10000ms+, with exponential decay
    // Configurable thresholds could be passed in
    const latencyThresholds = {
      excellent: 100,   // 100ms - score 1.0
      good: 500,        // 500ms - score 0.8
      acceptable: 1000, // 1s - score 0.6
      poor: 3000,       // 3s - score 0.3
      terrible: 10000,  // 10s+ - score 0.0
    };
    
    if (avgLatency <= 0) return 1.0;
    if (avgLatency <= latencyThresholds.excellent) return 1.0;
    if (avgLatency >= latencyThresholds.terrible) return 0.0;
    
    // Exponential interpolation
    const k = 0.003; // decay constant
    return Math.exp(-k * avgLatency);
  }
}

// ============================================================
// Exports
// ============================================================

export default ProviderHealthManager;