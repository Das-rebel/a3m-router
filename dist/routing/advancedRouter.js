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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODEL_PROFILES = void 0;
exports.extractQueryFeatures = extractQueryFeatures;
exports.routeQuery = routeQuery;
exports.routeBatch = routeBatch;
exports.recommendForTask = recommendForTask;
exports.updateModelProfile = updateModelProfile;
exports.getProviderHealth = getProviderHealth;
const providerConfig_1 = require("../providers/providerConfig");
const tokenUtils_1 = require("../utils/tokenUtils");
const costUtils_1 = require("../utils/costUtils");
const sorting_1 = require("../utils/sorting");
let cachedProfiles = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
function buildModelProfiles() {
    const profiles = {};
    const available = (0, providerConfig_1.getAvailableProviders)();
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
            }
            else if (costPerKInput > 2) {
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
            // Detect multimodal support
            const supportsMultimodal = provider.supports_multimodal === true;
            profiles[modelKey] = {
                name: modelKey,
                provider: providerId,
                providerName: provider.name,
                cost_per_1k_input: costPerKInput,
                cost_per_1k_output: costPerKOutput,
                latency_ms: provider.type === 'cli' ? 5000 : (provider.priority * 200 + 300),
                quality_score: (strengths.includes('premium') || strengths.includes('reasoning')) ? 0.94 :
                    (strengths.includes('fast') && costPerKInput > 0.3) ? 0.85 :
                        (strengths.includes('budget') || strengths.includes('free')) ? 0.72 : 0.80,
                strengths,
                context_window: provider.maxTokens || 8192,
                type: provider.type,
                priority: provider.priority,
                supports_multimodal: supportsMultimodal,
            };
        }
    }
    return profiles;
}
// Lazy cache with TTL - replaces refreshModelProfiles()
function getModelProfiles() {
    const now = Date.now();
    if (!cachedProfiles || (now - cacheTimestamp) > CACHE_TTL_MS) {
        cachedProfiles = buildModelProfiles();
        cacheTimestamp = now;
    }
    return cachedProfiles;
}
// Manual cache invalidation (call if provider config changes)
function invalidateProfileCache() {
    cachedProfiles = null;
    cacheTimestamp = 0;
}
exports.MODEL_PROFILES = {};
try {
    exports.MODEL_PROFILES = buildModelProfiles();
}
catch (e) {
    // Circular dependency at module load - will retry on first use
    exports.MODEL_PROFILES = {};
}
function extractQueryFeatures(prompt) {
    const lower = prompt.toLowerCase();
    const words = prompt.split(/\s+/);
    const wordCount = words.length;
    // === SIGNAL 1: Domain Detection ===
    const domainSignals = {
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
        ml_research: {
            keywords: ['bert', 'gpt', 'super_glue', 'glue benchmark', 'benchmarks', 'performance comparison',
                'natural language processing', 'nlp', 'language model', 'transformer model',
                'fine.tuning', 'pre.training', 'few.shot', 'zero.shot', 'prompt engineering',
                'model comparison', 'accuracy', 'f1 score', 'bleu', 'rouge', 'perplexity'],
            weight: 0.40
        },
    };
    let detectedDomain = null;
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
        'function ', 'def ', 'class ', 'import ', 'const ', 'let ', 'var ',
        '=>', '->', 'async ', 'await ', 'return ', 'if (', 'for (', 'while (',
        'public ', 'private ', 'protected ', 'static ', 'void ', 'int ', 'string ',
        '#include', 'std::', 'cout', 'cin', 'printf(', 'println!',
        'fn ', 'impl ', 'pub ', 'mut ', 'struct ', 'enum ',
        '```', 'python', 'javascript', 'typescript', 'java', 'cpp', 'ruby',
        'write a', 'create a', 'implement', 'algorithm'
    ];
    const hasCode = codeSignals.some(sig => lower.includes(sig));
    // === SIGNAL 3: Reasoning Detection ===
    // === SIGNAL 3: Reasoning Detection ===
    const reasoningSignals = [
        'why', 'how', 'explain', 'analyze', 'compare', 'contrast', 'evaluate',
        'think about', 'reason', 'logic', 'proof', 'derive', '证明', '分析',
        'reasoning', 'step by step', 'thinking', 'thought process'
    ];
    // Check if it's a simple factual "How" query (should NOT trigger reasoning boost)
    const simpleHowPatterns = [
        /^(what|how|who|which|when|where)\s+(is|are|was|were|do|does|did|can|has|have|named|called)/i,
        /^how\s+(many|much|long|tall|old|far)/i,
    ];
    const isSimpleHowQuery = simpleHowPatterns.some(p => p.test(prompt.trim()));
    const requiresReasoning = !isSimpleHowQuery && reasoningSignals.some(sig => lower.includes(sig));
    // === SIGNAL 4: Language Detection ===
    const languagePatterns = [
        [/[\u4e00-\u9fff]/, 'zh'],
        [/[\u0900-\u097f]/, 'hi'],
        [/[\u0600-\u06ff]/, 'ar'],
        [/[\u0400-\u04ff]/, 'ru'],
        [/[\u0900-\u097f]/, 'hi-latn'],
        [/বাংলা|করুন|হিন্দি|ভারত|ভারতীয়/, 'bn'],
    ];
    let detectedLanguage = null;
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
    // Math takes priority over code for math-heavy queries
    if (lower.includes('calculate') || lower.includes('compute') || lower.includes('integral') ||
        lower.includes('derivative') || lower.includes('equation') || lower.includes('formula')) {
        intent = 'math';
    }
    else if (hasCode) {
        intent = 'code';
    }
    else if (isTranslation) {
        intent = 'translation';
    }
    else if (lower.includes('write') || lower.includes('create') || lower.includes('generate')) {
        intent = 'creative';
    }
    else if (lower.includes('explain') || lower.includes('what is') || lower.includes('how does')) {
        intent = 'explanation';
    }
    // === COMPLEXITY SCORING ===
    // Base complexity from length
    let complexity = Math.min(wordCount / 100, 1.0);
    // === RESEARCH-BACKED COMPLEXITY SIGNALS (from accuracy gap analysis) ===
    // SIGNAL: Jargon Density (+15%) - professional terminology ratio
    const professionalTerms = [
        'liability', 'contract', 'clause', 'statute', 'jurisdiction', 'litigation', 'plaintiff', 'defendant', 'testimony', 'deposition', 'injunction', 'precedent',
        'oncology', 'diagnosis', 'prognosis', 'pathology', 'pharmacology', 'etiology', 'symptomology', 'clinical',
        'portfolio', 'equity', 'derivative', 'arbitrage', 'liquidity', 'amortization', 'collateral', 'fiduciary',
        'architecture', 'protocol', 'schema', 'interface', 'abstraction', 'implementation', 'optimization', 'scalability',
        'hypothesis', 'methodology', 'correlation', 'regression', 'variance', 'covariance', 'multivariate',
        'quantitative', 'qualitative', 'peer-reviewed', 'meta-analysis', 'systematic review', 'empirical',
    ];
    const jargonCount = professionalTerms.filter(t => lower.includes(t)).length;
    const jargonScore = (jargonCount / Math.max(wordCount, 1)) * 0.35;
    complexity += jargonScore;
    // SIGNAL: Task Formality (+10%) - formal professional task markers
    const formalTasks = ['protocol', 'audit', 'brief', 'filing', 'submission', 'application', 'complaint', 'petition', 'motion', 'agreement', 'negotiation', 'mediation', 'arbitration', 'compliance', 'regulatory', 'certification', 'accreditation', 'assessment', 'evaluation', 'appraisal', 'due diligence', 'impact assessment', 'risk assessment', 'investigation', 'inquiry', 'examination'];
    const formalityMatches = formalTasks.filter(t => lower.includes(t)).length;
    if (formalityMatches > 0)
        complexity += 0.10 + (formalityMatches * 0.03);
    // SIGNAL: Depth Markers (+8%) - comprehensive response requested
    const depthTerms = ['comprehensive', 'detailed', 'thorough', 'in-depth', 'exhaustive', 'systematic', 'methodical', 'rigorous', 'extensive', 'elaborate', 'nuanced', 'multi-faceted', 'holistic', 'deep dive', 'full analysis', 'expert level', 'professional grade', 'end-to-end', 'literature review', 'research report', 'whitepaper', 'technical specification'];
    const depthMatches = depthTerms.filter(t => lower.includes(t)).length;
    if (depthMatches > 0)
        complexity += 0.08 + (depthMatches * 0.03);
    // SIGNAL: Stakes Language (+5%) - high-stakes domain language
    const highStakes = ['safety-critical', 'liability', 'regulatory', 'compliance', 'legal', 'patent', 'copyright', 'litigation', 'lawsuit', 'penalty', 'fraud', 'malpractice', 'negligence', 'confidential', 'proprietary', 'trade secret', 'intellectual property', 'patient safety', 'clinical trial', 'financial risk', 'market risk', 'operational risk'];
    const stakesMatches = highStakes.filter(s => lower.includes(s)).length;
    if (stakesMatches > 0)
        complexity += 0.08 + (stakesMatches * 0.02);
    // SIGNAL: Multi-Step Structure (+5%) - sequential reasoning patterns
    const multiStepPatterns = [/first\s+.+\s+then\s+.+\s+finally/i, /step\s+\d+\s*[,.:]\s*step\s+\d+/i, /phase\s*\d+\s*[-–]\s*phase\s*\d+/i, /stage\s*\d+\s*[-–]\s*stage\s*\d+/i, /before\s+.+\s+after\s+.+/i];
    const multiStepMatches = multiStepPatterns.filter(p => p.test(prompt)).length;
    if (multiStepMatches > 0)
        complexity += 0.07 + (multiStepMatches * 0.02);
    // === MID-TIER SPECIFIC SIGNALS ===
    const midTierJargon = [
        'auth system', 'multi-tenant', 'ci/cd', 'pipeline', 'fraud detection', 'privacy-preserving',
        'netflix-scale', 'sensor fusion', 'autonomous', 'distributed', 'consensus',
        'load balancing', 'rate limiting', 'caching', 'sharding', 'replication',
        'authentication', 'authorization', 'encryption', 'compression', 'serialization',
    ];
    const midJargonMatches = midTierJargon.filter(t => lower.includes(t)).length;
    if (midJargonMatches > 0)
        complexity += 0.10 + (midJargonMatches * 0.02);
    // Analysis/Design task boost
    const analysisDesignPatterns = [
        /analyze\s+.*\s+(impact|implications|consequences|effects)/i,
        /compare\s+.*\s+and\s+.*\s+(vs|with|against)/i,
        /design\s+(a|an)\s+(system|architecture|protocol|schema)/i,
        /schema\s+for/i,
        /pipeline\s+for/i,
    ];
    const analysisMatches = analysisDesignPatterns.filter(p => p.test(prompt)).length;
    if (analysisMatches > 0)
        complexity += 0.12 + (analysisMatches * 0.03);
    // Complex system analysis patterns
    const complexSystemPatterns = [
        /explain\s+(the\s+)?(difference|relationship|correlation)/i,
        /how\s+does\s+.*\s+affect\s+.*\s+in\s+.*/i,
    ];
    const complexMatches = complexSystemPatterns.filter(p => p.test(prompt)).length;
    if (complexMatches > 0)
        complexity += 0.08;
    // === ORIGINAL SIGNALS (enhanced) ===
    // Domain加成 (increased from 0.2 to 0.35)
    if (detectedDomain)
        complexity += 0.35;
    // Code加成
    if (hasCode)
        complexity += 0.15;
    // Reasoning加成 (increased from 0.15 to 0.20)
    if (requiresReasoning)
        complexity += 0.20;
    // Multilingual加成
    if (isMultilingual)
        complexity += 0.1;
    // Detect new feature flags
    const isSecurity = /penetration testing|security audit|vulnerability|exploit|malware|ransomware|zero.trust|owasp|sql injection|xss|cross.site|csrf|brute.force|authentication bypass|cwe.\d+/i.test(lower);
    const isCreative = /write a story|write a poem|creative|imagination|artistic/i.test(lower) || isTranslation;
    const isDevops = /docker|kubernetes|terraform|ansible|ci.cd|pipeline|sql|nosql|database|sqlserver|mysql|postgres|deploy|container|orchestrat/i.test(lower);
    const isMultimodal = /image|video|audio|generate.*picture|generate.*image|transcribe|voice/i.test(lower);
    // Cap at 1.0
    complexity = Math.min(complexity, 1.0);
    return {
        length: prompt.length,
        wordCount,
        complexity,
        has_code: hasCode,
        has_math: intent === 'math', // Math detection
        requires_reasoning: requiresReasoning,
        is_multilingual: isMultilingual,
        is_translation: isTranslation,
        is_security: isSecurity,
        is_creative: isCreative,
        is_devops: isDevops,
        is_multimodal: isMultimodal,
        domain: detectedDomain,
        intent,
        detected_language: detectedLanguage,
    };
}
function scoreModelFit(model, features) {
    let score = model.quality_score * 0.6;
    // Domain match (reduced for budget models)
    // Premium models get +0.2 for domain match
    // Budget/free models get only +0.05 (they lack capability for complex domains)
    if (features.domain) {
        const domainBonus = {
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
            const is_budget = model.strengths.includes('budget') || model.strengths.includes('free');
            score += is_budget ? 0.05 : 0.25; // Budget gets minimal boost
        }
    }
    // For complex queries (complexity > 0.5), budget/free models get penalty
    if (features.complexity > 0.5) {
        if (model.strengths.includes('budget') || model.strengths.includes('free')) {
            score *= 0.7; // 30% penalty for budget models on complex queries
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
    // Multimodal bonus - if query needs multimodal, prefer models that support it
    if (features.is_multimodal && model.supports_multimodal) {
        score += 0.25; // Strong bonus for multimodal-capable models
    }
    else if (features.is_multimodal && !model.supports_multimodal) {
        score *= 0.5; // Heavy penalty for non-multimodal models on multimodal queries
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
function costEfficiency(model, features) {
    // Use log-scale cost score for better mid-range differentiation
    // Lower cost → higher score (thanks to logScaleCostScore inverse mapping)
    const avg_cost = (model.cost_per_1k_input + model.cost_per_1k_output) / 2;
    const cost_score = (0, costUtils_1.logScaleCostScore)(avg_cost);
    // Simple queries weigh cost more heavily (0.6)
    // Complex queries weigh cost less (0.2) since quality matters more
    const weight = features.complexity < 0.5 ? 0.6 : 0.2;
    return cost_score * weight;
}
function routeQuery(prompt, available_models, budget_multiplier = 1.0) {
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
    const scoreFn = (c) => c.quality_score * complexity_bias + c.cost_score * (1 - complexity_bias);
    const topCandidates = (0, sorting_1.quickselectTopK)(candidates, 4, scoreFn);
    const primary = topCandidates[0];
    const secondary = topCandidates.slice(1, 3);
    // Calculate confidence based on score gap
    let confidence = 0.5;
    if (candidates.length > 1) {
        const gap = primary.total_score - candidates[1].total_score;
        confidence = Math.min(0.95, 0.5 + gap * 2);
    }
    // Build reasoning
    const reasons = [];
    if (features.has_code)
        reasons.push("code detected");
    if (features.requires_reasoning)
        reasons.push("reasoning needed");
    if (features.complexity > 0.6)
        reasons.push("high complexity");
    if (features.is_multilingual)
        reasons.push("multilingual");
    if (features.is_translation)
        reasons.push("translation");
    if (primary.profile.strengths.includes("free"))
        reasons.push("free tier");
    const estimated_tokens = features.length * 1.5;
    const estimated_cost = (0, tokenUtils_1.estimateCost)(features.length, estimated_tokens, primary.name);
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
function routeBatch(prompts, options = {}) {
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
            if (d.estimated_cost > options.max_cost_per_prompt) {
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
function recommendForTask(task) {
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
function updateModelProfile(model_name, actual_latency_ms, actual_cost, quality_rating) {
    const profiles = getModelProfiles();
    const profile = profiles[model_name];
    if (!profile)
        return;
    const alpha = 0.2; // Learning rate
    profile.latency_ms = profile.latency_ms * (1 - alpha) + actual_latency_ms * alpha;
    profile.quality_score = profile.quality_score * (1 - alpha) + quality_rating * alpha;
}
// ============================================================
// PROVIDER HEALTH CHECK
// ============================================================
async function getProviderHealth() {
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
    MODEL_PROFILES: exports.MODEL_PROFILES,
    invalidateProfileCache,
};
module.exports.default = module.exports;
//# sourceMappingURL=advancedRouter.js.map