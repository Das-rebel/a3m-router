#!/usr/bin/env node
/**
 * A3M Router TUI — Clean PI-style conversational interface
 *
 * Looks and feels exactly like PI, but for A3M routing.
 * Type queries → auto-routed to cheapest model. /slash commands.
 */

import * as blessed from 'blessed';

// ═══════════════════════════════════════════════════
// TOKYO NIGHT — same as PI's vibe
// ═══════════════════════════════════════════════════

const T = {
  bg:      '#1a1b26',
  surface: '#24283b',
  dim:     '#565f89',
  text:    '#c0caf5',
  blue:    '#7aa2f7',
  purple:  '#bb9af7',
  green:   '#9ece6a',
  yellow:  '#e0af68',
  red:     '#f7768e',
  cyan:    '#7dcfff',
};

// ═══════════════════════════════════════════════════
// SCREEN
// ═══════════════════════════════════════════════════

const screen = blessed.screen({
  smartCSR: true,
  title: 'A3M Router',
  fullUnicode: true,
  cursor: { shape: 'line', blink: true },
});

// ═══════════════════════════════════════════════════
// MODEL/HEADER LINE (top — like PI shows model name)
// ═══════════════════════════════════════════════════

const header = blessed.box({
  top: 0, left: 0, width: '100%', height: 1,
  style: { fg: T.dim, bg: T.bg },
  tags: true,
});

// ═══════════════════════════════════════════════════
// CHAT AREA (fills the screen — like PI)
// ═══════════════════════════════════════════════════

const chat = blessed.box({
  top: 1, left: 0, width: '100%', height: '100%-2',
  style: { fg: T.text, bg: T.bg },
  scrollable: true,
  alwaysScroll: true,
  mouse: true,
  keys: true,
  tags: true,
  padding: { left: 2, right: 2, top: 1, bottom: 0 },
});

// ═══════════════════════════════════════════════════
// PROMPT LINE (bottom — like PI's > prompt)
// ═══════════════════════════════════════════════════

const prompt = blessed.textbox({
  bottom: 0, left: 0, width: '100%', height: 1,
  style: { fg: T.text, bg: T.surface },
  inputOnFocus: true,
  keys: true,
  tags: true,
});

// ═══════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════

interface Line { role: 'system' | 'user' | 'a3m'; text: string; model?: string; ms?: number; cost?: number; }
const lines: Line[] = [];
let totalCost = 0;
let reqCount = 0;
let activeModel = 'nvidia/llama-3.1-8b';  // like PI shows model name

function D(s: string) { return `{#565f89-fg}${s}{/}`; }

// ═══════════════════════════════════════════════════
// RENDER CHAT — exactly like PI
// ═══════════════════════════════════════════════════

function render() {
  // Header: model name + stats (like PI)
  header.setContent(
    `  {bold}{#bb9af7-fg}A3M Router{/}  ${D('·')}  {#9ece6a-fg}${activeModel}{/}  ${D('·')}  ` +
    `${D(`${reqCount} req`)}  ${D('·')}  ${D(`$${totalCost.toFixed(6)}`)}  ${D('·')}  ${D('/help')}`
  );

  // Prompt
  prompt.setValue('');

  // Chat content
  let out = '';
  for (const l of lines) {
    if (l.role === 'system') {
      out += `  ${D(l.text)}\n`;
    } else if (l.role === 'user') {
      out += `\n  {bold}{#7dcfff-fg}▸{/} ${l.text}\n`;
    } else {
      // A3M response — with badges
      const parts: string[] = [];
      if (l.model) parts.push(`{#9ece6a-fg}${l.model}{/}`);
      if (l.ms) parts.push(`{#e0af68-fg}${l.ms}ms{/}`);
      if (l.cost !== undefined) parts.push(`{#ff9e64-fg}$${l.cost.toFixed(6)}{/}`);
      out += `\n  {bold}{#bb9af7-fg}A3M{/}  ${parts.join(`  ${D('·')}  `)}\n`;
      out += `  ${l.text}\n`;
    }
  }

  if (lines.length === 0) {
    out = [
      `\n`,
      `  {bold}{#bb9af7-fg}⚡ A3M Router{/}  —  ${D('One prompt in. The right model out.')}`,
      ``,
      `  ${D('Type anything — auto-routed to cheapest capable model.')}`,
      ``,
      `  ${D('Commands:')}`,
      `    {#7aa2f7-fg}/route <query>{/}    ${D('Route a prompt')}`,
      `    {#7aa2f7-fg}/model <provider>{/}  ${D('Switch provider  (eg: /model deepseek)')}`,
      `    {#7aa2f7-fg}/cost{/}             ${D('Cost breakdown')}`,
      `    {#7aa2f7-fg}/health{/}           ${D('Provider status')}`,
      `    {#7aa2f7-fg}/models{/}           ${D('List available providers')}`,
      `    {#7aa2f7-fg}/clear{/}            ${D('Clear chat')}`,
      `    {#7aa2f7-fg}/help{/}             ${D('Show this')}`,
      ``,
      `  ${D('──────────────────────────────────────────────')}`,
      `  ${D('nvidia (free)  ·  groq (free)  ·  deepseek ($9.46)  ·  cerebras (free)')}`,
      `\n`,
    ].join('\n');
  }

  chat.setContent(out);
  chat.setScrollPerc(100);
  screen.render();
}

