class WemoIntegration {
  constructor(host) { this.host = host; this.baseUrl = 'http://' + host + ':49153'; }
  async getDevices() { return { action: 'get-devices' }; }
  async setState(deviceId, state) { return { action: 'set-state', device: deviceId }; }
}
module.exports = { WemoIntegration };
