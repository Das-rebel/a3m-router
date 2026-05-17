#!/usr/bin/env node
/**
 * WhatsApp ↔ Telegram Bridge Demo
 * 
 * This demo shows how the bridge works without requiring real credentials.
 * It uses mock implementations to demonstrate the flow.
 */

// Mock implementations for demo
class MockWhatsAppIntegration {
  constructor(phoneNumberId, accessToken) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;
    console.log(`📱 WhatsApp Integration initialized (Phone: ${phoneNumberId})`);
  }

  async sendMessage(to, body) {
    console.log(`   📤 WhatsApp → ${to}: "${body.substring(0, 50)}..."`);
    return { 
      messaging_product: 'whatsapp',
      contacts: [{ input: to, wa_id: to }],
      messages: [{ id: `wamid.${Date.now()}` }]
    };
  }

  async getMessages() {
    return { messages: [] };
  }
}

class MockTelegramIntegration {
  constructor(botToken) {
    this.botToken = botToken;
    this.messageId = 1000;
    console.log(`💬 Telegram Integration initialized (Bot: ${botToken.substring(0, 10)}...)`);
  }

  async sendMessage(chatId, text) {
    this.messageId++;
    console.log(`   📤 Telegram → Chat ${chatId}:`);
    console.log(`      ${text.substring(0, 100)}...`);
    return { 
      message_id: this.messageId,
      chat: { id: chatId },
      text: text
    };
  }

  async getUpdates() {
    return { result: [] };
  }
}

// Import A3M Router
const { createA3MRouter } = require('../dist/index.js');

/**
 * WhatsApp → Telegram Bridge Demo
 */
class WhatsAppTelegramBridgeDemo {
  constructor() {
    this.whatsapp = new MockWhatsAppIntegration('1234567890', 'mock_token');
    this.telegram = new MockTelegramIntegration('mock_bot_token_12345');
    this.telegramChatId = '987654321';
    
    // A3M Router for intelligent routing
    this.router = createA3MRouter();
    
    // Message tracking
    this.pendingReplies = new Map();
    this.demoMode = true;
  }

  async handleWhatsAppMessage(whatsappMessage) {
    console.log('\n📩 STEP 1: Received WhatsApp Message');
    console.log('─────────────────────────────────────────────────────────────');
    
    const entry = whatsappMessage.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];
    
    if (!message) {
      console.log('❌ No message in payload');
      return;
    }

    const from = message.from;
    const text = message.text?.body || '';
    const messageId = message.id;

    console.log(`   From: ${from}`);
    console.log(`   Text: "${text}"`);
    console.log(`   Message ID: ${messageId}`);

    // Route the message
    console.log('\n🔀 STEP 2: Route Message via A3M Router');
    console.log('─────────────────────────────────────────────────────────────');
    
    const route = this.router.route(text);
    console.log(`   Primary Model: ${route.primary_model}`);
    console.log(`   Fallbacks: ${route.fallback_models.slice(0, 2).join(', ')}`);
    console.log(`   Estimated Cost: $${route.estimated_cost.toFixed(6)}`);
    console.log(`   Reasoning: ${route.reasoning}`);

    // Forward to Telegram
    console.log('\n📤 STEP 3: Forward to Telegram Bot');
    console.log('─────────────────────────────────────────────────────────────');
    
    const telegramResult = await this.forwardToTelegram(from, text, route);
    
    this.pendingReplies.set(telegramResult.messageId, {
      whatsappUser: from,
      originalText: text,
      timestamp: Date.now(),
    });

    console.log(`   Telegram Message ID: ${telegramResult.messageId}`);
    console.log(`   Status: ✅ Forwarded successfully`);

    // Simulate Telegram bot reply
    console.log('\n📩 STEP 4: Telegram Bot Processes & Replies');
    console.log('─────────────────────────────────────────────────────────────');
    
    await this.simulateTelegramReply(telegramResult.messageId, text);

