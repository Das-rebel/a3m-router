/**
 * Obsidian Vault Integration (Compiled)
 */
const fs = require('fs');
const path = require('path');

class ObsidianVault {
  constructor(config = {}) {
    this.config = { path: config.path || './vault', autoSave: config.autoSave !== false, maxFileAge: 30 };
    this.decisions = [];
    if (!fs.existsSync(this.config.path)) fs.mkdirSync(this.config.path, { recursive: true });
  }

  async saveDecision(decision) {
    this.decisions.push(decision);
    const filepath = path.join(this.config.path, `routing-decision-${decision.id}.md`);
    const content = `# Routing Decision ${decision.id}\n\nDate: ${new Date(decision.timestamp).toISOString()}\n\nProvider: ${decision.selectedProvider}\nModel: ${decision.selectedModel}\n\nReasoning: ${decision.reasoning}\nCost: $${decision.cost}\n`;
    fs.writeFileSync(filepath, content);
    return filepath;
  }

  getRecentDecisions(count = 10) { return this.decisions.slice(-count).reverse(); }
  searchDecisions(query) { return this.decisions.filter(d => d.prompt.includes(query)); }
}

module.exports = { ObsidianVault };
