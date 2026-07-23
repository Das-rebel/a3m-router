/**
 * A3M Router - Models Handler
 *
 * Handles GET /v1/models
 */

import * as http from 'http';
import { RouteContext } from '../router';
import { listAvailableModels } from '../modelMapper';

function jsonResponse(res: http.ServerResponse, statusCode: number, body: object): void {
  res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

export function handleModels(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  _ctx: RouteContext
): void {
  const models = listAvailableModels();
  jsonResponse(res, 200, { object: 'list', data: models });
}

export default handleModels;
