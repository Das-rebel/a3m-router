/**
 * A3M Router - Guardrails Engine
 *
 * Comprehensive input/output guardrail system for production LLM routing:
 * - Prompt injection detection (score-based 0-100)
 * - PII detection and redaction
 * - Content filtering with configurable blocklist
 * - Language detection for intelligent routing
 * - Output validation and quality checks
 * - Custom user-defined guardrails
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GuardrailResult {
  passed: boolean;
  blocked: boolean;
  reason?: string;
  modified?: string;
  metadata?: Record<string, any>;
}

export interface GuardrailConfig {
  // Input guardrails
  promptInjection: boolean;
  piiDetection: boolean;
  contentFilter: boolean;
  maxLength: number;
  languageDetection: boolean;

  // Output guardrails
  outputFilter: boolean;
  outputPII: boolean;
  hallucinationCheck: boolean;
}

export type GuardrailCheck = (content: string) => GuardrailResult;

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: GuardrailConfig = {
  promptInjection: true,
  piiDetection: true,
  contentFilter: true,
  maxLength: 100_000,
  languageDetection: false,
  outputFilter: true,
  outputPII: true,
  hallucinationCheck: true,
};

// ---------------------------------------------------------------------------
// Prompt-injection detection
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS: Array<{ pattern: RegExp; weight: number; label: string }> = [
  { pattern: /ignore\s+(?:previous|above|earlier|all)\s+(?:instructions?|prompts?|rules?)/i, weight: 30, label: 'ignore-instructions' },
  { pattern: /disregard\s+(?:previous|above|earlier|all)/i, weight: 25, label: 'disregard' },
  { pattern: /forget\s+(?:previous|above|earlier|everything|all)/i, weight: 20, label: 'forget' },
  { pattern: /^system\s*:/im, weight: 35, label: 'system-prefix' },
  { pattern: /\[\s*system\s*\]/i, weight: 30, label: 'system-bracket' },
  { pattern: /<\s*system\s*>/i, weight: 30, label: 'system-tag' },
  { pattern: /\{\s*system\s*\}/i, weight: 25, label: 'system-brace' },
  { pattern: /you\s+are\s+now\s+/i, weight: 25, label: 'you-are-now' },
  { pattern: /new\s+instruction/i, weight: 20, label: 'new-instruction' },
  { pattern: /override\s+(?:previous|settings|safety|filter)/i, weight: 30, label: 'override' },
  { pattern: /bypass\s+(?:filter|restriction|safety|guard|security)/i, weight: 30, label: 'bypass' },
  { pattern: /DAN\s*[\(\[]/i, weight: 35, label: 'dan-attack' },
  { pattern: /jailbreak/i, weight: 35, label: 'jailbreak' },
  { pattern: /act\s+as\s+(?:if\s+you|a\s+different)/i, weight: 15, label: 'act-as' },
  { pattern: /pretend\s+(?:you\s+are|to\s+be)/i, weight: 15, label: 'pretend' },
  { pattern: /simulate\s+(?:a\s+)?(?:different|new)\s+(?:persona|identity|character)/i, weight: 15, label: 'simulate-persona' },
  { pattern: /reveal\s+(?:your|the|hidden|secret)/i, weight: 10, label: 'reveal-secrets' },
  { pattern: /output\s+(?:your|the)\s+(?:system|initial|original)\s+(?:prompt|instructions?)/i, weight: 25, label: 'extract-prompt' },
];

function scoreInjection(text: string): { score: number; triggers: string[] } {
  let score = 0;
  const triggers: string[] = [];

  for (const { pattern, weight, label } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      score += weight;
      triggers.push(label);
    }
  }

  // Clamp to 0-100
  return { score: Math.min(score, 100), triggers };
}

// ---------------------------------------------------------------------------
// PII detection & redaction
// ---------------------------------------------------------------------------

const PII_REDACTION_RULES: Array<{
  type: string;
  pattern: RegExp;
  replacement: string;
}> = [
  {
    type: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  {
    type: 'phone',
    pattern: /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    replacement: '[PHONE_REDACTED]',
  },
  {
    type: 'ssn',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  {
    type: 'creditCard',
    pattern: /\b(?:\d[ -]*?){13,19}\b/g,
    replacement: '[CC_REDACTED]',
  },
  {
    type: 'apiKey',
    pattern: /\b(?:sk-[a-zA-Z0-9]{20,}|key-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16})\b/g,
    replacement: '[API_KEY_REDACTED]',
  },
  {
    type: 'ipAddress',
    pattern: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g,
    replacement: '[IP_REDACTED]',
  },
];

function detectPII(text: string): { types: string[]; matches: Record<string, number> } {
  const types: string[] = [];
  const matches: Record<string, number> = {};

  for (const rule of PII_REDACTION_RULES) {
    // Clone regex because .test() advances lastIndex on global regexes
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    const found = text.match(re);
    if (found && found.length > 0) {
      types.push(rule.type);
      matches[rule.type] = found.length;
    }
  }

  return { types, matches };
}

function redactPII(text: string): string {
  let result = text;
  for (const rule of PII_REDACTION_RULES) {
    result = result.replace(rule.pattern, rule.replacement);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Content filter
// ---------------------------------------------------------------------------

interface ContentRule {
  category: string;
  pattern: RegExp;
  severity: 'warn' | 'block';
}

const DEFAULT_CONTENT_RULES: ContentRule[] = [
  // Violence / hate
  { category: 'hate', pattern: /\b(?:kill\s+(?:all|every|those)|ethnic\s+cleansing|genocide)\b/i, severity: 'block' },
  { category: 'violence', pattern: /\b(?:how\s+to\s+(?:make|build|create)\s+(?:bomb|weapon|explosive))\b/i, severity: 'block' },
  // Self-harm
  { category: 'selfHarm', pattern: /\b(?:how\s+to\s+(?:commit|do)\s+(?:suicide|self\s*harm)|kill\s+myself)\b/i, severity: 'block' },
  // Exploitation
  { category: 'exploitation', pattern: /\b(?:child\s+(?:abuse|exploitation|pornography))\b/i, severity: 'block' },
  // Illegal activity
  { category: 'illegal', pattern: /\b(?:how\s+to\s+(?:hack|steal|commit\s+fraud))\b/i, severity: 'warn' },
];

function filterContent(text: string, rules: ContentRule[]): { flagged: boolean; categories: string[]; action: 'pass' | 'warn' | 'block' } {
  const categories: string[] = [];
  let maxSeverity: 'pass' | 'warn' | 'block' = 'pass';

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      categories.push(rule.category);
      if (rule.severity === 'block') {
        maxSeverity = 'block';
      } else if (maxSeverity === 'pass') {
        maxSeverity = 'warn';
      }
    }
  }

  return { flagged: categories.length > 0, categories, action: maxSeverity };
}

// ---------------------------------------------------------------------------
// Language detection (script-based)
// ---------------------------------------------------------------------------

export type DetectedLanguage = 'latin' | 'cjk' | 'cyrillic' | 'arabic' | 'devanagari' | 'mixed' | 'unknown';

interface LanguageDetectionResult {
  primary: DetectedLanguage;
  details: Record<DetectedLanguage, number>;
  suggestedProviders: string[];
}

const LANGUAGE_PROVIDER_HINTS: Record<DetectedLanguage, string[]> = {
  latin: ['openai', 'anthropic', 'google', 'groq', 'mistral'],
  cjk: ['google', 'openai', 'anthropic'],
  cyrillic: ['openai', 'anthropic', 'google', 'mistral'],
  arabic: ['google', 'openai', 'anthropic'],
  devanagari: ['google', 'openai', 'anthropic'],
  mixed: ['google', 'openai', 'anthropic'],
  unknown: ['openai', 'anthropic', 'google'],
};

function detectLanguage(text: string): LanguageDetectionResult {
  const scripts: Record<DetectedLanguage, number> = {
    latin: 0,
    cjk: 0,
    cyrillic: 0,
    arabic: 0,
    devanagari: 0,
    mixed: 0,
    unknown: 0,
  };

  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp >= 0x0041 && cp <= 0x024F) { scripts.latin++; }
    else if ((cp >= 0x4E00 && cp <= 0x9FFF) || (cp >= 0x3040 && cp <= 0x309F) || (cp >= 0x30A0 && cp <= 0x30FF) || (cp >= 0xAC00 && cp <= 0xD7AF)) { scripts.cjk++; }
    else if (cp >= 0x0400 && cp <= 0x04FF) { scripts.cyrillic++; }
    else if (cp >= 0x0600 && cp <= 0x06FF) { scripts.arabic++; }
    else if (cp >= 0x0900 && cp <= 0x097F) { scripts.devanagari++; }
    else if (cp > 0x7F && !/\s/.test(ch)) { scripts.unknown++; }
  }

  // Determine primary
  const relevant = (['latin', 'cjk', 'cyrillic', 'arabic', 'devanagari'] as DetectedLanguage[])
    .filter((s) => scripts[s] > 0);

  let primary: DetectedLanguage = 'unknown';
  if (relevant.length === 0) {
    primary = 'latin'; // Default for pure ASCII
  } else if (relevant.length === 1) {
    primary = relevant[0];
  } else {
    primary = 'mixed';
  }

  return {
    primary,
    details: scripts,
    suggestedProviders: LANGUAGE_PROVIDER_HINTS[primary],
  };
}

// ---------------------------------------------------------------------------
// Output validation
// ---------------------------------------------------------------------------

interface OutputValidationResult {
  valid: boolean;
  issues: string[];
  qualityScore: number; // 0-100
}

function validateOutput(input: string, output: string): OutputValidationResult {
  const issues: string[] = [];
  let qualityScore = 100;

  // Empty output
  if (!output || output.trim().length === 0) {
    issues.push('empty_output');
    qualityScore -= 50;
  }

  // Very short output for non-trivial input
  if (input.length > 100 && output.trim().length < 10) {
    issues.push('suspiciously_short');
    qualityScore -= 20;
  }

  // Repetition detection
  const words = output.split(/\s+/);
  if (words.length > 20) {
    const unique = new Set(words.map((w) => w.toLowerCase()));
    const ratio = unique.size / words.length;
    if (ratio < 0.3) {
      issues.push('high_repetition');
      qualityScore -= 25;
    }
  }

  // GPT refusal patterns
  const refusalPatterns = [
    /I\s+(?:can'?t|cannot|won't|am\s+not\s+able\s+to)\s+(?:help|assist|do\s+that|provide)/i,
    /As\s+an?\s+AI/i,
    /I'?m\s+(?:sorry|unable)/i,
  ];
  for (const p of refusalPatterns) {
    if (p.test(output)) {
      issues.push('refusal_detected');
      qualityScore -= 10;
      break;
    }
  }

  // Hallucination heuristic: output repeats the question verbatim without answering
  const inputLower = input.toLowerCase().trim();
  const outputLower = output.toLowerCase().trim();
  if (outputLower === inputLower) {
    issues.push('echo_response');
    qualityScore -= 30;
  }

  return {
    valid: qualityScore >= 20,
    issues,
    qualityScore: Math.max(0, qualityScore),
  };
}

// ---------------------------------------------------------------------------
// GuardrailEngine
// ---------------------------------------------------------------------------

export class GuardrailEngine {
  private config: GuardrailConfig;
  private customGuardrails: Map<string, GuardrailCheck> = new Map();
  private contentRules: ContentRule[];
  private blocklist: string[] = [];

  constructor(config?: Partial<GuardrailConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.contentRules = [...DEFAULT_CONTENT_RULES];
  }

  // ---- Public API ----

  /**
   * Check input content before routing to an LLM.
   */
  async checkInput(content: string): Promise<GuardrailResult> {
    const metadata: Record<string, any> = {};

    // Length check
    if (content.length > this.config.maxLength) {
      return {
        passed: false,
        blocked: true,
        reason: `Input exceeds maximum length (${content.length} > ${this.config.maxLength})`,
        modified: content.substring(0, this.config.maxLength),
        metadata: { truncated: true, originalLength: content.length },
      };
    }

    let modified = content;

    // Prompt injection
    if (this.config.promptInjection) {
      const injection = scoreInjection(content);
      metadata.injectionScore = injection.score;
      metadata.injectionTriggers = injection.triggers;

      if (injection.score >= 80) {
        return {
          passed: false,
          blocked: true,
          reason: `Prompt injection detected (score: ${injection.score})`,
          metadata,
        };
      }
      if (injection.score >= 50) {
        metadata.injectionWarning = true;
      }
    }

    // PII detection + redaction
    if (this.config.piiDetection) {
      const pii = detectPII(content);
      metadata.piiTypes = pii.types;
      metadata.piiCounts = pii.matches;

      if (pii.types.length > 0) {
        modified = redactPII(modified);
        metadata.piiRedacted = true;
      }
    }

    // Content filter
    if (this.config.contentFilter) {
      const contentResult = filterContent(modified, this.contentRules);
      metadata.contentFlagged = contentResult.flagged;
      metadata.contentCategories = contentResult.categories;

      if (contentResult.action === 'block') {
        return {
          passed: false,
          blocked: true,
          reason: `Content blocked: ${contentResult.categories.join(', ')}`,
          metadata,
        };
      }
      if (contentResult.action === 'warn') {
        metadata.contentWarning = true;
      }
    }

    // Blocklist check
    if (this.blocklist.length > 0) {
      const lowerContent = modified.toLowerCase();
      for (const term of this.blocklist) {
        if (lowerContent.includes(term.toLowerCase())) {
          return {
            passed: false,
            blocked: true,
            reason: `Content blocked by blocklist: "${term}"`,
            metadata,
          };
        }
      }
    }

    // Language detection
    if (this.config.languageDetection) {
      const lang = detectLanguage(modified);
      metadata.language = lang.primary;
      metadata.suggestedProviders = lang.suggestedProviders;
    }

    // Custom guardrails
    for (const [name, check] of this.customGuardrails) {
      const result = check(modified);
      if (result.blocked) {
        return {
          passed: false,
          blocked: true,
          reason: result.reason || `Blocked by custom guardrail: ${name}`,
          metadata: { ...metadata, ...result.metadata, blockedBy: name },
        };
      }
      if (result.modified) {
        modified = result.modified;
      }
    }

    return {
      passed: true,
      blocked: false,
      modified: modified !== content ? modified : undefined,
      metadata,
    };
  }

  /**
   * Check output content before returning to caller.
   */
  async checkOutput(input: string, output: string): Promise<GuardrailResult> {
    const metadata: Record<string, any> = {};
    let modified = output;

    // PII in output
    if (this.config.outputPII) {
      const pii = detectPII(output);
      metadata.piiTypes = pii.types;
      if (pii.types.length > 0) {
        modified = redactPII(modified);
        metadata.piiRedacted = true;
      }
    }

    // Content filter on output
    if (this.config.outputFilter) {
      const contentResult = filterContent(modified, this.contentRules);
      metadata.contentFlagged = contentResult.flagged;
      metadata.contentCategories = contentResult.categories;

      if (contentResult.action === 'block') {
        return {
          passed: false,
          blocked: true,
          reason: `Output blocked: ${contentResult.categories.join(', ')}`,
          metadata,
        };
      }
    }

    // Quality / hallucination checks
    if (this.config.hallucinationCheck) {
      const validation = validateOutput(input, modified);
      metadata.qualityScore = validation.qualityScore;
      metadata.issues = validation.issues;

      if (!validation.valid) {
        return {
          passed: false,
          blocked: true,
          reason: `Output quality check failed: ${validation.issues.join(', ')}`,
          metadata,
        };
      }
    }

    // Custom guardrails on output
    for (const [name, check] of this.customGuardrails) {
      const result = check(modified);
      if (result.blocked) {
        return {
          passed: false,
          blocked: true,
          reason: result.reason || `Output blocked by custom guardrail: ${name}`,
          metadata: { ...metadata, ...result.metadata, blockedBy: name },
        };
      }
      if (result.modified) {
        modified = result.modified;
      }
    }

    return {
      passed: true,
      blocked: false,
      modified: modified !== output ? modified : undefined,
      metadata,
    };
  }

  /**
   * Register a custom guardrail check function.
   */
  addGuardrail(name: string, check: GuardrailCheck): void {
    this.customGuardrails.set(name, check);
  }

  /**
   * Remove a custom guardrail.
   */
  removeGuardrail(name: string): boolean {
    return this.customGuardrails.delete(name);
  }

  /**
   * Add a term to the blocklist.
   */
  addBlocklistTerm(term: string): void {
    this.blocklist.push(term);
  }

  /**
   * Add a content filter rule.
   */
  addContentRule(rule: ContentRule): void {
    this.contentRules.push(rule);
  }

  /**
   * Get the current configuration.
   */
  getConfig(): Readonly<GuardrailConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  updateConfig(partial: Partial<GuardrailConfig>): void {
    Object.assign(this.config, partial);
  }
}

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

export function createGuardrails(config?: Partial<GuardrailConfig>): GuardrailEngine {
  return new GuardrailEngine(config);
}
