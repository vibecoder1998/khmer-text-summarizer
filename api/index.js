// Vercel Serverless Function Handler
// This loads the pre-built API server and serves it as a Vercel function

const path = require('path');

// Load the built API server (ESM module)
let apiHandler = null;

async function loadApi() {
  if (apiHandler) return apiHandler;
  
  try {
    // Import the built API server
    const apiModule = await import(path.join(__dirname, '../artifacts/api-server/dist/index.mjs'));
    return apiModule.default;
  } catch (err) {
    console.error('[v0] Failed to load API module:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    return res.status(200).end();
  }

  try {
    const app = await loadApi();
    console.log('[v0] API handler loaded, calling app');
    return app(req, res);
  } catch (err) {
    console.error('[v0] API error:', err);
    return res.status(500).json({ error: 'Internal server error', message: err.message });
  }
};
