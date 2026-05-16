# A3M Router - Integration Guide

## Overview

A3M Router includes **116 integrations** across multiple categories:

| Category | Count | Examples |
|----------|-------|----------|
| Project Management | 15+ | Asana, Trello, Linear, ClickUp, Monday |
| CRM & Support | 8+ | HubSpot, Salesforce, Zendesk, Intercom |
| Marketing | 6+ | Mailchimp, SendGrid, Segment |
| Analytics | 6+ | Mixpanel, Amplitude, PostHog, Datadog |
| Communication | 10+ | Slack, Teams, Twilio, Zoom |
| AI & Vector DBs | 8+ | Pinecone, Weaviate, Qdrant, Chroma |
| Storage | 5+ | S3, GCS, Azure Blob, Dropbox |
| Payments | 5+ | Stripe, Square, Braintree, Shopify |
| Social | 4+ | Twitter, Instagram, LinkedIn |
| IoT | 5+ | Hue, Wemo, Sonos |
| DevOps | 10+ | Jenkins, GitLab, Bitbucket, Vercel |

---

## Quick Start

```javascript
import { createIntegration } from 'adaptive-memory-multi-model-router/integrations';

// GitHub
const github = createIntegration('github', { apiKey: 'your-token' });
await github.createIssue('owner', 'repo', 'Bug fix', 'Description');

// Slack
const slack = createIntegration('slack', { webhookUrl: 'https://hooks.slack.com/...' });
await slack.sendMessage('#alerts', 'Build complete!');
```

---

## Project Management Integrations

### Asana

```javascript
import { AsanaIntegration } from 'adaptive-memory-multi-model-router/integrations/asana';

const asana = new AsanaIntegration(process.env.ASANA_API_KEY);

// Create task
await asana.createTask(
  workspaceId = '123456',
  projectId = '789012',
  name = 'Implement feature',
  notes = 'Description here'
);

// Get tasks
const tasks = await asana.getTasks(projectId);
```

### Trello

```javascript
import { TrelloIntegration } from 'adaptive-memory-multi-model-router/integrations/trello';

const trello = new TrelloIntegration(
  process.env.TRELLO_API_KEY,
  process.env.TRELLO_TOKEN
);

await trello.createCard(boardId, listId, 'New Card', 'Description');
```

### Linear

```javascript
import { LinearIntegration } from 'adaptive-memory-multi-model-router/integrations/linear';

const linear = new LinearIntegration(process.env.LINEAR_API_KEY);

await linear.createIssue('Fix bug', 'team-id');
const teams = await linear.getTeams();
```

### Monday

```javascript
import { MondayIntegration } from 'adaptive-memory-multi-model-router/integrations/monday';

const monday = new MondayIntegration(process.env.MONDAY_API_KEY);

const boards = await monday.getBoards();
await monday.createItem(boardId, 'New Item');
```

---

## CRM & Customer Support

### HubSpot

```javascript
import { HubSpotIntegration } from 'adaptive-memory-multi-model-router/integrations/hubspot';

const hubspot = new HubSpotIntegration(process.env.HUBSPOT_API_KEY);

const contacts = await hubspot.getContacts(100);
await hubspot.createContact('customer@example.com', { firstName: 'John' });
await hubspot.createDeal('New Deal', { amount: 5000 });
```

### Salesforce

```javascript
import { SalesforceIntegration } from 'adaptive-memory-multi-model-router/integrations/salesforce';

const sf = new SalesforceIntegration(
  'https://your-instance.salesforce.com',
  process.env.SF_ACCESS_TOKEN
);

const contacts = await sf.query("SELECT Id, Name FROM Contact LIMIT 10");
await sf.createRecord('Contact', { Email: 'test@example.com', LastName: 'Test' });
```

### Zendesk

```javascript
import { ZendeskIntegration } from 'adaptive-memory-multi-model-router/integrations/zendesk';

const zendesk = new ZendeskIntegration(
  'your-company',
  'agent@example.com',
  process.env.ZENDESK_API_TOKEN
);

const tickets = await zendesk.getTickets();
await zendesk.createTicket('Help needed', 'Description of the issue');
```

---

## Communication

### Slack

```javascript
import { SlackIntegration } from 'adaptive-memory-multi-model-router/integrations/slack';

const slack = new SlackIntegration(process.env.SLACK_WEBHOOK_URL);

await slack.sendMessage('#dev-team', 'Deployment complete! 🚀');
await slack.sendMessage('#alerts', { text: 'High latency detected', icon_emoji: ':warning:' });
```

### Twilio

```javascript
import { TwilioIntegration } from 'adaptive-memory-multi-model-router/integrations/twilio';

const twilio = new TwilioIntegration(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

await twilio.sendMessage('+1234567890', 'Your code is ready!');
```

### Zoom

```javascript
import { ZoomIntegration } from 'adaptive-memory-multi-model-router/integrations/zoom';

const zoom = new ZoomIntegration(
  process.env.ZOOM_API_KEY,
  process.env.ZOOM_API_SECRET
);

const meeting = await zoom.createMeeting('Team Standup', 30);
console.log('Join URL:', meeting.join_url);
```

---

## AI & Vector Databases

### Pinecone

```javascript
import { PineconeIntegration } from 'adaptive-memory-multi-model-router/integrations/pinecone';

const pinecone = new PineconeIntegration(
  process.env.PINECONE_API_KEY,
  'us-west-2'
);

await pinecone.createIndex('my-index', 1536);
await pinecone.upsertVectors('my-index', [
  { id: 'vec1', vector: [...], metadata: { text: 'hello' } }
]);

const results = await pinecone.query('my-index', vector, 10);
```

### Weaviate

