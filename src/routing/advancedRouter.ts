/**
 * A3M Router - Generic Adaptive Routing (RouteLLM Style)
 * 
 * Routes queries to the best available LLM based on:
 * - Query features (code, math, creative, etc.)
 * - Provider availability (checks API keys)
 * - Cost optimization
 * - Quality vs speed tradeoff
 * 
 * All provider references are dynamically loaded from providerConfig.
 * Users can add/remove providers via environment variables or config files.
 */

import { getAvailableProviders } from "../providers/providerConfig";
import { estimateCost } from "../utils/tokenUtils";

// ============================================================
// CACHE FOR MODEL PROFILES (avoids O(n*m) rebuild on every routeQuery)
// ============================================================

interface ModelProfile {
  name: string;
  provider: string;
  providerName: string;
  cost_per_1k_input: number;
  cost_per_1k_output: number;
  latency_ms: number;
  quality_score: number;
  strengths: string[];
  context_window: number;
  type: string;
  priority: number;
}

let cachedProfiles: Record<string, ModelProfile> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function buildModelProfiles(): Record<string, ModelProfile> {
  const profiles: Record<string, ModelProfile> = {};
  const available = getAvailableProviders();
  
  for (const [providerId, provider] of Object.entries(available)) {
    for (const model of provider.models) {
      const modelKey = model.includes('/') ? model : providerId + '/' + model;
      const costPerKInput = provider.costPerK ? provider.costPerK.input : 0;
      const costPerKOutput = provider.costPerK ? provider.costPerK.output : 0;
      
      // Assign strengths based on model characteristics
      const strengths: string[] = [];
      if (provider.type === 'cli') {
        strengths.push('free', 'local');
      }
      if (costPerKInput < 0.3) {
        strengths.push('budget', 'fast');
      } else if (costPerKInput > 2) {
        strengths.push('premium', 'reasoning');
      }
      if (provider.name === 'Mistral' || provider.name === 'Groq' || provider.name === 'Cerebras') {
        strengths.push('fast', 'coding');
      }
      if (provider.name === 'CommandCode') {
        strengths.push('code-aware', 'context-rich');
      }
      if (provider.name === 'OpenCode') {
        strengths.push('free', 'multi-model');
      }
      if (provider.name === 'Google') {
        strengths.push('multilingual', 'long-context');
      }
      if (provider.name === 'OpenAI') {
        strengths.push('reasoning', 'coding', 'analysis');
      }
      if (provider.name === 'Anthropic') {
        strengths.push('reasoning', 'creative', 'analysis');
      }
      
      profiles[modelKey] = {
        name: modelKey,
        provider: providerId,
        providerName: provider.name,
        cost_per_1k_input: costPerKInput,
        cost_per_1k_output: costPerKOutput,
        latency_ms: provider.type === 'cli' ? 5000 : (provider.priority * 200 + 300),
        quality_score: strengths.includes('premium') ? 0.95 : 
                       strengths.includes('reasoning') ? 0.90 : 
                       strengths.includes('fast') ? 0.82 : 0.80,
        strengths,
        context_window: provider.maxTokens || 8192,
        type: provider.type,
        priority: provider.priority,
      };
    }
  }
  
  return profiles;
}

// Lazy cache with TTL - replaces refreshModelProfiles()
function getModelProfiles(): Record<string, ModelProfile> {
  const now = Date.now();
  if (!cachedProfiles || (now - cacheTimestamp) > CACHE_TTL_MS) {
    cachedProfiles = buildModelProfiles();
    cacheTimestamp = now;
  }
  return cachedProfiles;
}

// Manual cache invalidation (call if provider config changes)
function invalidateProfileCache(): void {
  cachedProfiles = null;
  cacheTimestamp = 0;
}

export let MODEL_PROFILES: Record<string, ModelProfile> = {};
try {
  MODEL_PROFILES = buildModelProfiles();
} catch (e) {
  // Circular dependency at module load — will retry on first use
  MODEL_PROFILES = {};
}

// ============================================================
// FEATURE EXTRACTION (v3 — multi-signal complexity scorer)
// ============================================================

export interface QueryFeatures {
  length: number;
  wordCount: number;
  complexity: number;
  has_code: boolean;
  requires_reasoning: boolean;
  is_multilingual: boolean;
  is_translation: boolean;
  domain: string | null;
  intent: string;
  detected_language: string | null;
}

