// Add to src/index.js
import fs from 'fs/promises';
import path from 'path';

// Simple in-memory file cache
const fileCache = new Map();

async function serveStaticFile(filePath) {
  if (fileCache.has(filePath)) {
    return fileCache.get(filePath);
  }
  
  try {
    const fullPath = path.join(process.cwd(), 'public', filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    
    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    if (filePath.endsWith('.json')) contentType = 'application/json';
    
    const response = {
      content,
      contentType,
      headers: {
        'Cache-Control': 'public, max-age=3600',
        'Content-Type': contentType
      }
    };
    
    fileCache.set(filePath, response);
    return response;
  } catch (error) {
    return null;
  }
}

// Update the GET route handler
router.get('/*', async (request) => {
  const url = new URL(request.url);
  let filePath = url.pathname;
  
  if (filePath === '/') filePath = '/login.html';
  
  // Remove leading slash
  if (filePath.startsWith('/')) {
    filePath = filePath.substring(1);
  }
  
  // Default to .html if no extension
  if (!filePath.includes('.') && filePath !== '') {
    filePath += '.html';
  }
  
  const file = await serveStaticFile(filePath);
  
  if (file) {
    return new Response(file.content, {
      headers: file.headers
    });
  }
  
  return new Response('Not Found', { status: 404 });
});
