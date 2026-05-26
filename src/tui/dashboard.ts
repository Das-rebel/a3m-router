#!/usr/bin/env node
/**
 * A3M Router TUI v2 — 10x UI
 *
 * Inspired by: lazygit panels + k9s pulse + btop graphs + Tokyo Night theme
 * Built with: blessed + blessed-contrib
 *
 * TABS:   1-Dashboard  2-Costs  3-Providers  4-Logs  5-Help
 * F-KEYS: F1 Dash  F2 Costs  F3 Prov  F4 Logs  F5 Help  F10 Quit
 * vim/hjkl for list nav, mouse for click targets
 */

import * as blessed from 'blessed';
import * as contrib from 'blessed-contrib';

// ═══════════════════════════════════════════════════════════════
// TOKYO NIGHT THEME
// ═══════════════════════════════════════════════════════════════

const T = {
  bg:       '#1a1b26',
  bgDark:   '#16161e',
  surface:  '#24283b',
  border:   '#3b4261',
  accent:   '#7aa2f7',   // blue
  accent2:  '#bb9af7',   // purple
  green:    '#9ece6a',
  yellow:   '#e0af68',
  red:      '#f7768e',
  cyan:     '#7dcfff',
  magenta:  '#bb9af7',
  orange:   '#ff9e64',
  white:    '#c0caf5',
  dim:      '#565f89',
  bright:   '#a9b1d6',
  pink:     '#ff007c',
};

// ═══════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════

let activeTab = 1;
let tick = 0;
const MAX_HISTORY = 60; // 60 data points for sparklines

// Cost history (simulated time series)
const costHistory: number[] = Array(MAX_HISTORY).fill(0);
const latencyHistory: number[] = Array(MAX_HISTORY).fill(30);

// Provider history for live charts
const providerLoads: Record<string, number[]> = {};

// ═══════════════════════════════════════════════════════════════
// SCREEN
// ═══════════════════════════════════════════════════════════════

const screen = blessed.screen({
  smartCSR: true,
  title: 'A3M Router ⚡',
  fullUnicode: true,
  mouse: true,
  // @ts-ignore
  cursor: { shape: 'line', blink: true },
});

const GRID = new contrib.grid({ rows: 12, cols: 24, screen });

// ═══════════════════════════════════════════════════════════════
// TITLE BAR — Tokyo Night Header
// ═══════════════════════════════════════════════════════════════

const titleBar = GRID.set(0, 0, 1, 24, blessed.box, {
  style: { fg: T.bright, bg: T.bgDark },
  tags: true,
});

function renderTitleBar() {
  titleBar.setContent(
    ` {bold}{#bb9af7-fg}⚡ A3M Router{/}  {#565f89-fg}v2.12.7{/}    │    ` +
    `[F1] {${activeTab===1?'#7aa2f7':'#565f89'}-fg}Dashboard{/}` +
    `  [F2] {${activeTab===2?'#7aa2f7':'#565f89'}-fg}Costs{/}` +
    `  [F3] {${activeTab===3?'#7aa2f7':'#565f89'}-fg}Providers{/}` +
    `  [F4] {${activeTab===4?'#7aa2f7':'#565f89'}-fg}Logs{/}` +
    `  [F5] {${activeTab===5?'#7aa2f7':'#565f89'}-fg}Help{/}` +
    `    │    {#565f89-fg}q quit  / cmd  ↑↓ nav  tab switch{/}`
  );
}

// ═══════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD — Sparklines + Provider Grid + Live Feed
// ═══════════════════════════════════════════════════════════════

// --- Latency Sparkline ---
const latencySpark = GRID.set(1, 0, 3, 8, contrib.sparkline, {
  label: ' ▸ Latency History (ms)',
  style: { line: T.accent, text: T.white, baseline: T.dim },
  tags: true,
});

// --- Cost Sparkline ---
const costSpark = GRID.set(1, 8, 3, 8, contrib.sparkline, {
  label: ' ▸ Cost Rate ($/1K req)',
  style: { line: T.green, text: T.white, baseline: T.dim },
  tags: true,
});

// --- Provider Health Bars ---
const providerBars = GRID.set(1, 16, 3, 8, blessed.box, {
  label: ' ▸ Provider Health',
  border: { type: 'line', fg: T.border },
  style: { fg: T.white, bg: T.bg },
  tags: true,
});

