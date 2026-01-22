export class TelegramService {
  constructor(env) {
    this.env = env;
  }

  async setupBot(userId, aiId, botToken) {
    try {
      const db = new DatabaseService(this.env.DB);
      
      const testUrl = `https://api.telegram.org/bot${botToken}/getMe`;
      const response = await fetch(testUrl, { timeout: 10000 });
      
      if (!response.ok) {
        throw new Error('Invalid Telegram bot token');
      }
      
      const botInfo = await response.json();
      const botUsername = botInfo.result.username;
      
      await db.saveTelegramBot(userId, aiId, botToken, botUsername);
      
      const webhookUrl = `https://${this.env.WORKER_URL}/webhook/telegram/${userId}_${aiId}`;
      await this.setWebhook(botToken, webhookUrl);
      
      return {
        success: true,
        botUsername,
        webhookUrl
      };
      
    } catch (error) {
      console.error('Telegram setup error:', error);
      throw error;
    }
  }

  async setWebhook(botToken, webhookUrl) {
    const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`;
    const response = await fetch(url, { timeout: 10000 });
    return response.ok;
  }

  async processMessage(update, userId, aiId) {
    try {
      if (!update.message || !update.message.text) {
        return null;
      }
      
      const message = update.message;
      const chatId = message.chat.id;
      const text = message.text;
      const senderId = message.from.id;
      
      const aiService = new AIService(this.env);
      
      const aiResponse = await aiService.generateAIResponse(
        text,
        userId,
        aiId,
        'telegram',
        senderId.toString()
      );
      
      const db = new DatabaseService(this.env.DB);
      const botConfig = await db.getTelegramBotByAI(userId, aiId);
      
      if (botConfig && botConfig.bot_token) {
        await this.sendMessage(botConfig.bot_token, chatId, aiResponse);
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Telegram process error:', error);
      return null;
    }
  }

  async sendMessage(botToken, chatId, text) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    
    return response.ok;
  }
}
