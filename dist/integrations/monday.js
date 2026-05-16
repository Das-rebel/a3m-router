class MondayIntegration {
  constructor(apiKey) { this.apiKey = apiKey; this.baseUrl = 'https://api.monday.com/v2'; }
  async getBoards() { return { action: 'get-boards' }; }
  async createItem(boardId, name) { return { action: 'create-item', board: boardId, name }; }
}
module.exports = { MondayIntegration };
