/**
 * OAuth Integration Manager (Compiled)
 */
const OAUTH_PROVIDERS = {
  github: { name: 'GitHub', authUrl: 'https://github.com/login/oauth/authorize', tokenUrl: 'https://github.com/login/oauth/access_token', scopes: ['repo'], baseUrl: 'https://api.github.com' },
  slack: { name: 'Slack', authUrl: 'https://slack.com/oauth/v2/authorize', tokenUrl: 'https://slack.com/api/oauth.v2.access', scopes: ['chat:write'], baseUrl: 'https://slack.com/api' },
  gmail: { name: 'Gmail', authUrl: 'https://accounts.google.com/o/oauth2/v2/auth', tokenUrl: 'https://oauth2.googleapis.com/token', scopes: ['https://www.googleapis.com/auth/gmail.send'], baseUrl: 'https://gmail.googleapis.com/gmail/v1' },
  notion: { name: 'Notion', authUrl: 'https://api.notion.com/v1/oauth/authorize', tokenUrl: 'https://api.notion.com/v1/oauth/token', scopes: ['read_content'], baseUrl: 'https://api.notion.com/v1' }
};

class OAuthManager {
  constructor() { this.configs = new Map(); this.tokens = new Map(); this.state = new Map(); }
  configure(provider, config) { this.configs.set(provider, config); }
  getAuthUrl(provider) {
    const config = this.configs.get(provider), info = OAUTH_PROVIDERS[provider];
    if (!config || !info) throw new Error(`Unknown provider: ${provider}`);
    const state = `${provider}_${Date.now()}`;
    this.state.set(provider, state);
    return `${info.authUrl}?client_id=${config.clientId}&redirect_uri=${config.redirectUri}&scope=${info.scopes.join(' ')}&state=${state}`;
  }
  isConnected(provider) { const t = this.tokens.get(provider); return !(!t || (t.expiresAt && Date.now() >= t.expiresAt)); }
  getConnectedProviders() { return Array.from(this.tokens.keys()).filter(p => this.isConnected(p)); }
  disconnect(provider) { this.tokens.delete(provider); this.state.delete(provider); }
}

module.exports = { OAuthManager, OAUTH_PROVIDERS };
