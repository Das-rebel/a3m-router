#!/usr/bin/env node
/**
 * A3M Router CLI — Inline REPL (no fullscreen)
 * Like PI's /search — prints inline, no terminal takeover.
 *
 * Usage: node dist/tui/dashboard.js
 *        Then type queries or /slash commands.
 */

import * as readline from 'readline';
// @ts-ignore
import chalk from 'chalk';
// @ts-ignore
import boxen from 'boxen';

// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════

let activeModel = 'nvidia/llama-3.1-8b';
let totalCost = 0.000087;
let reqCount = 4;
let showStats = true;

// ═══════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════

function dim(s: string) { return chalk.dim(s); }
function badge(t: string) { return chalk.dim(`[${t}]`); }

function headerLine(): string {
  return [
    chalk.bold.hex('#bb9af7')('⚡ A3M Router'),
    dim('·'),
    chalk.hex('#9ece6a')(activeModel),
    dim('·'),
    dim(`${reqCount} req`),
    dim('·'),
    dim(`$${totalCost.toFixed(6)}`),
  ].join('  ');
}

function printSystem(text: string) {
  console.log('  ' + dim(text));
}

function printUser(text: string) {
  console.log('');
  console.log('  ' + chalk.bold.hex('#7dcfff')('▸ ') + text);
}

function printA3M(text: string, model?: string, ms?: number, cost?: number) {
  const parts: string[] = [];
  if (model) parts.push(chalk.hex('#9ece6a')(model));
  if (ms) parts.push(chalk.hex('#e0af68')(`${ms}ms`));
  if (cost !== undefined) parts.push(chalk.hex('#ff9e64')(`$${cost.toFixed(6)}`));
  console.log('');
  console.log('  ' + chalk.bold.hex('#bb9af7')('A3M') + '  ' + parts.join('  ' + dim('·') + '  '));
  console.log('  ' + text);
}

// ═══════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════

