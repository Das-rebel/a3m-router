class SonosIntegration {
  constructor(host, port = 1400) { this.host = host; this.port = port; this.baseUrl = 'http://' + host + ':' + port; }
  async getZones() { return { action: 'get-zones' }; }
  async play(uri) { return { action: 'play', uri }; }
}
module.exports = { SonosIntegration };
