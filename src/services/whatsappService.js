export class WhatsAppService {
  constructor(env) {
    this.env = env;
  }

  async processWebhook(botId, request) {
    const db = new DatabaseService(this.env.DB);
    const botConfig = await db.getWhatsAppBot(botId);
    
    if (!botConfig) {
      return new Response('Bot not found', { status: 404 });
    }

    const { user_id, ai_id, provider } = botConfig;

    // GET request for verification
    if (request.method === 'GET') {
      const VERIFY_TOKEN = "obeksai123"; // Change this in production
      
      const url = new URL(request.url);
      const hubMode = url.searchParams.get('hub.mode');
      const hubToken = url.searchParams.get('hub.verify_token');
      const hubChallenge = url.searchParams.get('hub.challenge');

      if (hubMode === 'subscribe' && hubToken === VERIFY_TOKEN) {
        return new Response(hubChallenge, { status: 200 });
      }
      return new Response('Verification failed', { status: 403 });
    }

    // POST request for messages
    try {
      const data = await request.json();
      
      // Route to appropriate handler based on provider
      switch (provider) {
        case 'meta':
          return await this.handleMetaWebhook(data, botConfig);
        case 'twilio':
          return await this.handleTwilioWebhook(data, botConfig);
        case 'wati':
          return await this.handleWatiWebhook(data, botConfig);
        default:
          return await this.autoDetectProvider(data, botConfig);
      }
    } catch (error) {
      console.error('WhatsApp webhook error:', error);
      return new Response('OK', { status: 200 });
    }
  }

  async handleMetaWebhook(data, botConfig) {
    const { user_id, ai_id, access_token, phone_number_id } = botConfig;
    const aiService = new AIService(this.env);

    // Extract message from Meta format
    let messageText = '';
    let senderNumber = '';

    try {
      const entry = data.entry?.[0];
      const changes = entry?.changes?.[0];
      const messages = changes?.value?.messages || [];

      if (messages.length > 0) {
        const message = messages[0];
        if (message.type === 'text') {
          messageText = message.text.body;
          senderNumber = message.from;
        }
      }
    } catch (error) {
      console.error('Error parsing Meta webhook:', error);
    }

    if (!messageText) {
      return new Response('OK', { status: 200 });
    }

    // Generate AI response
    const aiResponse = await aiService.generateAIResponse(
      messageText, 
      user_id, 
      ai_id, 
      'whatsapp', 
      senderNumber
    );

    // Send response via Meta API
    await this.sendMetaMessage(phone_number_id, access_token, senderNumber, aiResponse);

    return new Response('OK', { status: 200 });
  }

  async handleTwilioWebhook(request, botConfig) {
    const { user_id, ai_id, account_sid, auth_token, whatsapp_number } = botConfig;
    const aiService = new AIService(this.env);

    // Twilio sends form data
    const formData = await request.formData();
    const messageText = formData.get('Body');
    const senderNumber = formData.get('From');

    if (!messageText) {
      const response = `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>No message received</Message>
        </Response>`;
      return new Response(response, { 
        headers: { 'Content-Type': 'text/xml' } 
      });
    }

    // Generate AI response
    const aiResponse = await aiService.generateAIResponse(
      messageText, 
      user_id, 
      ai_id, 
      'whatsapp', 
      senderNumber
    );

    // Return TwiML response
    const response = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${this.escapeXml(aiResponse)}</Message>
      </Response>`;

    return new Response(response, { 
      headers: { 'Content-Type': 'text/xml' } 
    });
  }

  async handleWatiWebhook(data, botConfig) {
    const { user_id, ai_id, api_key, wati_url = 'https://api.wati.io' } = botConfig;
    const aiService = new AIService(this.env);

    // Extract message from WATI format
    const messageText = data.text || '';
    const senderNumber = data.waId || '';

    if (!messageText) {
      return new Response('OK', { status: 200 });
    }

    // Generate AI response
    const aiResponse = await aiService.generateAIResponse(
      messageText, 
      user_id, 
      ai_id, 
      'whatsapp', 
      senderNumber
    );

    // Send response via WATI API
    await this.sendWatiMessage(wati_url, api_key, senderNumber, aiResponse);

    return new Response('OK', { status: 200 });
  }

  async sendMetaMessage(phoneNumberId, accessToken, to, message) {
    try {
      const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        })
      });

      if (!response.ok) {
        console.error('Meta API error:', await response.text());
      }
    } catch (error) {
      console.error('Error sending Meta message:', error);
    }
  }

  async sendWatiMessage(baseUrl, apiKey, to, message) {
    try {
      const url = `${baseUrl}/v1/sendSessionMessage/${to}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: message })
      });

      if (!response.ok) {
        console.error('WATI API error:', await response.text());
      }
    } catch (error) {
      console.error('Error sending WATI message:', error);
    }
  }

  async autoDetectProvider(data, botConfig) {
    // Auto-detect provider from data format
    // This is a simplified version - you should expand based on your needs
    return new Response('OK', { status: 200 });
  }

  escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  }

  async sendMessage(to, message, userId, aiId) {
    const db = new DatabaseService(this.env.DB);
    const botConfig = await db.getWhatsAppBotByAI(userId, aiId);
    
    if (!botConfig) {
      throw new Error('WhatsApp bot not configured');
    }

    const { provider } = botConfig;

    switch (provider) {
      case 'meta':
        return await this.sendMetaMessage(
          botConfig.phone_number_id,
          botConfig.access_token,
          to,
          message
        );
      case 'twilio':
        // For Twilio, you'd need to use their REST API
        // This is simplified - you'd need to implement properly
        return await this.sendTwilioMessage(
          botConfig.account_sid,
          botConfig.auth_token,
          botConfig.whatsapp_number,
          to,
          message
        );
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
