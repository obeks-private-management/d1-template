export class DatabaseService {
  constructor(db) {
    this.db = db;
  }

  async createUser(email, passwordHash, businessName, countryCode, whatsappNumber) {
    const id = crypto.randomUUID();
    const result = await this.db.prepare(`
      INSERT INTO users (id, email, password_hash, business_name, country_code, whatsapp_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, email, passwordHash, businessName, countryCode, whatsappNumber).run();
    
    return { id, email, business_name: businessName };
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

  async getUserAI(userId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM ai_workforce WHERE user_id = ?
    `).bind(userId).all();
    return results || [];
  }

  async getUserDatabases(userId) {
    const { results } = await this.db.prepare(`
      SELECT * FROM user_databases WHERE user_id = ?
    `).bind(userId).all();
    return results || [];
  }

  async getChatHistory(userId, aiId = null, platform = null, limit = 100) {
    let query = `SELECT * FROM chat_history WHERE user_id = ?`;
    const params = [userId];
    
    if (aiId) {
      query += ` AND ai_id = ?`;
      params.push(aiId);
    }
    
    if (platform) {
      query += ` AND platform = ?`;
      params.push(platform);
    }
    
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const { results } = await this.db.prepare(query).bind(...params).all();
    return results || [];
  }

  async saveAPIKey(userId, serviceName, apiKey) {
    // Check if exists
    const existing = await this.db.prepare(`
      SELECT id FROM api_keys WHERE user_id = ? AND service_name = ?
    `).bind(userId, serviceName).first();
    
    if (existing) {
      await this.db.prepare(`
        UPDATE api_keys SET api_key = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(apiKey, existing.id).run();
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
}
