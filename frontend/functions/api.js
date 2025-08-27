// Cloudflare Pages function for frontend API integration
// This function proxies API requests to the backend worker

export async function onRequest(context) {
  const { request } = context;
  
  // Get the URL and method
  const url = new URL(request.url);
  const method = request.method;
  
  // Proxy API requests to the backend worker
  if (url.pathname.startsWith('/api/')) {
    // In production, this would point to your deployed worker
    const backendUrl = `https://your-worker.your-subdomain.workers.dev${url.pathname}${url.search}`;
    
    // Create a new request to the backend
    const backendRequest = new Request(backendUrl, {
      method: method,
      headers: request.headers,
      body: method !== 'GET' && method !== 'HEAD' ? await request.blob() : null
    });
    
    // Forward the request to the backend
    try {
      const response = await fetch(backendRequest);
      return response;
    } catch (error) {
      return new Response(
        JSON.stringify({ 
          error: 'Backend service unavailable',
          message: error.message 
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
  
  // Serve static files for other requests
  return context.next();
}