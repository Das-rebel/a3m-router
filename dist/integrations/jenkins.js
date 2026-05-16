class JenkinsIntegration {
  constructor(url, username, apiToken) { this.url = url; this.username = username; this.apiToken = apiToken; this.baseUrl = url + '/api/json'; }
  async getJobs() { return { action: 'get-jobs' }; }
  async buildJob(jobName) { return { action: 'build', job: jobName }; }
}
module.exports = { JenkinsIntegration };
