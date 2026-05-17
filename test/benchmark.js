#!/usr/bin/env node
/**
 * A3M Router - Provider Benchmark
 * 
 * Benchmarks all available providers across:
 * - Latency (response time)
 * - Cost (per 1K tokens)
 * - Quality (simple factual questions)
 * - Cost-effectiveness (quality per dollar)
 */

const { execSync } = require('child_process');
const {
  getAvailableProviders,
  providerConfig,
  countTokens,
  estimateCost,
} = require('../dist/index.js');

// Benchmark configuration
const CONFIG = {
  timeout: 60000,
  maxTokens: 50,
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
  json: process.argv.includes('--json'),
  provider: process.argv.find(arg => arg.startsWith('--provider='))?.split('=')[1],
};

// Test queries for different scenarios
const QUERIES = {
  simple: 'What is 2+2?',
  code: 'Write a Python function to reverse a string.',
  math: 'Calculate the square root of 144.',
  creative: 'Write a haiku about programming.',
  reasoning: 'Explain why the sky is blue.',
};

// Results storage
const results = [];

// Helper: Call a provider
async function callProvider(id, provider, query) {
  const model = provider.models[0];
  const startTime = Date.now();
  
  try {
    if (provider.type === 'cli') {
      // CLI provider
      if (id === 'commandcode') {
        const raw = execSync(`commandcode -p "${query.replace(/"/g, '\\"')}" --skip-onboarding 2>&1`, { 
          timeout: CONFIG.timeout, 
          encoding: 'utf-8' 
        });
        const content = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
        const latency = Date.now() - startTime;
        const tokens = Math.ceil(content.length / 4);
        return {
          content: content.substring(0, 200),
          tokens,
          cost: 0,
          latency,
          success: true,
        };
      } else {
        // Generic CLI
        const raw = execSync(`${provider.cliCommand} run "${query.replace(/"/g, '\\"')}" 2>&1`, { 
          timeout: CONFIG.timeout, 
          encoding: 'utf-8' 
        });
        const lines = raw.replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(l => l.trim() && !l.startsWith('>'));
        const content = lines.join(' ').trim();
        const latency = Date.now() - startTime;
        const tokens = Math.ceil(content.length / 4);
        return {
          content: content.substring(0, 200),
          tokens,
          cost: 0,
          latency,
          success: true,
        };
      }
    }
    
    // API provider
    if (!provider.apiKey) {
      return { error: 'No API key', success: false };
    }
    
    const resp = await fetch(provider.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: query }],
        max_tokens: CONFIG.maxTokens,
      }),
    });
    
    const latency = Date.now() - startTime;
    const data = await resp.json();
    
    if (data.error) {
      return { error: data.error.message, success: false };
    }
    
    const content = data.choices?.[0]?.message?.content || '';
    const promptTokens = data.usage?.prompt_tokens || countTokens(query);
    const completionTokens = data.usage?.completion_tokens || countTokens(content);
    const cost = (promptTokens / 1000 * provider.costPerK.input) + 
                 (completionTokens / 1000 * provider.costPerK.output);
    
    return {
      content: content.substring(0, 200),
      tokens: promptTokens + completionTokens,
      cost,
      latency,
      success: true,
    };
    
  } catch (e) {
    return { error: e.message, success: false };
  }
}

// Helper: Check answer quality (simple heuristic)
function checkQuality(query, response) {
  const lower = response.toLowerCase();
  
  if (query.includes('2+2')) {
    return lower.includes('4') ? 1 : 0;
  }
  if (query.includes('square root of 144')) {
    return lower.includes('12') ? 1 : 0;
  }
  if (query.includes('reverse a string')) {
    return lower.includes('def') || lower.includes('function') ? 1 : 0;
  }
  if (query.includes('haiku')) {
    // Check for 3 lines (rough haiku check)
    const lines = response.split('\n').filter(l => l.trim());
    return lines.length >= 2 ? 1 : 0;
  }
  
  // Default: check for reasonable length
  return response.length > 20 ? 0.8 : 0.5;
}