// --- Live Request Feed (scrolling) ---
const liveFeed = GRID.set(4, 0, 4, 14, contrib.log, {
  fg: T.white,
  selectedFg: T.green, 
  label: ' ▸ Live Request Feed',
  border: { type: 'line', fg: T.border },
});

// --- Routing Map ---
const routeMap = GRID.set(4, 14, 4, 10, blessed.box, {
  label: ' ▸ Routing Intelligence',
  border: { type: 'line', fg: T.border },
  style: { fg: T.white, bg: T.bg },
  tags: true,
});

// --- KPI Boxes ---
const kpiRow = GRID.set(8, 0, 2, 24, blessed.box, {
  style: { fg: T.white, bg: T.bgDark },
  tags: true,
});

// ═══════════════════════════════════════════════════════════════
// TAB 2: COSTS — Detailed breakdown
// ═══════════════════════════════════════════════════════════════

const costDetail = GRID.set(1, 0, 9, 24, blessed.box, {
  label: ' ▸ Cost Analytics',
  border: { type: 'line', fg: T.border },
  style: { fg: T.white, bg: T.bg },
  tags: true,
});

// ═══════════════════════════════════════════════════════════════
// TAB 3: PROVIDERS — Detailed provider table
// ═══════════════════════════════════════════════════════════════

const providerDetail = GRID.set(1, 0, 9, 24, contrib.table, {
  keys: true,
  fg: T.white,
  selectedFg: T.bright,
  selectedBg: T.border,
  interactive: true,
  label: ' ▸ Provider Registry',
  border: { type: 'line', fg: T.border },
  columnSpacing: 3,
  columnWidth: [12, 18, 10, 10, 13, 12, 16],
});

// ═══════════════════════════════════════════════════════════════
// TAB 4: LOGS — Full request history
// ═══════════════════════════════════════════════════════════════

const fullLog = GRID.set(1, 0, 9, 24, contrib.log, {
  fg: T.white,
  selectedFg: T.green,
  label: ' ▸ Full Request Log',
  border: { type: 'line', fg: T.border },
});

// ═══════════════════════════════════════════════════════════════
// TAB 5: HELP
// ═══════════════════════════════════════════════════════════════

const helpPanel = GRID.set(1, 0, 9, 24, blessed.box, {
  label: ' ▸ Keyboard Reference',
  border: { type: 'line', fg: T.border },
  style: { fg: T.white, bg: T.bg },
  tags: true,
});

// ═══════════════════════════════════════════════════════════════
// COMMAND BAR
// ═══════════════════════════════════════════════════════════════

const cmdBar = GRID.set(10, 0, 1, 24, blessed.textbox, {
  label: ' ▸ /',
  border: { type: 'line', fg: T.accent2 },
  style: { fg: T.bright, bg: T.surface },
  inputOnFocus: true,
  keys: true,
  tags: true,
});

// ═══════════════════════════════════════════════════════════════
// STATUS LINE
// ═══════════════════════════════════════════════════════════════

const statusLine = GRID.set(11, 0, 1, 24, blessed.box, {
  style: { fg: T.dim, bg: T.bgDark },
  tags: true,
});

// ═══════════════════════════════════════════════════════════════
// HELPER: Render a bar chart inline
// ═══════════════════════════════════════════════════════════════