export function extractQueryFeatures(prompt: string): QueryFeatures {
  const lower = prompt.toLowerCase();
  const words = prompt.split(/\s+/);
  const wordCount = words.length;
  
  // === SIGNAL 1: Domain Detection ===
  const domainSignals: Record<string, { keywords: string[]; weight: number }> = {
    legal: {
      keywords: ['legal', 'law', 'contract', 'liability', 'litigation', 'patent', 'copyright',
                  'regulation', 'compliance', 'constitutional', 'statute', 'jurisdiction',
                  'court', 'ruling', 'precedent', 'attorney', 'amicus', 'sec ', 'fda ',
                  'gdpr', 'ccpa', 'cfpr', 'due diligence', 'merger', 'acquisition',
                  '10-k', 'sec filing', 'forensic', 'embezzlement', 'infringement'],
      weight: 0.35
    },
    medical: {
      keywords: ['clinical', 'medical', 'pharmaceutical', 'oncology', 'drug', 'trial protocol',
                  'diagnosis', 'treatment', 'epidemiolog', 'genome', 'cohort study',
                  'biomarker', 'efficacy', 'pharmacoeconomic', 'biologic', 'vaccine',
                  'sepsis', 'ehr ', 'surgical', 'patient safety', 'fda approval'],
      weight: 0.35
    },
    finance: {
      keywords: ['financial model', 'valuation', 'revenue', 'portfolio', 'derivative',
                  'hedge fund', 'series a', 'series b', 'startup valuation', 'sensitivity analysis',
                  'investment thesis', 'earnings', 'tax optimization', 'forensic accounting',
                  'multinational', 'jurisdiction', 'risk assessment', 'monte carlo',
                  'black-scholes', 'options pricing', 'credit risk'],
      weight: 0.30
    },
    security: {
      keywords: ['security audit', 'penetration', 'vulnerability', 'exploit', 'zero-trust',
                  'threat model', 'incident response', 'malware', 'ransomware',
                  'authentication flow', 'cryptograph', 'encryption', 'timing attack',
                  'supply chain attack', 'owasp', 'compliance', 'risk assessment',
                  'mfa', 'zero-day', 'firewall', 'intrusion'],
      weight: 0.30
    },
    architecture: {
      keywords: ['system design', 'microservice', 'distributed system', 'fault-tolerant',
                  'event-sourced', 'cqrs', 'consensus algorithm', 'real-time pipeline',
                  'high availability', 'multi-region', 'latency sla', 'kafka',
                  'event-driven', 'data warehouse', 'etl', 'streaming', '1m events',
                  'million events', 'scalab', 'infrastruct', 'deploy'],
      weight: 0.25
    },
    data_science: {
      keywords: ['machine learning', 'deep learning', 'neural network', 'transformer',
                  'training data', 'model accuracy', 'hyperparameter', 'cross-validation',
                  'feature engineering', 'data pipeline', 'pandas', 'numpy', 'scikit',
                  'tensorflow', 'pytorch', 'regression', 'classification', 'clustering'],
      weight: 0.30
    },
  };

  let detectedDomain: string | null = null;
  let maxDomainScore = 0;
  for (const [domain, signal] of Object.entries(domainSignals)) {
    let domainScore = 0;
    for (const kw of signal.keywords) {
      if (lower.includes(kw)) {
        domainScore += signal.weight;
      }
    }
    if (domainScore > maxDomainScore) {
      maxDomainScore = domainScore;
      detectedDomain = domain;
    }
  }
  
  // === SIGNAL 2: Code Detection ===
  const codeSignals = [
    'function ', 'def ', 'class ', 'import ', 'from ', 'const ', 'let ', 'var ',
    '=>', '->', 'async ', 'await ', 'return ', 'if (', 'for (', 'while (',
    'public ', 'private ', 'protected ', 'static ', 'void ', 'int ', 'string ',
    '#include', 'std::', 'cout', 'cin', 'printf(', 'println!',
    'fn ', 'impl ', 'pub ', 'mut ', 'struct ', 'enum ',
    '```', 'code', 'python', 'javascript', 'typescript', 'java', 'cpp', 'ruby',
    'write a', 'create a', 'implement', 'algorithm'
  ];
  const hasCode = codeSignals.some(sig => lower.includes(sig));
  
  // === SIGNAL 3: Reasoning Detection ===
  const reasoningSignals = [
    'why', 'how', 'explain', 'analyze', 'compare', 'contrast', 'evaluate',
    'think about', 'reason', 'logic', 'proof', 'derive', '证明', '分析',
    'reasoning', 'step by step', 'thinking', 'thought process'
  ];
  const requiresReasoning = reasoningSignals.some(sig => lower.includes(sig));
  
  // === SIGNAL 4: Language Detection ===
  const languagePatterns: [RegExp, string][] = [
    [/[\u4e00-\u9fff]/, 'zh'],
    [/[\u0900-\u097f]/, 'hi'],
    [/[\u0600-\u06ff]/, 'ar'],
    [/[\u0400-\u04ff]/, 'ru'],
    [/[\u0900-\u097f]/, 'hi-latn'],
    [/বাংলা|করুন|হিন্দি|ভারত|ভারতীয়/, 'bn'],
  ];
  
  let detectedLanguage: string | null = null;
  for (const [pattern, lang] of languagePatterns) {
    if (pattern.test(prompt)) {
      detectedLanguage = lang;
      break;
    }
  }
  
  // Translation detection
  const translationSignals = ['translate', 'translation', 'into english', 'to english', 
    'traducir', 'traduction', 'traduzione', 'übersetzen'];
  const isTranslation = translationSignals.some(sig => lower.includes(sig)) || 
    /to (english|french|german|spanish|chinese|japanese|korean)/i.test(prompt);
  
  const isMultilingual = detectedLanguage !== null || isTranslation;
  
  // === SIGNAL 5: Intent Classification ===
  let intent = 'general';
  if (hasCode) intent = 'code';
  else if (isTranslation) intent = 'translation';
  else if (lower.includes('write') || lower.includes('create') || lower.includes('generate')) {
    intent = 'creative';
  } else if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does')) {
    intent = 'explanation';
  } else if (lower.includes('calculate') || lower.includes('compute') || lower.includes('integral')) {
    intent = 'math';
  }
  
  // === COMPLEXITY SCORING ===
  // Base complexity from length
  let complexity = Math.min(wordCount / 100, 1.0);
  
  // Domain加成
  if (detectedDomain) complexity += 0.2;
  
  // Code加成
  if (hasCode) complexity += 0.15;
  
  // Reasoning加成
  if (requiresReasoning) complexity += 0.15;
  
  // Multilingual加成
  if (isMultilingual) complexity += 0.1;
  
  // Cap at 1.0
  complexity = Math.min(complexity, 1.0);
  
  return {
    length: prompt.length,
    wordCount,
    complexity,
    has_code: hasCode,
    requires_reasoning: requiresReasoning,
    is_multilingual: isMultilingual,
    is_translation: isTranslation,
    domain: detectedDomain,
    intent,
    detected_language: detectedLanguage,
  };
}