// Main benchmark
async function runBenchmark() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 A3M Router - Provider Benchmark');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const providers = getAvailableProviders();
  const providerList = CONFIG.provider 
    ? [[CONFIG.provider, providers[CONFIG.provider]]].filter(([_, p]) => p)
    : Object.entries(providers);
  
  if (providerList.length === 0) {
    console.log('❌ No providers available. Configure API keys in ~/.config/a3m-router/providers.json');
    process.exit(1);
  }
  
  console.log(`Testing ${providerList.length} provider(s)...\n`);
  
  for (const [id, provider] of providerList) {
    if (CONFIG.verbose) {
      console.log(`Testing ${provider.name}...`);
    }
    
    const providerResults = {
      id,
      name: provider.name,
      type: provider.type,
      model: provider.models[0],
      queries: {},
    };
    
    for (const [queryType, query] of Object.entries(QUERIES)) {
      if (CONFIG.verbose) {
        console.log(`  ${queryType}: "${query.substring(0, 40)}..."`);
      }
      
      const result = await callProvider(id, provider, query);
      
      if (result.success) {
        result.quality = checkQuality(query, result.content);
        result.costEffectiveness = result.cost > 0 
          ? result.quality / result.cost 
          : result.quality * 1000; // Free providers get high score
      }
      
      providerResults.queries[queryType] = result;
    }
    
    // Calculate averages
    const successful = Object.values(providerResults.queries).filter(r => r.success);
    if (successful.length > 0) {
      providerResults.avgLatency = successful.reduce((a, r) => a + r.latency, 0) / successful.length;
      providerResults.avgCost = successful.reduce((a, r) => a + r.cost, 0) / successful.length;
      providerResults.avgQuality = successful.reduce((a, r) => a + r.quality, 0) / successful.length;
      providerResults.avgCostEffectiveness = successful.reduce((a, r) => a + r.costEffectiveness, 0) / successful.length;
    }
    
    results.push(providerResults);
  }
  
  // Output results
  if (CONFIG.json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printResults(results);
  }
}

function printResults(results) {
  // Summary table
  console.log('┌─────────────────────────────────────────────────────────────────────────────┐');
  console.log('│ Provider          Type    Model                    Latency  Cost    Quality │');
  console.log('├─────────────────────────────────────────────────────────────────────────────┤');
  
  // Sort by cost-effectiveness
  const sorted = [...results].sort((a, b) => (b.avgCostEffectiveness || 0) - (a.avgCostEffectiveness || 0));
  
  for (const r of sorted) {
    const name = r.name.substring(0, 17).padEnd(17);
    const type = r.type.padEnd(7);
    const model = (r.model || 'N/A').substring(0, 22).padEnd(22);
    const latency = r.avgLatency ? `${Math.round(r.avgLatency)}ms`.padEnd(8) : 'N/A     ';
    const cost = r.avgCost !== undefined ? `$${r.avgCost.toFixed(4)}`.padEnd(7) : 'N/A    ';
    const quality = r.avgQuality ? `${(r.avgQuality * 100).toFixed(0)}%`.padEnd(7) : 'N/A    ';
    
    console.log(`│ ${name} ${type} ${model} ${latency} ${cost} ${quality} │`);
  }
  
  console.log('└─────────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  
  // Rankings
  console.log('🏆 Rankings:');
  console.log('─────────────────────────────────────────────────────────────');
  
  // Fastest
  const fastest = [...results].filter(r => r.avgLatency).sort((a, b) => a.avgLatency - b.avgLatency)[0];
  if (fastest) {
    console.log(`  ⚡ Fastest:      ${fastest.name} (${Math.round(fastest.avgLatency)}ms avg)`);
  }
  
  // Cheapest
  const cheapest = [...results].filter(r => r.avgCost !== undefined).sort((a, b) => a.avgCost - b.avgCost)[0];
  if (cheapest) {
    console.log(`  💰 Cheapest:     ${cheapest.name} ($${cheapest.avgCost.toFixed(6)} avg)`);
  }
  
  // Best quality
  const bestQuality = [...results].filter(r => r.avgQuality).sort((a, b) => b.avgQuality - a.avgQuality)[0];
  if (bestQuality) {
    console.log(`  🎯 Best Quality: ${bestQuality.name} (${(bestQuality.avgQuality * 100).toFixed(0)}% correct)`);
  }
  
  // Best cost-effectiveness
  const bestValue = sorted[0];
  if (bestValue) {
    console.log(`  ⭐ Best Value:   ${bestValue.name} (quality/$)`);
  }
  
  console.log('');
  
  // Detailed results
  if (CONFIG.verbose) {
    console.log('📋 Detailed Results:');
    console.log('─────────────────────────────────────────────────────────────');
    
    for (const r of results) {
      console.log(`\n${r.name} (${r.type}):`);
      
      for (const [queryType, result] of Object.entries(r.queries)) {
        if (result.success) {
          console.log(`  ${queryType.padEnd(10)} ${result.latency}ms  $${result.cost.toFixed(6)}  Q:${(result.quality * 100).toFixed(0)}%  "${result.content.substring(0, 50)}..."`);
        } else {
          console.log(`  ${queryType.padEnd(10)} ❌ ${result.error || 'Failed'}`);
        }
      }
    }
  }
  
  console.log('');
}

// Run benchmark
runBenchmark().catch(e => {
  console.error('Benchmark failed:', e.message);
  process.exit(1);
});
