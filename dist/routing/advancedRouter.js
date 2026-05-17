"use strict";
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

const { getAvailableProviders } = require("../providers/providerConfig");
const tokenUtils_1 = require("../utils/tokenUtils");

// ============================================================
// DYNAMIC MODEL PROFILES (built from available providers)
// ============================================================

function buildModelProfiles() {
  const profiles = {};
  const available = getAvailableProviders();
  
  for (const [providerId, provider] of Object.entries(available)) {
    for (const model of provider.models) {
      const modelKey = model.includes('/') ? model : providerId + '/' + model;
      const costPerKInput = provider.costPerK ? provider.costPerK.input : 0;
      const costPerKOutput = provider.costPerK ? provider.costPerK.output : 0;
      
      // Assign strengths based on model characteristics
      const strengths = [];
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

let MODEL_PROFILES = buildModelProfiles();

// Refresh profiles when providers change
function refreshModelProfiles() {
  MODEL_PROFILES = buildModelProfiles();
}

exports.MODEL_PROFILES = MODEL_PROFILES;

// ============================================================
// FEATURE EXTRACTION
// ============================================================

function extractQueryFeatures(prompt) {
  const lower = prompt.toLowerCase();
  
  // Code patterns
  const code_indicators = [
    "function", "class ", "def ", "import ", "const ", "let ",
    "python", "javascript", "typescript", "java", "cpp", "rust",
    "```", "=>", "->", "async", "await"
  ];
  const has_code = code_indicators.some(pattern => lower.includes(pattern));
  
  // Math patterns
  const math_indicators = [
    "equation", "formula", "calculate", "sqrt", "^", "log",
    "sin", "cos", "tan", "integral", "derivative", "$", "math",
    "∫", "∂", "∑", "∏", "√", "∞", "π", "θ", "β",
    "dx", "dy", "dz", "=", "solver", "compute"
  ];
  const has_math = math_indicators.some(pattern => prompt.includes(pattern));
  
  // Multilingual
  const lang_patterns = [
    /[\u4e00-\u9fff]/,       // Chinese
    /[\u3040-\u309f\u30a0-\u30ff]/, // Japanese
    /[\uac00-\ud7af]/,       // Korean
    /[а-яА-Я]/,              // Russian
    /[áéíóúñ]/               // Spanish accented
  ];
  const is_multilingual = lang_patterns.some(pattern => pattern.test(prompt));
  
  // Translation detection
  const translation_indicators = ["translate", "translation", "translate to", "in french", "in spanish", "in japanese"];
  const is_translation = translation_indicators.some(pattern => lower.includes(pattern));
  
  // Creative writing
  const creative_indicators = [
    "write a", "story", "poem", "creative", "imagine",
    "describe", "explain in", "tell me", "narrative", "joke"
  ];
  const is_creative = creative_indicators.some(pattern => lower.includes(pattern));
  
  // Reasoning
  const reasoning_indicators = [
    "explain", "why", "because", "therefore", "thus",
    "analyze", "think", "consider", "reason", "logic"
  ];
  const requires_reasoning = reasoning_indicators.some(pattern => lower.includes(pattern));
  
  // Security/specialized
  const security_indicators = ["security", "vulnerability", "inject", "exploit", "attack", "encryption", "auth"];
  const is_security = security_indicators.some(pattern => lower.includes(pattern));
  
  // DevOps
  const devops_indicators = ["ci/cd", "docker", "kubernetes", "k8s", "deploy", "pipeline", "github action", "terraform"];
  const is_devops = devops_indicators.some(pattern => lower.includes(pattern));
  
  // Data/ML
  const data_indicators = ["dataset", "pandas", "numpy", "training", "model", "neural", "transformer", "bert", "llm"];
  const is_data = data_indicators.some(pattern => lower.includes(pattern));
  
  // Complexity estimation
  const tokens = tokenUtils_1.countTokens(prompt, "gpt-4o");
  let complexity = 0.3;
  if (tokens > 1000) complexity += 0.2;
  if (has_code) complexity += 0.15;
  if (has_math) complexity += 0.2;
  if (requires_reasoning) complexity += 0.15;
  if (is_creative) complexity += 0.1;
  if (is_security) complexity += 0.1;
  if (is_devops) complexity += 0.1;
  if (is_data) complexity += 0.15;
  complexity = Math.min(1.0, complexity);
  
  return {
    complexity,
    length: tokens,
    has_code,
    has_math,
    is_multilingual,
    is_translation,
    is_creative,
    requires_reasoning,
    is_security,
    is_devops,
    is_data,
  };
}

exports.extractQueryFeatures = extractQueryFeatures;

// ============================================================
// SCORING FUNCTIONS
// ============================================================

function scoreModelFit(model, features) {
  let score = model.quality_score * 0.4; // Base quality
  
  if (features.has_code && model.strengths.includes("coding")) score += 0.2;
  if (features.requires_reasoning && model.strengths.includes("reasoning")) score += 0.2;
  if (features.is_creative && model.strengths.includes("creative")) score += 0.15;
  if (features.is_multilingual && model.strengths.includes("multilingual")) score += 0.15;
  if (features.has_math && model.strengths.includes("analysis")) score += 0.15;
  if (features.is_security && model.strengths.includes("reasoning")) score += 0.1;
  if (features.is_data && model.strengths.includes("analysis")) score += 0.1;
  
  // Free/local providers bonus for simple tasks
  if (features.complexity < 0.4 && model.strengths.includes("free")) score += 0.15;
  if (features.complexity < 0.4 && model.latency_ms < 1000) score += 0.1;
  
  // Code-aware providers for code tasks
  if (features.has_code && model.strengths.includes("code-aware")) score += 0.2;
  
  return score;
}

function costEfficiency(model, features) {
  const avg_cost = (model.cost_per_1k_input + model.cost_per_1k_output) / 2;
  if (features.complexity < 0.5) {
    return (1 - Math.min(avg_cost / 10, 1)) * 0.6;
  }
  return (1 - Math.min(avg_cost / 10, 1)) * 0.2;
}

// ============================================================
// ROUTING
// ============================================================

function routeQuery(prompt, available_models, budget_multiplier = 1.0) {
  // Refresh profiles to ensure we have latest provider config
  refreshModelProfiles();
  
  const features = extractQueryFeatures(prompt);
  const candidate_names = available_models || Object.keys(MODEL_PROFILES);
  
  // Filter to available models
  const candidates = candidate_names
    .filter(name => MODEL_PROFILES[name])
    .map(name => {
      const profile = MODEL_PROFILES[name];
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
  const reasons = [];
  if (features.has_code) reasons.push("code detected");
  if (features.requires_reasoning) reasons.push("reasoning needed");
  if (features.complexity > 0.6) reasons.push("high complexity");
  if (features.is_multilingual) reasons.push("multilingual");
  if (features.is_translation) reasons.push("translation");
  if (primary.profile.strengths.includes("free")) reasons.push("free tier");
  
  const estimated_tokens = features.length * 1.5;
  const estimated_cost = tokenUtils_1.estimateCost(features.length, estimated_tokens, primary.name);
  
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

exports.routeQuery = routeQuery;

// ============================================================
// BATCH ROUTING
// ============================================================

function routeBatch(prompts, options = {}) {
  const decisions = prompts.map(p => routeQuery(p));
  
  if (options.same_model && decisions.length > 0) {
    const primary_model = decisions[0].primary_model;
    decisions.forEach(d => {
      d.primary_model = primary_model;
      d.fallback_models = decisions[0].fallback_models;
    });
  }
  
  if (options.max_cost_per_prompt) {
    decisions.forEach(d => {
      if (d.estimated_cost > options.max_cost_per_prompt) {
        const cheap = Object.entries(MODEL_PROFILES)
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

exports.routeBatch = routeBatch;

// ============================================================
// TASK RECOMMENDATIONS
// ============================================================

function recommendForTask(task) {
  refreshModelProfiles();
  const features = extractQueryFeatures(task);
  const decision = routeQuery(task);
  return {
    primary: decision.primary_model,
    fallbacks: decision.fallback_models,
    reason: decision.reasoning,
    features,
  };
}

exports.recommendForTask = recommendForTask;

// ============================================================
// ONLINE LEARNING - Update model profiles from feedback
// ============================================================

function updateModelProfile(model_name, actual_latency_ms, actual_cost, quality_rating) {
  refreshModelProfiles();
  const profile = MODEL_PROFILES[model_name];
  if (!profile) return;
  
  const alpha = 0.2; // Learning rate
  profile.latency_ms = profile.latency_ms * (1 - alpha) + actual_latency_ms * alpha;
  profile.quality_score = profile.quality_score * (1 - alpha) + quality_rating * alpha;
}

exports.updateModelProfile = updateModelProfile;

// ============================================================
// PROVIDER HEALTH CHECK
// ============================================================

async function getProviderHealth() {
  const { checkAllProviders } = require("../providers/providerConfig");
  return checkAllProviders();
}

exports.getProviderHealth = getProviderHealth;

// ============================================================
// Default export
// ============================================================

exports.default = {
  extractQueryFeatures,
  routeQuery,
  routeBatch,
  recommendForTask,
  updateModelProfile,
  getProviderHealth,
  MODEL_PROFILES,
};
