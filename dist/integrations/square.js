class SquareIntegration {
  constructor(accessToken, locationId) { this.accessToken = accessToken; this.locationId = locationId; this.baseUrl = 'https://connect.squareup.com/v2'; }
  async createPayment(amount, currency) { return { action: 'create-payment', amount }; }
  async getPayments() { return { action: 'get-payments' }; }
}
module.exports = { SquareIntegration };
