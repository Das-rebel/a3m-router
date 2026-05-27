#!/usr/bin/env node
/**
 * A3M Router CLI - Adaptive Memory Multi-Model Router
 * 
 * Commands:
 *   npx a3m-router serve [--port 8787]    Start OpenAI-compatible proxy server
 *   npx a3m-router route <query>           Route query to best provider
 *   npx a3m-router setup                  Interactive setup wizard (auto-detect API keys)
 *   npx a3m-router batch <q1> <q2>..      Route multiple queries
 *   npx a3m-router providers               List all configured providers
 *   npx a3m-router test                    Test all providers
 *   npx a3m-router compare <query>         Compare providers side by side
 *   npx a3m-router benchmark               Benchmark all providers
 *   npx a3m-router recommend <task>        Get model recommendation
 *   npx a3m-router cost <text>             Estimate token cost
 *   npx a3m-router token <text>            Count tokens
 *   npx a3m-router models                  List known models
 *   npx a3m-router memory add/search/stats Memory operations
 *   npx a3m-router status                  Show router status
 */

const { execSync } = require('child_process');
const {
  createA3MRouter, routeQuery, routeBatch, recommendForTask,
  countTokens, estimateCost, MODEL_COSTS, CostTracker, MemoryTree,
  getAvailableProviders, providerConfig, registerProvider, loadProviders,
} = require('./index.js');

let createProxyServer;
try {
  createProxyServer = require('./server/proxyServer.js').createProxyServer;
} catch (e) {
  // Server module not yet compiled
}

const args = process.argv.slice(2);
const command = args[0];

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatRoute(result) {
  console.log('\n🔀 A3M Router — Route Result');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Primary:   ' + result.primary_model);
  if (result.fallback_models) {
    console.log('  Fallbacks: ' + result.fallback_models.join(', '));
  }
  if (result.estimated_cost) {
    console.log('  Est. Cost: $' + result.estimated_cost.toFixed(6));
  }
  if (result.provider_type) {
    console.log('  Type:      ' + result.provider_type);
  }
  if (result.reasoning) {
    console.log('  Reason:    ' + result.reasoning);
      showStarPrompt();
  }
  console.log('');
}


