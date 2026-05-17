/**
 * A3M Router - Agent & Tool Integrations
 * 
 * Connect to popular services for AI agent workflows:
 * - GitHub (PRs, issues, repos)
 * - Slack (messaging)
 * - Telegram (bots)
 * - Notion (docs, databases)
 * - Linear (project management)
 * - Jira (Atlassian)
 * - Gmail (email)
 * - Discord (messaging)
 * - Airtable (databases)
 * - Google Calendar (scheduling)
 */

const GitHubIntegration = require('./github.js').GitHubIntegration;
const SlackIntegration = require('./slack.js').SlackIntegration;
const TelegramIntegration = require('./telegram.js').TelegramIntegration;
const NotionIntegration = require('./notion.js').NotionIntegration;
const LinearIntegration = require('./linear.js').LinearIntegration;
const JiraIntegration = require('./jira.js').JiraIntegration;
const GmailIntegration = require('./gmail.js').GmailIntegration;
const DiscordIntegration = require('./discord.js').DiscordIntegration;
const AirtableIntegration = require('./airtable.js').AirtableIntegration;
const GoogleCalendarIntegration = require('./google-calendar.js').GoogleCalendarIntegration;
const WhatsAppIntegration = require('./whatsapp.js').WhatsAppIntegration;

/**
 * Factory to create integrations
 */
function createIntegration(type, config) {
  switch (type) {
    case 'github': return new GitHubIntegration(config.apiKey);
    case 'slack': return new SlackIntegration(config.webhookUrl);
    case 'telegram': return new TelegramIntegration(config.botToken);
    case 'notion': return new NotionIntegration(config.apiKey);
    case 'linear': return new LinearIntegration(config.apiKey);
    case 'jira': return new JiraIntegration(config.domain, config.email, config.apiToken);
    case 'gmail': return new GmailIntegration(config.credentials);
    case 'discord': return new DiscordIntegration(config.webhookUrl);
    case 'airtable': return new AirtableIntegration(config.apiKey, config.baseId);
    case 'google-calendar': return new GoogleCalendarIntegration(config.credentials);
    case 'whatsapp': return new WhatsAppIntegration(config.phoneNumberId, config.accessToken);
    default: throw new Error(`Unknown integration type: ${type}`);
  }
}

module.exports = {
  // Integrations
  GitHubIntegration,
  SlackIntegration,
  TelegramIntegration,
  NotionIntegration,
  LinearIntegration,
  JiraIntegration,
  GmailIntegration,
  DiscordIntegration,
  AirtableIntegration,
  GoogleCalendarIntegration,
  WhatsAppIntegration,
  // Factory
  createIntegration
};
