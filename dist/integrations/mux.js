class MuxIntegration {
  constructor(tokenId, secretKey) { this.tokenId = tokenId; this.secretKey = secretKey; this.baseUrl = 'https://api.mux.com/video/v1'; }
  async getUploadURL() { return { action: 'get-upload-url' }; }
  async getAssets() { return { action: 'get-assets' }; }
}
module.exports = { MuxIntegration };
