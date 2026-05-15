/**
 * Linear Integration for A3M Router
 * Project management with Linear
 */
class LinearIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.linear.app/graphql';
  }

  async createIssue(title, description, teamId) {
    return { action: 'create-issue', title, teamId };
  }

  async listTeams() {
    return { action: 'list-teams' };
  }
}
module.exports = { LinearIntegration };
