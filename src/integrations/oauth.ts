/**
 * OAuth Integration Manager
 * 
 * Provides one-click OAuth for GitHub, Slack, Gmail, Notion
 * with typed tool wrappers for each service.
 */

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  tokenType: string;
}

export interface OAuthProvider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  baseUrl: string;
}

// Supported OAuth providers
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  github: {
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'read:user', 'notifications'],
    baseUrl: 'https://api.github.com'
  },
  slack: {
    name: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    baseUrl: 'https://slack.com/api'
  },
  gmail: {
    name: 'Gmail',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.readonly'],
    baseUrl: 'https://gmail.googleapis.com/gmail/v1'
  },
  notion: {
    name: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read_content', 'update_content', 'insert_database'],
    baseUrl: 'https://api.notion.com/v1'
  },
  googlecalendar: {
    name: 'Google Calendar',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    baseUrl: 'https://www.googleapis.com/calendar/v3'
  }
};

export class OAuthManager {
  private configs: Map<string, OAuthConfig>;
  private tokens: Map<string, OAuthTokens>;
  private state: Map<string, string>; // CSRF state

  constructor() {
    this.configs = new Map();
    this.tokens = new Map();
    this.state = new Map();
  }

  /**
   * Configure an OAuth provider
   */
  configure(provider: string, config: OAuthConfig) {
    this.configs.set(provider, config);
  }

  /**
   * Generate authorization URL for a provider
   */
  getAuthUrl(provider: string, state?: string): string {
    const config = this.configs.get(provider);
    const providerInfo = OAUTH_PROVIDERS[provider];
    
    if (!config || !providerInfo) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // Generate CSRF state
    const csrfState = state || this.generateState(provider);
    this.state.set(provider, csrfState);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      scope: providerInfo.scopes.join(' '),
      state: csrfState,
      response_type: 'code'
    });

    return `${providerInfo.authUrl}?${params.toString()}`;
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(provider: string, code: string, state: string): Promise<OAuthTokens> {
    const config = this.configs.get(provider);
    const providerInfo = OAUTH_PROVIDERS[provider];
    
    if (!config || !providerInfo) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // Validate state
    const savedState = this.state.get(provider);
    if (savedState && savedState !== state) {
      throw new Error('Invalid OAuth state - CSRF mismatch');
    }

    // Exchange code for tokens
    const response = await fetch(providerInfo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const tokens = await response.json() as OAuthTokens & { expires_in: number };
    
    // Store tokens with expiration
    const tokensWithExpiry: OAuthTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : 0,
      tokenType: tokens.tokenType || 'Bearer'
    };
    
    this.tokens.set(provider, tokensWithExpiry);
    return tokensWithExpiry;
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getAccessToken(provider: string): Promise<string> {
    const tokens = this.tokens.get(provider);
    
    if (!tokens) {
      throw new Error(`No tokens for provider: ${provider}`);
    }

    // Check if expired
    if (tokens.expiresAt && Date.now() >= tokens.expiresAt - 60000) {
      if (tokens.refreshToken) {
        await this.refreshToken(provider, tokens.refreshToken);
      } else {
        throw new Error(`Token expired for ${provider} and no refresh token available`);
      }
    }

    return this.tokens.get(provider)!.accessToken;
  }

  /**
   * Refresh access token
   */
  async refreshToken(provider: string, refreshToken: string) {
    const config = this.configs.get(provider);
    const providerInfo = OAUTH_PROVIDERS[provider];
    
    if (!config || !providerInfo) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const response = await fetch(providerInfo.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.statusText}`);
    }

    const tokens = await response.json() as OAuthTokens & { expires_in: number };
    
    this.tokens.set(provider, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken || refreshToken,
      expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : 0,
      tokenType: tokens.tokenType || 'Bearer'
    });
  }

  /**
   * Make authenticated API request
   */
  async apiRequest(provider: string, endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await this.getAccessToken(provider);
    const providerInfo = OAUTH_PROVIDERS[provider];
    
    if (!providerInfo) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const response = await fetch(`${providerInfo.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Check if provider is connected
   */
  isConnected(provider: string): boolean {
    const tokens = this.tokens.get(provider);
    if (!tokens) return false;
    if (tokens.expiresAt && Date.now() >= tokens.expiresAt) return false;
    return true;
  }

  /**
   * Get connected providers
   */
  getConnectedProviders(): string[] {
    return Array.from(this.tokens.keys()).filter(p => this.isConnected(p));
  }

  /**
   * Disconnect provider
   */
  disconnect(provider: string) {
    this.tokens.delete(provider);
    this.state.delete(provider);
  }

  private generateState(provider: string): string {
    return `${provider}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }
}

export default OAuthManager;
