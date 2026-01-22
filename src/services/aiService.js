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
        console.error('OpenRouter API error:', response.status, await response.text());
        return "I'm having trouble connecting to the AI service. Please try again later.";
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      // Save to chat history
      await db.saveChatHistory(userId, aiId, platform, senderId, prompt, aiResponse, "incoming");

      return aiResponse;

    } catch (error) {
      console.error('AI Service Error:', error);
      return `Error generating response: ${error.message}`;
    }
  }

  async getAIConfig(userId, aiId) {
    const db = new DatabaseService(this.env.DB);
    const aiWorkforce = await db.getUserAI(userId);
    return aiWorkforce.find(ai => ai.id === aiId);
  }

  async getConversationMemory(userId, aiId, platform, senderId, maxMessages = 5) {
    const db = new DatabaseService(this.env.DB);
    const chatHistory = await db.getChatHistory(userId, aiId, platform, maxMessages);
    
    // Filter by senderId if provided
    if (senderId) {
      return chatHistory.filter(msg => msg.sender_id === senderId);
    }
    
    return chatHistory;
  }

  buildSystemMessage(businessInfo, userDatabases) {
    let message = `You are an AI assistant with access to business data.

BUSINESS CONTEXT:
${businessInfo || 'No specific business context provided.'}`;

    // Add database context if available
    if (userDatabases && userDatabases.length > 0) {
      message += `\n\nAVAILABLE BUSINESS DATA:`;
      userDatabases.forEach(db => {
        message += `\n\n--- ${db.name} ---\n`;
        message += `Records: ${db.record_count}\n`;
        
        // Show sample data (first 3 records)
        if (db.data && Array.isArray(db.data) && db.data.length > 0) {
          message += `Sample data:\n`;
          db.data.slice(0, 3).forEach((record, i) => {
            if (typeof record === 'object') {
              const sample = Object.entries(record)
                .slice(0, 3)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ');
              message += `Record ${i+1}: ${sample}\n`;
            }
          });
          if (db.data.length > 3) {
            message += `... and ${db.data.length - 3} more records\n`;
          }
        }
      });
    }

    message += `\n\nINSTRUCTIONS:
1. Use the business data when relevant to answer questions
2. Be specific and helpful
3. If you don't know something, admit it
4. Keep responses professional but friendly`;

    return message;
  }

  // Facebook post generation
  async generateFacebookPost(prompt, userId, aiId) {
    const enhancedPrompt = `Create a Facebook post about: ${prompt}

IMPORTANT: Generate ONLY the post content. No introductions, explanations, or phrases like 'here is your post'. Write like a real human would post naturally with appropriate emojis but no hashtag spam.`;

    return await this.generateAIResponse(enhancedPrompt, userId, aiId, 'facebook_post');
  }

  // Security analysis
  async generateSecurityAnalysis(events, recentIPs, userId, aiId) {
    const analysisPrompt = `Analyze these security events and provide a simple, human-readable security report:

    Recent Security Events: ${events.length} events
    Unique IP Addresses: ${Object.keys(recentIPs).length} addresses

    Please provide:
    1. A simple security status (Good, Watch, Concern)
    2. Key observations about the activity
    3. Any suspicious patterns to watch for
    4. Basic security recommendations

    Keep it simple and actionable for a business owner:`;

    return await this.generateAIResponse(analysisPrompt, userId, aiId, 'security_analysis');
  }

  // Auto-reply generation
  async generateAutoReply(comment, businessContext, userId, aiId) {
    const prompt = `Generate a friendly and professional response to this comment: "${comment}"
    for ${businessContext}. Keep it engaging and appropriate:`;

    return await this.generateAIResponse(prompt, userId, aiId, 'auto_reply');
  }
}
