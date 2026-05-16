class FogBugzIntegration {
  constructor(url, apiKey) { this.url = url; this.apiKey = apiKey; this.baseUrl = url + '/api/v3'; }
  async getCases() { return { action: 'get-cases' }; }
  async createCase(title) { return { action: 'create-case', title }; }
}
module.exports = { FogBugzIntegration };
