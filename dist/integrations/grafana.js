class GrafanaIntegration {
  constructor(apiKey, baseUrl = 'http://localhost:3000') { this.apiKey = apiKey; this.baseUrl = baseUrl + '/api'; }
  async getDashboards() { return { action: 'get-dashboards' }; }
  async getAlerts() { return { action: 'get-alerts' }; }
}
module.exports = { GrafanaIntegration };
