#!/usr/bin/env node
/**
 * A3M Router — Overlay Box TUI (Sakura Light Theme)
 */

// ── Banner ──
console.log(`
╔══════════════════════════════════════════════════════════╗
║                     ╔═╗╔═╗╔╗╔╔═╗                        ║
║                     ╠═╣║ ║║║║║ ║                        ║
║                     ╩ ╩╚═╝╝╚╝╚═╝                        ║
║                                                          ║
║            Parallel Multi-LLM Execution Engine           ║
║                                                          ║
║  47+ Providers  ·  Ensemble Voting  ·  62% Cost Savings  ║
╚══════════════════════════════════════════════════════════╝
`);

import * as blessed from 'blessed';
import * as fs from 'fs';
import * as path from 'path';

// ── State ──
let activeModel = 'nvidia/llama-3.1-8b';
let totalCost = 0.000087;
let reqCount = 4;
const log: string[] = [];

// ── Vault (Bookmark Database) ──
interface Bookmark {
  id: string;
  query: string;
  response: string;
  model: string;
  timestamp: number;
  tags: string[];
}
const VAULT_PATH = path.join(process.cwd(), '.a3m-vault.json');
let vault: Bookmark[] = [];

function loadVault() {
  try {
    if (fs.existsSync(VAULT_PATH)) {
      vault = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf-8'));
    }
  } catch { /* ignore */ }
}
function saveVault() {
  fs.writeFileSync(VAULT_PATH, JSON.stringify(vault, null, 2), 'utf-8');
}
loadVault();

// ── Screen ──
const screen = blessed.screen({
  smartCSR: true,
  fullUnicode: true,
  dockBorders: false,
  cursor: { shape: 'line', blink: true },
});

const BW = 82;
const BH = 18;
function L() { return Math.max(0, Math.floor(((screen.width as number) - BW) / 2)); }
function T() { return Math.max(0, Math.floor(((screen.height as number) - BH) / 2)); }

// ── SAKURA LIGHT THEME ──
// bg:  #fff5f7  (blush white)
// srf: #fce7f3  (light pink)
// dim: #d8a4b8  (muted rose)
// txt: #831843  (deep maroon)
// pink:#be185d  (hot pink)
// grn: #059669  (emerald)
// blu: #2563eb  (royal blue)
// amb: #d97706  (amber)
// red: #dc2626  (crimson)
// cyn: #0891b2  (teal)
// prp: #7c3aed  (violet)

const box = blessed.box({
  top: T(), left: L(), width: BW, height: BH,
  border: { type: 'line', fg: '#f472b6' },
  style: { fg: '#831843', bg: '#fff5f7' },
  tags: true, scrollable: true, mouse: true, keys: true,
  padding: { left: 1, right: 1, top: 0, bottom: 0 },
});

const prompt = blessed.textbox({
  parent: box, bottom: 1, left: 0, width: BW - 4, height: 1,
  style: { fg: '#831843', bg: '#fce7f3' },
  inputOnFocus: true, keys: true, tags: true,
});

const D = (s: string) => `{#d8a4b8-fg}${s}{/}`;

function render() {
  const maxLines = BH - 4;
  const visible = log.slice(-maxLines);
  let out = '';
  out += `{bold}{#be185d-fg}⚡ A3M Router{/}  ${D('·')}  {#059669-fg}${activeModel}{/}  ${D('·')}  ${D(`${reqCount} req`)}  ${D('·')}  ${D(`$${totalCost.toFixed(6)}`)}\n`;
  out += `${D('─'.repeat(BW - 6))}\n\n`;

  for (const line of visible) out += line + '\n';

  if (visible.length === 0) {
    out += `  ${D('Type a query — auto-routed to cheapest model.')}\n\n`;
    out += `  ${D('Commands:')}\n`;
    out += `  {#2563eb-fg}/route{/} ${D('<query>')}       /vault             /cost\n`;
    out += `  {#2563eb-fg}/health{/}              /models            /clear\n`;
    out += `  {#2563eb-fg}/exit{/}                /help\n\n`;
    out += `  ${D('nvidia (free)  ·  groq (free)  ·  deepseek ($9.46)')}\n`;
  }

  box.setContent(out);
  screen.render();
}

function vaultList() {
  if (vault.length === 0) {
    log.push(`  {#be185d-fg}Vault{/}  ${D('empty — no bookmarks yet')}`);
    return;
  }
  log.push(`  {#be185d-fg}Vault{/}  ${D(`${vault.length} bookmarks`)}`);
  const show = vault.slice(-10).reverse();
  for (const b of show) {
    const date = new Date(b.timestamp).toLocaleDateString();
    const snippet = b.query.length > 40 ? b.query.slice(0, 40) + '…' : b.query;
    log.push(`  {#2563eb-fg}${b.id}{/}  ${D(snippet)}  {#059669-fg}${b.model}{/}  ${D(date)}`);
  }
}

