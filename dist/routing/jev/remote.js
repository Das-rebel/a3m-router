"use strict";
/**
 * Remote backend for Jev-compatible endpoints.
 *
 * Works with:
 *   - api.typesafe.ai (commercial Jev, "System One")
 *   - ekzhang/openjev-sglang (open, Jev HTTP API on SGLang; self-host on Modal)
 *
 * Configure via env:
 *   A3M_JEV_URL      — endpoint base (e.g. https://your-server.modal.direct)
 *   A3M_JEV_API_KEY  — optional bearer token
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.remoteConfigured = remoteConfigured;
exports.remoteDecide = remoteDecide;
function remoteConfigured() {
    return Boolean(process.env.A3M_JEV_URL);
}
async function remoteDecide(req, timeoutMs = 2000) {
    const base = process.env.A3M_JEV_URL;
    if (!base)
        return null;
    const key = process.env.A3M_JEV_API_KEY || "";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = Date.now();
    try {
        const res = await fetch(`${base.replace(/\/$/, "")}/v1/decide`, {
            method: "POST",
            headers: {
                "content-type": "application/json",
                ...(key ? { authorization: `Bearer ${key}` } : {}),
            },
            body: JSON.stringify(req),
            signal: controller.signal,
        });
        if (!res.ok)
            return null;
        const data = (await res.json());
        if (!Array.isArray(data.answers))
            return null;
        return {
            answers: data.answers,
            elapsed_ms: Date.now() - t0,
            backend: "remote",
        };
    }
    catch {
        return null;
    }
    finally {
        clearTimeout(timer);
    }
}
//# sourceMappingURL=remote.js.map