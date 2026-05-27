#!/usr/bin/env node
"use strict";
/**
 * A3M Router — Overlay Box (blessed, non-fullscreen)
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
// State
let activeModel = 'nvidia/llama-3.1-8b';
let totalCost = 0.000087;
let reqCount = 4;
const log = [];
// Screen — floating overlay, not fullscreen
const screen = blessed.screen({
    smartCSR: true,
    fullUnicode: true,
    dockBorders: false,
    cursor: { shape: 'line', blink: true },
});
// Box settings
const BW = 82;
const BH = 18;
function boxLeft() { return Math.max(0, Math.floor((screen.width - BW) / 2)); }
function boxTop() { return Math.max(0, Math.floor((screen.height - BH) / 2)); }
// Overlay box
const box = blessed.box({
    top: boxTop(),
    left: boxLeft(),
    width: BW,
    height: BH,
    border: { type: 'line', fg: 'magenta' },
    style: { fg: '#c0caf5', bg: '#1a1b26' },
    tags: true,
    scrollable: true,
    mouse: true,
    keys: true,
    padding: { left: 1, right: 1, top: 0, bottom: 0 },
});
// Prompt
const prompt = blessed.textbox({
    parent: box,
    bottom: 1,
    left: 0,
    width: BW - 4,
    height: 1,
    style: { fg: '#c0caf5', bg: '#24283b' },
    inputOnFocus: true,
    keys: true,
    tags: true,
});
// Helpers
const D = (s) => `{#565f89-fg}${s}{/}`;
function render() {
    const maxLines = BH - 4;
    const visible = log.slice(-maxLines);
    let out = '';
    out += `{bold}{#bb9af7-fg}⚡ A3M Router{/}  ${D('·')}  {#9ece6a-fg}${activeModel}{/}  ${D('·')}  ${D(`${reqCount} req`)}  ${D('·')}  ${D(`$${totalCost.toFixed(6)}`)}\n`;
    out += `${D('─'.repeat(BW - 6))}\n`;
    out += '\n';
    for (const line of visible) {
        out += line + '\n';
    }
    if (visible.length === 0) {
        out += `  ${D('Type a query — auto-routed to cheapest model.')}\n\n`;
        out += `  ${D('Commands:')}\n`;
        out += `  {#7aa2f7-fg}/route{/} ${D('<query>')}       /cost              /model nvidia\n`;
        out += `  {#7aa2f7-fg}/health{/}              /models            /clear\n`;
        out += `  {#7aa2f7-fg}/exit{/}                /help\n\n`;
        out += `  ${D('nvidia (free)  ·  groq (free)  ·  deepseek ($9.46)')}\n`;
    }
    box.setContent(out);
    screen.render();
}
function cmd(c) {
    if (!c)
        return;
    log.push(`{bold}{#7dcfff-fg}▸{/} ${c}`);
    if (c === '/exit' || c === '/q') {
        screen.destroy();
        process.exit(0);
    }
    else if (c === '/help')
        log.push(`  ${D('/route /cost /health /models /model <p> /clear /exit')}`);
    else if (c === '/clear')
        log.length = 0;
    else if (c === '/cost') {
        log.push(`  {#bb9af7-fg}A3M{/}  Cost:`);
        log.push(`  ${D('nvidia $0  |  deepseek $0.000009  |  groq $0  |  cerebras $0')}`);
        log.push(`  ${D(`TOTAL $${totalCost.toFixed(6)}  |  ${reqCount} req  |  99.97% saved`)}`);
    }
    else if (c === '/health') {
        log.push(`  {#bb9af7-fg}A3M{/}  Health:`);
        log.push(`  {#9ece6a-fg}●{/} nvidia 85ms  {#9ece6a-fg}●{/} deepseek 210ms  {#9ece6a-fg}●{/} groq 150ms  {#9ece6a-fg}●{/} cerebras 320ms`);
        log.push(`  {#f7768e-fg}✕{/} mistral OFFLINE  {#9ece6a-fg}●{/} ollama 50ms`);
    }
    else if (c === '/models') {
        log.push(`  {#bb9af7-fg}A3M{/}  47+ providers:`);
        log.push(`  {#9ece6a-fg}● nvidia{/} (free)  {#7dcfff-fg}● groq{/} (free)  {#e0af68-fg}● deepseek{/} (cheap)  {#bb9af7-fg}● cerebras{/} (free)`);
    }
    else if (c.startsWith('/model ')) {
        const w = c.replace('/model ', '').trim();
        const valid = ['nvidia', 'deepseek', 'groq', 'cerebras', 'mistral', 'openai', 'ollama'];
        if (valid.includes(w)) {
            activeModel = `${w}/auto`;
            log.push(`  ${D(`→ {#9ece6a-fg}${activeModel}{/}`)}`);
        }
        else
            log.push(`  ${D(`Unknown: ${w}`)}`);
    }
    else {
        const ms = Math.floor(Math.random() * 100) + 30;
        const cost = Math.random() * 0.00005;
        totalCost += cost;
        reqCount++;
        log.push(`  {#bb9af7-fg}A3M{/}  {#9ece6a-fg}${activeModel}{/}  ${D('·')}  {#e0af68-fg}${ms}ms{/}  ${D('·')}  {#ff9e64-fg}$${cost.toFixed(6)}{/}`);
        log.push(`  ${c}`);
    }
    while (log.length > 25)
        log.shift();
    render();
    prompt.focus();
}
// Keys
screen.key(['C-c', 'escape'], () => { screen.destroy(); process.exit(0); });
prompt.key('enter', () => { const v = prompt.getValue().trim(); prompt.clearValue(); cmd(v); });
// Start
screen.append(box);
render();
prompt.focus();
screen.render();
//# sourceMappingURL=dashboard.js.map