function scoreModelFit(model: ModelProfile, features: QueryFeatures): number {
  let score = model.quality_score * 0.6;
  
  // Domain match
  if (features.domain) {
    const domainBonus: Record<string, string[]> = {
      code: ['code-aware', 'coding', 'fast'],
      medical: ['reasoning', 'analysis'],
      legal: ['reasoning', 'analysis', 'context-rich'],
      finance: ['analysis', 'reasoning'],
      security: ['reasoning', 'analysis'],
      architecture: ['context-rich', 'long-context'],
      data_science: ['coding', 'fast', 'reasoning'],
    };
    const bonuses = domainBonus[features.domain] || [];
    if (bonuses.some(b => model.strengths.includes(b))) {
      score += 0.2;
    }
  }
  
  // Code bonus
  if (features.has_code && model.strengths.includes('coding')) {
    score += 0.15;
  }
  
  // Multilingual bonus
  if (features.is_multilingual && model.strengths.includes('multilingual')) {
    score += 0.15;
  }
  
  // Free tier preference for simple queries
  if (features.complexity < 0.5 && model.strengths.includes('free')) {
    score += 0.2;
  }
  
  // Fast provider for simple queries
  if (features.complexity < 0.4 && model.strengths.includes('fast')) {
    score += 0.15;
  }
  
  // Premium for complex queries
  if (features.complexity > 0.6 && model.strengths.includes('premium')) {
    score += 0.15;
  }
  
  return Math.min(score, 1.0);
}

function costEfficiency(model: ModelProfile, features: QueryFeatures): number {
  const avg_cost = (model.cost_per_1k_input + model.cost_per_1k_output) / 2;
  if (features.complexity < 0.5) {
    return (1 - Math.min(avg_cost / 10, 1)) * 0.6;
  }
  return (1 - Math.min(avg_cost / 10, 1)) * 0.2;
}

// ============================================================
// ROUTING
// ============================================================

export interface RouteDecision {
  primary_model: string | null;
  fallback_models: string[];
  confidence: number;
  reasoning: string;
  estimated_cost: number;
  estimated_latency_ms: number;
  features?: QueryFeatures;
  provider_type?: string;
}

