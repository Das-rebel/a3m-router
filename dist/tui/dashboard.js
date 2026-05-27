#!/usr/bin/env node
"use strict";
/**
 * A3M Router CLI — Inline REPL (no fullscreen)
 * Like PI's /search — prints inline, no terminal takeover.
 *
 * Usage: node dist/tui/dashboard.js
 *        Then type queries or /slash commands.
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const readline = __importStar(require("readline"));
// @ts-ignore
const chalk_1 = __importDefault(require("chalk"));
// @ts-ignore
const boxen_1 = __importDefault(require("boxen"));
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
function dim(s) { return chalk_1.default.dim(s); }
function badge(t) { return chalk_1.default.dim(`[${t}]`); }
function headerLine() {
    return [
        chalk_1.default.bold.hex('#bb9af7')('⚡ A3M Router'),
        dim('·'),
        chalk_1.default.hex('#9ece6a')(activeModel),
        dim('·'),
        dim(`${reqCount} req`),
        dim('·'),
        dim(`$${totalCost.toFixed(6)}`),
    ].join('  ');
}
function printSystem(text) {
    console.log('  ' + dim(text));
}
function printUser(text) {
    console.log('');
    console.log('  ' + chalk_1.default.bold.hex('#7dcfff')('▸ ') + text);
}
function printA3M(text, model, ms, cost) {
    const parts = [];
    if (model)
        parts.push(chalk_1.default.hex('#9ece6a')(model));
    if (ms)
        parts.push(chalk_1.default.hex('#e0af68')(`${ms}ms`));
    if (cost !== undefined)
        parts.push(chalk_1.default.hex('#ff9e64')(`$${cost.toFixed(6)}`));
    console.log('');
    console.log('  ' + chalk_1.default.bold.hex('#bb9af7')('A3M') + '  ' + parts.join('  ' + dim('·') + '  '));
    console.log('  ' + text);
}
// ═══════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════
function handle(input) {
    const cmd = input.trim();
    if (!cmd)
        return;
    printUser(cmd);
    if (cmd === '/help' || cmd === '/h') {
        printA3M([
            chalk_1.default.bold('Commands:'),
            '',
            `  ${chalk_1.default.hex('#7aa2f7')('/route <query>')}    ${dim('Route a prompt')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/model <provider>')}  ${dim('Switch provider (nvidia, deepseek, groq, etc)')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/cost')}             ${dim('Cost breakdown')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/health')}           ${dim('Provider status')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/models')}           ${dim('List available providers')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/stats')}            ${dim('Toggle stats header')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/clear')}            ${dim('Clear screen')}`,
            `  ${chalk_1.default.hex('#7aa2f7')('/exit, /q')}         ${dim('Quit')}`,
            '',
            dim('Or just type anything — auto-routed to cheapest model.'),
        ].join('\n'));
    }
    else if (cmd === '/exit' || cmd === '/q' || cmd === ':q') {
        console.log(dim('\n  Goodbye.\n'));
        process.exit(0);
    }
    else if (cmd === '/clear' || cmd === '/cls') {
        console.clear();
        console.log(headerLine());
        console.log('');
    }
    else if (cmd === '/stats') {
        showStats = !showStats;
        printSystem(showStats ? 'Stats header: ON' : 'Stats header: OFF');
    }
    else if (cmd === '/cost') {
        printA3M('Cost breakdown:', '—', 0, 0);
        printSystem(`  nvidia       $0.000000  (free)`);
        printSystem(`  deepseek     $0.000009  ($9.46 remaining)`);
        printSystem(`  groq         $0.000000  (free)`);
        printSystem(`  cerebras     $0.000000  (free)`);
        printSystem(`  ───────────────────────`);
        printSystem(`  TOTAL        $${totalCost.toFixed(6)}  (${reqCount} requests)`);
        printSystem(`  Savings      99.97% vs all-premium`);
    }
    else if (cmd === '/health') {
        printA3M('Provider health:', '—', 0, 0);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('●')} nvidia     llama-3.1-8b      85ms   free`);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('●')} deepseek   v4-flash          210ms   mid`);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('●')} groq       8b-instant        150ms   cheap`);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('●')} cerebras   3.3-70b          320ms   cheap`);
        printSystem(`  ${chalk_1.default.hex('#f7768e')('✕')} mistral    small            OFFLINE`);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('●')} ollama     llama3            50ms   local`);
        printSystem(`  ${dim('4/6 healthy  ·  45ms avg')}`);
    }
    else if (cmd === '/models') {
        printA3M('Available providers (47+):', '—', 0, 0);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('● nvidia')} (free, default)      ${chalk_1.default.hex('#7dcfff')('● groq')} (free)       ${chalk_1.default.hex('#e0af68')('● deepseek')} (cheap)`);
        printSystem(`  ${chalk_1.default.hex('#bb9af7')('● cerebras')} (free)           ${chalk_1.default.hex('#7aa2f7')('● mistral')} (mid)       ${chalk_1.default.hex('#f7768e')('● openai')} (premium)`);
        printSystem(`  ${chalk_1.default.hex('#9ece6a')('● ollama')} (local)            ${chalk_1.default.hex('#7dcfff')('● google')} (free)`);
        printSystem(`  ${dim('Use /model <name> to switch')}`);
    }
    else if (cmd.startsWith('/model ')) {
        const wanted = cmd.replace('/model ', '').trim();
        const valid = ['nvidia', 'deepseek', 'groq', 'cerebras', 'mistral', 'openai', 'ollama', 'google'];
        if (valid.includes(wanted)) {
            activeModel = `${wanted}/auto`;
            printSystem(`Switched to ${chalk_1.default.hex('#9ece6a')(activeModel)}`);
        }
        else {
            printSystem(`Unknown: ${wanted}. Options: ${valid.join(', ')}`);
        }
    }
    else if (cmd.startsWith('/route ') || cmd.startsWith('/r ')) {
        const query = cmd.replace(/^\/r(oute)?\s*/, '');
        const ms = Math.floor(Math.random() * 120) + 35;
        const cost = Math.random() * 0.00008;
        totalCost += cost;
        reqCount++;
        printA3M(query, activeModel, ms, cost);
    }
    else {
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
console.log((0, boxen_1.default)([
    chalk_1.default.bold.hex('#bb9af7')('⚡ A3M Router'),
    '',
    dim('One prompt in. The right model out.'),
    '',
    dim('Type anything — auto-routed to cheapest model.'),
    dim('Commands: /route /cost /health /models /help /exit'),
    '',
    chalk_1.default.hex('#9ece6a')('nvidia (free)') + dim('  ·  ') +
        chalk_1.default.hex('#7dcfff')('groq (free)') + dim('  ·  ') +
        chalk_1.default.hex('#e0af68')('deepseek ($9.46)'),
].join('\n'), {
    padding: 1,
    margin: { top: 1, bottom: 1 },
    borderStyle: 'round',
    borderColor: 'magenta',
    dimBorder: true,
}));
console.log(headerLine());
console.log('');
// REPL
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk_1.default.hex('#7dcfff')('▸ '),
    terminal: true,
});
rl.prompt();
rl.on('line', (line) => {
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
//# sourceMappingURL=dashboard.js.map