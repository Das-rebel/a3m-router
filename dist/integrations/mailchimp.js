/**
 * Mailchimp Integration
 * Email marketing platform
 */
class MailchimpIntegration {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://us1.api.mailchimp.com/3.0';
  }
  
  async getLists() {
    return { action: 'get-lists' };
  }
  
  async addSubscriber(listId, email) {
    return { action: 'add-subscriber', list: listId, email };
  }
  
  async sendCampaign(listId, subject) {
    return { action: 'send-campaign', list: listId, subject };
  }
}

module.exports = { MailchimpIntegration };
