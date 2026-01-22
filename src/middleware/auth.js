import bcrypt from 'bcryptjs';
import { DatabaseService } from '../database/db.js';

export async function handleSignup(request, env) {
  try {
    const { email, password, confirm_password, business_name, country_code, whatsapp_number } = await request.json();
    
    // Validation
    if (password !== confirm_password) {
      return new Response(JSON.stringify({ error: 'Passwords do not match' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!whatsapp_number || !/^\d+$/.test(whatsapp_number)) {
      return new Response(JSON.stringify({ error: 'WhatsApp number must contain only digits' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const db = new DatabaseService(env.DB);
    
    // Check if user exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'Email already registered' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await db.createUser(email, passwordHash, business_name, country_code, whatsapp_number);
    
    // Generate simple token (in production, use JWT)
    const token = user.id;
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Signup failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleLogin(request, env) {
  try {
    const { email, password } = await request.json();
    
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const db = new DatabaseService(env.DB);
    const user = await db.getUserByEmail(email);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate token
    const token = user.id; // Simple token for now
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Login failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function handleDashboard(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const token = authHeader.substring(7);
    const db = new DatabaseService(env.DB);
    
    // Get user from token (simple implementation)
    const user = await db.getUserById(token);
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get user's AI agents
    const userAI = await db.getUserAI(user.id);
    
    // Get user databases count
    const userDatabases = await db.getUserDatabases(user.id);
    
    // Get chat history count (last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const chatHistory = await db.getChatHistory(user.id, null, null, 100);
    const todayChats = chatHistory.filter(chat => 
      new Date(chat.created_at) > new Date(twentyFourHoursAgo)
    );
    
    return new Response(JSON.stringify({
      success: true,
      dashboard: {
        user: {
          id: user.id,
          email: user.email,
          business_name: user.business_name
        },
        statistics: {
          database_count: userDatabases.length,
          chat_count: todayChats.length,
          active_ai_count: userAI.length
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'Failed to load dashboard' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
