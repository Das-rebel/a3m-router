"use strict";
/**
 * A3M Router - Input Validation & Security
 *
 * Security features for production LLM routing:
 * - Input sanitization
 * - Prompt injection detection
 * - Rate limiting
 * - Content filtering
 * - PII detection
 */

// Common prompt injection patterns
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(?:previous|above|earlier)/i,
  /disregard\s+(?:previous|above|earlier)/i,
  /forget\s+(?:previous|above|earlier)/i,
  /system\s*:\s*/i,
  /you\s+are\s+now/i,
  /new\s+instruction/i,
  /override\s+(?:previous|settings)/i,
  /bypass\s+(?:filter|restriction)/i,
  /DAN\s*\(/i,  // Do Anything Now
  /jailbreak/i,
  /\[\s*system\s*\]/i,
  /<\s*system\s*>/i,
  /\{\s*system\s*\}/i,
];

// PII patterns
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b(?:\d{4}[- ]?){3}\d{4}\b/g,
  apiKey: /(?:api[_-]?key|apikey|token)\s*[:=]\s*["']?[a-zA-Z0-9_-]{20,}["']?/gi,
};

// Content filter categories
const CONTENT_CATEGORIES = {
  hate: /\b(hate|kill|die|attack|violence)\b/i,
  selfHarm: /\b(suicide|self[- ]?harm|kill\s+myself)\b/i,
  illegal: /\b(hack|exploit|steal|fraud|illegal)\b/i,
};

class InputValidator {
  constructor(options = {}) {
    this.options = {
      maxLength: options.maxLength || 10000,
      maxTokens: options.maxTokens || 4000,
      enableInjectionDetection: options.enableInjectionDetection !== false,
      enablePIIDetection: options.enablePIIDetection || false,
      enableContentFilter: options.enableContentFilter !== false,
      allowedDomains: options.allowedDomains || [],
      blockedPatterns: options.blockedPatterns || [],
      ...options,
    };
    this.rateLimiter = new Map();
  }

  /**
   * Sanitize input text
   */
  sanitize(text) {
    if (typeof text !== 'string') {
      throw new Error('Input must be a string');
    }

    let sanitized = text;

    // Trim whitespace
    sanitized = sanitized.trim();

    // Limit length
    if (sanitized.length > this.options.maxLength) {
      sanitized = sanitized.substring(0, this.options.maxLength);
    }

    // Remove null bytes
    sanitized = sanitized.replace(/\x00/g, '');

    // Normalize unicode
    sanitized = sanitized.normalize('NFC');

    return sanitized;
  }