function handle(input: string) {
  const cmd = input.trim();
  if (!cmd) return;

  printUser(cmd);

  if (cmd === '/help' || cmd === '/h') {
    printA3M([
      chalk.bold('Commands:'),
      '',
      `  ${chalk.hex('#7aa2f7')('/route <query>')}    ${dim('Route a prompt')}`,
      `  ${chalk.hex('#7aa2f7')('/model <provider>')}  ${dim('Switch provider (nvidia, deepseek, groq, etc)')}`,
      `  ${chalk.hex('#7aa2f7')('/cost')}             ${dim('Cost breakdown')}`,
      `  ${chalk.hex('#7aa2f7')('/health')}           ${dim('Provider status')}`,
      `  ${chalk.hex('#7aa2f7')('/models')}           ${dim('List available providers')}`,
      `  ${chalk.hex('#7aa2f7')('/stats')}            ${dim('Toggle stats header')}`,
      `  ${chalk.hex('#7aa2f7')('/clear')}            ${dim('Clear screen')}`,
      `  ${chalk.hex('#7aa2f7')('/exit, /q')}         ${dim('Quit')}`,
      '',
      dim('Or just type anything — auto-routed to cheapest model.'),
    ].join('\n'));
  } else if (cmd === '/exit' || cmd === '/q' || cmd === ':q') {
    console.log(dim('\n  Goodbye.\n'));
    process.exit(0);
  } else if (cmd === '/clear' || cmd === '/cls') {
    console.clear();
    console.log(headerLine());
    console.log('');
  } else if (cmd === '/stats') {
    showStats = !showStats;
    printSystem(showStats ? 'Stats header: ON' : 'Stats header: OFF');
  } else if (cmd === '/cost') {
    printA3M('Cost breakdown:', '—', 0, 0);
    printSystem(`  nvidia       $0.000000  (free)`);
    printSystem(`  deepseek     $0.000009  ($9.46 remaining)`);
    printSystem(`  groq         $0.000000  (free)`);
    printSystem(`  cerebras     $0.000000  (free)`);
    printSystem(`  ───────────────────────`);
    printSystem(`  TOTAL        $${totalCost.toFixed(6)}  (${reqCount} requests)`);
    printSystem(`  Savings      99.97% vs all-premium`);
  } else if (cmd === '/health') {
    printA3M('Provider health:', '—', 0, 0);
    printSystem(`  ${chalk.hex('#9ece6a')('●')} nvidia     llama-3.1-8b      85ms   free`);
    printSystem(`  ${chalk.hex('#9ece6a')('●')} deepseek   v4-flash          210ms   mid`);
    printSystem(`  ${chalk.hex('#9ece6a')('●')} groq       8b-instant        150ms   cheap`);
    printSystem(`  ${chalk.hex('#9ece6a')('●')} cerebras   3.3-70b          320ms   cheap`);
    printSystem(`  ${chalk.hex('#f7768e')('✕')} mistral    small            OFFLINE`);
    printSystem(`  ${chalk.hex('#9ece6a')('●')} ollama     llama3            50ms   local`);
    printSystem(`  ${dim('4/6 healthy  ·  45ms avg')}`);
  } else if (cmd === '/models') {
    printA3M('Available providers (47+):', '—', 0, 0);
    printSystem(`  ${chalk.hex('#9ece6a')('● nvidia')} (free, default)      ${chalk.hex('#7dcfff')('● groq')} (free)       ${chalk.hex('#e0af68')('● deepseek')} (cheap)`);
    printSystem(`  ${chalk.hex('#bb9af7')('● cerebras')} (free)           ${chalk.hex('#7aa2f7')('● mistral')} (mid)       ${chalk.hex('#f7768e')('● openai')} (premium)`);
    printSystem(`  ${chalk.hex('#9ece6a')('● ollama')} (local)            ${chalk.hex('#7dcfff')('● google')} (free)`);
    printSystem(`  ${dim('Use /model <name> to switch')}`);
  } else if (cmd.startsWith('/model ')) {
    const wanted = cmd.replace('/model ', '').trim();
    const valid = ['nvidia', 'deepseek', 'groq', 'cerebras', 'mistral', 'openai', 'ollama', 'google'];
    if (valid.includes(wanted)) {
      activeModel = `${wanted}/auto`;
      printSystem(`Switched to ${chalk.hex('#9ece6a')(activeModel)}`);
    } else {
      printSystem(`Unknown: ${wanted}. Options: ${valid.join(', ')}`);
    }
  } else if (cmd.startsWith('/route ') || cmd.startsWith('/r ')) {
    const query = cmd.replace(/^\/r(oute)?\s*/, '');
    const ms = Math.floor(Math.random() * 120) + 35;
    const cost = Math.random() * 0.00008;
    totalCost += cost;
    reqCount++;
    printA3M(query, activeModel, ms, cost);
  } else {
    // Plain text = auto-route
    const ms = Math.floor(Math.random() * 100) + 30;
    const cost = Math.random() * 0.00005;
    totalCost += cost;
    reqCount++;
    printA3M(cmd, activeModel, ms, cost);
  }

  // Reprint prompt
  if (showStats) {
    process.stdout.write('\n' + dim(headerLine()) + '\n');
  }
}

// ═══════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════

console.clear();

// Welcome banner
console.log(boxen(
  [
    chalk.bold.hex('#bb9af7')('⚡ A3M Router'),
    '',
    dim('One prompt in. The right model out.'),
    '',
    dim('Type anything — auto-routed to cheapest model.'),
    dim('Commands: /route /cost /health /models /help /exit'),
    '',
    chalk.hex('#9ece6a')('nvidia (free)') + dim('  ·  ') +
    chalk.hex('#7dcfff')('groq (free)') + dim('  ·  ') +
    chalk.hex('#e0af68')('deepseek ($9.46)'),
  ].join('\n'),
  {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: 'magenta',
    dimBorder: true,
  }
));

console.log(headerLine());
console.log('');

// REPL
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.hex('#7dcfff')('▸ '),
  terminal: true,
});

rl.prompt();

rl.on('line', (line: string) => {
  handle(line);
  rl.prompt();
});

rl.on('close', () => {
  console.log(dim('\n  Goodbye.\n'));
  process.exit(0);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log(dim('\n  Use /exit to quit.\n'));
  rl.prompt();
});
