import { Router } from 'itty-router';
import { handleTelegramSetup, handleTelegramWebhook, handleTelegramTest } from './routes/telegram.js';
import { requireAuth } from './middleware/auth.js';

const router = Router();

// Telegram Routes
router.post('/api/telegram/setup', requireAuth, handleTelegramSetup);
router.post('/api/telegram/test', requireAuth, handleTelegramTest);
router.post('/webhook/telegram/:botId', handleTelegramWebhook);

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx);
  }
};
