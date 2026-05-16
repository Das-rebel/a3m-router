/**
 * Salesforce Integration
 * CRM platform
 */
class SalesforceIntegration {
  constructor(instanceUrl, accessToken) {
    this.instanceUrl = instanceUrl;
    this.accessToken = accessToken;
    this.baseUrl = `${instanceUrl}/services/data/v58.0`;
  }
  
  async query(soql) {
    return { action: 'query', soql: soql.slice(0, 50) };
  }
  
  async createRecord(object, data) {
    return { action: 'create-record', object };
  }
  
  async updateRecord(object, id, data) {
    return { action: 'update-record', object, id };
  }
}

module.exports = { SalesforceIntegration };
