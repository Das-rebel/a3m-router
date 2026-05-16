class TeamsIntegration {
  constructor(webhookUrl) { this.webhookUrl = webhookUrl; }
  async sendMessage(text) { return { action: 'send-message', text: text.slice(0, 50) }; }
  async sendCard(card) { return { action: 'send-card' }; }
}
module.exports = { TeamsIntegration };
