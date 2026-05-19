#!/usr/bin/env node
/**
 * A3M Router — Multi-Provider Benchmark
 * Tests Groq, Cerebras, OpenCode free endpoints
 */

const https = require('https');
const http = require('http');

const QUESTIONS = [
  { id:1, prompt:"What is 2+2?" },
  { id:2, prompt:"Write a Python function to check prime" },
  { id:3, prompt:"Explain what an API is in 1 sentence" },
  { id:4, prompt:"What causes climate change?" },
  { id:5, prompt:"Write a haiku about programming" },
  { id:6, prompt:"Summarize: AI models improve with data" },
  { id:7, prompt:"List 3 programming languages" },
  { id:8, prompt:"What is machine learning?" },
  { id:9, prompt:"Code: reverse a string in Python" },
  { id:10, prompt:"What is the capital of Japan?" },
];

const PROVIDERS = {
  // Groq (free)
  'groq-llama-3.3-70b': {
    name: 'Groq Llama 3.3 70B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    apiKeyEnv: 'GROQ_API_KEY',
    inputCostPer1M: 0,
  },
  'groq-llama-3.1-8b': {
    name: 'Groq Llama 3.1 8B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    apiKeyEnv: 'GROQ_API_KEY',
    inputCostPer1M: 0,
  },
  'groq-qwen-3-32b': {
    name: 'Groq Qwen 3 32B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'qwen/qwen3-32b',
    apiKeyEnv: 'GROQ_API_KEY',
    inputCostPer1M: 0,
  },
  'groq-allam-2-7b': {
    name: 'Groq Allam 2 7B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'allam-2-7b',
    apiKeyEnv: 'GROQ_API_KEY',
    inputCostPer1M: 0,
  },
  'groq-compound-mini': {
    name: 'Groq Compound Mini',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'groq/compound-mini',
    apiKeyEnv: 'GROQ_API_KEY',
    inputCostPer1M: 0,
  },
  // Cerebras (free)
  'cerebras-llama3.1-8b': {
    name: 'Cerebras Llama 3.1 8B',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'llama3.1-8b',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    inputCostPer1M: 0,
  },
  'cerebras-qwen-3-235b': {
    name: 'Cerebras Qwen 3 235B',
    endpoint: 'https://api.cerebras.ai/v1/chat/completions',
    model: 'qwen-3-235b-a22b-instruct-2507',
    apiKeyEnv: 'CEREBRAS_API_KEY',
    inputCostPer1M: 0,
  },
  // OpenCode (via API server running on 18787)
  'opencode-deepseek-v4': {
    name: 'OpenCode DeepSeek V4 Flash',
    endpoint: 'http://127.0.0.1:18787/v1/chat/completions',
    model: 'opencode/deepseek-v4-flash-free',
    apiKeyEnv: null,
    local: true,
    inputCostPer1M: 0,
  },
  'opencode-minimax-m2.5': {
    name: 'OpenCode MiniMax M2.5',
    endpoint: 'http://127.0.0.1:18787/v1/chat/completions',
    model: 'minimax/MiniMax-M2.5',
    apiKeyEnv: null,
    local: true,
    inputCostPer1M: 0,
  },
  'opencode-nemotron': {
    name: 'OpenCode Nemotron Super',
    endpoint: 'http://127.0.0.1:18787/v1/chat/completions',
    model: 'opencode/nemotron-3-super-free',
    apiKeyEnv: null,
    local: true,
    inputCostPer1M: 0,
  },
  'opencode-qwen3.6-plus': {
    name: 'OpenCode Qwen 3.6 Plus',
    endpoint: 'http://127.0.0.1:18787/v1/chat/completions',
    model: 'opencode/qwen3.6-plus-free',
    apiKeyEnv: null,
    local: true,
    inputCostPer1M: 0,
  },
  // Groq via OpenCode (same provider, different path)
  'opencode-groq-llama-3.3-70b': {
    name: 'OpenCode Groq Llama 3.3 70B',
    endpoint: 'http://127.0.0.1:18787/v1/chat/completions',
    model: 'groq/llama-3.3-70b-versatile',
    apiKeyEnv: null,
    local: true,
    inputCostPer1M: 0,
  },
};