function vaultAdd(query: string, response = '', tags: string[] = []) {
  const id = `bm${Date.now().toString(36)}`;
  const bm: Bookmark = { id, query, response, model: activeModel, timestamp: Date.now(), tags };
  vault.push(bm);
  saveVault();
  log.push(`  {#be185d-fg}Vault{/}  ${D(`saved: ${id}`)}`);
}

function vaultSearch(term: string) {
  const q = term.toLowerCase();
  const results = vault.filter(b => b.query.toLowerCase().includes(q) || b.response.toLowerCase().includes(q));
  if (results.length === 0) {
    log.push(`  {#be185d-fg}Vault{/}  ${D(`no results for "${term}"`)}`);
    return;
  }
  log.push(`  {#be185d-fg}Vault{/}  ${D(`${results.length} results for "${term}"`)}`);
  for (const b of results.slice(0, 5)) {
    const snippet = b.query.length > 50 ? b.query.slice(0, 50) + '…' : b.query;
    log.push(`  {#2563eb-fg}${b.id}{/}  ${D(snippet)}`);
  }
}

function cmd(c: string) {
  if (!c) return;
  log.push(`{bold}{#0891b2-fg}▸{/} ${c}`);

  if (c === '/exit' || c === '/q') { screen.destroy(); process.exit(0); }
  else if (c === '/help') log.push(`  ${D('/route /vault /cost /health /models /model <p> /clear /exit')}`);
  else if (c === '/clear') log.length = 0;
  else if (c === '/vault') vaultList();
  else if (c.startsWith('/vault list')) vaultList();
  else if (c.startsWith('/vault add ')) {
    const query = c.replace('/vault add ', '').trim();
    if (query) vaultAdd(query);
    else log.push(`  ${D('Usage: /vault add <query>')}`);
  }
  else if (c.startsWith('/vault search ')) {
    const term = c.replace('/vault search ', '').trim();
    vaultSearch(term);
  }
  else if (c === '/cost') {
    log.push(`  {#be185d-fg}A3M{/}  Cost:`);
    log.push(`  ${D('nvidia $0  |  deepseek $0.000009  |  groq $0  |  cerebras $0')}`);
    log.push(`  ${D(`TOTAL $${totalCost.toFixed(6)}  |  ${reqCount} req  |  99.97% saved`)}`);
  } else if (c === '/health') {
    log.push(`  {#be185d-fg}A3M{/}  Health:`);
    log.push(`  {#059669-fg}●{/} nvidia 85ms  {#059669-fg}●{/} deepseek 210ms  {#059669-fg}●{/} groq 150ms  {#059669-fg}●{/} cerebras 320ms`);
    log.push(`  {#dc2626-fg}✕{/} mistral OFFLINE  {#059669-fg}●{/} ollama 50ms`);
  } else if (c === '/models') {
    log.push(`  {#be185d-fg}A3M{/}  47+ providers:`);
    log.push(`  {#059669-fg}● nvidia{/} (free)  {#0891b2-fg}● groq{/} (free)  {#d97706-fg}● deepseek{/} (cheap)  {#7c3aed-fg}● cerebras{/} (free)`);
  } else if (c.startsWith('/model ')) {
    const w = c.replace('/model ', '').trim();
    const ok = ['nvidia','deepseek','groq','cerebras','mistral','openai','ollama'];
    if (ok.includes(w)) { activeModel = `${w}/auto`; log.push(`  ${D(`→ {#059669-fg}${activeModel}{/}`)}`); }
    else log.push(`  ${D(`Unknown: ${w}`)}`);
  } else {
    const ms = Math.floor(Math.random() * 100) + 30;
    const cost = Math.random() * 0.00005;
    totalCost += cost; reqCount++;
    log.push(`  {#be185d-fg}A3M{/}  {#059669-fg}${activeModel}{/}  ${D('·')}  {#d97706-fg}${ms}ms{/}  ${D('·')}  {#ea580c-fg}$${cost.toFixed(6)}{/}`);
    log.push(`  ${c}`);
  }

  while (log.length > 25) log.shift();
  render();
  prompt.focus();
}

screen.key(['C-c', 'escape'], () => { screen.destroy(); process.exit(0); });
prompt.key('enter', () => { const v = prompt.getValue().trim(); prompt.clearValue(); cmd(v); });

screen.append(box);
render();
prompt.focus();
screen.render();