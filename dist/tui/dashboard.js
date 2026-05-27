#!/usr/bin/env node
"use strict";
/**
 * A3M Router — Terminal Overlay Box
 * Draws a centered overlay ON TOP of existing terminal content.
 * Does NOT clear the screen. Restores terminal when done.
 * Pure ANSI — no fullscreen, no alt-buffer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const ansi = (n) => `\x1b[${n}m`;
const R = ansi(0);
const BOLD = ansi(1);
const DIM = ansi(2);
const C = {
    bg: '\x1b[48;5;234m', // #1a1b26
    surface: '\x1b[48;5;236m', // #24283b
    border: '\x1b[38;5;60m', // #3b4261
    dim: '\x1b[38;5;60m', // #565f89
    text: '\x1b[38;5;189m', // #c0caf5
    blue: '\x1b[38;5;111m', // #7aa2f7
    purple: '\x1b[38;5;183m', // #bb9af7
    green: '\x1b[38;5;114m', // #9ece6a
    yellow: '\x1b[38;5;180m', // #e0af68
    red: '\x1b[38;5;204m', // #f7768e
    cyan: '\x1b[38;5;117m', // #7dcfff
    orange: '\x1b[38;5;216m', // #ff9e64
};
let activeModel = 'nvidia/llama-3.1-8b';
let totalCost = 0.000087;
let reqCount = 4;
const log = [];
function getSize() {
    return [process.stdout.columns || 80, process.stdout.rows || 24];
}
function saveCursor() { process.stdout.write('\x1b[s'); }
function restoreCursor() { process.stdout.write('\x1b[u'); }
function moveTo(row, col) { process.stdout.write(`\x1b[${row};${col}H`); }
function clearLine() { process.stdout.write('\x1b[2K'); }
function hideCursor() { process.stdout.write('\x1b[?25l'); }
function showCursor() { process.stdout.write('\x1b[?25h'); }
function stripAnsi(s) {
    return s.replace(/\x1b\[[0-9;]*m/g, '');
}
const B = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };
let inputBuf = '';
let cursorPos = 3;
function handleInput(char) {
    if (char === '\r' || char === '\n') {
        // Submit
        const cmd = inputBuf.trim();
        processCommand(cmd);
        inputBuf = '';
        cursorPos = 3;
        render();
    }
    else if (char === '\x7f' || char === '\b') {
        // Backspace
        if (inputBuf.length > 0) {
            inputBuf = inputBuf.slice(0, -1);
            cursorPos = Math.max(3, cursorPos - 1);
            renderPromptLine();
        }
    }
    else if (char === '\x1b') {
        // Escape — handled separately
    }
    else if (char >= ' ') {
        inputBuf += char;
        cursorPos++;
        renderPromptLine();
    }
}
function processCommand(cmd) {
    const c = cmd.trim();
    if (!c)
        return;
    log.push(`${C.cyan + BOLD}▸${R} ${c}`);
    if (c === '/exit' || c === '/q' || c === ':q') {
        cleanup();
        return;
    }
    else if (c === '/help' || c === '/h') {
        log.push(`${C.dim}  /route /cost /health /models /model <p> /clear /exit${R}`);
    }
    else if (c === '/clear') {
        log.length = 0;
    }
    else if (c === '/cost') {
        log.push(`${C.purple + BOLD}A3M${R}${C.dim}  Cost breakdown:${R}`);
        log.push(`${C.dim}  nvidia      $0.000000  (free)${R}`);
        log.push(`${C.dim}  deepseek    $0.000009  ($9.46 left)${R}`);
        log.push(`${C.dim}  groq        $0.000000  (free)${R}`);
        log.push(`${C.dim}  ───────────────────────${R}`);
        log.push(`${C.dim}  TOTAL       $${totalCost.toFixed(6)}  (${reqCount} req)${R}`);
        log.push(`${C.green}  Savings: 99.97% vs all-premium${R}`);
    }
    else if (c === '/health') {
        log.push(`${C.purple + BOLD}A3M${R}${C.dim}  Provider health:${R}`);
        log.push(`  ${C.green}●${R} nvidia     llama-3.1-8b      ${C.dim}85ms   free${R}`);
        log.push(`  ${C.green}●${R} deepseek   v4-flash          ${C.dim}210ms  mid${R}`);
        log.push(`  ${C.green}●${R} groq       8b-instant        ${C.dim}150ms  cheap${R}`);
        log.push(`  ${C.green}●${R} cerebras   3.3-70b          ${C.dim}320ms  cheap${R}`);
        log.push(`  ${C.red}✕${R} mistral    small             ${C.dim}OFFLINE${R}`);
    }
    else if (c === '/models') {
        log.push(`${C.purple + BOLD}A3M${R}${C.dim}  Available (47+):${R}`);
        log.push(`  ${C.green}● nvidia${R}(free)  ${C.cyan}● groq${R}(free)  ${C.yellow}● deepseek${R}(cheap)`);
        log.push(`  ${C.purple}● cerebras${R}(free)  ${C.blue}● mistral${R}(mid)  ${C.red}● openai${R}(premium)`);
    }
    else if (c.startsWith('/model ')) {
        const w = c.replace('/model ', '').trim();
        const valid = ['nvidia', 'deepseek', 'groq', 'cerebras', 'mistral', 'openai', 'ollama', 'google'];
        if (valid.includes(w)) {
            activeModel = `${w}/auto`;
            log.push(`${C.dim}  Switched to ${C.green}${activeModel}${R}`);
        }
        else {
            log.push(`${C.dim}  Unknown: ${w}${R}`);
        }
    }
    else {
        const ms = Math.floor(Math.random() * 100) + 30;
        const cost = Math.random() * 0.00005;
        totalCost += cost;
        reqCount++;
        log.push(`${C.purple + BOLD}A3M${R}  ${C.green}${activeModel}${R}  ${C.dim}·${R}  ${C.yellow}${ms}ms${R}  ${C.dim}·${R}  ${C.orange}$${cost.toFixed(6)}${R}`);
        log.push(`  ${c}`);
    }
    // Trim log if too long
    const maxLog = 14;
    while (log.length > maxLog)
        log.shift();
}
function buildOverlayLines(boxW) {
    const contentW = boxW - 4; // inside padding
    const lines = [];
    // Header row
    const hdr = `${C.purple + BOLD}⚡ A3M Router${R}  ${C.dim}·${R}  ${C.green}${activeModel}${R}  ${C.dim}·${R}  ${C.dim}${reqCount} req${R}  ${C.dim}·${R}  ${C.dim}$${totalCost.toFixed(6)}${R}`;
    lines.push(hdr.padEnd(contentW));
    // Separator
    lines.push(`${C.dim}${'─'.repeat(Math.max(0, contentW))}${R}`);
    lines.push('');
    // Log lines
    for (const l of log) {
        lines.push(l.padEnd(contentW));
    }
    // Welcome message if empty
    if (log.length === 0) {
        lines.push(`  ${C.dim}Type a query — auto-routed to cheapest model.${R}`.padEnd(contentW));
        lines.push('');
        lines.push(`  ${C.dim}Commands:${R}`.padEnd(contentW));
        lines.push(`  ${C.blue}/route${R} ${C.dim}<query>${R}       ${C.blue}/cost${R}              ${C.blue}/model nvidia${R}`.padEnd(contentW));
        lines.push(`  ${C.blue}/health${R}              ${C.blue}/models${R}            ${C.blue}/clear${R}`.padEnd(contentW));
        lines.push(`  ${C.blue}/exit${R}                ${C.blue}/help${R}`.padEnd(contentW));
    }
    return lines;
}
function render() {
    const [w, h] = getSize();
    const BOX_W = Math.min(82, w - 4);
    const BOX_H = 18;
    const left = Math.max(0, Math.floor((w - BOX_W) / 2));
    const top = Math.max(0, Math.floor((h - BOX_H) / 2));
    const overlayLines = buildOverlayLines(BOX_W);
    hideCursor();
    // Draw the box
    const innerW = BOX_W - 2;
    // Top border
    moveTo(top, left);
    clearLine();
    process.stdout.write(C.bg + C.purple + B.tl + B.h.repeat(innerW) + B.tr + R);
    // Content rows (BOX_H - 3 for borders + prompt)
    const contentRows = BOX_H - 3;
    for (let i = 0; i < contentRows; i++) {
        moveTo(top + 1 + i, left);
        clearLine();
        const content = (overlayLines[i] || '').slice(0, innerW);
        const padded = content + ' '.repeat(Math.max(0, innerW - stripAnsi(content).length));
        process.stdout.write(C.bg + C.purple + B.v + R + C.bg + padded + C.purple + B.v + R);
    }
    // Prompt row (second-to-last)
    const promptRow = top + 1 + contentRows;
    moveTo(promptRow, left);
    clearLine();
    const promptText = `${BOLD} ▸ ${R}${inputBuf}`;
    const promptPadded = promptText + ' '.repeat(Math.max(0, innerW - stripAnsi(promptText).length));
    process.stdout.write(C.bg + C.purple + B.v + R + C.surface + promptPadded + C.purple + B.v + R);
    // Cursor position
    moveTo(promptRow, left + 2 + stripAnsi(BOLD + ' ▸ ' + R).length + inputBuf.length);
    // Bottom border
    moveTo(promptRow + 1, left);
    clearLine();
    process.stdout.write(C.bg + C.purple + B.bl + B.h.repeat(innerW) + B.br + R);
    showCursor();
}
function renderPromptLine() {
    const [w, h] = getSize();
    const BOX_W = Math.min(82, w - 4);
    const BOX_H = 18;
    const left = Math.max(0, Math.floor((w - BOX_W) / 2));
    const top = Math.max(0, Math.floor((h - BOX_H) / 2));
    const innerW = BOX_W - 2;
    const promptRow = top + 1 + (BOX_H - 3);
    moveTo(promptRow, left);
    clearLine();
    const promptText = `${BOLD} ▸ ${R}${inputBuf}`;
    const promptPadded = promptText + ' '.repeat(Math.max(0, innerW - stripAnsi(promptText).length));
    process.stdout.write(C.bg + C.purple + B.v + R + C.surface + promptPadded + C.purple + B.v + R);
    moveTo(promptRow, left + 2 + stripAnsi(BOLD + ' ▸ ' + R).length + inputBuf.length);
    showCursor();
}
let cleanedUp = false;
function cleanup() {
    if (cleanedUp)
        return;
    cleanedUp = true;
    const [w, h] = getSize();
    const BOX_W = Math.min(82, w - 4);
    const BOX_H = 18;
    const left = Math.max(0, Math.floor((w - BOX_W) / 2));
    const top = Math.max(0, Math.floor((h - BOX_H) / 2));
    for (let i = 0; i < BOX_H; i++) {
        moveTo(top + i, left);
        clearLine();
    }
    moveTo(h, 0);
    showCursor();
    process.stdout.write('\n');
    // Restore stdin
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    process.stdin.pause();
    process.exit(0);
}
function main() {
    if (!process.stdin.isTTY) {
        console.log('A3M Router requires a terminal.');
        process.exit(1);
    }
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (data) => {
        if (data === '\x03') {
            // Ctrl+C
            cleanup();
            return;
        }
        if (data === '\x1b') {
            // Escape
            if (inputBuf) {
                inputBuf = '';
                cursorPos = 3;
                render();
            }
            else {
                cleanup();
            }
            return;
        }
        handleInput(data);
    });
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    hideCursor();
    render();
}
main();
//# sourceMappingURL=dashboard.js.map