  /**
   * Detect prompt injection attempts
   */
  detectInjection(text) {
    if (!this.options.enableInjectionDetection) {
      return { detected: false, matches: [] };
    }

    const matches = [];

    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        matches.push(pattern.toString());
      }
    }

    // Check custom blocked patterns
    for (const pattern of this.options.blockedPatterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(text)) {
        matches.push(`custom:${pattern}`);
      }
    }

    return {
      detected: matches.length > 0,
      matches,
      risk: matches.length > 2 ? 'high' : matches.length > 0 ? 'medium' : 'low',
    };
  }

  /**
   * Detect PII in text
   */
  detectPII(text) {
    if (!this.options.enablePIIDetection) {
      return { detected: false, matches: {} };
    }

    const matches = {};

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      const found = text.match(pattern);
      if (found) {
        matches[type] = found;
      }
    }

    return {
      detected: Object.keys(matches).length > 0,
      matches,
      types: Object.keys(matches),
    };
  }

  /**
   * Content filtering
   */
  filterContent(text) {
    if (!this.options.enableContentFilter) {
      return { flagged: false, categories: [] };
    }

    const categories = [];

    for (const [category, pattern] of Object.entries(CONTENT_CATEGORIES)) {
      if (pattern.test(text)) {
        categories.push(category);
      }
    }

    return {
      flagged: categories.length > 0,
      categories,
      action: categories.length > 1 ? 'block' : 'warn',
    };
  }

  /**
   * Rate limiting check
   */
  checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.rateLimiter.has(identifier)) {
      this.rateLimiter.set(identifier, []);
    }

    const requests = this.rateLimiter.get(identifier);

    // Remove old requests
    const validRequests = requests.filter(time => time > windowStart);

    if (validRequests.length >= maxRequests) {
      const oldestRequest = validRequests[0];
      const retryAfter = Math.ceil((oldestRequest + windowMs - now) / 1000);

      return {
        allowed: false,
        retryAfter,
        remaining: 0,
      };
    }

    // Add current request
    validRequests.push(now);
    this.rateLimiter.set(identifier, validRequests);

    return {
      allowed: true,
      remaining: maxRequests - validRequests.length,
      resetTime: now + windowMs,
    };
  }

  /**
   * Full validation pipeline
   */
  validate(text, options = {}) {
    const identifier = options.identifier || 'anonymous';
    const results = {
      valid: true,
      sanitized: null,
      errors: [],
      warnings: [],
      metadata: {},
    };

    try {
      // Step 1: Sanitize
      results.sanitized = this.sanitize(text);

      // Step 2: Rate limiting
      const rateLimit = this.checkRateLimit(
        identifier,
        options.maxRequests,
        options.windowMs
      );

      if (!rateLimit.allowed) {
        results.valid = false;
        results.errors.push({
          type: 'rate_limit',
          message: `Rate limit exceeded. Retry after ${rateLimit.retryAfter}s`,
        });
        return results;
      }

      results.metadata.rateLimit = rateLimit;

      // Step 3: Injection detection
      const injection = this.detectInjection(results.sanitized);
      if (injection.detected) {
        if (injection.risk === 'high') {
          results.valid = false;
          results.errors.push({
            type: 'injection',
            message: 'Potential prompt injection detected',
            details: injection.matches,
          });
        } else {
          results.warnings.push({
            type: 'injection',
            message: 'Suspicious patterns detected',
            details: injection.matches,
          });
        }
      }

      // Step 4: PII detection
      const pii = this.detectPII(results.sanitized);
      if (pii.detected) {
        results.warnings.push({
          type: 'pii',
          message: `PII detected: ${pii.types.join(', ')}`,
          details: pii.types,
        });
        results.metadata.piiTypes = pii.types;
      }

      // Step 5: Content filtering
      const content = this.filterContent(results.sanitized);
      if (content.flagged) {
        if (content.action === 'block') {
          results.valid = false;
          results.errors.push({
            type: 'content',
            message: `Content flagged: ${content.categories.join(', ')}`,
            details: content.categories,
          });
        } else {
          results.warnings.push({
            type: 'content',
            message: `Content warning: ${content.categories.join(', ')}`,
            details: content.categories,
          });
        }
      }

      return results;

    } catch (error) {
      results.valid = false;
      results.errors.push({
        type: 'validation_error',
        message: error.message,
      });
      return results;
    }
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimiter(maxAgeMs = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [identifier, requests] of this.rateLimiter) {
      const validRequests = requests.filter(time => now - time < maxAgeMs);
      if (validRequests.length === 0) {
        this.rateLimiter.delete(identifier);
        cleaned++;
      } else {
        this.rateLimiter.set(identifier, validRequests);
      }
    }

    return { cleaned, remaining: this.rateLimiter.size };
  }
}

// Convenience functions
function sanitizeInput(text, options = {}) {
  const validator = new InputValidator(options);
  return validator.sanitize(text);
}

function validateInput(text, options = {}) {
  const validator = new InputValidator(options);
  return validator.validate(text, options);
}

function detectInjection(text) {
  const validator = new InputValidator({ enableInjectionDetection: true });
  return validator.detectInjection(text);
}

function detectPII(text) {
  const validator = new InputValidator({ enablePIIDetection: true });
  return validator.detectPII(text);
}

module.exports = {
  InputValidator,
  sanitizeInput,
  validateInput,
  detectInjection,
  detectPII,
  PROMPT_INJECTION_PATTERNS,
  PII_PATTERNS,
  CONTENT_CATEGORIES,
};
