class PrometheusIntegration {
  constructor(url) { this.url = url; this.baseUrl = url + '/api/v1'; }
  async query(query) { return { action: 'query', expr: query.slice(0, 50) }; }
  async getRules() { return { action: 'get-rules' }; }
}
module.exports = { PrometheusIntegration };
