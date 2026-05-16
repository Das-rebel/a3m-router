class AnthropicIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.anthropic.com'; }
  async complete(model, messages) { return { action: 'complete', model }; }
  async getModels() { return { action: 'get-models' }; }
}
module.exports = { AnthropicIntegration };
