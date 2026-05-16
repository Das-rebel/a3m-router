class SentryIntegration {
  constructor(dsn) { this.dsn = dsn; this.baseUrl = 'https://sentry.io/api'; }
  async captureException(exception) { return { action: 'capture-exception' }; }
  async captureMessage(message, level) { return { action: 'capture-message', level }; }
}
module.exports = { SentryIntegration };
