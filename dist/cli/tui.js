#!/usr/bin/env node
/**
 * A3M Router Quick TUI
 * Zero-config experience - no API key needed for free tier
 */

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
╔══════════════════════════════════════════════╗
║         🔀 A3M Router - Zero Config          ║
╠══════════════════════════════════════════════╣
║                                              ║
║  One prompt in. The right model out.         ║
║                                              ║
║  Usage:                                      ║
║    a3m hello world      # Route a query       ║
║    a3m --serve         # Start proxy          ║
║    a3m --setup        # Configure API keys   ║
║    a3m --demo         # Try without keys     ║
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

Try these queries:
  • "Write Python hello world"
  • "Explain quantum physics"
  • "Translate to Japanese: Hello"
  • "Write a haiku about coding"
`);
  
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  
  const demoResults = [
    { provider: 'groq', model: 'llama-3.3-70b-versatile', tier: 'free', cost: '$0.00' },
    { provider: 'deepseek', model: 'deepseek-chat-v3', tier: 'cheap', cost: '$0.00' },
    { provider: 'kimi', model: 'moonshot-v1-8k', tier: 'cheap', cost: '$0.00' },
    { provider: 'openai', model: 'gpt-4o-mini', tier: 'paid', cost: '$0.00' },
  ];
  
  let count = 0;
  function ask() {
    rl.question('\n🔀 Query: ', (q) => {
      if (!q || q.toLowerCase() === 'exit') {
        console.log('\n👋 Ready for the real thing? Run: npm install adaptive-memory-multi-model-router\n');
        rl.close();
        return;
      }
      const r = demoResults[count++ % demoResults.length];
      console.log(`\n  🏆 Best: ${r.provider} / ${r.model}`);
      console.log(`  💰 Cost: ${r.cost} (${r.tier})`);
      ask();
    });
  }
  ask();
  return;
}

// Serve mode
if (command === '--serve') {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀  A3M Router Proxy Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server: http://localhost:8787/v1/chat/completions
API: OpenAI-compatible

No API keys configured? Add free tier:
  GROQ_API_KEY=your_key npx a3m-router serve

Or run setup: a3m --setup
`);
  
  try {
    const server = require('./server/proxyServer.js');
    const port = parseInt(args[1]) || 8787;
    server.createProxyServer({ port });
    console.log(`\n✅ Server running at http://localhost:${port}`);
  } catch (e) {
    console.log('\n⚠️  Run "npm install" first, then "npm run build"\n');
  }
  return;
}

// Setup mode
if (command === '--setup') {
  const wizard = require('./cli/setupWizard.js');
  wizard.runWizard();
  return;
}

// Zero-config mode - route with free tier defaults
const query = args.join(' ');

// Check for GROQ_API_KEY first (free tier)
if (process.env.GROQ_API_KEY) {
  console.log('\n🔀 Routing: "' + query + '"');
  console.log('📡 Using free tier (Groq)...\n');
  
  // Quick route via groq
  const { routeQuery } = require('./index.js');
  routeQuery(query).then(r => {
    console.log(`  🏆 Provider: ${r.provider || 'groq'}`);
    console.log(`  🤖 Model: ${r.model || 'llama-3.3-70b-versatile'}`);
    console.log(`  💰 Est: $${(r.estimated_cost || 0.0001).toFixed(6)}`);
  }).catch(e => {
    console.log('  ⚠️  Error:', e.message);
    console.log('  Tip: Get free key at https://console.groq.com\n');
  });
  return;
}

// No API key - show helpful message
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  No API key detected
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A3M Router needs at least one API key to route queries.

🔥 FREE TIER OPTIONS:
  1. Groq (fastest, 1000+ req/day free)
     → https://console.groq.com/apikeys
     → Set: export GROQ_API_KEY=your_key

  2. Cerebras (fastest inference, free)
     → https://cerebras.ai/labs
     → Set: export CEREBRAS_API_KEY=your_key

  3. Google AI (Gemini, free tier)
     → https://aistudio.google.com/app/apikey
     → Set: export GOOGLE_API_KEY=your_key

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Quick setup: npx a3m --setup
Quick start: GROQ_API_KEY=your_key npx a3m-router serve
`);
