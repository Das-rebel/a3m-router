#!/usr/bin/env node

/**
 * A3M Router — In-Memory Rate Limiter Middleware
 *
 * Sliding-window rate limiter for Express. Tracks request timestamps per IP
 * and rejects clients that exceed the configured threshold within the window.
 *
 * Configuration (environment variables):
 *   RATE_LIMIT_WINDOW_MS   — time window in milliseconds (default: 60000)
 *   RATE_LIMIT_MAX          — max requests per window (default: 60)
 *
 * Usage:
 *   const RateLimiter = require("./rate-limit");
 *   app.use(new RateLimiter().middleware());
 *
 * Or with custom options:
 *   app.use(new RateLimiter({ windowMs: 30_000, maxRequests: 30 }).middleware());
 */

class RateLimiter {
  /**
   * @param {object} options
   * @param {number} [options.windowMs]   — sliding window duration in ms
   * @param {number} [options.maxRequests] — max requests allowed per window
   */
  constructor(options = {}) {
    this.windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10);
    this.maxRequests = options.maxRequests || parseInt(process.env.RATE_LIMIT_MAX || "60", 10);
    this.clients = new Map();

    // Periodic cleanup every 60s to evict stale entries
    this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
    this._cleanupInterval.unref();
  }

  /**
   * Returns the Express middleware function.
   */
  middleware() {
    return (req, res, next) => {
      // Trust X-Forwarded-For if behind a proxy
      const key = req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
        || req.ip
        || req.socket?.remoteAddress
        || "unknown";

      const now = Date.now();

      if (!this.clients.has(key)) {
        this.clients.set(key, []);
      }

      const timestamps = this.clients.get(key);
      // Keep only timestamps within the current window
      const windowStart = now - this.windowMs;
      const recent = timestamps.filter((t) => t >= windowStart);

      if (recent.length >= this.maxRequests) {
        const retryAfter = Math.ceil(
          (recent[0] + this.windowMs - now) / 1000
        );

        res.setHeader("Retry-After", String(retryAfter));
        res.setHeader("X-RateLimit-Limit", String(this.maxRequests));
        res.setHeader("X-RateLimit-Remaining", "0");
        res.setHeader("X-RateLimit-Reset", String(Math.ceil((recent[0] + this.windowMs) / 1000)));

        return res.status(429).json({
          error: {
            message: "Too many requests. Please slow down.",
            type: "rate_limit_error",
            code: 429,
            retry_after: retryAfter,
          },
        });
      }

      recent.push(now);
      this.clients.set(key, recent);

      // Set rate-limit headers
      res.setHeader("X-RateLimit-Limit", String(this.maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(this.maxRequests - recent.length - 1));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil((now + this.windowMs) / 1000)));

      next();
    };
  }

  /**
   * Reset rate limit state for a specific key (useful in tests).
   * @param {string} key
   */
  resetKey(key) {
    this.clients.delete(key);
  }

  /**
   * Reset all rate limit state.
   */
  resetAll() {
    this.clients.clear();
  }

  /**
   * Get current count for a key (useful in tests).
   * @param {string} key
   * @returns {number}
   */
  getCount(key) {
    const timestamps = this.clients.get(key);
    if (!timestamps) return 0;
    const now = Date.now();
    return timestamps.filter((t) => now - t < this.windowMs).length;
  }

  /**
   * Dispose the limiter — clears the cleanup interval.
   */
  dispose() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
  }

  /**
   * Evict stale entries to prevent unbounded memory growth.
   */
  _cleanup() {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    for (const [key, timestamps] of this.clients.entries()) {
      const recent = timestamps.filter((t) => t >= cutoff);
      if (recent.length === 0) {
        this.clients.delete(key);
      } else {
        this.clients.set(key, recent);
      }
    }
  }
}

module.exports = RateLimiter;
