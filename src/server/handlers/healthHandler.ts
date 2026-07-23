/**
 * A3M Router - Health Handler
 *
 * Handles GET /health
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { getAvailableProviders } from '../../providers/providerConfig';
import { costTracker, requestLogs } from '../state';

function jsonResponse(res: http.ServerResponse, statusCode: number, body: object): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

export async function handleHealth(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _ctx: RouteContext
): Promise<void> {
  const available = getAvailableProviders();
  const providerStatus: Record<string, object> = {};
  let healthyCount = 0;

  for (const [id, provider] of Object.entries(available)) {
    const hasKey = !!provider.apiKey;
    const isAvailable = provider.type !== 'api' || hasKey;
    providerStatus[id] = {
      name: provider.name || id,
      type: provider.type,
      models: provider.models?.length || 0,
      available: isAvailable,
    };
    if (isAvailable) healthyCount++;
  }

  const costSummary = costTracker.getSummary();

  jsonResponse(res, 200, {
    status: 'ok',
    version: '2.14.60',
    providers: {
      total: Object.keys(available).length,
      healthy: healthyCount,
      details: providerStatus,
    },
    cost: {
      total: costSummary.total_cost,
      requests: costSummary.request_count,
    },
    uptime: process.uptime(),
    recentRequests: requestLogs.slice(-20),
  });
}

export default handleHealth;
