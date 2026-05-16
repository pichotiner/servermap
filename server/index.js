const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;
const DYNMAP_BASE = process.env.DYNMAP_URL || 'http://127.0.0.1:8123';

app.use(cors());

// Proxy tile requests
app.use('/tiles', createProxyMiddleware({
  target: DYNMAP_BASE,
  changeOrigin: true,
}));

// Proxy dynmap data endpoints
app.use('/up', createProxyMiddleware({
  target: DYNMAP_BASE,
  changeOrigin: true,
}));

// Skin face endpoint — fetches the 8x8 face region from Crafatar
app.get('/api/skin/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    const size = req.query.size || 32;
    const url = `https://crafatar.com/avatars/${uuid}?size=${size}&overlay=true`;
    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) throw new Error('crafatar error');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    response.body.pipe(res);
  } catch {
    // Return a 1x1 transparent PNG on failure
    const fallback = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    res.send(fallback);
  }
});

// Aggregate status: config + world data
app.get('/api/status', async (req, res) => {
  try {
    const [cfgRes, worldRes] = await Promise.all([
      fetch(`${DYNMAP_BASE}/up/configuration`),
      fetch(`${DYNMAP_BASE}/up/world/world/0`),
    ]);
    const config = await cfgRes.json();
    const world = await worldRes.json();
    res.json({ config, world });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// World data with timestamp (for polling updates)
app.get('/api/world/:world/:timestamp', async (req, res) => {
  try {
    const { world, timestamp } = req.params;
    const response = await fetch(`${DYNMAP_BASE}/up/world/${world}/${timestamp}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Serve built React frontend
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servermap backend running on port ${PORT}`);
  console.log(`Proxying Dynmap at ${DYNMAP_BASE}`);
});