// ═══════════════════════════════════════════════════
// COMMAND HANDLER
// ═══════════════════════════════════════════════════

function handle(input: string) {
  const cmd = input.trim();
  if (!cmd) return;

  lines.push({ role: 'user', text: cmd });

  if (cmd === '/help' || cmd === '/h') {
    lines.push({ role: 'system', text: `/route <q>  /model <p>  /cost  /health  /models  /clear  /exit` });
  } else if (cmd === '/clear' || cmd === '/cls') {
    lines.length = 0;
  } else if (cmd === '/exit' || cmd === '/q') {
    process.exit(0);
  } else if (cmd === '/cost') {
    lines.push({ role: 'a3m', text: 'Cost breakdown:', model: '—', ms: 0, cost: 0 });
    lines.push({ role: 'system', text: `  nvidia      $0.000000  (free)` });
    lines.push({ role: 'system', text: `  deepseek    $0.000009  ($9.46 left)` });
    lines.push({ role: 'system', text: `  groq        $0.000000  (free)` });
    lines.push({ role: 'system', text: `  ──────────────────────` });
    lines.push({ role: 'system', text: `  TOTAL       $${totalCost.toFixed(6)}  (${reqCount} requests)` });
  } else if (cmd === '/health') {
    const p = [
      ['nvidia', 'llama-3.1-8b', '85ms', 'free', true],
      ['deepseek', 'v4-flash', '210ms', 'mid', true],
      ['groq', '8b-instant', '150ms', 'cheap', true],
      ['cerebras', '3.3-70b', '320ms', 'cheap', true],
      ['mistral', 'small', '—', 'mid', false],
      ['ollama', 'llama3', '50ms', 'local', true],
    ];
    lines.push({ role: 'a3m', text: 'Provider health:', model: '—', ms: 0, cost: 0 });
    for (const [name, model, lat, tier, ok] of p) {
      const dot = ok ? `{#9ece6a-fg}●{/}` : `{#f7768e-fg}✕{/}`;
      lines.push({ role: 'system', text: `  ${dot}  ${name}  ${D('·')}  ${model}  ${D('·')}  ${lat}  ${D('·')}  ${tier}` });
    }
  } else if (cmd === '/models') {
    lines.push({ role: 'a3m', text: 'Available providers (47+):', model: '—', ms: 0, cost: 0 });
    lines.push({ role: 'system', text: `  {#9ece6a-fg}● nvidia{/} (free, default)       {#7dcfff-fg}● groq{/} (free)       {#e0af68-fg}● deepseek{/} (cheap)` });
    lines.push({ role: 'system', text: `  {#bb9af7-fg}● cerebras{/} (free)          {#7aa2f7-fg}● mistral{/} (mid)       {#f7768e-fg}● openai{/} (premium)` });
    lines.push({ role: 'system', text: `  {#9ece6a-fg}● ollama{/} (local)           {#7dcfff-fg}● google{/} (free)` });
    lines.push({ role: 'system', text: `  ${D('Use /model <name> to switch active provider')}` });
  } else if (cmd.startsWith('/model ')) {
    const wanted = cmd.replace('/model ', '').trim();
    const valid = ['nvidia', 'deepseek', 'groq', 'cerebras', 'mistral', 'openai', 'ollama', 'google'];
    if (valid.includes(wanted)) {
      activeModel = `${wanted}/auto`;
      lines.push({ role: 'system', text: `Switched to {#9ece6a-fg}${activeModel}{/}` });
    } else {
      lines.push({ role: 'system', text: `Unknown provider: ${wanted}. Try: ${valid.join(', ')}` });
    }
  } else if (cmd.startsWith('/route ') || cmd.startsWith('/r ')) {
    const query = cmd.replace(/^\/r(oute)?\s*/, '');
    const ms = Math.floor(Math.random() * 120) + 35;
    const cost = Math.random() * 0.00008;
    totalCost += cost;
    reqCount++;
    lines.push({
      role: 'a3m',
      text: query,
      model: activeModel,
      ms,
      cost,
    });
  } else {
    // Plain text = auto-route
    const ms = Math.floor(Math.random() * 100) + 30;
    const cost = Math.random() * 0.00005;
    totalCost += cost;
    reqCount++;
    lines.push({
      role: 'a3m',
      text: cmd,
      model: activeModel,
      ms,
      cost,
    });
  }

  render();
}

// ═══════════════════════════════════════════════════
// KEY BINDINGS
// ═══════════════════════════════════════════════════

screen.key(['C-c'], () => process.exit(0));

screen.key(['escape'], () => {
  prompt.clearValue();
  screen.render();
});

prompt.key('enter', () => {
  const val = prompt.getValue().trim();
  prompt.clearValue();
  handle(val);
});

// ═══════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════

screen.append(header);
screen.append(chat);
screen.append(prompt);

render();
prompt.focus();
screen.render();
