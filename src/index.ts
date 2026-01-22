import { Router } from 'itty-router';
import { 
  requireAuth, 
  requirePartnerAuth, 
  rateLimit 
} from './middleware/auth.js';
import {
  handleLogin,
  handleSignup,
  handleLogout,
  handleDashboard
} from './routes/auth.js';
import {
  handleAddAI,
  handleSaveAI,
  handleDeleteAI,
  handleUpdateBusinessContext
} from './routes/ai.js';
import {
  handleAPISettings,
  handleSaveAPIKey,
  handleDeleteAPIKey
} from './routes/api.js';
import {
  handleChatHistory,
  handleChatAPI
} from './routes/chat.js';
import {
  handleTelegramSetup,
  handleTelegramWebhook
} from './routes/telegram.js';
import {
  handleWhatsAppSetup,
  handleWhatsAppWebhook,
  handleWhatsAppTest
} from './routes/whatsapp.js';
import {
  handleFacebookSetup,
  handleFacebookPost,
  handleFacebookWebhook
} from './routes/facebook.js';
import {
  handleInstagramSetup,
  handleInstagramWebhook
} from './routes/instagram.js';
import {
  handleDatabaseUpload,
  handleCreateDatabase,
  handleManageDatabase,
  handleDatabaseQuery
} from './routes/database.js';
import {
  handleEcommerceStore,
  handleAddProduct,
  handleProcessOrder
} from './routes/ecommerce.js';
import {
  handleSalesDashboard,
  handleAddSale,
  handleSalesAnalytics
} from './routes/sales.js';
import {
  handlePartnerLogin,
  handlePartnerSignup,
  handlePartnerDashboard,
  handlePartnerClients,
  handlePartnerEarnings
} from './routes/partner.js';

const router = Router();

// Enable CORS for all routes
router.all('*', async (request, env) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        'Access-Control-Max-Age': '86400',
      }
    });
  }
});

// Public Routes
router.get('/', () => new Response('AI Agent Platform API', { status: 200 }));
router.get('/health', () => new Response(JSON.stringify({ status: 'ok' }), { status: 200 }));

// Auth Routes
router.post('/api/login', handleLogin);
router.post('/api/signup', handleSignup);
router.post('/api/logout', handleLogout);

// Dashboard
router.get('/api/dashboard', requireAuth, handleDashboard);

// AI Management
router.post('/api/ai/add', requireAuth, handleAddAI);
router.post('/api/ai/save', requireAuth, handleSaveAI);
router.delete('/api/ai/:ai_id', requireAuth, handleDeleteAI);
router.put('/api/ai/business-context', requireAuth, handleUpdateBusinessContext);

// API Settings
router.get('/api/settings/api', requireAuth, handleAPISettings);
router.post('/api/settings/api', requireAuth, handleSaveAPIKey);
router.delete('/api/settings/api/:key_id', requireAuth, handleDeleteAPIKey);

// Chat
router.get('/api/chat/history', requireAuth, handleChatHistory);
router.post('/api/chat', requireAuth, handleChatAPI);

// Telegram
router.post('/api/telegram/setup', requireAuth, handleTelegramSetup);
router.post('/webhook/telegram/:bot_id', handleTelegramWebhook);

// WhatsApp
router.post('/api/whatsapp/setup', requireAuth, handleWhatsAppSetup);
router.get('/webhook/whatsapp/:bot_id', handleWhatsAppWebhook); // GET for verification
router.post('/webhook/whatsapp/:bot_id', handleWhatsAppWebhook); // POST for messages
router.post('/api/whatsapp/test/:ai_id', requireAuth, handleWhatsAppTest);

// Facebook
router.post('/api/facebook/setup', requireAuth, handleFacebookSetup);
router.post('/api/facebook/post/:ai_id', requireAuth, handleFacebookPost);
router.get('/webhook/facebook/:ai_id', handleFacebookWebhook); // GET for verification
router.post('/webhook/facebook/:ai_id', handleFacebookWebhook); // POST for updates

// Instagram
router.post('/api/instagram/setup', requireAuth, handleInstagramSetup);
router.post('/webhook/instagram/:ai_id', handleInstagramWebhook);

// Database Management
router.get('/api/databases', requireAuth, handleDatabaseUpload);
router.post('/api/databases/upload', requireAuth, handleDatabaseUpload);
router.post('/api/databases/create', requireAuth, handleCreateDatabase);
router.get('/api/databases/:db_id', requireAuth, handleManageDatabase);
router.post('/api/databases/query', requireAuth, handleDatabaseQuery);

// E-commerce
router.get('/api/ecommerce/stores', requireAuth, handleEcommerceStore);
router.post('/api/ecommerce/stores', requireAuth, handleEcommerceStore);
router.post('/api/ecommerce/products/:store_id', requireAuth, handleAddProduct);
router.post('/api/ecommerce/orders/:store_id', requireAuth, handleProcessOrder);

// Sales
router.get('/api/sales/:db_id', requireAuth, handleSalesDashboard);
router.post('/api/sales/:db_id', requireAuth, handleAddSale);
router.get('/api/sales/:db_id/analytics', requireAuth, handleSalesAnalytics);

// Partner Routes
router.post('/api/partner/login', handlePartnerLogin);
router.post('/api/partner/signup', handlePartnerSignup);
router.get('/api/partner/dashboard', requirePartnerAuth, handlePartnerDashboard);
router.get('/api/partner/clients', requirePartnerAuth, handlePartnerClients);
router.get('/api/partner/earnings', requirePartnerAuth, handlePartnerEarnings);

// 404 Handler
router.all('*', () => new Response('Not Found', { status: 404 }));

// Worker entry point
export default {
  async fetch(request, env, ctx) {
    // Add environment to request for all handlers
    request.env = env;
    request.ctx = ctx;
    
    // Handle request
    return router.handle(request);
  }
};
