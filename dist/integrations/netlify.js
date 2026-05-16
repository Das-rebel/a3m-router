class NetlifyIntegration {
  constructor(accessToken) { this.accessToken = accessToken; this.baseUrl = 'https://api.netlify.com/api/v1'; }
  async getSites() { return { action: 'get-sites' }; }
  async createDeploy(siteId, files) { return { action: 'create-deploy', site: siteId }; }
}
module.exports = { NetlifyIntegration };
