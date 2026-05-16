class QdrantIntegration {
  constructor(url, apiKey) { this.url = url; this.apiKey = apiKey; this.baseUrl = url + '/collections'; }
  async getCollections() { return { action: 'get-collections' }; }
  async createCollection(name, vectors) { return { action: 'create-collection', name }; }
}
module.exports = { QdrantIntegration };
