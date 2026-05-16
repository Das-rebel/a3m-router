class ZoomIntegration {
  constructor(apiKey, apiSecret) { this.apiKey = apiKey; this.apiSecret = apiSecret; this.baseUrl = 'https://api.zoom.us/v2'; }
  async createMeeting(topic, duration) { return { action: 'create-meeting', topic }; }
  async listMeetings(userId) { return { action: 'list-meetings', user: userId }; }
}
module.exports = { ZoomIntegration };