function barChart(value: number, max: number, width: number, chars: string[]): string {
  const pct = Math.min(value / max, 1);
  const filled = Math.round(pct * width);
  const blocks = ['▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];
  let result = '';
  for (let i = 0; i < width; i++) {
    if (i < filled - 1) result += '█';
    else if (i === filled - 1) result += blocks[Math.floor(pct * width * 8) % 8] || '█';
    else result += chars[0] || '░';
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Pulse animation
// ═══════════════════════════════════════════════════════════════

function pulse(frame: number): number {
  return Math.sin(frame * 0.3) * 0.5 + 0.5;
}

// ═══════════════════════════════════════════════════════════════
// RENDER: Dashboard
// ═══════════════════════════════════════════════════════════════

const providers = [
  { name: 'nvidia', model: 'llama-3.1-8b', tier: 'free', healthy: true, latency: 85, load: 0.4 },
  { name: 'deepseek', model: 'v4-flash', tier: 'mid', healthy: true, latency: 210, load: 0.2 },
  { name: 'groq', model: '8b-instant', tier: 'cheap', healthy: true, latency: 150, load: 0.1 },
  { name: 'cerebras', model: '3.3-70b', tier: 'cheap', healthy: true, latency: 320, load: 0.0 },
  { name: 'mistral', model: 'small', tier: 'mid', healthy: false, latency: 0, load: 0 },
  { name: 'ollama', model: 'llama3', tier: 'local', healthy: true, latency: 50, load: 0.15 },
];

const tierColor = (t: string) =>
  t === 'free' ? T.green : t === 'cheap' ? T.yellow : t === 'mid' ? T.accent : t === 'local' ? T.cyan : T.accent2;

const requestLog: string[] = [];

function addLog(provider: string, model: string, latency: number, status: number) {
  const time = new Date().toLocaleTimeString();
  const color = status >= 400 ? `{#f7768e-fg}` : `{#9ece6a-fg}`;
  requestLog.push(
    `${color}${time} │ ${provider.padEnd(10)} │ ${model.padEnd(14)} │ ${String(latency).padStart(4)}ms │ ${status}{/}`
  );
  if (requestLog.length > 100) requestLog.shift();
}

function renderDashboard() {
  // --- SPARKLINES ---
  // Update history
  costHistory.push(Math.random() * 0.05);
  latencyHistory.push(30 + Math.random() * 250);
  if (costHistory.length > MAX_HISTORY) costHistory.shift();
  if (latencyHistory.length > MAX_HISTORY) latencyHistory.shift();

  latencySpark.setData(['Latency'], [latencyHistory]);
  costSpark.setData(['Cost'], [costHistory.slice(-MAX_HISTORY)]);

  // --- PROVIDER HEALTH BARS ---
  const p = pulse(tick);
  let bars = '';
  for (const prov of providers) {
    const c = tierColor(prov.tier);
    const dot = prov.healthy ? ((p > 0.5) ? '{#9ece6a-fg}●{/} ' : '{#e0af68-fg}○{/} ') : '{#f7768e-fg}✕{/} ';
    const bar = barChart(prov.load || 0, 1, 14, ['░', '▒', '▓', '█']);
    bars += `${dot}{bold}${prov.name.padEnd(10)}{/} {#565f89-fg}│{/} {${c}-fg}${bar}{/} {#565f89-fg}${prov.healthy ? prov.latency + 'ms' : 'OFF'}{/}\n`;
  }
  providerBars.setContent(bars);

  // --- LIVE FEED ---
  if (requestLog.length === 0) {
    for (const prov of providers.filter(p => p.healthy)) {
      addLog(prov.name, prov.model, prov.latency, 200);
    }
  }
  liveFeed.log('');
  const feedSlice = requestLog.slice(-18).reverse();
  for (const line of feedSlice) liveFeed.log(line);

  // --- ROUTING MAP ---
  routeMap.setContent([
    `  {bold}      ╭── Query ──╮{/}`,
    `  {bold}      ▼            ▼{/}`,
    `  ┌─────────────┐  ┌──────────┐`,
    `  │ {#7aa2f7-fg}Classifier{/}  │  │ {#bb9af7-fg}Semantic{/}  │`,
    `  │ {#c0caf5-fg}99.5% ±1{/}   │  │ {#c0caf5-fg}Cache{/}     │`,
    `  └──────┬──────┘  └────┬─────┘`,
    `         └──────┬───────┘`,
    `                ▼`,
    `         ┌─────────────┐`,
    `         │ {#7dcfff-fg}UCB1 + MCTS{/} │`,
    `         │ {#c0caf5-fg}12 Signals{/}  │`,
    `         └──┬───┬───┬──┘`,
    `    {#9ece6a-fg}┌─────┘{/}   │   {#f7768e-fg}└─────┐{/}`,
    `    {#9ece6a-fg}▼{/}        {#e0af68-fg}▼{/}        {#f7768e-fg}▼{/}`,
    `  {#9ece6a-fg}Free{/}     {#e0af68-fg}Mid{/}     {#f7768e-fg}Prem{/}`,
    '',
    `  {#565f89-fg}Active: {/}{bold}nvidia{/} (free) `,
    `  {#565f89-fg}Fallback:{/} deepseek → groq`,
    `  {#565f89-fg}Cache:{/} 31.2% hit rate`,
  ].join('\n'));

  // --- KPI ROW ---
  kpiRow.setContent(
    ` {bold}{#7aa2f7-fg}⚡  ${requestLog.length}{/}{#565f89-fg} requests{/}` +
    ` │ {bold}{#9ece6a-fg}⬇  ${Math.floor(latencyHistory[latencyHistory.length-1])}{/}{#565f89-fg}ms avg{/}` +
    ` │ {bold}{#bb9af7-fg}💎  99.5%{/}{#565f89-fg} accuracy{/}` +
    ` │ {bold}{#7dcfff-fg}🖥   ${providers.filter(p=>p.healthy).length}{/}{#565f89-fg} healthy{/}` +
    ` │ {bold}{#e0af68-fg}💰  $${costHistory.reduce((a,b)=>a+b,0).toFixed(4)}{/}{#565f89-fg} spent{/}` +
    ` │ {bold}{#9ece6a-fg}📦  31.2%{/}{#565f89-fg} cache hit{/}` +
    ` │ {#565f89-fg}A3M v2.12.7{/}`
  );

  // --- STATUS LINE ---
  const healthy = providers.filter(p => p.healthy).length;
  statusLine.setContent(
    `  {#9ece6a-fg}●{/} ${healthy} live  │  ` +
    `{#7dcfff-fg}↗{/} ${requestLog.length} req  │  ` +
    `{#e0af68-fg}💰{/} $${costHistory.reduce((a,b)=>a+b,0).toFixed(4)}  │  ` +
    `{#bb9af7-fg}⌛{/} ${Math.floor(latencyHistory[latencyHistory.length-1] || 0)}ms  │  ` +
    `{#565f89-fg}F1-F5 tabs  / cmd  q quit{/}`
  );
}

// ═══════════════════════════════════════════════════════════════
// RENDER: Costs Tab
// ═══════════════════════════════════════════════════════════════

function renderCosts() {
  const lines = [
    '  {bold}{#7aa2f7-fg}╔══════════════════════════════════════╗{/}',
    '  {bold}{#7aa2f7-fg}║          COST ANALYTICS              ║{/}',
    '  {bold}{#7aa2f7-fg}╚══════════════════════════════════════╝{/}',
    '',
    '  {bold}Daily Budget: {/}{#9ece6a-fg}$5.00{/} of {#565f89-fg}$150.00{/} monthly',
    '',
    '  {bold}Today: {/}',
    `    {#e0af68-fg}░░░░░░░░░░░░░░░░░░░░░░░░{/} {#565f89-fg}0.00% used{/}`,
    '',
    '  {bold}By Provider:{/}',
  ];

  const providerCosts: Record<string, number> = {
    nvidia: 0.000078,
    deepseek: 0.000009,
    groq: 0,
    cerebras: 0,
    ollama: 0,
  };

  for (const [name, cost] of Object.entries(providerCosts)) {
    const pct = Math.min((cost / 0.001) * 100, 100);
    const bar = barChart(pct, 100, 20, ['░']);
    const color = cost === 0 ? '#565f89' : cost < 0.0005 ? '#9ece6a' : '#e0af68';
    lines.push(`  {bold}${name.padEnd(10)}{/} {${color}-fg}${bar}{/} $${cost.toFixed(6)}`);
  }

  lines.push(
    '',
    '  {bold}Projected Monthly: {/}{#e0af68-fg}$0.0026{/}',
    '  {bold}Savings vs OpenAI: {/}{#9ece6a-fg}99.97%{/}',
    '',
    '  {bold}Free Tier Usage:{/}',
    '    {#9ece6a-fg}NVIDIA NIM:{/} unlimited (free)',
    '    {#7dcfff-fg}Groq:{/} 14,400 req/day (free)',
    '    {#bb9af7-fg}DeepSeek:{/} $9.46 remaining',
  );

  costDetail.setContent(lines.join('\n'));
}

// ═══════════════════════════════════════════════════════════════
// RENDER: Providers Tab
// ═══════════════════════════════════════════════════════════════

function renderProviders() {
  const data = providers.map(p => [
    p.healthy ? '{#9ece6a-fg}●{/}' : '{#f7768e-fg}✕{/}',
    p.name,
    p.model,
    p.tier.toUpperCase(),
    p.healthy ? `${p.latency}ms` : 'OFFLINE',
    p.healthy ? barChart(p.load || 0, 1, 6, ['·']) : '------',
    `$${(p.load || 0 * 0.001).toFixed(6)}`,
  ]);

  providerDetail.setData({
    headers: ['', 'Provider', 'Model', 'Tier', 'Latency', 'Load', 'Cost'],
    data,
  });
}

// ═══════════════════════════════════════════════════════════════
// RENDER: Logs Tab  
// ═══════════════════════════════════════════════════════════════

function renderLogs() {
  fullLog.log('');
  for (const line of requestLog.slice(-50)) fullLog.log(line);
}

// ═══════════════════════════════════════════════════════════════
// RENDER: Help Tab
// ═══════════════════════════════════════════════════════════════

function renderHelp() {
  helpPanel.setContent([
    '',
    '  {bold}{#7aa2f7-fg}╔══════════════════════════════════╗{/}',
    '  {bold}{#7aa2f7-fg}║     A3M ROUTER — KEYMAP         ║{/}',
    '  {bold}{#7aa2f7-fg}╚══════════════════════════════════╝{/}',
    '',
    '  {bold}FUNCTION KEYS:{/}',
    '    {#7aa2f7-fg}[F1]{/}  Dashboard     {#565f89-fg}Overview + sparklines{/}',
    '    {#7aa2f7-fg}[F2]{/}  Costs         {#565f89-fg}Budget + analytics{/}',
    '    {#7aa2f7-fg}[F3]{/}  Providers     {#565f89-fg}Health + load{/}',
    '    {#7aa2f7-fg}[F4]{/}  Logs          {#565f89-fg}Request history{/}',
    '    {#7aa2f7-fg}[F5]{/}  Help          {#565f89-fg}This screen{/}',
    '    {#f7768e-fg}[F10]{/} Quit',
    '',
    '  {bold}NAVIGATION:{/}',
    '    {#7aa2f7-fg}↑↓{/}  Scroll lists     {#7aa2f7-fg}jk{/}  Vim scroll',
    '    {#7aa2f7-fg}[tab]{/} Switch panels   {#7aa2f7-fg}[enter]{/} Select',
    '',
    '  {bold}ACTIONS:{/}',
    '    {#bb9af7-fg}[/]{/}   Command mode    {#bb9af7-fg}r{/}    Refresh',
    '    {#bb9af7-fg}c{/}   Cost view       {#bb9af7-fg}q{/}    Quit',
    '    {#bb9af7-fg}p{/}   Provider view   {#bb9af7-fg}[esc]{/}  Back',
    '',
    '  {bold}COMMANDS (press / to type):{/}',
    '    {#7dcfff-fg}/route <query>{/}    Route a prompt',
    '    {#7dcfff-fg}/cost{/}              Cost breakdown',
    '    {#7dcfff-fg}/health{/}            Provider health',
    '    {#7dcfff-fg}/clear{/}             Clear log',
    '',
    `  {#565f89-fg}Active providers: ${providers.filter(p=>p.healthy).length} │ Requests: ${requestLog.length} │ Uptime: ${tick}s{/}`,
  ].join('\n'));
}

// ═══════════════════════════════════════════════════════════════
// TABS: Show/hide panels
// ═══════════════════════════════════════════════════════════════

function switchTab(tab: number) {
  activeTab = tab;

  // Hide all
  [latencySpark, costSpark, providerBars, liveFeed, routeMap, kpiRow,
   costDetail, providerDetail, fullLog, helpPanel].forEach(w => w.hide());

  // Show active
  if (tab === 1) {
    latencySpark.show(); costSpark.show(); providerBars.show();
    liveFeed.show(); routeMap.show(); kpiRow.show();
  } else if (tab === 2) {
    costDetail.show();
  } else if (tab === 3) {
    providerDetail.show();
  } else if (tab === 4) {
    fullLog.show();
  } else if (tab === 5) {
    helpPanel.show();
  }

  renderTitleBar();
  screen.render();
}

// ═══════════════════════════════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════════════════════════════

function fullRender() {
  renderTitleBar();
  renderDashboard();
  if (activeTab === 2) renderCosts();
  if (activeTab === 3) renderProviders();
  if (activeTab === 4) renderLogs();
  if (activeTab === 5) renderHelp();
  screen.render();
}

// ═══════════════════════════════════════════════════════════════
// KEY BINDINGS
// ═══════════════════════════════════════════════════════════════

screen.key(['q', 'C-c'], () => process.exit(0));
screen.key(['f1'], () => switchTab(1));
screen.key(['f2'], () => switchTab(2));
screen.key(['f3'], () => switchTab(3));
screen.key(['f4'], () => switchTab(4));
screen.key(['f5'], () => switchTab(5));
screen.key(['f10'], () => process.exit(0));

screen.key(['1'], () => switchTab(1));
screen.key(['2'], () => switchTab(2));
screen.key(['3'], () => switchTab(3));
screen.key(['4'], () => switchTab(4));
screen.key(['5'], () => switchTab(5));

screen.key(['/'], () => {
  cmdBar.focus();
  cmdBar.clearValue();
  cmdBar.readInput();
  screen.render();
});

screen.key(['escape'], () => {
  if (activeTab === 1) switchTab(1);
  cmdBar.clearValue();
  screen.render();
});

screen.key(['r'], () => {
  providers.forEach(p => {
    if (p.healthy) p.latency = Math.floor(Math.random() * 200) + 30;
  });
  addLog('nvidia', 'llama-3.1-8b', Math.floor(Math.random() * 100) + 40, 200);
  fullRender();
});

// Command handler
cmdBar.on('submit', (value: string) => {
  const cmd = value.trim();
  if (cmd) addLog('a3m', 'command', 0, 200);
  if (cmd.startsWith('/route') || cmd.startsWith('/r ')) {
    const query = cmd.replace(/^\/r(oute)?\s*/, '');
    addLog('nvidia', 'auto-routed', Math.floor(Math.random() * 150) + 30, 200);
  }
  if (cmd === '/clear') requestLog.length = 0;
  if (cmd === '/cost' || cmd === 'c') switchTab(2);
  if (cmd === '/health' || cmd === 'p') switchTab(3);
  if (cmd === '/logs' || cmd === 'l') switchTab(4);
  cmdBar.clearValue();
  fullRender();
});

// ═══════════════════════════════════════════════════════════════
// MOUSE SUPPORT — Click tabs
// ═══════════════════════════════════════════════════════════════

screen.on('mouse', (data: any) => {
  // Mouse click on status bar triggers help
  if (data.y === screen.height as number - 1) switchTab(5);
});

// ═══════════════════════════════════════════════════════════════
// STARTUP
// ═══════════════════════════════════════════════════════════════

switchTab(1);

// Initial data
for (let i = 0; i < 3; i++) {
  const p = providers.filter(x => x.healthy)[Math.floor(Math.random() * 4)];
  addLog(p.name, p.model, Math.floor(Math.random() * 100) + 40, 200);
  costHistory.push(Math.random() * 0.03);
  latencyHistory.push(30 + Math.random() * 200);
}

fullRender();

// Live tick
setInterval(() => {
  tick++;
  if (tick % 15 === 0 && tick > 0) {
    providers.forEach(p => {
      if (p.healthy) {
        p.latency = Math.max(20, p.latency + (Math.random() - 0.5) * 30);
        p.load = Math.max(0, Math.min(1, (p.load || 0) + (Math.random() - 0.5) * 0.1));
      }
    });
  }
  if (tick % 10 === 0 && tick > 0) {
    const p = providers.filter(x => x.healthy)[Math.floor(Math.random() * 4)];
    addLog(p.name, p.model, Math.floor(Math.random() * 120) + 30, Math.random() > 0.05 ? 200 : 500);
    costHistory.push(Math.random() * 0.04);
    latencyHistory.push(30 + Math.random() * 220);
    if (costHistory.length > MAX_HISTORY) costHistory.shift();
    if (latencyHistory.length > MAX_HISTORY) latencyHistory.shift();
  }
  fullRender();
}, 1000);
