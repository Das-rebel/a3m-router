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

import type { JevRequest, JevResponse } from "./types";

export function remoteConfigured(): boolean {
  return Boolean(process.env.A3M_JEV_URL);
}

export async function remoteDecide(req: JevRequest, timeoutMs = 2000): Promise<JevResponse | null> {
  const base = process.env.A3M_JEV_URL;
  if (!base) return null;
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
    if (!res.ok) return null;
    const data = (await res.json()) as { answers?: unknown };
    if (!Array.isArray(data.answers)) return null;
    return {
      answers: data.answers as JevResponse["answers"],
      elapsed_ms: Date.now() - t0,
      backend: "remote",
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
