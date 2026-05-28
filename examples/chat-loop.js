#!/usr/bin/env node
/**
 * chat-loop.js — Interactive terminal chat loop with auto-routing,
 * cost tracking, and guardrails.
 *
 * A full-featured REPL that routes each message through A3M,
 * tracks cumulative cost, and checks input/output safety.
 *
 * Usage:
 *   node examples/chat-loop.js
 *
 * Commands in chat:
 *   /cost     — Show current session cost
 *   /route    — Show the route decision for the last query
 *   /providers — List available providers
 *   /clear    — Reset conversation and cost
 *   /help     — Show commands
 *   /quit     — Exit
 */

const readline = require('readline');
const {
  routeQuery,
  extractQueryFeatures,
  CostTracker,
  GuardrailEngine,
  getAvailableProviders,
  findCheapestAvailableProvider,
  findFastestAvailableProvider,
} = require('../dist/index.js');

class ChatLoop {
  constructor() {
    this.costTracker = new CostTracker({ daily_limit: 1.0 }); // $1/day soft limit
    this.guardrails = new GuardrailEngine({
      promptInjection: true,
      piiDetection: true,
      contentFilter: true,
      maxLength: 4000,
      languageDetection: false,
      outputFilter: false,
      outputPII: false,
      hallucinationCheck: false,
    });
    this.history = [];
    this.lastDecision = null;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '\x1b[36mA3M> \x1b[0m',
    });
  }

  start() {
    console.log('');
    console.log('  A3M Router — Interactive Chat');
    console.log('  ' + '-'.repeat(36));
    console.log('  Type a message to route it through A3M.');
    console.log('  Type /help for commands.');
    console.log('');

    this.rl.prompt();

    this.rl.on('line', async (line) => {
      const input = line.trim();
      if (!input) { this.rl.prompt(); return; }

      if (input.startsWith('/')) {
        await this.handleCommand(input);
      } else {
        await this.handleMessage(input);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log('\nGoodbye!');
      this.printCostSummary();
      process.exit(0);
    });
  }

  async handleCommand(cmd) {
    switch (cmd) {
      case '/cost':
        this.printCostSummary();
        break;

      case '/route':
        if (this.lastDecision) {
          console.log('  Last route decision:');
          console.log('    Model:      ', this.lastDecision.primary_model);
          console.log('    Confidence: ', (this.lastDecision.confidence * 100).toFixed(1) + '%');
          console.log('    Cost:       $', this.lastDecision.estimated_cost.toFixed(6));
          console.log('    Reasoning:  ', this.lastDecision.reasoning);
        } else {
          console.log('  No messages routed yet.');
        }
        break;

      case '/providers':
        const providers = getAvailableProviders();
        const entries = Object.entries(providers);
        console.log('  Available providers (' + entries.length + '):');
        for (const [id, p] of entries.slice(0, 10)) {
          const cheap = findCheapestAvailableProvider(id);
          const fast = findFastestAvailableProvider();
          console.log(`    ${id.padEnd(16)} tier=${p.tier.padEnd(10)} models=${p.models.length}`);
        }
        if (entries.length > 10) {
          console.log(`    ... and ${entries.length - 10} more`);
        }
        break;

      case '/clear':
        this.history = [];
        this.costTracker.reset();
        this.lastDecision = null;
        console.log('  Session cleared.');
        break;

      case '/help':
        console.log('  Commands:');
        console.log('    /cost       — Show session cost');
        console.log('    /route      — Show last route decision');
        console.log('    /providers  — List available providers');
        console.log('    /clear      — Reset conversation');
        console.log('    /help       — This message');
        console.log('    /quit       — Exit');
        break;

      case '/quit':
        this.rl.close();
        break;

      default:
        console.log('  Unknown command. Type /help.');
    }
  }

  async handleMessage(text) {
    // 1. Guardrails — check input safety
    const inputCheck = await this.guardrails.checkInput(text);
    if (inputCheck.blocked) {
      console.log(`  \x1b[31m[BLOCKED]\x1b[0m ${inputCheck.reason || 'Input rejected by guardrails'}`);
      return;
    }

    const safeText = inputCheck.modified || text;

    // 2. Extract features
    const features = extractQueryFeatures(safeText);
    const complexityLabel = features.complexity < 0.2 ? 'simple' :
                            features.complexity < 0.45 ? 'moderate' :
                            features.complexity < 0.65 ? 'complex' : 'expert';

    // 3. Route the query
    this.lastDecision = routeQuery(safeText);

    console.log(`  [${complexityLabel}] -> ${this.lastDecision.primary_model} (${(this.lastDecision.confidence * 100).toFixed(0)}% conf, $${this.lastDecision.estimated_cost.toFixed(6)})`);

    // 4. Record cost
    this.costTracker.record(
      this.lastDecision.primary_model.split('/')[0] || 'unknown',
      this.lastDecision.primary_model,
      Math.ceil(safeText.length / 4),
      100 // estimated output tokens
    );

    // 5. Track history
    this.history.push({ role: 'user', content: safeText });

    // 6. Check budget
    const summary = this.costTracker.getSummary();
    const remaining = this.costTracker.getRemainingBudget();
    if (remaining.daily !== null && remaining.daily < 0.05) {
      console.log(`  \x1b[33m[WARN]\x1b[0m Daily budget nearly exhausted: $${remaining.daily.toFixed(4)} remaining`);
    }
  }

  printCostSummary() {
    const summary = this.costTracker.getSummary();
    const remaining = this.costTracker.getRemainingBudget();
    console.log('  -- Cost Summary --');
    console.log('  Total spent:     $' + summary.total_cost.toFixed(6));
    console.log('  Requests:        ', summary.request_count);
    console.log('  Avg/request:     $' + summary.average_cost_per_request.toFixed(6));
    console.log('  Daily remaining: $' + (remaining.daily !== null ? remaining.daily.toFixed(6) : 'unlimited'));
    console.log('  Monthly remain:  $' + (remaining.monthly !== null ? remaining.monthly.toFixed(6) : 'unlimited'));
    if (Object.keys(summary.by_provider).length > 0) {
      console.log('  By provider:');
      for (const [prov, cost] of Object.entries(summary.by_provider)) {
        console.log(`    ${prov}: $${cost.toFixed(6)}`);
      }
    }
  }
}

// Start the chat loop
const chat = new ChatLoop();
chat.start();
