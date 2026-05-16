class BasecampIntegration {
  constructor(accountId, apiKey) { this.accountId = accountId; this.apiKey = apiKey; this.baseUrl = 'https://launchpad.37signals.com'; }
  async getProjects() { return { action: 'get-projects' }; }
  async getTodos(projectId) { return { action: 'get-todos', project: projectId }; }
}
module.exports = { BasecampIntegration };
