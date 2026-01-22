import { DatabaseService, parseJSON, jsonResponse, errorResponse } from '../database/queries.js';
import { WhatsAppService } from '../services/whatsappService.js';

export async function handleWhatsAppSetup(request, env) {
  try {
    const user = request.user;
    const data = await parseJSON(request);
    
    const { provider, phone_number, api_key, auth_token, whatsapp_number, ai_id } = data;
    
    // Validate required fields based on provider
    if (provider === 'twilio' && (!api_key || !auth_token)) {
      return errorResponse('Account SID and Auth Token are required for Twilio');
    }
    
    if (provider === 'meta' && (!api_key || !auth_token)) {
      return errorResponse('Access Token and Phone Number ID are required for Meta');
    }
    
    if (provider === 'wati' && !api_key) {
      return errorResponse('API Key is required for WATI');
    }
    
    const db = new DatabaseService(env.DB);
    
    // Prepare config object
    const config = {
      account_sid: provider === 'twilio' ? api_key : null,
      access_token: provider === 'meta' ? api_key : null,
      api_key: provider === 'wati' ? api_key : null,
      auth_token: auth_token || null,
      phone_number: phone_number,
      phone_number_id: provider === 'meta' ? auth_token : null,
      whatsapp_number: whatsapp_number || phone_number,
      wati_url: data.wati_url || 'https://api.wati.io'
    };
    
    const botId = await db.saveWhatsAppBot(user.id, ai_id, provider, config);
    
    return jsonResponse({
      success: true,
      message: 'WhatsApp bot configured successfully!',
      bot_id: botId
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleWhatsAppWebhook(request, env) {
  try {
    const botId = new URL(request.url).pathname.split('/').pop();
    const whatsappService = new WhatsAppService(env);
    
    return await whatsappService.processWebhook(botId, request);
    
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return new Response('OK', { status: 200 });
  }
}

export async function handleWhatsAppTest(request, env) {
  try {
    const user = request.user;
    const aiId = new URL(request.url).pathname.split('/').pop();
    const { test_number, test_message } = await parseJSON(request);
    
    const whatsappService = new WhatsAppService(env);
    await whatsappService.sendMessage(test_number, test_message, user.id, aiId);
    
    return jsonResponse({
      success: true,
      message: 'Test message sent successfully'
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}
