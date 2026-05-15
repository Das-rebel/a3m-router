/**
 * Auto-Fetch Sync Loop (Compiled)
 */
class AutoFetch {
  constructor(config = {}) {
    this.intervalMs = config.intervalMs || 20 * 60 * 1000;
    this.enabled = config.enabled !== false;
    this.targets = new Set(config.targets || ['github', 'notion', 'slack']);
    this.lastSync = new Map();
    this.syncHandlers = new Map();
    this.timer = null;
    this.setupDefaultHandlers();
  }

  setupDefaultHandlers() {
    this.syncHandlers.set('github', async () => ({ target: 'github', success: true, items: 0, timestamp: Date.now() }));
    this.syncHandlers.set('notion', async () => ({ target: 'notion', success: true, items: 0, timestamp: Date.now() }));
    this.syncHandlers.set('slack', async () => ({ target: 'slack', success: true, items: 0, timestamp: Date.now() }));
    this.syncHandlers.set('gmail', async () => ({ target: 'gmail', success: true, items: 0, timestamp: Date.now() }));
    this.syncHandlers.set('calendar', async () => ({ target: 'calendar', success: true, items: 0, timestamp: Date.now() }));
  }

  start() {
    if (!this.enabled) return;
    this.syncAll();
    this.timer = setInterval(() => this.syncAll(), this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async syncAll() {
    const results = new Map();
    for (const target of this.targets) {
      const handler = this.syncHandlers.get(target);
      if (handler) {
        try {
          const result = await handler();
          this.lastSync.set(target, result);
          results.set(target, result);
        } catch (error) {
          const result = { target, success: false, items: 0, timestamp: Date.now(), error: error.message };
          this.lastSync.set(target, result);
          results.set(target, result);
        }
      }
    }
    return results;
  }

  getLastSync(target) { return this.lastSync.get(target); }
  addHandler(target, handler) { this.syncHandlers.set(target, handler); this.targets.add(target); }
}

module.exports = { AutoFetch };