```javascript
import { WeaviateIntegration } from 'adaptive-memory-multi-model-router/integrations/weaviate';

const weaviate = new WeaviateIntegration(
  'http://localhost:8080',
  process.env.WEAVIATE_API_KEY
);

await weaviate.createObject('Article', { title: 'Hello', content: 'World' });
const articles = await weaviate.getObjects('Article');
```

---

## Storage

### S3

```javascript
import { S3Integration } from 'adaptive-memory-multi-model-router/integrations/s3';

const s3 = new S3Integration(
  process.env.AWS_ACCESS_KEY_ID,
  process.env.AWS_SECRET_ACCESS_KEY,
  'us-east-1'
);

await s3.putObject('my-bucket', 'path/to/file.txt', 'Hello World');
const data = await s3.getObject('my-bucket', 'path/to/file.txt');
```

### Dropbox

```javascript
import { DropboxIntegration } from 'adaptive-memory-multi-model-router/integrations/dropbox';

const dropbox = new DropboxIntegration(process.env.DROPBOX_ACCESS_TOKEN);

await dropbox.uploadFile('/path/to/file.txt', 'File content');
const content = await dropbox.downloadFile('/path/to/file.txt');
```

---

## Payments

### Stripe

```javascript
import { StripeIntegration } from 'adaptive-memory-multi-model-router/integrations/stripe';

const stripe = new StripeIntegration(process.env.STRIPE_API_KEY);

const charge = await stripe.createCharge(1999, 'usd', 'cus_123');
const charges = await stripe.getCharges(10);
```

### Shopify

```javascript
import { ShopifyIntegration } from 'adaptive-memory-multi-model-router/integrations/shopify';

const shopify = new ShopifyIntegration(
  'my-store.myshopify.com',
  process.env.SHOPIFY_ACCESS_TOKEN
);

const products = await shopify.getProducts(50);
const order = await shopify.createOrder([
  { variant_id: 123, quantity: 2 }
]);
```

---

## Analytics & Monitoring

### Mixpanel

```javascript
import { MixpanelIntegration } from 'adaptive-memory-multi-model-router/integrations/mixpanel';

const mixpanel = new MixpanelIntegration(process.env.MIXPANEL_TOKEN);

await mixpanel.track('Purchase', { 
  userId: 'user-123', 
  value: 99.99,
  item: 'Premium Plan'
});
```

### Datadog

```javascript
import { DataDogIntegration } from 'adaptive-memory-multi-model-router/integrations/datadog';

const datadog = new DataDogIntegration(
  process.env.DD_API_KEY,
  process.env.DD_APP_KEY
);

await datadog.postMetric('app.latency', 150);
const metrics = await datadog.getMetrics('app.latency');
```

---

## DevOps

### GitHub

```javascript
import { GitHubIntegration } from 'adaptive-memory-multi-model-router/integrations/github';

const github = new GitHubIntegration(process.env.GITHUB_TOKEN);

const repo = await github.getRepo('owner', 'repo');
await github.createIssue('owner', 'repo', 'Bug', 'Description');
await github.createPR('owner', 'repo', 'Feature', 'feature-branch', 'main');
```

### GitLab

```javascript
import { GitLabIntegration } from 'adaptive-memory-multi-model-router/integrations/gitlab';

const gitlab = new GitLabIntegration(process.env.GITLAB_TOKEN);

const projects = await gitlab.getProjects();
await gitlab.createMR('project-id', 'feature-branch', 'main');
```

### Jenkins

```javascript
import { JenkinsIntegration } from 'adaptive-memory-multi-model-router/integrations/jenkins';

const jenkins = new JenkinsIntegration(
  'https://jenkins.example.com',
  'admin',
  process.env.JENKINS_API_TOKEN
);

const jobs = await jenkins.getJobs();
await jenkins.buildJob('my-job');
```

---

## Using OAuth Manager

```javascript
import { OAuthManager } from 'adaptive-memory-multi-model-router/oauth';

const oauth = new OAuthManager();

// Configure OAuth for Slack
oauth.configure('slack', {
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  redirectUri: 'https://myapp.com/callback/slack'
});

// Get authorization URL
const authUrl = oauth.getAuthUrl('slack');

// In your callback handler
const tokens = await oauth.handleCallback('slack', code, state);

// Make authenticated requests
oauth.apiRequest('slack', '/chat.postMessage', {
  method: 'POST',
  body: JSON.stringify({ channel: '#general', text: 'Hello!' })
});
```

---

## Error Handling

```javascript
import { createIntegration } from 'adaptive-memory-multi-model-router/integrations';

const github = createIntegration('github', { apiKey: 'invalid' });

try {
  await github.createIssue('owner', 'repo', 'Title', 'Body');
} catch (error) {
  console.error('GitHub API Error:', error.message);
  // Handle: retry, fallback, or alert
}
```

---

## Integration Factory

Use `createIntegration` for quick setup:

```javascript
import { createIntegration } from 'adaptive-memory-multi-model-router/integrations';

// All integrations available via string name
const integration = createIntegration('stripe', { apiKey: 'sk_...' });
const integration2 = createIntegration('slack', { webhookUrl: 'https://...' });
const integration3 = createIntegration('pinecone', { apiKey: '...', environment: 'us-west-2' });

// Supported integration names:
// github, slack, telegram, notion, linear, jira, gmail, discord, airtable,
// google-calendar, asana, trello, stripe, shopify, intercom, sendgrid,
// mailchimp, hubspot, salesforce, zendesk, mixpanel, amplitude, segment,
// posthog, datadog, newrelic, sentry, grafana, pagerduty, aws-s3, gcs,
// azureblob, dropbox, jenkins, gitlab, bitbucket, vercel, netlify, pinecone,
// weaviate, qdrant, chromadb, and 70+ more!
```
