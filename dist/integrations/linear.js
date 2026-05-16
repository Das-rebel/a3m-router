class LinearIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.linear.app/graphql'; }
  async createIssue(title, teamId) { return { action: 'create-issue', title, team: teamId }; }
  async getTeams() { return { action: 'get-teams' }; }
}
module.exports = { LinearIntegration };
