class WeightsIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.week.com/v1'; }
  async getProjects() { return { action: 'get-projects' }; }
  async getTasks(projectId) { return { action: 'get-tasks', project: projectId }; }
}
module.exports = { WeightsIntegration };
