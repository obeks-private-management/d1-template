// Database helper functions for D1
import bcrypt from 'bcryptjs';

export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  // ========== USERS ==========
  async createUser(email, password, businessName, countryCode, whatsappNumber) {
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO users (id, email, password_hash, business_name, country_code, whatsapp_number, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, email, passwordHash, businessName, countryCode, whatsappNumber, createdAt).run();

    return { id, email, businessName };
  }

  async getUserByEmail(email) {
    return await this.db.prepare(`
      SELECT * FROM users WHERE email = ?
    `).bind(email).first();
  }

  async getUserById(id) {
    return await this.db.prepare(`
      SELECT * FROM users WHERE id = ?
    `).bind(id).first();
  }

  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // ========== AI WORKFORCE ==========
  async addAI(userId, aiId, name, description, businessInfo, serviceName) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO ai_workforce (id, user_id, ai_id, name, description, business_info, service_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, aiId, name, description, businessInfo, serviceName, createdAt).run();

    return id;
  }

  async getUserAI(userId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM ai_workforce 
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
    `).bind(userId).all();

    return results;
  }

  async deleteAI(userId, aiId) {
    await this.db.prepare(`
      DELETE FROM ai_workforce 
      WHERE id = ? AND user_id = ?
    `).bind(aiId, userId).run();
  }

  async updateBusinessContext(aiId, userId, businessInfo) {
    await this.db.prepare(`
      UPDATE ai_workforce 
      SET business_info = ?, updated_at = ?
      WHERE id = ? AND user_id = ?
    `).bind(businessInfo, new Date().toISOString(), aiId, userId).run();
  }

  // ========== API KEYS ==========
  async saveAPIKey(userId, serviceName, apiKey) {
    // Check if exists
    const existing = await this.db.prepare(`
      SELECT id FROM api_keys 
      WHERE user_id = ? AND service_name = ?
    `).bind(userId, serviceName).first();

    if (existing) {
      await this.db.prepare(`
        UPDATE api_keys 
        SET api_key = ?, updated_at = ?
        WHERE id = ? AND user_id = ?
      `).bind(apiKey, new Date().toISOString(), existing.id, userId).run();
      return existing.id;
    } else {
      const id = crypto.randomUUID();
      await this.db.prepare(`
        INSERT INTO api_keys (id, user_id, service_name, api_key)
        VALUES (?, ?, ?, ?)
      `).bind(id, userId, serviceName, apiKey).run();
      return id;
    }
  }

  async getUserAPIKey(userId, serviceName) {
    return await this.db.prepare(`
      SELECT api_key FROM api_keys 
      WHERE user_id = ? AND service_name = ?
    `).bind(userId, serviceName).first();
  }

  async deleteAPIKey(keyId, userId) {
    await this.db.prepare(`
      DELETE FROM api_keys 
      WHERE id = ? AND user_id = ?
    `).bind(keyId, userId).run();
  }

  // ========== CHAT HISTORY ==========
  async saveChatHistory(userId, aiId, platform, senderId, message, response, direction) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO chat_history (id, user_id, ai_id, platform, sender_id, direction, message, response, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, aiId, platform, senderId, direction, message, response, createdAt).run();
  }

  async getChatHistory(userId, aiId = null, platform = null, limit = 100) {
    let query = `SELECT * FROM chat_history WHERE user_id = ?`;
    const binds = [userId];

    if (aiId) {
      query += ` AND ai_id = ?`;
      binds.push(aiId);
    }

    if (platform) {
      query += ` AND platform = ?`;
      binds.push(platform);
    }

    query += ` ORDER BY created_at DESC LIMIT ?`;
    binds.push(limit);

    const { results } = await this.db.prepare(query).bind(...binds).all();
    return results;
  }

  // ========== TELEGRAM BOTS ==========
  async saveTelegramBot(userId, aiId, botToken, botUsername) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Delete any existing bot for this AI
    await this.db.prepare(`
      DELETE FROM telegram_bots 
      WHERE user_id = ? AND ai_id = ?
    `).bind(userId, aiId).run();

    await this.db.prepare(`
      INSERT INTO telegram_bots (id, user_id, ai_id, bot_token, bot_username, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, userId, aiId, botToken, botUsername, createdAt).run();

    return id;
  }

  async getTelegramBot(botId) {
    return await this.db.prepare(`
      SELECT * FROM telegram_bots WHERE id = ?
    `).bind(botId).first();
  }

  async getTelegramBotByAI(userId, aiId) {
    return await this.db.prepare(`
      SELECT * FROM telegram_bots 
      WHERE user_id = ? AND ai_id = ?
    `).bind(userId, aiId).first();
  }

  // ========== WHATSAPP BOTS ==========
  async saveWhatsAppBot(userId, aiId, provider, config) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    // Delete any existing bot for this AI
    await this.db.prepare(`
      DELETE FROM whatsapp_bots 
      WHERE user_id = ? AND ai_id = ?
    `).bind(userId, aiId).run();

    const { 
      account_sid, 
      access_token, 
      api_key, 
      auth_token, 
      phone_number, 
      phone_number_id, 
      whatsapp_number, 
      wati_url 
    } = config;

    await this.db.prepare(`
      INSERT INTO whatsapp_bots (id, user_id, ai_id, provider, account_sid, access_token, api_key, 
                                auth_token, phone_number, phone_number_id, whatsapp_number, wati_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, userId, aiId, provider, account_sid, access_token, api_key, 
      auth_token, phone_number, phone_number_id, whatsapp_number, wati_url, createdAt
    ).run();

    return id;
  }

  async getWhatsAppBot(botId) {
    return await this.db.prepare(`
      SELECT * FROM whatsapp_bots WHERE id = ?
    `).bind(botId).first();
  }

  async getWhatsAppBotByAI(userId, aiId) {
    return await this.db.prepare(`
      SELECT * FROM whatsapp_bots 
      WHERE user_id = ? AND ai_id = ?
    `).bind(userId, aiId).first();
  }

  // ========== DATABASES ==========
  async saveDatabase(userId, name, description, filename, fileType, data) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const recordCount = Array.isArray(data) ? data.length : 1;

    await this.db.prepare(`
      INSERT INTO user_databases (id, user_id, name, description, filename, file_type, data, record_count, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, userId, name, description, filename, fileType, JSON.stringify(data), recordCount, createdAt).run();

    return id;
  }

  async getUserDatabases(userId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM user_databases 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).bind(userId).all();

    return results.map(db => ({
      ...db,
      data: JSON.parse(db.data || '[]')
    }));
  }

  async getDatabase(dbId, userId) {
    const db = await this.db.prepare(`
      SELECT * FROM user_databases 
      WHERE id = ? AND user_id = ?
    `).bind(dbId, userId).first();

    if (db) {
      db.data = JSON.parse(db.data || '[]');
    }
    return db;
  }

  async queryDatabase(dbId, userId, queryParams) {
    const db = await this.getDatabase(dbId, userId);
    if (!db) return [];

    let data = db.data;
    
    // Apply filters
    if (queryParams.filters) {
      data = this.applyFilters(data, queryParams.filters);
    }
    
    // Apply sorting
    if (queryParams.sort) {
      data = this.applySorting(data, queryParams.sort);
    }
    
    // Apply pagination
    if (queryParams.pagination) {
      data = this.applyPagination(data, queryParams.pagination);
    }

    return data;
  }

  applyFilters(data, filters) {
    return data.filter(item => {
      for (const [field, condition] of Object.entries(filters)) {
        if (!this.evaluateCondition(item[field], condition)) {
          return false;
        }
      }
      return true;
    });
  }

  evaluateCondition(value, condition) {
    if (typeof condition === 'object') {
      for (const [op, opValue] of Object.entries(condition)) {
        if (op === 'equals' && String(value) !== String(opValue)) return false;
        if (op === 'contains' && !String(value).toLowerCase().includes(String(opValue).toLowerCase())) return false;
        if (op === 'greaterThan' && Number(value) <= Number(opValue)) return false;
        if (op === 'lessThan' && Number(value) >= Number(opValue)) return false;
      }
      return true;
    }
    return String(value) === String(condition);
  }

  applySorting(data, sort) {
    const { field, direction = 'asc' } = sort;
    return data.sort((a, b) => {
      const aVal = a[field] || '';
      const bVal = b[field] || '';
      const compare = String(aVal).localeCompare(String(bVal));
      return direction === 'desc' ? -compare : compare;
    });
  }

  applyPagination(data, pagination) {
    const { page = 1, limit = 10 } = pagination;
    const start = (page - 1) * limit;
    const end = start + limit;
    return data.slice(start, end);
  }

  // ========== SALES ==========
  async addSale(userId, dbId, saleData) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const total = parseFloat(saleData.amount) * parseInt(saleData.quantity);

    await this.db.prepare(`
      INSERT INTO sales_records (id, user_id, db_id, customer_name, product_service, 
                                amount, quantity, total, sale_date, payment_method, 
                                customer_contact, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, userId, dbId, saleData.customer_name, saleData.product_service,
      saleData.amount, saleData.quantity, total, saleData.sale_date,
      saleData.payment_method, saleData.customer_contact, saleData.notes, createdAt
    ).run();

    return id;
  }

  async getSalesAnalytics(dbId, userId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM sales_records 
      WHERE db_id = ? AND user_id = ?
      ORDER BY sale_date DESC
    `).bind(dbId, userId).all();

    if (!results.length) {
      return {
        totalSales: 0,
        totalRevenue: 0,
        averageSale: 0,
        totalCustomers: 0,
        dailyBreakdown: [],
        productBreakdown: []
      };
    }

    // Calculate analytics
    const totalRevenue = results.reduce((sum, sale) => sum + parseFloat(sale.total), 0);
    const totalSales = results.length;
    const averageSale = totalRevenue / totalSales;
    
    // Unique customers
    const customers = [...new Set(results.map(s => s.customer_name))];
    
    // Daily breakdown
    const dailyTotals = {};
    results.forEach(sale => {
      const date = sale.sale_date.split('T')[0];
      dailyTotals[date] = (dailyTotals[date] || 0) + parseFloat(sale.total);
    });
    
    // Product breakdown
    const productTotals = {};
    results.forEach(sale => {
      const product = sale.product_service;
      productTotals[product] = (productTotals[product] || 0) + parseFloat(sale.total);
    });

    return {
      totalSales,
      totalRevenue,
      averageSale,
      totalCustomers: customers.length,
      dailyBreakdown: Object.entries(dailyTotals).map(([date, revenue]) => ({ date, revenue })),
      productBreakdown: Object.entries(productTotals)
        .map(([product, revenue]) => ({ product, revenue }))
        .sort((a, b) => b.revenue - a.revenue),
      recentSales: results.slice(0, 10)
    };
  }

  // ========== PARTNERS ==========
  async createPartner(name, email, password, company, phone) {
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    const createdAt = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO partners (id, name, email, password_hash, company, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, name, email, passwordHash, company, phone, createdAt).run();

    return { id, name, email };
  }

  async getPartnerByEmail(email) {
    return await this.db.prepare(`
      SELECT * FROM partners WHERE email = ?
    `).bind(email).first();
  }

  async addPartnerClient(partnerId, clientData) {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const partnerEarnings = parseFloat(clientData.billing_amount) * 0.6;
    const yourEarnings = parseFloat(clientData.billing_amount) * 0.4;

    await this.db.prepare(`
      INSERT INTO partner_clients (id, partner_id, partner_name, client_name, client_email, 
                                  client_phone, client_company, billing_amount, billing_period,
                                  partner_earnings, your_earnings, notes, preferences, 
                                  status, created_at, last_billing_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, partnerId, clientData.partner_name, clientData.client_name, clientData.client_email,
      clientData.client_phone, clientData.client_company, clientData.billing_amount, 
      clientData.billing_period, partnerEarnings, yourEarnings, clientData.notes,
      clientData.preferences, 'active', createdAt, createdAt
    ).run();

    return id;
  }

  async getPartnerClients(partnerId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM partner_clients 
      WHERE partner_id = ?
      ORDER BY created_at DESC
    `).bind(partnerId).all();

    return results;
  }

  async getPartnerEarnings(partnerId) {
    const { results } = await this.db.prepare(`
      SELECT billing_period, SUM(partner_earnings) as total_earnings
      FROM partner_clients 
      WHERE partner_id = ?
      GROUP BY billing_period
    `).bind(partnerId).all();

    const monthly = results.find(r => r.billing_period === 'monthly')?.total_earnings || 0;
    const quarterly = results.find(r => r.billing_period === 'quarterly')?.total_earnings || 0;
    const yearly = results.find(r => r.billing_period === 'yearly')?.total_earnings || 0;
    const total = monthly + quarterly + yearly;

    return { monthly, quarterly, yearly, total };
  }
}

// Helper to parse JSON from request
export async function parseJSON(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new Error('Invalid JSON');
  }
}

// Helper to return JSON response
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Helper to return error response
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}
