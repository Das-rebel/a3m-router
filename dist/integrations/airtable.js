/**
 * Airtable Integration for A3M Router
 * Airtable API
 */
class AirtableIntegration {
  constructor(apiKey, baseId) {
    this.apiKey = apiKey;
    this.baseId = baseId;
    this.baseUrl = 'https://api.airtable.com/v0';
  }

  async listRecords(tableName, filterByFormula) {
    return { action: 'list-records', tableName };
  }

  async createRecord(tableName, fields) {
    return { action: 'create-record', tableName, fields };
  }
}
module.exports = { AirtableIntegration };