// ============================================================
// STAR PROMPT (shown once per user)
// ============================================================
function showStarPrompt() {
  const fs = require('fs');
  const path = require('path');
  const home = process.env.HOME || process.env.USERPROFILE || '/tmp';
  const marker = path.join(home, '.a3m-router', '.star-prompt-shown');
  
  try {
    // Only show once
    if (fs.existsSync(marker)) return;
    
    // Create directory if needed
    const dir = path.dirname(marker);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    console.log('');
    console.log('  \x1b[2m── ────────────────────────────────────────\x1b[0m');
    console.log('  \x1b[2m⭐  Found this useful? Star us on GitHub:\x1b[0m');
    console.log('  \x1b[1m\x1b[36m   https://github.com/Das-rebel/a3m-router\x1b[0m');
    console.log('  \x1b[2m── ────────────────────────────────────────\x1b[0m');
    console.log('');
    
    // Mark as shown
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (e) {
    // Silently fail - don't break CLI for this
  }
}

async function callProvider(providerId, model, prompt, maxTokens) {
  providerId = providerId || 'groq';
  model = model || 'llama-3.3-70b-versatile';
  maxTokens = maxTokens || 50;
  
  const providers = providerConfig.getAvailableProviders();
  const provider = providers[providerId];
  
  if (!provider) {
    console.error('  ❌ Provider "' + providerId + '" not found or not configured.');
    console.error('  Run: npx a3m-router providers');
    return null;
  }
  
  const startTime = Date.now();
  
  if (provider.type === 'cli') {
    try {
      if (providerId === 'commandcode') {
        const raw = execSync('commandcode -p "' + prompt.replace(/"/g, '\\"') + '" --skip-onboarding 2>&1', { timeout: 60000, encoding: 'utf-8' });
        const content = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
        return { content: content.substring(0, 200), totalTokens: Math.ceil(content.length / 4), cost: 0, latency: Date.now() - startTime };
      } else {
        const raw = execSync(provider.cliCommand + ' run "' + prompt.replace(/"/g, '\\"') + '" 2>&1', { timeout: 60000, encoding: 'utf-8' });
        const lines = raw.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(l => l.trim() && !l.startsWith('>') && !l.includes('build'));
        const content = lines.join(' ').trim();
        return { content: content.substring(0, 200), totalTokens: Math.ceil(content.length / 4), cost: 0, latency: Date.now() - startTime };
      }
    } catch (e) {
      console.error('  ❌ ' + provider.name + ' error: ' + e.message.substring(0, 80));
      return null;
    }
  }
  
  // API provider
  try {
    const resp = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + provider.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens }),
    });
    const data = await resp.json();
    const latency = Date.now() - startTime;
    if (data.error) {
      console.error('  ❌ ' + provider.name + ' error: ' + data.error.message.substring(0, 80));
      return null;
    }
    const tokens = data.usage || {};
    const cost = (tokens.prompt_tokens || 0) / 1000 * provider.costPerK.input + (tokens.completion_tokens || 0) / 1000 * provider.costPerK.output;
    return { content: data.choices[0].message.content.trim(), totalTokens: tokens.total_tokens || 0, cost, latency, model: data.model || model };
  } catch (e) {
    console.error('  ❌ ' + provider.name + ' error: ' + e.message.substring(0, 80));
    return null;
  }
}

// ============================================================
// COMMANDS
// ============================================================

async function main() {
  const router = createA3MRouter({ memory: { maxSize: 1000 } });

  switch (command) {
    case 'setup': {
      const { runWizard } = require('./cli/setupWizard.js');
      runWizard();
      break;
    }

    case 'providers': {
      const providers = providerConfig.getAvailableProviders();
      const allProviders = providerConfig._providers;
      
      console.log('\n📡 A3M Router — Provider Configuration');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Config: ~/.config/a3m-router/providers.json');
      console.log('  Add your own: npx a3m-router register <id> <config>');
      console.log('');
      console.log('  Provider              Type    Models  Priority  Key');
      console.log('  ───────────────────── ─────── ────── ──────── ─────────');
      
      for (const [id, provider] of Object.entries(allProviders)) {
        const available = providers[id];
        const status = available ? '✅' : '❌';
        const keyStatus = provider.apiKey ? '✅' : (provider.type === 'cli' ? 'N/A' : '❌');
        const modelCount = provider.models ? provider.models.length : 0;
        console.log('  ' + status + ' ' + (provider.name || id).padEnd(20) + ' ' + (provider.type || 'api').padEnd(7) + ' ' + String(modelCount).padEnd(6) + ' ' + String(provider.priority).padEnd(9) + ' ' + keyStatus);
      }
      console.log('');
      console.log('  Available: ' + Object.keys(providers).length + ' providers');
      console.log('  Configured: ' + Object.keys(allProviders).length + ' providers');
      console.log('');
      break;
    }

    case 'test': {
      const providers = providerConfig.getAvailableProviders();
      console.log('\n🧪 A3M Router — Provider Health Check');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      for (const [id, provider] of Object.entries(providers)) {
        const model = provider.models[0];
        console.log('  Testing ' + (provider.name || id) + ' (' + model + ')...');
        const result = await callProvider(id, model, 'Say OK', 5);
        if (result) {
          console.log('  ✅ Response: "' + result.content.substring(0, 30) + '" (' + result.totalTokens + ' tok, ' + result.latency + 'ms, $' + result.cost.toFixed(6) + ')');
        }
        console.log('');
      }
      break;
    }

    case 'compare': {
      const query = args.slice(1).join(' ');
      if (!query) {
        console.error('Usage: npx a3m-router compare "your query here"');
        process.exit(1);
      }
      
      const providers = providerConfig.getAvailableProviders();
      console.log('\n🔄 A3M Router — Provider Comparison');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Query: "' + query + '"');
      console.log('');
      
      const results = [];
      for (const [id, provider] of Object.entries(providers)) {
        const model = provider.models[0];
        console.log('  Testing ' + (provider.name || id) + '...');
        const result = await callProvider(id, model, query, 100);
        if (result) {
          results.push({ id: provider.name || id, model, ...result });
        }
      }
      
      console.log('\n  Comparison:');
      console.log('  ──────────────────────────────────────────────────────────────');
      console.log('  Provider'.padEnd(18) + 'Response'.padEnd(40) + 'Time'.padEnd(12) + 'Cost');
      console.log('  ──────────────────────────────────────────────────────────────');
      for (const r of results) {
        console.log('  ' + r.id.padEnd(16) + r.content.substring(0, 38).padEnd(40) + (r.latency + 'ms').padEnd(12) + '$' + r.cost.toFixed(6));
      }
      console.log('');
      break;
    }

    case 'benchmark': {
      const queries = [
        'What is 2+2?',
        'Write a Python function to reverse a string.',
        'Translate "Hello" to French.',
        'Write a haiku about programming.',
        'What is SQL injection?',
      ];
      
      const providers = providerConfig.getAvailableProviders();
      console.log('\n📊 A3M Router — Provider Benchmark');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      for (const [id, provider] of Object.entries(providers)) {
        const model = provider.models[0];
        console.log('  ' + (provider.name || id).padEnd(15) + '(' + model + ')');
        
        let totalTime = 0;
        let totalCost = 0;
        
        for (const q of queries) {
          const r = await callProvider(id, model, q, 50);
          if (r) {
            totalTime += r.latency;
            totalCost += r.cost;
          }
        }
        
        console.log('    Total: ' + totalTime + 'ms, Cost: $' + totalCost.toFixed(6) + ', Avg: ' + (totalTime / queries.length).toFixed(0) + 'ms/query');
      }
      console.log('');
      break;
    }

    case 'route': {
      const query = args.slice(1).join(' ');
      if (!query) {
        console.error('Usage: npx a3m-router route "your query here"');
        process.exit(1);
      }
      const result = router.route(query);
      formatRoute(result);
      break;
    }

    case 'batch': {
      const queries = args.slice(1);
      if (queries.length === 0) {
        console.error('Usage: npx a3m-router batch "query1" "query2" ...');
        process.exit(1);
      }
      const results = router.routeBatch(queries);
      console.log('\n🔀 A3M Router — Batch Results');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      results.forEach(function(r, i) {
        console.log('  ' + (i + 1) + '. "' + queries[i].substring(0, 40) + '..." → ' + r.primary_model);
      });
      console.log('');
      break;
    }

    case 'recommend': {
      const task = args.slice(1).join(' ');
      if (!task) {
        console.error('Usage: npx a3m-router recommend "coding"');
        process.exit(1);
      }
      const rec = router.recommend(task);
      console.log('\n🎯 A3M Router — Recommendation');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(JSON.stringify(rec, null, 2));
      console.log('');
      break;
    }

    case 'status': {
      const providers = providerConfig.getAvailableProviders();
      console.log('\n📊 A3M Router — Status');
      console.log('━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Version:      1.9.0');
      console.log('  Exports:      74');
      console.log('  Providers:    ' + Object.keys(providers).length + ' configured');
      console.log('  Integrations: 116');
      console.log('  Keywords:     139');
      console.log('  Subpaths:     11');
      console.log('  Memory:       ✅ MemoryTree + AutoFetch + ObsidianVault');
      console.log('  Compression:  ✅ Enhanced + ISON');
      console.log('  Auth:         ✅ OAuth 2.0 + PKCE');
      console.log('  Cost:         ✅ Tracking + Budgets');
      console.log('  Cache:        ✅ Prefix + Response');
      console.log('  Routing:      ✅ RouteLLM + Adaptive');
      console.log('  Models known: ' + Object.keys(providerConfig._providers).length);
      console.log('');
      console.log('  Available Providers:');
      for (const [id, p] of Object.entries(providers)) {
        console.log('    ✅ ' + (p.name || id).padEnd(15) + '(' + p.models.length + ' models, type: ' + p.type + ')');
      }
      console.log('');
      break;
    }

    case 'cost': {
      const text = args.slice(1).join(' ') || 'Hello world this is a test';
      const tokens = countTokens(text);
      var completionTokens = Math.ceil(tokens * 1.5);
      var gpt4oCost = estimateCost(tokens, completionTokens, 'gpt-4o');
      var miniCost = estimateCost(tokens, completionTokens, 'gpt-4o-mini');
      var haikuCost = estimateCost(tokens, completionTokens, 'claude-3-haiku');
      var geminiCost = estimateCost(tokens, completionTokens, 'gemini-2.0-flash');
      console.log('\n💰 A3M Router — Cost Estimate');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  Text:         "' + text.substring(0, 50) + '"');
      console.log('  Tokens:       ' + tokens);
      console.log('  GPT-4o:       $' + gpt4oCost.toFixed(6));
      console.log('  GPT-4o-mini:  $' + miniCost.toFixed(6));
      console.log('  Claude Haiku: $' + haikuCost.toFixed(6));
      console.log('  Gemini Flash: $' + geminiCost.toFixed(6));
      if (gpt4oCost > 0) {
        var savings = ((1 - miniCost / gpt4oCost) * 100).toFixed(1);
        console.log('  Savings:      ' + savings + '% (mini vs GPT-4o)');
      }
      console.log('');
      break;
    }

    case 'models': {
      const allProviders = providerConfig._providers;
      console.log('\n📋 A3M Router — All Known Models');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      for (const [id, provider] of Object.entries(allProviders)) {
        if (!provider.models || provider.models.length === 0) continue;
        console.log('  ' + (provider.name || id).padEnd(15) + '(Priority: ' + provider.priority + ', Type: ' + provider.type + ')');
        for (const m of provider.models) {
          const cost = provider.costPerK;
          console.log('    ' + m.padEnd(40) + 'in:$' + (cost ? cost.input : 0) + ' out:$' + (cost ? cost.output : 0));
        }
        console.log('');
      }
      break;
    }

    case 'token': {
      const text = args.slice(1).join(' ');
      if (!text) {
        console.error('Usage: npx a3m-router token "your text here"');
        process.exit(1);
      }
      const tokens = countTokens(text);
      console.log('  "' + text + '" → ' + tokens + ' tokens');
      break;
    }

    case 'register': {
      const id = args[1];
      const config = JSON.parse(args.slice(2).join(' '));
      registerProvider(id, config);
      providerConfig.saveConfig();
      console.log('✅ Registered provider: ' + id);
      console.log('  Config saved to: ~/.config/a3m-router/providers.json');
      break;
    }

    case 'memory': {
      const subcmd = args[1];
      if (subcmd === 'add') {
        const text = args.slice(2).join(' ');
        router.memory.add(text, { metadata: { cli: true } });
        console.log('  ✅ Added to memory: "' + text.substring(0, 50) + '"');
      } else if (subcmd === 'search') {
        const query = args.slice(2).join(' ');
        const results = router.memory.search(query);
        console.log('  Found ' + results.length + ' results for "' + query + '"');
        results.forEach(function(r, i) {
          var content = r.content ? r.content.substring(0, 60) : JSON.stringify(r).substring(0, 60);
          console.log('  ' + (i + 1) + '. ' + content);
        });
      } else {
        const stats = router.memory.getStats();
        console.log('\n🧠 A3M Router — Memory Stats');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(JSON.stringify(stats, null, 2));
      }
      break;
    }

    case 'health': {
      console.log('\n🏥 A3M Router — Provider Health Check');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const providers = providerConfig.getAvailableProviders();
      for (const [id, provider] of Object.entries(providers)) {
        try {
          const health = await providerConfig.healthCheck(id);
          console.log('  ' + (health.healthy ? '✅' : '❌') + ' ' + (provider.name || id).padEnd(15) + health.healthy ? 'Healthy' : health.error);
        } catch (e) {
          console.log('  ❌ ' + (provider.name || id).padEnd(15) + e.message.substring(0, 60));
        }
      }
      console.log('');
      break;
    }

    case 'serve': {
      if (!createProxyServer) {
        console.error('\n  Error: Server module not available.');
        console.error('  Build first: npm run build');
        console.error('  Or use directly: node -e "require(\'./server/proxyServer.js\').createProxyServer()"\n');
        process.exit(1);
      }

      // Parse --port argument
      var portArg = args.indexOf('--port');
      var port = undefined;
      if (portArg !== -1 && args[portArg + 1]) {
        port = parseInt(args[portArg + 1], 10);
        if (isNaN(port)) {
          console.error('  Error: --port must be a number');
          process.exit(1);
        }
      }

      console.log('\n  Starting A3M Router Proxy Server...');
      createProxyServer(port);
      break;
    }

    default:
      console.log('\n🔀 A3M Router — Adaptive Memory Multi-Model Router');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('  Commands:');
      console.log('    serve [--port 8787]    Start OpenAI-compatible proxy server');
      console.log('    route <query>          Route query to best provider');
      console.log('    batch <q1> <q2>..      Route multiple queries');
      console.log('    compare <query>        Compare providers side by side');
      console.log('    benchmark              Benchmark all providers');
      console.log('    recommend <task>       Get model recommendation');
      console.log('    cost [text]            Estimate token cost across models');
      console.log('    models                 List all known models + pricing');
      console.log('    providers              List configured providers');
      console.log('    test                   Test all provider connectivity');
      console.log('    health                 Quick health check for all providers');
      console.log('    token <text>           Count tokens');
      console.log('    memory add <text>      Add to memory tree');
      console.log('    memory search <q>      Search memory');
      console.log('    memory                 Show memory stats');
      console.log('    register <id> <cfg>    Register new provider');
      console.log('    status                 Show router status');
      console.log('');
      console.log('  Config: ~/.config/a3m-router/providers.json');
      console.log('  Env:    GROQ_API_KEY, CEREBRAS_API_KEY, MISTRAL_API_KEY, etc.');
      console.log('');
      console.log('  Examples:');
      console.log('    npx a3m-router serve                        # Start proxy on :8787');
      console.log('    npx a3m-router serve --port 3000            # Start proxy on :3000');
      console.log('    npx a3m-router route "Write a Python function to sort"');
      console.log('    npx a3m-router compare "What is 2+2?"');
      console.log('    npx a3m-router providers');
      console.log('    npx a3m-router test');
      console.log('');
  }
}

main().catch(function(err) {
  console.error('Error:', err.message);
  process.exit(1);
});
