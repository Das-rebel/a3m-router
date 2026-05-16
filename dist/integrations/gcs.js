class GCSIntegration {
  constructor(projectId, keyFile) { this.projectId = projectId; this.keyFile = keyFile; this.baseUrl = 'https://storage.googleapis.com/storage/v1'; }
  async listBuckets() { return { action: 'list-buckets', project: projectId }; }
  async uploadFile(bucket, name, data) { return { action: 'upload', bucket, name }; }
}
module.exports = { GCSIntegration };
