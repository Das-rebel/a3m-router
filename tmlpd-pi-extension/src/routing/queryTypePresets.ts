/**
 * TMLPD - Query-Type Presets (P1)
 * 
 * Configurable provider + temperature profiles per query type.
 * Replaces flat regex patterns with named, adjustable presets.
 * This productizes what Reddit users do manually: route different
 * task types to different providers with different settings.
 */

export interface QueryPreset {
  name: string;
  description: string;
  provider: string;         // primary provider
  fallbackProvider?: string;
  temperature: number;
  maxTokens: number;
  ensemble: boolean;        // use ensemble voting?
  ensembleProviders?: string[];
  timeoutMs: number;
  systemPrompt?: string;
}

export interface PresetRouter {
  presets: Record<string, QueryPreset>;
  defaultPreset: string;
  classify: (query: string) => string;
}

// ============================================================
// DEFAULT PRESETS
// ============================================================

export const DEFAULT_PRESETS: Record<string, QueryPreset> = {
  fast: {
    name: 'Fast Query',
    description: 'Quick lookups, simple questions, status checks',
    provider: 'groq',
    temperature: 0.3,
    maxTokens: 500,
    ensemble: false,
    timeoutMs: 15000,
    systemPrompt: 'Answer concisely in 1-2 sentences.',
  },
  research: {
    name: 'Research / Deep Analysis',
    description: 'Complex multi-step reasoning, comparisons, deep dives',
    provider: 'nvidia',
    fallbackProvider: 'groq',
    temperature: 0.3,
    maxTokens: 3000,
    ensemble: true,
    ensembleProviders: ['nvidia', 'groq'],
    timeoutMs: 60000,
    systemPrompt: 'Provide thorough analysis with specific technical details and examples.',
  },
  creative: {
    name: 'Creative / Writing',
    description: 'Content generation, storytelling, brainstorming',
    provider: 'nvidia',
    temperature: 0.7,
    maxTokens: 2500,
    ensemble: false,
    timeoutMs: 45000,
    systemPrompt: 'Be creative and engaging. Use vivid language.',
  },
  code: {
    name: 'Code / Technical',
    description: 'Code generation, debugging, architecture, implementation',
    provider: 'nvidia',
    fallbackProvider: 'groq',
    temperature: 0.2,
    maxTokens: 3000,
    ensemble: true,
    ensembleProviders: ['nvidia', 'groq'],
    timeoutMs: 45000,
    systemPrompt: 'Be precise. Show code with clear explanations. Prefer working solutions over theoretical ones.',
  },
  factual: {
    name: 'Factual / Q&A',
    description: 'Direct answers with citations, definitions, explanations',
    provider: 'groq',
    temperature: 0.2,
    maxTokens: 1000,
    ensemble: false,
    timeoutMs: 20000,
    systemPrompt: 'Answer factually. If unsure, say so. Be concise.',
  },
};

// ============================================================
// CLASSIFICATION PATTERNS
// ============================================================

const PATTERNS: Array<{ rx: RegExp; preset: string }> = [
  { rx: /\b(debug|error|bug|fix|crash|exception|fail|broken|compile)\b/i, preset: 'code' },
  { rx: /\b(code|function|api|endpoint|syntax|npm|import|implement|class|algorithm)\b/i, preset: 'code' },
  { rx: /\b(story|poem|write|create|generate|tweet|post|article|content|draft|compose|creative)\b/i, preset: 'creative' },
  { rx: /\b(architecture|design|pattern|database|cache|queue|latency|throughput|scal|deploy|optimize|refactor)\b/i, preset: 'research' },
  { rx: /\b(compare|analyze|evaluate|difference|pros|cons|tradeoff|vs\b|research|deep|comprehensive)\b/i, preset: 'research' },
  { rx: /\b(what is|define|explain|meaning|definition|describe|how does)\b/i, preset: 'factual' },
];

// ============================================================
// PRESET ROUTER
// ============================================================

export function createPresetRouter(customPresets?: Record<string, QueryPreset>): PresetRouter {
  const presets = { ...DEFAULT_PRESETS, ...customPresets };

  return {
    presets,
    defaultPreset: 'fast',

    classify(query: string): string {
      for (const p of PATTERNS) {
        if (p.rx.test(query)) return p.preset;
      }
      // Length-based classification
      const words = query.split(/\s+/).length;
      if (words > 30) return 'research';
      if (words > 10) return 'factual';
      return 'fast';
    }
  };
}

/**
 * Get preset config for a query, with fallback to default.
 */
export function getPresetForQuery(
  query: string,
  router: PresetRouter
): QueryPreset {
  const presetName = router.classify(query);
  return router.presets[presetName] || router.presets[router.defaultPreset];
}