export function routeQuery(prompt: string, available_models?: string[], budget_multiplier: number = 1.0): RouteDecision {
  // Use cached profiles instead of rebuilding every time (5-10ms savings)
  const profiles = getModelProfiles();
  
  const features = extractQueryFeatures(prompt);
  const candidate_names = available_models || Object.keys(profiles);
  
  // Filter to available models
  const candidates = candidate_names
    .filter(name => profiles[name])
    .map(name => {
      const profile = profiles[name];
      const quality = scoreModelFit(profile, features);
      const cost = costEfficiency(profile, features);
      return {
        name,
        profile,
        quality_score: quality,
        cost_score: cost,
        total_score: quality + cost
      };
    });
  
  if (candidates.length === 0) {
    return {
      primary_model: null,
      fallback_models: [],
      confidence: 0,
      reasoning: "No providers available - configure API keys in ~/.config/a3m-router/providers.json",
      estimated_cost: 0,
      estimated_latency_ms: 0,
    };
  }
  
  // Sort by total score (quality vs cost tradeoff based on complexity)
  const complexity_bias = features.complexity > 0.6 ? 0.7 : 0.3;
  candidates.sort((a, b) => {
    const score_a = a.quality_score * complexity_bias + a.cost_score * (1 - complexity_bias);
    const score_b = b.quality_score * complexity_bias + b.cost_score * (1 - complexity_bias);
    return score_b - score_a;
  });
  
  const primary = candidates[0];
  const secondary = candidates.slice(1, 3);
  
  // Calculate confidence based on score gap
  let confidence = 0.5;
  if (candidates.length > 1) {
    const gap = primary.total_score - candidates[1].total_score;
    confidence = Math.min(0.95, 0.5 + gap * 2);
  }
  
  // Build reasoning
  const reasons: string[] = [];
  if (features.has_code) reasons.push("code detected");
  if (features.requires_reasoning) reasons.push("reasoning needed");
  if (features.complexity > 0.6) reasons.push("high complexity");
  if (features.is_multilingual) reasons.push("multilingual");
  if (features.is_translation) reasons.push("translation");
  if (primary.profile.strengths.includes("free")) reasons.push("free tier");
  
  const estimated_tokens = features.length * 1.5;
  const estimated_cost = estimateCost(features.length, estimated_tokens, primary.name);
  
  return {
    primary_model: primary.name,
    fallback_models: secondary.map(c => c.name),
    confidence,
    reasoning: `Selected ${primary.profile.providerName || primary.profile.provider}/${primary.name} for ${reasons.join(", ") || "general query"}`,
    estimated_cost: estimated_cost * budget_multiplier,
    estimated_latency_ms: primary.profile.latency_ms,
    features,
    provider_type: primary.profile.type,
  };
}

// ============================================================
// BATCH ROUTING
// ============================================================

export function routeBatch(prompts: string[], options: {
  same_model?: boolean;
  max_cost_per_prompt?: number;
} = {}): RouteDecision[] {
  const decisions = prompts.map(p => routeQuery(p));
  
  if (options.same_model && decisions.length > 0) {
    const primary_model = decisions[0].primary_model;
    decisions.forEach(d => {
      d.primary_model = primary_model;
      d.fallback_models = decisions[0].fallback_models;
    });
  }
  
  if (options.max_cost_per_prompt !== undefined) {
    const profiles = getModelProfiles();
    decisions.forEach(d => {
      if (d.estimated_cost > options.max_cost_per_prompt!) {
        const cheap = Object.entries(profiles)
          .find(([name, p]) => p.cost_per_1k_input < 0.5);
        if (cheap) {
          d.primary_model = cheap[0];
          d.reasoning = `Budget-limited routing to ${cheap[1].providerName || cheap[1].provider}`;
        }
      }
    });
  }
  
  return decisions;
}

// ============================================================
// TASK RECOMMENDATIONS
// ============================================================

export function recommendForTask(task: string) {
  const features = extractQueryFeatures(task);
  const decision = routeQuery(task);
  return {
    primary: decision.primary_model,
    fallbacks: decision.fallback_models,
    reason: decision.reasoning,
    features,
  };
}

// ============================================================
// ONLINE LEARNING - Update model profiles from feedback
// ============================================================

export function updateModelProfile(model_name: string, actual_latency_ms: number, actual_cost: number, quality_rating: number): void {
  const profiles = getModelProfiles();
  const profile = profiles[model_name];
  if (!profile) return;
  
  const alpha = 0.2; // Learning rate
  profile.latency_ms = profile.latency_ms * (1 - alpha) + actual_latency_ms * alpha;
  profile.quality_score = profile.quality_score * (1 - alpha) + quality_rating * alpha;
}

// ============================================================
// PROVIDER HEALTH CHECK
// ============================================================

export async function getProviderHealth() {
  const { checkAllProviders } = require("../providers/providerConfig");
  return checkAllProviders();
}

// ============================================================
// Default export
// ============================================================

module.exports = {
  extractQueryFeatures,
  routeQuery,
  routeBatch,
  recommendForTask,
  updateModelProfile,
  getProviderHealth,
  MODEL_PROFILES,
  invalidateProfileCache,
};

module.exports.default = module.exports;