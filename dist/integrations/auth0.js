class Auth0Integration {
  constructor(domain, clientId, clientSecret) { this.domain = domain; this.clientId = clientId; this.clientSecret = clientSecret; this.baseUrl = 'https://' + domain + '/oauth/token'; }
  async getUsers() { return { action: 'get-users' }; }
  async createUser(email, password) { return { action: 'create-user', email }; }
}
module.exports = { Auth0Integration };
