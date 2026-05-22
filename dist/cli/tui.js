#!/usr/bin/env node
/**
 * A3M Router Quick TUI
 * Single-command experience - no setup needed
 */

const { routeQuery } = require('./index.js');

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
╔══════════════════════════════════════════════╗
║         🔀 A3M Router — Zero Config          ║
╠══════════════════════════════════════════════╣
║                                              ║
║  One prompt in. The right model out.         ║
║                                              ║
║  Usage:                                      ║
║    a3m hello world      # Route a query       ║
║    a3m --serve         # Start proxy server  ║
║    a3m --setup        # Configure providers  ║
║    a3m --demo         # Try without API key  ║
║                                              ║
╚══════════════════════════════════════════════╝
`);
  process.exit(0);
}

const command = args[0];

// Demo mode - works without API key
if (command === '--demo') {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎮  A3M Router Demo Mode
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No API key needed - using mock responses.

Try these queries:
  • "Write Python code to sort a list"
  • "Explain quantum physics"  
  • "Translate to Japanese: Hello"
  • "Write a haiku about coding"

Type 'exit' to quit.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
  
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const demoResponses = {
    code: { provider: 'groq', model: 'llama-3.3-70b-versatile', tier: 'free', cost: '$0.0001' },
    explain: { provider: 'deepseek', model: 'deepseek-chat-v3', tier: 'cheap', cost: '$0.0003' },
    translate: { provider: 'kimi', model: 'moonshot-v1-8k', tier: 'cheap', cost: '$0.0002' },
    haiku: { provider: 'openai', model: 'gpt-4o-mini', tier: 'paid', cost: '$0.001' },
  };
  
  function routeDemo(query) {
    const lower = query.toLowerCase();
    if (lower.includes('code') || lower.includes('python') || lower.includes('javascript')) {
      return demoResponses.code;
    }
    if (lower.includes('explain') || lower.includes('what') || lower.includes('how')) {
      return demoResponses.explain;
    }
    if (lower.includes('translate') || lower.includes('japanese') || lower.includes('chinese')) {
      return demoResponses.translate;
    }
    return demoResponses.haiku;
  }
  
  function askQuestion() {
    rl.question('\n🔀 Query: ', (query) => {
      if (!query || query.toLowerCase() === 'exit') {
        console.log('\n👋 Thanks for trying A3M Router!\n');
        rl.close();
        return;
      }
      
      const result = routeDemo(query);
      console.log(`
┌─────────────────────────────────────┐
│  🏆 Best: ${result.provider.padEnd(12)} ${result.model}
│  💰 Cost: ${result.cost.padEnd(12)} (${result.tier})
│  📊 Confidence: 95%
└─────────────────────────────────────┘
  `);
      
      askQuestion();
    });
  }
  
  askQuestion();
  return;
}

// Serve mode
if (command === '--serve') {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  Starting A3M Router Proxy Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server: http://localhost:8787
API: OpenAI-compatible (/v1/chat/completions)

Configure providers first: a3m --setup
Or set API keys in environment and run: a3m --serve
`);
  
  try {
    const server = require('./server/proxyServer.js');
    const port = args[1] || 8787;
    server.createProxyServer({ port: parseInt(port) });
    console.log(`\n✅ Server running on port ${port}`);
  } catch (e) {
    console.log('\n⚠️  Server module not compiled yet');
    console.log('   Run: npm run build   first\n');
  }
  return;
}

// Setup mode
if (command === '--setup') {
  const wizard = require('./cli/setupWizard.js');
  wizard.runWizard();
  return;
}

// Default: route the query
const query = args.join(' ');

console.log('\n🔀 Routing: "' + query + '"');

routeQuery(query).then(result => {
  console.log(`
┌─────────────────────────────────────┐
│  🏆 Provider: ${result.provider || 'unknown'}
│  🤖 Model:   ${result.model || 'N/A'}
│  💰 Est Cost: ${result.estimated_cost ? '$' + result.estimated_cost.toFixed(6) : 'N/A'}
│  📊 Tier:    ${result.tier || 'N/A'}
└─────────────────────────────────────┘
  `);
}).catch(err => {
  console.log('\n⚠️  Error:', err.message);
  console.log('\nTip: Run "a3m --setup" to configure API keys\n');
});