class PlanetScaleIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.planetscale.com/v1'; }
  async query(sql) { return { action: 'query', sql: sql.slice(0, 50) }; }
  async execute(sql) { return { action: 'execute', sql: sql.slice(0, 50) }; }
}
module.exports = { PlanetScaleIntegration };
