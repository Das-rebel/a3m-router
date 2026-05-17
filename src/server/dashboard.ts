/**
 * A3M Router - Dashboard UI + API Endpoints
 *
 * Single HTML dashboard served at GET / when the proxy server runs.
 * Dark theme, hacker/terminal aesthetic, auto-refreshes every 5s.
 * API endpoints: /api/stats, /api/providers, /api/requests, /api/clear
 *
 * No React, no build step — vanilla HTML/CSS/JS served inline.
 */

import * as http from "http";

// ============================================================
// Types
// ============================================================

export interface DashboardRequest {
  timestamp: number;
  query: string;
  provider: string;
  model: string;
  latency: number;
  cost: number;
  status: "success" | "error";
  error?: string;
  tokens?: { input: number; output: number };
}

export interface DashboardProvider {
  id: string;
  name: string;
  status: "online" | "offline";
  requestsToday: number;
  costToday: number;
  avgLatency: number;
  lastError: string | null;
  lastErrorTime: number | null;
}

export interface DashboardStats {
  totalRequestsToday: number;
  totalCostToday: number;
  avgLatency: number;
  activeProviders: number;
  totalProviders: number;
  providers: DashboardProvider[];
  recentRequests: DashboardRequest[];
  costByProvider: Record<string, number>;
  uptime: number;
}

// ============================================================
// Dashboard State (in-memory)
// ============================================================

const MAX_REQUESTS = 50;
const recentRequests: DashboardRequest[] = [];
const providerStats: Map<string, DashboardProvider> = new Map();
const startTime = Date.now();

/**
 * Record a request for the dashboard.
 */
export function recordRequest(req: Omit<DashboardRequest, "timestamp">): void {
  const entry: DashboardRequest = { ...req, timestamp: Date.now() };
  recentRequests.unshift(entry);
  if (recentRequests.length > MAX_REQUESTS) recentRequests.pop();

  // Update provider stats
  const existing = providerStats.get(req.provider);
  const today = startOfToday();
  const isToday = true; // We track rolling

  if (existing) {
    existing.requestsToday++;
    existing.costToday += req.cost;
    // Running average latency
    existing.avgLatency =
      (existing.avgLatency * (existing.requestsToday - 1) + req.latency) /
      existing.requestsToday;
    if (req.status === "error") {
      existing.lastError = req.error || "Unknown error";
      existing.lastErrorTime = entry.timestamp;
      existing.status = "offline";
    } else {
      existing.status = "online";
    }
  } else {
    providerStats.set(req.provider, {
      id: req.provider,
      name: req.provider,
      status: req.status === "success" ? "online" : "offline",
      requestsToday: 1,
      costToday: req.cost,
      avgLatency: req.latency,
      lastError: req.status === "error" ? req.error || "Unknown error" : null,
      lastErrorTime: req.status === "error" ? entry.timestamp : null,
    });
  }
}

/**
 * Register a provider as available (called on startup / health check).
 */
export function registerProvider(id: string, name: string): void {
  if (!providerStats.has(id)) {
    providerStats.set(id, {
      id,
      name,
      status: "online",
      requestsToday: 0,
      costToday: 0,
      avgLatency: 0,
      lastError: null,
      lastErrorTime: null,
    });
  }
}

/**
 * Build the full stats snapshot.
 */
