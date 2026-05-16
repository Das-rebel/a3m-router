class OpenRouterIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://openrouter.ai/api/v1'; }
  async complete(model, prompt) { return { action: 'complete', model, prompt: prompt.slice(0, 50) }; }
  async getModels() { return { action: 'get-models' }; }
}
module.exports = { OpenRouterIntegration };
