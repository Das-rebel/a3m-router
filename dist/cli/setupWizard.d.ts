/**
 * A3M Router Setup Wizard
 * Interactive configuration wizard with smart defaults
 */
declare const fs: any;
declare const path: any;
declare const readline: any;
declare const CONFIG_DIR: any;
declare const CONFIG_FILE: any;
declare const PROVIDERS_FILE: any;
declare const API_KEY_ENV_MAP: {
    GROQ_API_KEY: {
        id: string;
        tier: string;
    };
    OPENAI_API_KEY: {
        id: string;
        tier: string;
    };
    ANTHROPIC_API_KEY: {
        id: string;
        tier: string;
    };
    DEEPSEEK_API_KEY: {
        id: string;
        tier: string;
    };
    MISTRAL_API_KEY: {
        id: string;
        tier: string;
    };
    GOOGLE_API_KEY: {
        id: string;
        tier: string;
    };
    XAI_API_KEY: {
        id: string;
        tier: string;
    };
    FIREWORKS_API_KEY: {
        id: string;
        tier: string;
    };
    TOGETHER_API_KEY: {
        id: string;
        tier: string;
    };
    CEREBRAS_API_KEY: {
        id: string;
        tier: string;
    };
    AI21_API_KEY: {
        id: string;
        tier: string;
    };
    COHERE_API_KEY: {
        id: string;
        tier: string;
    };
    PERPLEXITY_API_KEY: {
        id: string;
        tier: string;
    };
    MINIMAX_API_KEY: {
        id: string;
        tier: string;
    };
    KIMI_API_KEY: {
        id: string;
        tier: string;
    };
    MOONSHOT_API_KEY: {
        id: string;
        tier: string;
    };
    QWEN_API_KEY: {
        id: string;
        tier: string;
    };
    ZHIPU_API_KEY: {
        id: string;
        tier: string;
    };
    YI_API_KEY: {
        id: string;
        tier: string;
    };
    BAICHUAN_API_KEY: {
        id: string;
        tier: string;
    };
    STEPFUN_API_KEY: {
        id: string;
        tier: string;
    };
    REPLICATE_API_KEY: {
        id: string;
        tier: string;
    };
    HUGGINGFACE_API_KEY: {
        id: string;
        tier: string;
    };
    NVIDIA_API_KEY: {
        id: string;
        tier: string;
    };
    OPENROUTER_API_KEY: {
        id: string;
        tier: string;
    };
    AZURE_OPENAI_API_KEY: {
        id: string;
        tier: string;
    };
    DEEPINFRA_API_KEY: {
        id: string;
        tier: string;
    };
    SAMBANOVA_API_KEY: {
        id: string;
        tier: string;
    };
    ANYSCALE_API_KEY: {
        id: string;
        tier: string;
    };
    VOYAGE_API_KEY: {
        id: string;
        tier: string;
    };
    JINA_API_KEY: {
        id: string;
        tier: string;
    };
    NOVITA_API_KEY: {
        id: string;
        tier: string;
    };
    OCTOAI_API_KEY: {
        id: string;
        tier: string;
    };
    LAMINAR_API_KEY: {
        id: string;
        tier: string;
    };
    WRITER_API_KEY: {
        id: string;
        tier: string;
    };
};
declare const PROVIDER_INFO: {
    groq: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    cerebras: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    google: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    deepseek: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    groq_alt: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    together: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    fireworks: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    mistral: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    cohere: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    qwen: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    zhipu: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    kimi: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    yi: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    minimax: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    stepfun: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    openai: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    anthropic: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    xai: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
    perplexity: {
        name: string;
        defaultModel: string;
        tier: string;
        strength: string;
        specialties: string[];
        note: string;
    };
};
declare function createInterface(): any;
declare function question(rl: any, text: any): Promise<unknown>;
/**
 * Detect API keys from environment variables
 */
declare function detectApiKeys(): Promise<{
    envVar: string;
    providerId: string;
    tier: string;
    info: any;
}[]>;
/**
 * Load existing configuration
 */
declare function loadExistingConfig(): any;
/**
 * Auto-detect best starter config based on available keys
 */
declare function suggestStarterConfig(detected: any): any[];
/**
 * Print provider list with status
 */
declare function printProviderList(selected: any, detected: any): void;
/**
 * Print usage tips
 */
declare function printTips(detected: any): void;
/**
 * Build configuration object
 */
declare function buildConfig(selected: any, detected: any): {
    version: string;
    providers: {};
};
/**
 * Main wizard execution
 */
declare function runWizard(): Promise<{
    version: string;
    providers: {};
}>;
//# sourceMappingURL=setupWizard.d.ts.map