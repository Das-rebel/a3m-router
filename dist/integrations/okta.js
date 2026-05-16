class OktaIntegration {
  constructor(domain, apiToken) { this.domain = domain; this.apiToken = apiToken; this.baseUrl = 'https://' + domain + '/api/v1'; }
  async getUsers() { return { action: 'get-users' }; }
  async createUser(profile) { return { action: 'create-user', email: profile.email }; }
}
module.exports = { OktaIntegration };
