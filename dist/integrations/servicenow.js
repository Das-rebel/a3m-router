class ServiceNowIntegration {
  constructor(instance, username, password) { this.instance = instance; this.username = username; this.baseUrl = 'https://' + instance + '.service-now.com/api/now'; }
  async getIncidents() { return { action: 'get-incidents' }; }
  async createIncident(shortDescription) { return { action: 'create-incident', short_description: shortDescription }; }
}
module.exports = { ServiceNowIntegration };
