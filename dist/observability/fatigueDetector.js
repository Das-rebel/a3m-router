"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkProviderFatigue = checkProviderFatigue;
exports.formatFatigueReport = formatFatigueReport;
const metrics_1 = require("./metrics");
function checkProviderFatigue() {
    const allMetrics = (0, metrics_1.getMetrics)().getMetrics();
    const byProvider = {};
    for (const m of allMetrics) {
        const p = (m.labels || {}).provider;
        if (!p)
            continue;
        if (!byProvider[p])
            byProvider[p] = { req: 0, err: 0, lat: [] };
        if (m.type === 'histogram' && m.name.includes('latency') && typeof m.value === 'number')
            byProvider[p].lat.push(m.value * 1000);
    }
    const reports = [];
    let anyAction = false;
    for (const [provider, data] of Object.entries(byProvider)) {
        const errRate = data.req > 0 ? data.err / data.req : 0;
        const healthy = errRate < 0.1;
        if (!healthy)
            anyAction = true;
        reports.push({
            provider, queriesCount: data.req, errorRate: errRate,
            healthy,
            recommendedAction: healthy ? 'No action needed' : `Error rate ${(errRate * 100).toFixed(1)}% — add fallback`,
        });
    }
    return {
        reports,
        summary: anyAction ? '⚠️ Provider fatigue detected' : '✅ All providers healthy',
        anyActionNeeded: anyAction,
    };
}
function formatFatigueReport() {
    const r = checkProviderFatigue();
    let out = `  ${r.summary}\n  Checked ${r.reports.length} providers\n\n`;
    for (const rep of r.reports) {
        out += `  ${rep.healthy ? '✅' : '⚠️'} ${rep.provider}\n     Queries: ${rep.queriesCount} | Errors: ${(rep.errorRate * 100).toFixed(1)}%\n`;
        if (!rep.healthy)
            out += `     ⚠️  ${rep.recommendedAction}\n`;
        out += '\n';
    }
    return out;
}
//# sourceMappingURL=fatigueDetector.js.map