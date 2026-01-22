
import { DatabaseService } from '../database/queries.js';
import { TelegramService } from '../services/telegramService.js';

export async function handleTelegramSetup(request, env) {
  try {
    const user = request.user;
    const data = await request.json();
    const { ai_id, bot_token } = data;
    
    if (!bot_token) {
      return new Response(JSON.stringify({ error: 'Bot token is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const telegramService = new TelegramService(env);
    const result = await telegramService.setupBot(user.id, ai_id, bot_token);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Telegram bot configured successfully!',
      ...result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to setup Telegram bot' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleTelegramWebhook(request, env) {
  try {
    const path = new URL(request.url).pathname;
    const parts = path.split('/');
    const botIdentifier = parts[parts.length - 1];
    
    const [userId, aiId] = botIdentifier.split('_');
    
    if (!userId || !aiId) {
      return new Response('Invalid webhook URL', { status: 400 });
    }
    
    const data = await request.json();
    
    const telegramService = new TelegramService(env);
    await telegramService.processMessage(data, userId, aiId);
    
    return new Response('OK', { status: 200 });
    
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

export async function handleTelegramTest(request, env) {
  try {
    const user = request.user;
    const { ai_id, chat_id, message } = await request.json();
    
    const db = new DatabaseService(env.DB);
    const botConfig = await db.getTelegramBotByAI(user.id, ai_id);
    
    if (!botConfig) {
      return new Response(JSON.stringify({ error: 'Telegram bot not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const telegramService = new TelegramService(env);
    await telegramService.sendMessage(botConfig.bot_token, chat_id, message);
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Test message sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