function apiCall(provider, body) {
  return new Promise((resolve) => {
    const config = PROVIDERS[provider];
    const startTime = Date.now();
    const bodyStr = JSON.stringify(body);
    const url = new URL(config.endpoint);
    const isHttp = url.protocol === 'http:';
    
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyStr),
    };
    
    if (config.apiKeyEnv) {
      const key = process.env[config.apiKeyEnv];
      if (key) headers['Authorization'] = `Bearer ${key}`;
    }
    
    const opts = {
      hostname: url.hostname,
      port: url.port || (isHttp ? 80 : 443),
      path: url.pathname,
      method: 'POST',
      headers,
    };
    
    const req = (isHttp ? http : https).request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const latency = Date.now() - startTime;
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content || '';
          resolve({ success: true, latency, content, status: res.statusCode });
        } catch {
          resolve({ success: false, latency, error: data.slice(0, 100), status: res.statusCode });
        }
      });
    });
    
    req.on('error', e => resolve({ success: false, latency: 0, error: e.message }));
    req.setTimeout(60000, () => { req.destroy(); resolve({ success: false, latency: 60000, error: 'Timeout' }); });
    req.write(bodyStr);
    req.end();
  });
}

async function runBench(providerIds) {
  console.log('\n🧪 A3M Router Multi-Provider Benchmark\n');
  
  const results = {};
  
  for (const pid of providerIds) {
    const config = PROVIDERS[pid];
    if (!config) continue;
    
    // Check API key
    if (config.apiKeyEnv && (!process.env[config.apiKeyEnv] || process.env[config.apiKeyEnv].length < 20)) {
      console.log(`⏭️  ${config.name}: No API key (${config.apiKeyEnv})`);
      continue;
    }
    
    console.log(`\n📡 ${config.name}...`);
    const qResults = [];
    
    for (const q of QUESTIONS) {
      process.stdout.write(`  Q${q.id}...`);
      const result = await apiCall(pid, {
        model: config.model,
        messages: [{ role: 'user', content: q.prompt }],
        max_tokens: 100,
      });
      qResults.push({ id: q.id, ...result });
      process.stdout.write(` ${result.latency}ms ${result.success ? '✅' : '❌'}\n`);
      await new Promise(r => setTimeout(r, 300));
    }
    
    const success = qResults.filter(r => r.success).length;
    const avgLat = qResults.reduce((s, r) => s + r.latency, 0) / qResults.length;
    const avgLen = qResults.filter(r => r.success).reduce((s, r) => s + (r.content?.length || 0), 0) / Math.max(success, 1);
    
    results[pid] = {
      name: config.name,
      successRate: success / QUESTIONS.length,
      avgLatency: Math.round(avgLat),
      avgOutputLen: Math.round(avgLen),
      inputCostPer1M: config.inputCostPer1M,
      questions: qResults,
    };
    
    console.log(`  → ${success}/${QUESTIONS.length}, avg ${avgLat}ms, ~${avgLen} chars output\n`);
  }
  
  // Summary table
  console.log('\n📊 Results Summary\n');
  console.log('Provider                  | Success | Avg Latency | $/1M');
  console.log('--------------------------|---------|-------------|--------');
  
  const sorted = Object.values(results).sort((a, b) => a.avgLatency - b.avgLatency);
  for (const r of sorted) {
    const sr = `${(r.successRate * 100).toFixed(0)}%`;
    console.log(`${r.name.padEnd(25)}| ${sr.padStart(7)} | ${String(r.avgLatency).padStart(8)}ms | $${r.inputCostPer1M}`);
  }
  
  require('fs').writeFileSync('benchmark-provider-results.json', JSON.stringify({
    meta: { date: new Date().toISOString(), questions: QUESTIONS.length },
    results,
  }, null, 2));
  
  console.log('\n💾 Saved to benchmark-provider-results.json');
  return results;
}

const args = process.argv.slice(2);
const all = args.includes('--all');
const pids = all ? Object.keys(PROVIDERS) : (args.filter(a => PROVIDERS[a]) || []);

if (pids.length === 0) {
  console.log('Usage: node run-provider-benchmark.js [--all] [pid1] [pid2] ...');
  console.log('\nAvailable providers:');
  Object.entries(PROVIDERS).forEach(([id, c]) => console.log(`  ${id}: ${c.name}`));
  process.exit(1);
}

runBench(pids).catch(console.error);