    return telegramResult;
  }

  async forwardToTelegram(whatsappUser, text, route) {
    const formattedMessage = `
🔄 <b>WhatsApp Bridge</b>
📱 <b>From:</b> ${whatsappUser}
🤖 <b>Route:</b> ${route.primary_model}
💰 <b>Est. Cost:</b> $${route.estimated_cost.toFixed(6)}

💬 <b>Message:</b>
${text}

<i>Reply to this message to respond back to WhatsApp user</i>
    `.trim();

    const result = await this.telegram.sendMessage(this.telegramChatId, formattedMessage);

    return {
      messageId: result.message_id,
      chatId: this.telegramChatId,
    };
  }

  async simulateTelegramReply(originalMessageId, originalText) {
    // Simulate bot processing time
    console.log('   🤖 Bot is processing...');
    await new Promise(r => setTimeout(r, 1000));

    // Generate contextual reply
    let reply;
    if (originalText.toLowerCase().includes('order')) {
      reply = `I've checked your order. It will be shipped tomorrow! 📦`;
    } else if (originalText.toLowerCase().includes('help')) {
      reply = `I'm here to help! What do you need assistance with? 🤝`;
    } else if (originalText.toLowerCase().includes('price')) {
      reply = `Let me check the pricing for you. One moment please... 💰`;
    } else {
      reply = `Thanks for your message! Our team will get back to you shortly. ⏰`;
    }

    console.log(`   Bot Reply: "${reply}"`);

    // Handle the reply
    await this.handleTelegramReply({
      message: {
        message_id: Date.now(),
        reply_to_message: { message_id: originalMessageId },
        text: reply,
        chat: { id: this.telegramChatId }
      }
    });
  }

  async handleTelegramReply(telegramUpdate) {
    console.log('\n📤 STEP 5: Send Reply Back to WhatsApp');
    console.log('─────────────────────────────────────────────────────────────');
    
    const message = telegramUpdate.message;
    const replyToMessage = message.reply_to_message;
    const originalMessageId = replyToMessage.message_id;
    
    const pending = this.pendingReplies.get(originalMessageId);
    if (!pending) {
      console.log('❌ No pending reply found');
      return;
    }

    const replyText = message.text;
    console.log(`   Original WhatsApp User: ${pending.whatsappUser}`);
    console.log(`   Reply Text: "${replyText}"`);

    // Send back to WhatsApp
    await this.whatsapp.sendMessage(pending.whatsappUser, replyText);

    this.pendingReplies.delete(originalMessageId);
    
    console.log('   Status: ✅ Reply sent successfully');
  }
}

// Demo scenarios
const DEMO_MESSAGES = [
  {
    description: 'Customer asking about order',
    payload: {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '+1234567890',
              id: 'wamid.demo1',
              text: { body: 'Hello, I need help with my order #12345' },
              timestamp: Date.now().toString(),
            }],
          },
        }],
      }],
    },
  },
  {
    description: 'Customer asking for pricing',
    payload: {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '+9876543210',
              id: 'wamid.demo2',
              text: { body: 'What is the price for your premium plan?' },
              timestamp: Date.now().toString(),
            }],
          },
        }],
      }],
    },
  },
  {
    description: 'General inquiry',
    payload: {
      entry: [{
        changes: [{
          value: {
            messages: [{
              from: '+5555555555',
              id: 'wamid.demo3',
              text: { body: 'Hi there, I have a question about your services' },
              timestamp: Date.now().toString(),
            }],
          },
        }],
      }],
    },
  },
];

// Run demo
async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📱 WhatsApp ↔ Telegram Bridge Demo');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('This demo shows how to use a Telegram bot to process');
  console.log('WhatsApp messages and send replies back.');
  console.log('');

  const bridge = new WhatsAppTelegramBridgeDemo();

  for (const scenario of DEMO_MESSAGES) {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📝 Scenario: ${scenario.description}`);
    console.log('═══════════════════════════════════════════════════════════════');
    
    await bridge.handleWhatsAppMessage(scenario.payload);
    
    // Wait between scenarios
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Demo Complete!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('To use in production:');
  console.log('  1. Get WhatsApp Business API credentials');
  console.log('  2. Create Telegram bot via @BotFather');
  console.log('  3. Set up webhooks for both platforms');
  console.log('  4. Use whatsapp-telegram-bridge.js with real credentials');
  console.log('');
  console.log('Documentation:');
  console.log('  - WhatsApp: https://business.whatsapp.com/products/business-platform');
  console.log('  - Telegram: https://core.telegram.org/bots/api');
  console.log('');
}

main().catch(console.error);
