const { createProxyMiddleware } = require('http-proxy-middleware');

// Use local backend port (8000) for local development
// Use Docker backend port (8001) when Docker is running
const BACKEND_PORT = process.env.REACT_APP_BACKEND_PORT || '8000';
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;

module.exports = function(app) {
  console.log(`[Proxy] Forwarding to backend at: ${BACKEND_URL}`);
  
  // Proxy /api/* to backend
  app.use(
    '/api',
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('[Proxy] Request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('[Proxy] Response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('[Proxy] Error:', err.message);
      },
    })
  );
  
  // Proxy /inference/* to backend (inference routes don't have /api/v1 prefix)
  app.use(
    '/inference',
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      logLevel: 'debug',
      onProxyReq: (proxyReq, req, res) => {
        console.log('[Proxy] Inference Request:', req.method, req.url);
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log('[Proxy] Inference Response:', proxyRes.statusCode, req.url);
      },
      onError: (err, req, res) => {
        console.error('[Proxy] Inference Error:', err.message);
      },
    })
  );
  
  app.use(
    '/health',
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      logLevel: 'debug',
    })
  );
};