function buildStats(): DashboardStats {
  const providers = Array.from(providerStats.values());
  const active = providers.filter((p) => p.status === "online").length;
  const totalCost = providers.reduce((s, p) => s + p.costToday, 0);
  const totalReqs = providers.reduce((s, p) => s + p.requestsToday, 0);
  const latReqs = providers.filter((p) => p.avgLatency > 0);
  const avgLat =
    latReqs.length > 0
      ? latReqs.reduce((s, p) => s + p.avgLatency, 0) / latReqs.length
      : 0;

  const costByProvider: Record<string, number> = {};
  for (const p of providers) {
    costByProvider[p.id] = p.costToday;
  }

  return {
    totalRequestsToday: totalReqs,
    totalCostToday: totalCost,
    avgLatency: avgLat,
    activeProviders: active,
    totalProviders: providers.length,
    providers,
    recentRequests,
    costByProvider,
    uptime: Date.now() - startTime,
  };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ============================================================
// API Route Handler
// ============================================================

/**
 * Handle dashboard API requests. Returns true if the request was handled.
 */
export function handleDashboardRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse
): boolean {
  const url = req.url || "/";

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return true;
  }

  // GET / → Dashboard HTML
  if (url === "/" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(getDashboardHTML());
    return true;
  }

  // GET /api/stats
  if (url === "/api/stats" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(buildStats()));
    return true;
  }

  // GET /api/providers
  if (url === "/api/providers" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Array.from(providerStats.values())));
    return true;
  }

  // GET /api/requests
  if (url === "/api/requests" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(recentRequests));
    return true;
  }

  // POST /api/clear
  if (url === "/api/clear" && req.method === "POST") {
    recentRequests.length = 0;
    for (const p of providerStats.values()) {
      p.requestsToday = 0;
      p.costToday = 0;
      p.avgLatency = 0;
      p.lastError = null;
      p.lastErrorTime = null;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "Dashboard cleared" }));
    return true;
  }

  return false; // Not a dashboard route
}

// ============================================================
// Dashboard HTML
// ============================================================

