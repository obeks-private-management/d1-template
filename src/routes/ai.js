import { DatabaseService, parseJSON, jsonResponse, errorResponse } from '../database/queries.js';
import { AIService } from '../services/aiService.js';

// Available AI services (matching your Flask app)
const AVAILABLE_AI_SERVICES = [
  { id: "whatsapp", name: "WhatsApp AI Assistant", description: "AI-powered customer support for WhatsApp" },
  { id: "telegram", name: "Telegram AI Assistant", description: "AI assistant for Telegram messaging" },
  { id: "facebook", name: "Facebook AI Manager", description: "AI for Facebook content and engagement" },
  { id: "instagram", name: "Instagram Manager", description: "AI-powered Instagram content and engagement management" },
  { id: "website", name: "Website AI Agent", description: "AI chatbot with appointment scheduling for websites" },
  { id: "security", name: "Cyber Security AI Agent", description: "AI security monitoring and threat detection" },
  { id: "ecommerce", name: "E-Commerce Store Bot", description: "AI-powered e-commerce chatbot with product catalog and order management" }
];

export async function handleAddAI(request, env) {
  try {
    const { ai_id } = await parseJSON(request);
    
    const aiService = AVAILABLE_AI_SERVICES.find(ai => ai.id === ai_id);
    if (!aiService) {
      return errorResponse('AI service not found');
    }
    
    return jsonResponse({
      success: true,
      ai_service: aiService
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleSaveAI(request, env) {
  try {
    const user = request.user;
    const data = await parseJSON(request);
    const { ai_id, ai_name, description, business_info } = data;
    
    const aiService = AVAILABLE_AI_SERVICES.find(ai => ai.id === ai_id);
    if (!aiService) {
      return errorResponse('AI service not found');
    }
    
    const db = new DatabaseService(env.DB);
    const aiEntryId = await db.addAI(
      user.id,
      ai_id,
      ai_name,
      description,
      business_info,
      aiService.name
    );
    
    return jsonResponse({
      success: true,
      message: `${aiService.name} added successfully!`,
      ai_id: aiEntryId
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleDeleteAI(request, env) {
  try {
    const user = request.user;
    const aiId = new URL(request.url).pathname.split('/').pop();
    
    const db = new DatabaseService(env.DB);
    await db.deleteAI(user.id, aiId);
    
    return jsonResponse({
      success: true,
      message: 'AI deleted successfully!'
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleUpdateBusinessContext(request, env) {
  try {
    const user = request.user;
    const { ai_id, business_info } = await parseJSON(request);
    
    const db = new DatabaseService(env.DB);
    await db.updateBusinessContext(ai_id, user.id, business_info);
    
    return jsonResponse({
      success: true,
      message: 'Business context updated successfully!'
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleChatAPI(request, env) {
  try {
    const user = request.user;
    const { message, ai_id, platform = 'dashboard', sender_id = 'user' } = await parseJSON(request);
    
    const aiService = new AIService(env);
    const response = await aiService.generateAIResponse(
      message,
      user.id,
      ai_id,
      platform,
      sender_id
    );
    
    return jsonResponse({
      success: true,
      response: response
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}
