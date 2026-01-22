import { DatabaseService, parseJSON, jsonResponse, errorResponse } from '../database/queries.js';
import { createSession } from '../middleware/auth.js';

export async function handleLogin(request, env) {
  try {
    const { email, password } = await parseJSON(request);
    
    if (!email || !password) {
      return errorResponse('Email and password are required');
    }
    
    const db = new DatabaseService(env.DB);
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }
    
    const validPassword = await db.verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return errorResponse('Invalid email or password', 401);
    }
    
    const session = createSession(user);
    
    return jsonResponse({
      success: true,
      message: 'Logged in successfully',
      session
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleSignup(request, env) {
  try {
    const data = await parseJSON(request);
    const { email, password, confirm_password, business_name, country_code, whatsapp_number } = data;
    
    // Validation
    if (password !== confirm_password) {
      return errorResponse('Passwords do not match');
    }
    
    if (!whatsapp_number || !/^\d+$/.test(whatsapp_number)) {
      return errorResponse('WhatsApp number must contain only digits');
    }
    
    const db = new DatabaseService(env.DB);
    
    // Check if user exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return errorResponse('Email already registered');
    }
    
    // Create user
    const user = await db.createUser(email, password, business_name, country_code, whatsapp_number);
    const session = createSession(user);
    
    return jsonResponse({
      success: true,
      message: 'Account created successfully',
      session
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

export async function handleLogout(request, env) {
  // With JWT, you'd blacklist the token
  // For simple implementation, client just discards token
  return jsonResponse({
    success: true,
    message: 'Logged out successfully'
  });
}

export async function handleDashboard(request, env) {
  try {
    const user = request.user; // Added by auth middleware
    const db = new DatabaseService(env.DB);
    
    // Get user's AI agents
    const userAI = await db.getUserAI(user.id);
    
    // Get user databases count
    const userDatabases = await db.getUserDatabases(user.id);
    
    // Get chat history count
    const chatHistory = await db.getChatHistory(user.id, null, null, 1);
    
    // Count active AI agents
    const activeAICount = userAI.length;
    
    // Get WhatsApp webhook URLs
    const aiWithWebhooks = await Promise.all(userAI.map(async (ai) => {
      const webhookInfo = await getWebhookInfo(ai, user.id, db, request);
      return { ...ai, ...webhookInfo };
    }));
    
    return jsonResponse({
      success: true,
      dashboard: {
        user: {
          id: user.id,
          email: user.email,
          business_name: user.business_name
        },
        ai_agents: aiWithWebhooks,
        statistics: {
          database_count: userDatabases.length,
          chat_count: chatHistory.length,
          active_ai_count: activeAICount
        }
      }
    });
    
  } catch (error) {
    return errorResponse(error.message);
  }
}

async function getWebhookInfo(ai, userId, db, request) {
  const baseUrl = new URL(request.url).origin;
  
  switch (ai.ai_id) {
    case 'whatsapp':
      const whatsappBot = await db.getWhatsAppBotByAI(userId, ai.id);
      return {
        webhook_url: whatsappBot ? `${baseUrl}/webhook/whatsapp/${whatsappBot.id}` : null,
        whatsapp_bot_id: whatsappBot?.id
      };
      
    case 'telegram':
      const telegramBot = await db.getTelegramBotByAI(userId, ai.id);
      return {
        webhook_url: telegramBot ? `${baseUrl}/webhook/telegram/${telegramBot.id}` : null,
        telegram_bot_id: telegramBot?.id
      };
      
    default:
      return {
        webhook_url: `${baseUrl}/webhook/${ai.id}`
      };
  }
}
