class SegmentIntegration {
  constructor(writeKey) { this.writeKey = writeKey; this.baseUrl = 'https://api.segment.io/v1'; }
  async identify(userId, traits) { return { action: 'identify', userId }; }
  async track(event, properties) { return { action: 'track', event }; }
}
module.exports = { SegmentIntegration };
