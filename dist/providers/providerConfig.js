"use strict";
/**
 * A3M Router - Generic Provider Configuration System
 * 
 * Users can configure their available LLM providers via:
 * 1. Environment variables (*_API_KEY patterns)
 * 2. Config file at ~/.config/a3m-router/providers.json
 * 3. Runtime registration via registerProvider()
 * 
 * All provider references are generic and configurable.
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// DEFAULT PROVIDER DEFINITIONS (generic, user-configurable)
// ============================================================

const DEFAULT_PROVIDERS = {
  // ===== API Providers =====
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    apiKeyEnv: 'GROQ_API_KEY',
    models: [
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3-32b',
      'meta-llama/llama-4-scout-17b-16e-instruct',
    ],
    costPerK: { input: 0.59, output: 0.79 },
    type: 'api',
    priority: 1,
    maxTokens: 8192,
  },

  cerebras: {
    id: 'cerebras',
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    models: [
      'llama3.1-8b',
      'qwen-3-235b-a22b-instruct-2507',
      'gpt-oss-120b',
      'zai-glm-4.7',
    ],
    costPerK: { input: 0.6, output: 0.6 },
    type: 'api',
    priority: 2,
    maxTokens: 8192,
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    apiKeyEnv: 'MISTRAL_API_KEY',
    models: [
      'mistral-small-latest',
      'mistral-medium-latest',
      'mistral-large-latest',
      'mistral-small-2506',
      'devstral-small-2507',
      'ministral-3b-latest',
      'ministral-8b-latest',
      'codestral-latest',
    ],
    costPerK: { input: 0.2, output: 0.6 },
    type: 'api',
    priority: 3,
    maxTokens: 8192,
  },

  openai: {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
    ],
    costPerK: { input: 2.5, output: 10 },
    type: 'api',
    priority: 4,
    maxTokens: 8192,
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: [
      'claude-3.5-sonnet',
      'claude-3-opus',
      'claude-3-haiku',
    ],
    costPerK: { input: 3, output: 15 },
    type: 'api',
    priority: 5,
    maxTokens: 8192,
  },

  google: {
    id: 'google',
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    apiKeyEnv: 'GOOGLE_API_KEY',
    models: [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemma-3-27b-it',
    ],
    costPerK: { input: 0, output: 0 }, // Free tier available
    type: 'api',
    priority: 6,
    maxTokens: 8192,
  },

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1/chat/completions',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    costPerK: { input: 0.14, output: 0.28 },
    type: 'api',
    priority: 7,
    maxTokens: 8192,
  },

  // ===== CLI Providers (local tools) =====
  opencode: {
    id: 'opencode',
    name: 'OpenCode',
    cliCommand: 'opencode',
    models: [], // Populated dynamically via `opencode models`
    costPerK: { input: 0, output: 0 }, // Free tier available
    type: 'cli',
    priority: 8,
    maxTokens: 8192,
  },

  commandcode: {
    id: 'commandcode',
    name: 'CommandCode',
    baseUrl: 'https://api.commandcode.ai/v1',
    apiKeyEnv: 'COMMANDCODE_API_KEY',
    models: ['taste-1'],
    costPerK: { input: 0, output: 0 }, // Free for now
    type: 'cli',
    cliCommand: 'commandcode',
    priority: 9,
    maxTokens: 8192,
  },

  // ===== Local Providers =====
  ollama: {
    id: 'ollama',
    name: 'Ollama',
    baseUrl: 'http://127.0.0.1:11434/api/generate',
    models: [], // Populated dynamically via ollama list
    costPerK: { input: 0, output: 0 },
    type: 'local',
    priority: 10,
    maxTokens: 8192,
  },

  vllm: {
    id: 'vllm',
    name: 'vLLM',
    baseUrl: 'http://127.0.0.1:8000/v1/chat/completions',
    models: [],
    costPerK: { input: 0, output: 0 },
    type: 'local',
    priority: 11,
    maxTokens: 8192,
  },

  lmstudio: {
    id: 'lmstudio',
    name: 'LM Studio',
    baseUrl: 'http://127.0.0.1:1234/v1/chat/completions',
    models: [],
    costPerK: { input: 0, output: 0 },
    type: 'local',
    priority: 12,
    maxTokens: 8192,
  },
};

// ============================================================
// RUNTIME STATE
// ============================================================

let _registeredProviders = { ...DEFAULT_PROVIDERS };
let _configLoaded = false;

// ============================================================
// CONFIGURATION LOADING
// ============================================================

function loadConfig(configPath) {
  const paths = [];
  
  // 1. Provided path
  if (configPath && fs.existsSync(configPath)) {
    paths.push(configPath);
  }
  
  // 2. User config directory
  const userConfig = path.join(
    process.env.HOME || process.env.USERPROFILE || '.',
    '.config', 'a3m-router', 'providers.json'
  );
  if (fs.existsSync(userConfig)) {
    paths.push(userConfig);
  }
  
  // 3. Project config
  const projectConfig = path.join(process.cwd(), 'a3m-providers.json');
  if (fs.existsSync(projectConfig)) {
    paths.push(projectConfig);
  }
  
  // 4. .env file
  const envPath = path.join(process.env.HOME || '.', '.env');
  if (fs.existsSync(envPath)) {
    try {
      require('dotenv').config({ path: envPath });
    } catch (e) {
      // dotenv not installed - env vars still work
    }
  }
  
  // Load config from first found file
  for (const p of paths) {
    try {
      const config = JSON.parse(fs.readFileSync(p, 'utf-8'));
      if (config.providers) {
        for (const [id, provider] of Object.entries(config.providers)) {
          if (_registeredProviders[id]) {
            // Merge with defaults
            _registeredProviders[id] = { ..._registeredProviders[id], ...provider };
          } else {
            // Register new provider
            _registeredProviders[id] = {
              id,
              type: 'api',
              priority: 50,
              maxTokens: 8192,
              costPerK: { input: 0, output: 0 },
              models: [],
              ...provider,
            };
          }
        }
      }
      _configLoaded = true;
      break;
    } catch (e) {
      // Skip invalid config files
    }
  }
  
  // Load API keys from environment
  for (const [id, provider] of Object.entries(_registeredProviders)) {
    if (provider.apiKeyEnv) {
      provider.apiKey = process.env[provider.apiKeyEnv] || null;
    }
  }
  
  return _registeredProviders;
}

function getAvailableProviders() {
  if (!_configLoaded) {
    loadConfig();
  }
  
  const available = {};
  
  for (const [id, provider] of Object.entries(_registeredProviders)) {
    if (provider.type === 'api') {
      // API providers need a key
      if (provider.apiKey) {
        available[id] = provider;
      }
    } else {
      // CLI/local providers are always available if the command exists
      available[id] = provider;
    }
  }
  
  // Sort by priority
  return Object.entries(available)
    .sort(([, a], [, b]) => a.priority - b.priority)
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
}

// ============================================================
// RUNTIME REGISTRATION
// ============================================================

function registerProvider(id, config) {
  _registeredProviders[id] = {
    id,
    type: 'api',
    priority: 50,
    maxTokens: 8192,
    costPerK: { input: 0, output: 0 },
    models: [],
    ...config,
  };
  return _registeredProviders[id];
}

function deregisterProvider(id) {
  delete _registeredProviders[id];
}

function updateProvider(id, updates) {
  if (_registeredProviders[id]) {
    _registeredProviders[id] = { ..._registeredProviders[id], ...updates };
    return _registeredProviders[id];
  }
  return null;
}

// ============================================================
// HEALTH CHECK
// ============================================================

async function healthCheck(providerId) {
  const provider = _registeredProviders[providerId];
  if (!provider) {
    return { healthy: false, error: 'Provider not found: ' + providerId };
  }
  
  if (provider.type === 'cli') {
    // CLI provider - check if command exists
    const { execSync } = require('child_process');
    try {
      execSync(`which ${provider.cliCommand || provider.id}`, { stdio: 'pipe' });
      return { healthy: true, latency: 0, type: 'cli' };
    } catch (e) {
      return { healthy: false, error: 'Command not found: ' + (provider.cliCommand || provider.id) };
    }
  }
  
  if (provider.type === 'api') {
    if (!provider.apiKey) {
      return { healthy: false, error: 'No API key for ' + provider.name };
    }
    
    // Simple health check
    const startTime = Date.now();
    try {
      const model = provider.models[0];
      const resp = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + provider.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5,
        }),
      });
      
      const latency = Date.now() - startTime;
      const data = await resp.json();
      
      if (data.error) {
        return { healthy: false, error: data.error.message, latency };
      }
      
      return { healthy: true, latency, model: data.model || model };
    } catch (e) {
      return { healthy: false, error: e.message, latency: Date.now() - startTime };
    }
  }
  
  return { healthy: false, error: 'Unknown provider type: ' + provider.type };
}

async function checkAllProviders() {
  const results = {};
  const available = getAvailableProviders();
  
  for (const [id, provider] of Object.entries(available)) {
    results[id] = await healthCheck(id);
  }
  
  return results;
}

// ============================================================
// SAVE CONFIG
// ============================================================

function saveConfig(configPath) {
  const target = configPath || path.join(
    process.env.HOME || '.',
    '.config', 'a3m-router', 'providers.json'
  );
  
  const dir = path.dirname(target);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Save without API keys for security
  const safeConfig = {};
  for (const [id, provider] of Object.entries(_registeredProviders)) {
    safeConfig[id] = { ...provider };
    delete safeConfig[id].apiKey;
  }
  
  fs.writeFileSync(target, JSON.stringify({ providers: safeConfig }, null, 2));
  return target;
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  DEFAULT_PROVIDERS,
  loadConfig,
  getAvailableProviders,
  registerProvider,
  deregisterProvider,
  updateProvider,
  healthCheck,
  checkAllProviders,
  saveConfig,
  _providers: _registeredProviders,
};
