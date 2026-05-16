class SignalIntegration {
  constructor(accountId, password) { this.accountId = accountId; this.password = password; this.baseUrl = 'https://api.signalwire.com'; }
  async sendMessage(to, body) { return { action: 'send-message', to }; }
  async getMessages() { return { action: 'get-messages' }; }
}
module.exports = { SignalIntegration };
