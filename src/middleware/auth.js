import { DatabaseService } from '../database/queries.js';

// JWT secret - use environment variable
const JWT_SECRET = 'your-jwt-secret-change-this'; // Should be in env.JWT_SECRET

export async function requireAuth(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(7);
  
  try {
    // Simple token verification (in production, use JWT)
    // For now, we'll assume token is user ID
    const userId = token; // In production, decode JWT
    
    const db = new DatabaseService(request.env.DB);
    const user = await db.getUserById(userId);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add user to request object for handlers to use
    request.user = user;
    return null; // No error, continue
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Authentication failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function requirePartnerAuth(request) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Partner ')) {
    return new Response(JSON.stringify({ error: 'Partner authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const token = authHeader.substring(8);
  
  try {
    const db = new DatabaseService(request.env.DB);
    const partner = await db.getPartnerById(token); // You'll need to add this method
    
    if (!partner) {
      return new Response(JSON.stringify({ error: 'Invalid partner token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    request.partner = partner;
    return null;
    
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Partner authentication failed' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Rate limiting middleware
export async function rateLimit(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const path = new URL(request.url).pathname;
  const key = `rate_limit:${ip}:${path}`;
  
  // Use D1 for rate limiting
  const db = new DatabaseService(env.DB);
  
  try {
    // Create rate_limits table if it doesn't exist
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        count INTEGER DEFAULT 1,
        expires_at DATETIME
      )
    `).run();
    
    // Check existing count
    const existing = await env.DB.prepare(`
      SELECT count, expires_at FROM rate_limits 
      WHERE key = ? AND expires_at > datetime('now')
    `).bind(key).first();
    
    if (existing && existing.count >= 100) { // 100 requests per window
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update or insert rate limit
    if (existing) {
      await env.DB.prepare(`
        UPDATE rate_limits 
        SET count = count + 1 
        WHERE key = ?
      `).bind(key).run();
    } else {
      const expiresAt = new Date(Date.now() + 60 * 1000).toISOString(); // 1 minute window
      await env.DB.prepare(`
        INSERT INTO rate_limits (key, count, expires_at)
        VALUES (?, 1, ?)
      `).bind(key, expiresAt).run();
    }
    
    // Clean up old rate limits
    await env.DB.prepare(`
      DELETE FROM rate_limits 
      WHERE expires_at <= datetime('now')
    `).run();
    
    return null; // No error, continue
    
  } catch (error) {
    console.error('Rate limiting error:', error);
    return null; // Don't block on rate limit errors
  }
}

// Session management (simplified)
export function createSession(user) {
  // In production, use JWT
  return {
    token: user.id, // Simple token - user ID
    user: {
      id: user.id,
      email: user.email,
      business_name: user.business_name
    }
  };
}

export function createPartnerSession(partner) {
  return {
    token: partner.id,
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email
    }
  };
}
