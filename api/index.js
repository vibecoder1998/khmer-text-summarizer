// Vercel Serverless Function Handler
// This loads the pre-built API server and serves it as a Vercel function

let appInstance = null;

async function loadApp() {
  if (appInstance) {
    return appInstance;
  }
  
  try {
    console.log('[v0] Loading API server from dist/index.mjs');
    // Import the built API server ESM module
    const { default: app } = await import('../artifacts/api-server/dist/index.mjs');
    
    if (!app || typeof app !== 'function') {
      throw new Error('API module does not export a valid Express app');
    }
    
    appInstance = app;
    console.log('[v0] API server loaded successfully');
    return appInstance;
  } catch (err) {
    console.error('[v0] Failed to load API server:', err?.message || err);
    console.error('[v0] Error details:', err);
    throw err;
  }
}

module.exports = async (req, res) => {
  try {
    const app = await loadApp();
    
    // Call the Express app directly with the request and response
    // Express apps are callable as functions: app(req, res)
    return app(req, res);
  } catch (err) {
    console.error('[v0] Handler error:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to load API server', 
        message: err?.message || 'Unknown error'
      });
    }
  }
};
