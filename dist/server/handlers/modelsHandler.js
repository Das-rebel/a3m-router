"use strict";
/**
 * A3M Router - Models Handler
 *
 * Handles GET /v1/models
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleModels = handleModels;
const modelMapper_1 = require("../modelMapper");
function jsonResponse(res, statusCode, body) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
    res.end(JSON.stringify(body));
}
function handleModels(_req, res, _ctx) {
    const models = (0, modelMapper_1.listAvailableModels)();
    jsonResponse(res, 200, { object: 'list', data: models });
}
exports.default = handleModels;
//# sourceMappingURL=modelsHandler.js.map