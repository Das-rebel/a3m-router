class ShortcutIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.app.shortcut.com/api/v1'; }
  async getStories() { return { action: 'get-stories' }; }
  async createStory(name, description) { return { action: 'create-story', name }; }
}
module.exports = { ShortcutIntegration };
