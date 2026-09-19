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
export declare function remoteConfigured(): boolean;
export declare function remoteDecide(req: JevRequest, timeoutMs?: number): Promise<JevResponse | null>;
