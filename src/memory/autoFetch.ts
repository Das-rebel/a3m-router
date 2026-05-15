/**
 * Auto-Fetch Sync Loop
 * 
 * Periodically syncs data from connected tools to provide
 * context-aware routing decisions.
 */

export interface SyncConfig {
  intervalMs: number;
  enabled: boolean;
  targets: string[];
}

export interface SyncResult {
  target: string;
  success: boolean;
  items: number;
  timestamp: number;
  error?: string;
}

export class AutoFetch {
  private intervalMs: number;
  private enabled: boolean;
  private targets: Set<string>;
  private lastSync: Map<string, SyncResult>;
  private timer: NodeJS.Timeout | null = null;
  private syncHandlers: Map<string, () => Promise<SyncResult>>;

  constructor(config: Partial<SyncConfig> = {}) {
    this.intervalMs = config.intervalMs || 20 * 60 * 1000;
    this.enabled = config.enabled !== false;
    this.targets = new Set(config.targets || ['github', 'notion', 'slack']);
    this.lastSync = new Map();
    this.syncHandlers = new Map();
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers() {
    this.syncHandlers.set('github', async () => this.syncGitHub());
    this.syncHandlers.set('notion', async () => this.syncNotion());
    this.syncHandlers.set('slack', async () => this.syncSlack());
    this.syncHandlers.set('gmail', async () => this.syncGmail());
    this.syncHandlers.set('calendar', async () => this.syncCalendar());
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

  async syncAll(): Promise<Map<string, SyncResult>> {
    const results = new Map<string, SyncResult>();
    for (const target of this.targets) {
      const handler = this.syncHandlers.get(target);
      if (handler) {
        try {
          const result = await handler();
          this.lastSync.set(target, result);
          results.set(target, result);
        } catch (error: any) {
          const result: SyncResult = { target, success: false, items: 0, timestamp: Date.now(), error: error.message };
          this.lastSync.set(target, result);
          results.set(target, result);
        }
      }
    }
    return results;
  }

  getLastSync(target: string): SyncResult | undefined {
    return this.lastSync.get(target);
  }

  addHandler(target: string, handler: () => Promise<SyncResult>) {
    this.syncHandlers.set(target, handler);
    this.targets.add(target);
  }

  private async syncGitHub(): Promise<SyncResult> {
    return { target: 'github', success: true, items: 0, timestamp: Date.now() };
  }

  private async syncNotion(): Promise<SyncResult> {
    return { target: 'notion', success: true, items: 0, timestamp: Date.now() };
  }

  private async syncSlack(): Promise<SyncResult> {
    return { target: 'slack', success: true, items: 0, timestamp: Date.now() };
  }

  private async syncGmail(): Promise<SyncResult> {
    return { target: 'gmail', success: true, items: 0, timestamp: Date.now() };
  }

  private async syncCalendar(): Promise<SyncResult> {
    return { target: 'calendar', success: true, items: 0, timestamp: Date.now() };
  }
}

export default AutoFetch;
