export class AIService {
  constructor(env) {
    this.env = env;
  }

  async generateAIResponse(prompt, userId, aiId, platform = 'dashboard', senderId = 'user') {
    try {
      // Get API key from database
      const db = new DatabaseService(this.env.DB);
      const apiKey = await db.getUserAPIKey(userId, 'OpenRouter');
      
      if (!apiKey || !apiKey.api_key) {
        return "Bot Not Active Yet 🚫 The bot is missing a required setup key to work properly. Please add your OpenRouter API key in the API Settings.";
      }

      // Get AI configuration
      const aiConfig = await this.getAIConfig(userId, aiId);
      if (!aiConfig) {
        return "Error: AI configuration not found.";
      }

      // Get conversation memory
      const conversationMemory = await this.getConversationMemory(userId, aiId, platform, senderId, 5);

      // Get user databases for context
      const userDatabases = await db.getUserDatabases(userId);

      // Build system message with business context
      const systemMessage = this.buildSystemMessage(aiConfig.business_info, userDatabases);

      // Prepare messages for AI
      const messages = [
        { role: "system", content: systemMessage }
      ];

      // Add conversation memory
      conversationMemory.forEach(msg => {
        if (msg.direction === 'incoming') {
          messages.push({ role: "user", content: msg.message });
        } else {
          messages.push({ role: "assistant", content: msg.response });
        }
      });

      // Add current message
      messages.push({ role: "user", content: prompt });

      // Call OpenRouter API
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.api_key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yourdomain.com',
          'X-Title': 'AI Agent Platform'
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-chat",
          messages: messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
       
