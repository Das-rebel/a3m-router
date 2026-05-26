#!/usr/bin/env node
"use strict";
/**
 * A3M Router TUI — Terminal Dashboard
 *
 * Inspired by: k9s, lazygit, btop, htop, PI CLI
 * Built with: blessed + blessed-contrib
 *
 * Key Bindings:
 *   /     — Command mode (route queries)
 *   r     — Refresh provider health
 *   c     — Cost breakdown view
 *   p     — Provider detail view
 *   l     — Live request log
 *   b     — Budget alerts
 *   q     — Quit
 *   tab   — Switch panel focus
 *   ↑↓    — Navigate lists
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const blessed = __importStar(require("blessed"));
const contrib = __importStar(require("blessed-contrib"));
const providers = [
    { name: 'nvidia', model: 'llama-3.1-8b', healthy: true, latency: 85, costPerK: 0, requests: 2, tier: 'free' },
    { name: 'deepseek', model: 'deepseek-v4-flash', healthy: true, latency: 210, costPerK: 0.14, requests: 1, tier: 'mid' },
    { name: 'groq', model: 'llama-3.1-8b-instant', healthy: true, latency: 150, costPerK: 0.05, requests: 0, tier: 'cheap' },
    { name: 'cerebras', model: 'llama-3.3-70b', healthy: true, latency: 320, costPerK: 0.10, requests: 0, tier: 'cheap' },
    { name: 'mistral', model: 'mistral-small', healthy: false, latency: 0, costPerK: 0.20, requests: 0, tier: 'mid' },
    { name: 'openai', model: 'gpt-4o', healthy: false, latency: 0, costPerK: 2.50, requests: 0, tier: 'premium' },
    { name: 'anthropic', model: 'claude-sonnet-4', healthy: false, latency: 0, costPerK: 3.00, requests: 0, tier: 'premium' },
    { name: 'google', model: 'gemma-4-31b', healthy: false, latency: 0, costPerK: 0, requests: 0, tier: 'free' },
    { name: 'ollama', model: 'llama3', healthy: true, latency: 50, costPerK: 0, requests: 1, tier: 'local' },
];
const costSnapshot = {
    total: 0.000087,
    daily: { '2026-05-25': 0.000087 },
    monthly: { '2026-05': 0.000087 },
    byProvider: { nvidia: 0.000078, deepseek: 0.000009 },
    requestCount: 4,
};
const requestLogs = [
    { timestamp: '10:32:15', model: 'deepseek-v4-flash', provider: 'deepseek', latency: 210, tokens: 47, cost: 0.000009, status: 200 },
    { timestamp: '10:31:42', model: 'llama-3.1-8b', provider: 'nvidia', latency: 85, tokens: 38, cost: 0, status: 200 },
    { timestamp: '10:30:11', model: 'llama-3.1-8b', provider: 'nvidia', latency: 92, tokens: 52, cost: 0, status: 200 },
    { timestamp: '10:29:03', model: 'llama3', provider: 'ollama', latency: 55, tokens: 31, cost: 0, status: 200 },
];
// ============================================================
// COLORS — Elegant Dark Theme
// ============================================================
const C = {
    bg: '#0a0e14',
    surface: '#131820',
    border: '#253040',
    accent: '#39bae6',
    accent2: '#ff8f40',
    green: '#7fd962',
    yellow: '#ffcc66',
    red: '#f26d78',
    white: '#bfbab0',
    dim: '#5c6773',
    bright: '#e6e1cf',
    header: '#d4bfff',
};
const colorScheme = {
    healthy: C.green,
    unhealthy: C.red,
    free: C.green,
    cheap: C.yellow,
    mid: C.accent,
    premium: C.accent2,
    local: C.dim,
};
// ============================================================
// SCREEN SETUP
// ============================================================
const screen = blessed.screen({
    smartCSR: true,
    title: 'A3M Router',
    dockBorders: false,
    fullUnicode: true,
    cursor: { shape: 'block', blink: true },
});
const grid = new contrib.grid({ rows: 12, cols: 12, screen: screen });
// ============================================================
// HEADER
// ============================================================
const header = grid.set(0, 0, 1, 12, blessed.box, {
    content: '{center}{bold}A3M Router Dashboard{/bold}  |  ─────────────────────────────────────────────────  |  q quit  / cmd  r refresh  c costs  p providers  l logs  b alerts{/center}',
    style: { fg: C.bright, bg: C.surface },
    tags: true,
});
// ============================================================
// PROVIDER HEALTH GRID (Top Left 5x4)
// ============================================================
const providerTable = grid.set(1, 0, 5, 4, contrib.table, {
    keys: true,
    fg: C.white,
    selectedFg: C.bright,
    selectedBg: C.border,
    interactive: true,
    label: ' ▸ Providers',
    width: '30%',
    height: '50%',
    border: { type: 'line', fg: C.border },
    columnSpacing: 2,
    columnWidth: [12, 14, 6, 8, 8],
});
function renderProviders() {
    const data = providers.map(p => [
        p.name,
        p.model,
        p.tier.toUpperCase(),
        p.healthy ? `● ${p.latency}ms` : '○ OFFLINE',
        p.requests > 0 ? `${p.requests}` : '—',
    ]);
    providerTable.setData({
        headers: ['Provider', 'Model', 'Tier', 'Status', 'Req'],
        data: data,
    });
    // Color-code rows
    const rows = providerTable.rows;
    if (rows) {
        providers.forEach((p, i) => {
            if (rows[i]) {
                const color = p.healthy ? colorScheme[p.tier] || C.white : C.red;
                rows[i].style.fg = color;
            }
        });
    }
}
// ============================================================
// COST GAUGE (Top Right 5x4)
// ============================================================
const costGauge = grid.set(1, 4, 3, 4, contrib.gauge, {
    label: ' ▸ Cost Tracker',
    stroke: C.accent,
    fill: C.accent + '20',
});
const costBox = grid.set(4, 4, 2, 4, blessed.box, {
    label: ' ▸ Breakdown',
    border: { type: 'line', fg: C.border },
    style: { fg: C.white, bg: C.bg },
    tags: true,
});
function renderCosts() {
    const maxBudget = 5.00; // $5 daily budget
    const pct = Math.min((costSnapshot.total / maxBudget) * 100, 100);
    costGauge.setPercent(pct);
    costGauge.setLabel(` ▸ Cost Tracker — $${costSnapshot.total.toFixed(4)} / $${maxBudget.toFixed(2)} (${pct.toFixed(1)}%)`);
    const lines = ['{bold}By Provider:{/bold}'];
    for (const [provider, cost] of Object.entries(costSnapshot.byProvider)) {
        lines.push(`  {${cost === 0 ? 'grey' : cost < 0.001 ? 'green' : 'yellow'}-fg}${provider}: $${cost.toFixed(6)}{/}`);
    }
    lines.push('');
    lines.push(`{bold}Total Requests: {/bold}${costSnapshot.requestCount}`);
    lines.push(`{bold}Monthly: {/bold}$${Object.values(costSnapshot.monthly)[0]?.toFixed(6) || '0.00'}`);
    costBox.setContent(lines.join('\n'));
}
// ============================================================
// LIVE REQUEST LOG (Bottom Left 5x4)
// ============================================================
const requestLog = grid.set(6, 0, 5, 4, contrib.log, {
    fg: C.white,
    selectedFg: C.green,
    label: ' ▸ Live Requests',
    border: { type: 'line', fg: C.border },
});
function renderRequestLog() {
    requestLog.log('');
    for (const r of requestLogs.slice(-20).reverse()) {
        const color = r.status === 200 ? '{green-fg}' : r.status >= 400 ? '{red-fg}' : '{yellow-fg}';
        requestLog.log(`${color}${r.timestamp} │ ${r.provider}/${r.model} │ ${r.latency}ms │ ${r.tokens} tok │ $${r.cost.toFixed(6)}{/}`);
    }
}
// ============================================================
// MODEL ROUTING TREE (Bottom Right 5x4)
// ============================================================
const routingBox = grid.set(6, 4, 5, 4, blessed.box, {
    label: ' ▸ Routing Flow',
    border: { type: 'line', fg: C.border },
    style: { fg: C.white, bg: C.bg },
    tags: true,
});
function renderRoutingFlow() {
    const lines = [
        '{center}{bold}Query → A3M Router → Best Model{/bold}{/center}',
        '',
        '   ┌──────────┐',
        '   │  Query   │',
        '   └────┬─────┘',
        '        ▼',
        '  ┌─────────────┐',
        '  │ Classifier  │',
        '  │ 99.5% ±1    │',
        '  └─────┬───────┘',
        '        ▼',
        '  ┌─────────────┐',
        '  │ 12 Signals  │',
        '  │ UCB1 + MCTS │',
        '  └──┬──┬──┬───┘',
        '     │  │  │',
        '  {green-fg}┌──┘ {/} {yellow-fg}┌─┘ {/}  {blue-fg}└─{/}',
        '  {green-fg}▼{/}    {yellow-fg}▼{/}    {blue-fg}▼{/}',
        ' {green-fg}Free{/} {yellow-fg}Mid{/} {blue-fg}Prem{/}',
        '',
        '{dim}Active: {/}{bold}nvidia/llama-3.1-8b{/bold} {green-fg}(free, 85ms){/}',
        '{dim}Fallback: {/}deepseek/groq/cerebras',
    ];
    routingBox.setContent(lines.join('\n'));
}
// ============================================================
// COMMAND BAR (Bottom)
// ============================================================
const cmdBar = grid.set(11, 0, 1, 12, blessed.textbox, {
    label: ' ▸ Command',
    border: { type: 'line', fg: C.accent },
    style: { fg: C.bright, bg: C.surface },
    inputOnFocus: true,
    keys: true,
    tags: true,
});
// ============================================================
// STATUS BAR
// ============================================================
const statusBar = blessed.box({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: '  {green-fg}●{/} 4 providers healthy  │  {yellow-fg}⚠{/} $0.00 spent today  │  {cyan-fg}↗{/} 4 requests  │  {magenta-fg}⌛{/} 45ms avg latency',
    style: { fg: C.dim, bg: C.surface },
    tags: true,
});
// ============================================================
// RENDER ALL
// ============================================================
function renderAll() {
    renderProviders();
    renderCosts();
    renderRequestLog();
    renderRoutingFlow();
    screen.append(statusBar);
    screen.render();
}
// ============================================================
// KEY BINDINGS
// ============================================================
let activePanel = 'providers';
screen.key(['q', 'C-c'], () => process.exit(0));
screen.key(['r'], () => {
    // Simulate health refresh
    providers.forEach(p => {
        if (p.healthy)
            p.latency = Math.floor(Math.random() * 200) + 30;
    });
    renderAll();
});
screen.key(['/'], () => {
    activePanel = 'cmd';
    cmdBar.focus();
    cmdBar.readInput();
    screen.render();
});
screen.key(['escape'], () => {
    activePanel = 'providers';
    providerTable.focus();
    cmdBar.clearValue();
    screen.render();
});
screen.key(['tab'], () => {
    activePanel = activePanel === 'providers' ? 'cmd' : 'providers';
    if (activePanel === 'providers')
        providerTable.focus();
    else
        cmdBar.focus();
    screen.render();
});
screen.key(['c'], () => {
    const pct = Math.min((costSnapshot.total / 5) * 100, 100);
    costGauge.setPercent(pct + 0.1);
    renderAll();
});
// Handle command input
cmdBar.on('submit', (value) => {
    const cmd = value.trim();
    if (cmd.startsWith('/route') || cmd.startsWith('/r ')) {
        const query = cmd.replace(/^\/r(oute)?\s*/, '');
        requestLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            model: 'auto',
            provider: 'nvidia',
            latency: Math.floor(Math.random() * 150) + 30,
            tokens: Math.floor(Math.random() * 100),
            cost: 0,
            status: 200,
        });
        costSnapshot.requestCount++;
        renderAll();
    }
    cmdBar.clearValue();
    providerTable.focus();
    screen.render();
});
// ============================================================
// STARTUP
// ============================================================
screen.append(statusBar);
renderAll();
providerTable.focus();
screen.render();
// Auto-refresh every 5s
setInterval(() => {
    // Simulate live request
    if (Math.random() > 0.7) {
        requestLogs.push({
            timestamp: new Date().toLocaleTimeString(),
            model: providers[Math.floor(Math.random() * providers.length)].model,
            provider: providers[Math.floor(Math.random() * providers.length)].name,
            latency: Math.floor(Math.random() * 200) + 30,
            tokens: Math.floor(Math.random() * 100),
            cost: Math.random() * 0.0001,
            status: Math.random() > 0.1 ? 200 : 500,
        });
        costSnapshot.requestCount++;
    }
    renderAll();
}, 5000);
console.log('[A3M TUI] Dashboard loaded. Press q to quit.');
//# sourceMappingURL=dashboard.js.map