export function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>A3M Router Dashboard</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg: #0a0a0f;
    --surface: #111118;
    --surface2: #1a1a24;
    --border: #2a2a3a;
    --text: #c8c8d8;
    --text-dim: #6a6a80;
    --green: #00ff88;
    --green-dim: #00aa5a;
    --red: #ff4444;
    --yellow: #ffcc00;
    --cyan: #00ccff;
    --magenta: #ff44ff;
    --orange: #ff8800;
    --mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Consolas', monospace;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    font-size: 13px;
    line-height: 1.5;
    padding: 20px;
    min-height: 100vh;
  }
  a { color: var(--cyan); text-decoration: none; }

  /* Header */
  .header {
    border-bottom: 1px solid var(--green-dim);
    padding-bottom: 12px;
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header h1 {
    color: var(--green);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: 2px;
  }
  .header .uptime { color: var(--text-dim); font-size: 11px; }

  /* Overview cards */
  .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 16px;
    position: relative;
    overflow: hidden;
  }
  .card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: var(--green);
    opacity: 0.6;
  }
  .card.error::before { background: var(--red); }
  .card .label { color: var(--text-dim); font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .card .value { font-size: 22px; font-weight: 700; color: var(--green); }
  .card .value.cost { color: var(--yellow); }
  .card .value.latency { color: var(--cyan); }
  .card .value.providers { color: var(--magenta); }

  /* Section */
  .section { margin-bottom: 28px; }
  .section-title {
    color: var(--green);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 12px;
    padding-left: 10px;
    border-left: 3px solid var(--green);
  }

  /* Provider table */
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left;
    color: var(--text-dim);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
  }
  tr:hover { background: var(--surface2); }
  .status-dot { font-size: 14px; }
  .error-text { color: var(--red); font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* Cost chart */
  .chart-row { display: flex; align-items: center; margin-bottom: 8px; gap: 12px; }
  .chart-label { width: 100px; text-align: right; color: var(--text-dim); font-size: 11px; flex-shrink:0; }
  .chart-bar-wrap { flex: 1; background: var(--surface); border-radius: 3px; height: 20px; position: relative; }
  .chart-bar {
    height: 100%;
    border-radius: 3px;
    min-width: 2px;
    transition: width 0.5s ease;
    position: relative;
  }
  .chart-bar .chart-val {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 10px;
    color: var(--bg);
    font-weight: 600;
  }

  /* Request log */
  .log-wrap { max-height: 420px; overflow-y: auto; }
  .log-wrap::-webkit-scrollbar { width: 6px; }
  .log-wrap::-webkit-scrollbar-track { background: var(--surface); }
  .log-wrap::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  .query-cell { color: var(--text); max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
  }
  .badge.success { background: #0a2a1a; color: var(--green); }
  .badge.error { background: #2a0a0a; color: var(--red); }

  /* Footer */
  .footer {
    margin-top: 32px;
    padding-top: 12px;
    border-top: 1px solid var(--border);
    color: var(--text-dim);
    font-size: 10px;
    text-align: center;
  }
  .refresh-indicator { color: var(--green-dim); }

  /* Responsive */
  @media (max-width: 900px) {
    .cards { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 500px) {
    .cards { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>

<div class="header">
  <h1>&gt;_ A3M ROUTER</h1>
  <div>
    <span class="uptime" id="uptime">uptime: loading...</span>
    <span class="refresh-indicator" id="refresh-dot"> &#9679;</span>
  </div>
</div>

<!-- Overview Cards -->
<div class="cards" id="overview-cards">
  <div class="card">
    <div class="label">Requests Today</div>
    <div class="value" id="stat-requests">--</div>
  </div>
  <div class="card">
    <div class="label">Cost Today</div>
    <div class="value cost" id="stat-cost">$--</div>
  </div>
  <div class="card">
    <div class="label">Avg Latency</div>
    <div class="value latency" id="stat-latency">-- ms</div>
  </div>
  <div class="card">
    <div class="label">Active Providers</div>
    <div class="value providers" id="stat-providers">-- / --</div>
  </div>
</div>

<!-- Provider Status -->
<div class="section">
  <div class="section-title">Provider Status</div>
  <table>
    <thead>
      <tr>
        <th>Status</th>
        <th>Provider</th>
        <th>Requests</th>
        <th>Cost</th>
        <th>Avg Latency</th>
        <th>Last Error</th>
      </tr>
    </thead>
    <tbody id="provider-table"></tbody>
  </table>
</div>

<!-- Cost Chart -->
<div class="section">
  <div class="section-title">Cost by Provider</div>
  <div id="cost-chart">
    <div style="color:var(--text-dim); font-size:11px;">Loading...</div>
  </div>
</div>

<!-- Request Log -->
<div class="section">
  <div class="section-title">Recent Requests <span style="color:var(--text-dim);font-weight:400;">(last 50)</span></div>
  <div class="log-wrap">
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Query</th>
          <th>Provider</th>
          <th>Model</th>
          <th>Latency</th>
          <th>Cost</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="request-log"></tbody>
    </table>
  </div>
</div>

<!-- Clear + Footer -->
<div style="text-align:right; margin-bottom:12px;">
  <button onclick="clearLog()" style="
    background:var(--surface2); color:var(--red); border:1px solid var(--red);
    padding:6px 16px; border-radius:4px; cursor:pointer; font-family:var(--mono);
    font-size:11px; letter-spacing:1px;
  ">CLEAR LOG</button>
</div>

<div class="footer">
  A3M Router Dashboard &middot; Auto-refresh every 5s &middot; <span id="last-refresh">--</span>
</div>

<script>
const CHART_COLORS = ['#00ff88','#00ccff','#ffcc00','#ff44ff','#ff8800','#ff4444','#88ff00','#44ffff'];

function fmt(n, d) { return typeof n === 'number' ? n.toFixed(d || 2) : '--'; }
function fmtCost(c) { return '$' + fmt(c, 6); }
function fmtMs(ms) { return fmt(ms, 0) + ' ms'; }
function fmtTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false, hour:'2-digit', minute:'2-digit', second:'2-digit' });
}
function uptime(ms) {
  const s = Math.floor(ms/1000);
  const h = Math.floor(s/3600);
  const m = Math.floor((s%3600)/60);
  return 'uptime: ' + h + 'h ' + m + 'm';
}
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function trunc(s, n) { return s && s.length > n ? s.substring(0, n) + '...' : s; }

function renderProviders(providers) {
  const tbody = document.getElementById('provider-table');
  if (!providers || providers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="color:var(--text-dim);">No providers registered</td></tr>';
    return;
  }
  tbody.innerHTML = providers.map(function(p) {
    var dot = p.status === 'online' ? '&#x1F7E2;' : '&#x1F534;';
    var errCell = p.lastError
      ? '<td class="error-text" title="' + esc(p.lastError) + '">' + esc(trunc(p.lastError, 30)) + '</td>'
      : '<td style="color:var(--text-dim);">--</td>';
    return '<tr>' +
      '<td class="status-dot">' + dot + '</td>' +
      '<td>' + esc(p.name || p.id) + '</td>' +
      '<td>' + p.requestsToday + '</td>' +
      '<td>' + fmtCost(p.costToday) + '</td>' +
      '<td>' + (p.avgLatency > 0 ? fmtMs(p.avgLatency) : '--') + '</td>' +
      errCell +
    '</tr>';
  }).join('');
}

function renderChart(costByProvider) {
  var el = document.getElementById('cost-chart');
  var keys = Object.keys(costByProvider || {});
  if (keys.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);font-size:11px;">No cost data yet</div>';
    return;
  }
  var max = 0;
  keys.forEach(function(k) { if (costByProvider[k] > max) max = costByProvider[k]; });
  if (max === 0) max = 0.001;
  el.innerHTML = keys.map(function(k, i) {
    var pct = Math.max(1, (costByProvider[k] / max) * 100);
    var color = CHART_COLORS[i % CHART_COLORS.length];
    return '<div class="chart-row">' +
      '<div class="chart-label">' + esc(k) + '</div>' +
      '<div class="chart-bar-wrap">' +
        '<div class="chart-bar" style="width:' + pct + '%;background:' + color + ';">' +
          '<span class="chart-val">' + fmtCost(costByProvider[k]) + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderRequests(requests) {
  var tbody = document.getElementById('request-log');
  if (!requests || requests.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="color:var(--text-dim);">No requests yet</td></tr>';
    return;
  }
  tbody.innerHTML = requests.map(function(r) {
    var badge = r.status === 'success'
      ? '<span class="badge success">OK</span>'
      : '<span class="badge error">ERR</span>';
    return '<tr>' +
      '<td>' + fmtTime(r.timestamp) + '</td>' +
      '<td class="query-cell" title="' + esc(r.query) + '">' + esc(trunc(r.query || '', 50)) + '</td>' +
      '<td>' + esc(r.provider) + '</td>' +
      '<td style="font-size:10px;color:var(--text-dim);">' + esc(r.model) + '</td>' +
      '<td>' + fmtMs(r.latency) + '</td>' +
      '<td>' + fmtCost(r.cost) + '</td>' +
      '<td>' + badge + '</td>' +
    '</tr>';
  }).join('');
}

function clearLog() {
  fetch('/api/clear', { method: 'POST' }).then(function() { refresh(); });
}

async function refresh() {
  try {
    var resp = await fetch('/api/stats');
    var data = await resp.json();
    document.getElementById('stat-requests').textContent = data.totalRequestsToday || 0;
    document.getElementById('stat-cost').textContent = fmtCost(data.totalCostToday);
    document.getElementById('stat-latency').textContent = data.avgLatency > 0 ? fmtMs(data.avgLatency) : '-- ms';
    document.getElementById('stat-providers').textContent = (data.activeProviders || 0) + ' / ' + (data.totalProviders || 0);
    document.getElementById('uptime').textContent = uptime(data.uptime || 0);
    renderProviders(data.providers);
    renderChart(data.costByProvider);
    renderRequests(data.recentRequests);
    document.getElementById('last-refresh').textContent = 'updated ' + new Date().toLocaleTimeString();
    document.getElementById('refresh-dot').style.color = '#00ff88';
    setTimeout(function() { document.getElementById('refresh-dot').style.color = '#00aa5a'; }, 800);
  } catch (e) {
    document.getElementById('last-refresh').textContent = 'fetch error: ' + e.message;
    document.getElementById('refresh-dot').style.color = '#ff4444';
  }
}

refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>`;
}
