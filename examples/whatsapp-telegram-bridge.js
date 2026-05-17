#!/usr/bin/env node
/**
 * WhatsApp ↔ Telegram Bridge Example
 * 
 * This example shows how to use a Telegram bot to process
 * WhatsApp messages and send replies back.
 * 
 * Prerequisites:
 * 1. WhatsApp Business API credentials (phoneNumberId, accessToken)
 * 2. Telegram Bot Token (from @BotFather)
 * 3. Webhook endpoint to receive WhatsApp messages
 * 
 * Usage:
 *   node whatsapp-telegram-bridge.js
 */

const { 
  createIntegration,
  WhatsAppIntegration,
  TelegramIntegration,
  createA3MRouter 
} = require('../dist/index.js');

// Configuration
const CONFIG = {
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    // The chat ID where your bot will process messages
    // This could be your personal chat with the bot
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
};

// Validate config
function validateConfig() {
  const missing = [];
  if (!CONFIG.whatsapp.phoneNumberId) missing.push('WHATSAPP_PHONE_NUMBER_ID');
  if (!CONFIG.whatsapp.accessToken) missing.push('WHATSAPP_ACCESS_TOKEN');
  if (!CONFIG.telegram.botToken) missing.push('TELEGRAM_BOT_TOKEN');
  if (!CONFIG.telegram.chatId) missing.push('TELEGRAM_CHAT_ID');
  
  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nSet these variables and try again.');
    process.exit(1);
  }
}

/**
 * WhatsApp → Telegram Bridge
 * 
 * Flow:
 * 1. Receive message from WhatsApp (via webhook)
 * 2. Forward message to Telegram bot
 * 3. Get reply from Telegram (bot processes it)
 * 4. Send reply back to WhatsApp user
 */
class WhatsAppTelegramBridge {
  constructor(config) {
    this.whatsapp = new WhatsAppIntegration(
      config.whatsapp.phoneNumberId,
      config.whatsapp.accessToken
    );
    this.telegram = new TelegramIntegration(config.telegram.botToken);
    this.telegramChatId = config.telegram.chatId;
    
    // A3M Router for intelligent routing
    this.router = createA3MRouter();
    
    // Message tracking
    this.pendingReplies = new Map(); // messageId -> { whatsappUser, timestamp }
  }

  /**
   * Handle incoming WhatsApp message
   * @param {Object} whatsappMessage - WhatsApp webhook payload
   */
  async handleWhatsAppMessage(whatsappMessage) {
    try {
      // Extract message details
      const entry = whatsappMessage.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];
      
      if (!message) {
        console.log('No message in webhook payload');
        return;
      }

      const from = message.from; // WhatsApp user phone number
      const text = message.text?.body || '';
      const messageId = message.id;

      console.log(`📩 WhatsApp message from ${from}: "${text.substring(0, 50)}..."`);

      // Route the message to get best processing strategy
      const route = this.router.route(text);
      console.log(`🔀 Routed to: ${route.primary_model} (${route.reasoning})`);

      // Forward to Telegram bot with context
      const telegramMessage = await this.forwardToTelegram(from, text, route);
      
      // Track pending reply
      this.pendingReplies.set(telegramMessage.messageId, {
        whatsappUser: from,
        originalText: text,
        timestamp: Date.now(),
      });

      console.log(`📤 Forwarded to Telegram (message ID: ${telegramMessage.messageId})`);

    } catch (error) {
      console.error('❌ Error handling WhatsApp message:', error.message);
    }
  }

  /**
   * Forward WhatsApp message to Telegram
   */
  async forwardToTelegram(whatsappUser, text, route) {
    // Format message for Telegram bot
    const formattedMessage = `
🔄 <b>WhatsApp Bridge</b>
📱 <b>From:</b> ${whatsappUser}
🤖 <b>Route:</b> ${route.primary_model}

💬 <b>Message:</b>
${text}

<i>Reply to this message to respond back to WhatsApp user</i>
    `.trim();

    // Send to Telegram
    const result = await this.telegram.sendMessage(
      this.telegramChatId,
      formattedMessage
    );

    return {
      messageId: result.message_id || `msg_${Date.now()}`,
      chatId: this.telegramChatId,
    };
  }

  /**
   * Handle Telegram reply
   * @param {Object} telegramUpdate - Telegram webhook/update payload
   */
  async handleTelegramReply(telegramUpdate) {
    try {
      const message = telegramUpdate.message || telegramUpdate.callback_query?.message;
      if (!message) return;

      const replyToMessage = message.reply_to_message;
      if (!replyToMessage) {
        console.log('Not a reply message, ignoring');
        return;
      }

      // Extract original message ID from reply
      const originalMessageId = replyToMessage.message_id;
      const pending = this.pendingReplies.get(originalMessageId);

      if (!pending) {
        console.log('No pending WhatsApp reply found for this message');
        return;
      }

      const replyText = message.text || message.caption || '';
      console.log(`📩 Telegram reply: "${replyText.substring(0, 50)}..."`);

      // Send reply back to WhatsApp
      await this.sendWhatsAppReply(pending.whatsappUser, replyText);

      // Clean up pending reply
      this.pendingReplies.delete(originalMessageId);

    } catch (error) {
      console.error('❌ Error handling Telegram reply:', error.message);
    }
  }

  /**
   * Send reply back to WhatsApp user
   */
  async sendWhatsAppReply(to, text) {
    const result = await this.whatsapp.sendMessage(to, text);
    console.log(`📤 Sent WhatsApp reply to ${to}: "${text.substring(0, 50)}..."`);
    return result;
  }

  /**
   * Clean up old pending replies (older than 1 hour)
   */
  cleanupPendingReplies() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    for (const [messageId, pending] of this.pendingReplies) {
      if (now - pending.timestamp > oneHour) {
        this.pendingReplies.delete(messageId);
        console.log(`🧹 Cleaned up expired pending reply: ${messageId}`);
      }
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanup() {
    setInterval(() => this.cleanupPendingReplies(), 5 * 60 * 1000); // Every 5 minutes
  }
}

// Example usage
async function main() {
  validateConfig();

  console.log('🚀 Starting WhatsApp ↔ Telegram Bridge\n');

  const bridge = new WhatsAppTelegramBridge(CONFIG);
  bridge.startCleanup();

  console.log('✅ Bridge initialized');
  console.log(`   WhatsApp Phone Number ID: ${CONFIG.whatsapp.phoneNumberId}`);
  console.log(`   Telegram Chat ID: ${CONFIG.telegram.chatId}`);
  console.log('');

  // Example: Simulate receiving a WhatsApp message
  console.log('📋 Example: Simulating WhatsApp webhook payload\n');
  
  const exampleWhatsAppMessage = {
    entry: [{
      changes: [{
        value: {
          messages: [{
            from: '1234567890',
            id: 'wamid.example123',
            text: { body: 'Hello, I need help with my order #12345' },
            timestamp: Date.now().toString(),
          }],
        },
      }],
    }],
  };

  await bridge.handleWhatsAppMessage(exampleWhatsAppMessage);

  console.log('\n📋 To use this in production:');
  console.log('   1. Set up WhatsApp Business API webhook');
  console.log('   2. Set up Telegram bot webhook');
  console.log('   3. Route webhooks to handleWhatsAppMessage() and handleTelegramReply()');
  console.log('');
  console.log('📖 See: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks');
  console.log('📖 See: https://core.telegram.org/bots/webhooks');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { WhatsAppTelegramBridge };
