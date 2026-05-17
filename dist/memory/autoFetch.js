"use strict";
/**
 * Auto-Fetch Sync Loop
 *
 * Periodically syncs data from connected tools to provide
 * context-aware routing decisions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoFetch = void 0;
class AutoFetch {
    intervalMs;
    enabled;
    targets;
    lastSync;
    timer = null;
    syncHandlers;
    constructor(config = {}) {
        this.intervalMs = config.intervalMs || 20 * 60 * 1000;
        this.enabled = config.enabled !== false;
        this.targets = new Set(config.targets || ['github', 'notion', 'slack']);
        this.lastSync = new Map();
        this.syncHandlers = new Map();
        this.setupDefaultHandlers();
    }
    setupDefaultHandlers() {
        this.syncHandlers.set('github', async () => this.syncGitHub());
        this.syncHandlers.set('notion', async () => this.syncNotion());
        this.syncHandlers.set('slack', async () => this.syncSlack());
        this.syncHandlers.set('gmail', async () => this.syncGmail());
        this.syncHandlers.set('calendar', async () => this.syncCalendar());
    }
    start() {
        if (!this.enabled)
            return;
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
                }
                catch (error) {
                    const result = { target, success: false, items: 0, timestamp: Date.now(), error: error.message };
                    this.lastSync.set(target, result);
                    results.set(target, result);
                }
            }
        }
        return results;
    }
    getLastSync(target) {
        return this.lastSync.get(target);
    }
    addHandler(target, handler) {
        this.syncHandlers.set(target, handler);
        this.targets.add(target);
    }
    async syncGitHub() {
        return { target: 'github', success: true, items: 0, timestamp: Date.now() };
    }
    async syncNotion() {
        return { target: 'notion', success: true, items: 0, timestamp: Date.now() };
    }
    async syncSlack() {
        return { target: 'slack', success: true, items: 0, timestamp: Date.now() };
    }
    async syncGmail() {
        return { target: 'gmail', success: true, items: 0, timestamp: Date.now() };
    }
    async syncCalendar() {
        return { target: 'calendar', success: true, items: 0, timestamp: Date.now() };
    }
}
exports.AutoFetch = AutoFetch;
exports.default = AutoFetch;
//# sourceMappingURL=autoFetch.js.map