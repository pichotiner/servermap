const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const PORT = process.env.PORT || 3001;
const DYNMAP_BASE = process.env.DYNMAP_URL || 'http://127.0.0.1:8123';
const TILES_DIR = process.env.DYNMAP_TILES_DIR || '/home/pichotiner/ServerMine/dynmap/web/tiles';
const MINECRAFT_SCREEN = process.env.MC_SCREEN || 'minecraft';
const RENDER_INTERVAL_MS = 4000;
const QUEUE_MAX = 200;

app.use(cors());

// Log all incoming requests
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ---------------------------------------------------------------------------
// On-demand render queue
// Dynmap console command (confirmed from source):
//   dynmap radiusrender <world> <x> <z> <radius>
// ---------------------------------------------------------------------------
const renderQueue = [];    // [{world, blockX, blockZ, radius}]
const queuedKeys = new Set(); // "world:chunkX:chunkZ" — dedup per session

setInterval(() => {
  if (renderQueue.length === 0) return;
  const { world, blockX, blockZ, radius } = renderQueue.shift();
  const cmd = `screen -S ${MINECRAFT_SCREEN} -X stuff "dynmap radiusrender ${world} ${blockX} ${blockZ} ${radius}\\r"`;
  exec(cmd, (err) => {
    if (err) console.error(`[ondemand] screen cmd failed: ${err.message}`);
    else console.log(`[ondemand] render: ${world} (${blockX}, ${blockZ}) r=${radius} — ${renderQueue.length} left`);
  });
}, RENDER_INTERVAL_MS);

// Parse /tiles/... URL and return Minecraft center coords for the tile.
// Tile URL: /tiles/{world}/{renderer}/{dirX}_{dirY}/{zoomPrefix}{tileX}_{tileY}.{fmt}
//
// For flat renderer:  map_x = 4*blockX, map_z = 4*blockZ (Dynmap Y-inverted in filename)
//   → blockX = tileX/4,  blockZ = tileY/4
// For surface renderer (isometric): projection is complex; we use the same
//   formula as a rough approximation — good enough for radius-based rendering.
function tileUrlToRenderJob(urlPath) {
  const m = urlPath.match(
    /^\/tiles\/([^/]+)\/([^/]+)\/(-?\d+)_(-?\d+)\/(z*)(?:_?)(-?\d+)_(-?\d+)\.[a-z]+$/
  );
  if (!m) return null;
  const [, world, , , , zoomPfx, txStr, tyStr] = m;

  const zOut = zoomPfx.length; // number of 'z' chars = zoom-out level
  if (zOut > 2) return null;   // skip tiles covering >128 chunks (too coarse)

  const tileX = parseInt(txStr);
  const tileY = parseInt(tyStr);
  const scale  = 1 << zOut;    // 1 at native, 2 at z_, 4 at zz_

  // Center of tile in Minecraft block coordinates
  const blockX = Math.round(tileX / 4);
  const blockZ = Math.round(tileY / 4);

  // Radius in chunks: native tile ≈ 2 chunks wide; scale up for zoom-out tiles
  const radius = 2 * scale;

  // Dedup key: round to chunk grid so nearby tiles don't duplicate work
  const chunkX = blockX >> 4;
  const chunkZ = blockZ >> 4;
  const key = `${world}:${chunkX}:${chunkZ}`;

  return { world, blockX, blockZ, radius, key };
}

// ---------------------------------------------------------------------------
// Tile serving: filesystem-first, on-demand render on miss
// ---------------------------------------------------------------------------
app.use('/tiles', (req, res) => {
  const tilePath = path.join(TILES_DIR, req.path);
  fs.access(tilePath, fs.constants.R_OK, (err) => {
    if (!err) {
      // Tile exists — serve it without caching so freshly rendered tiles appear
      return res.set('Cache-Control', 'no-cache').sendFile(tilePath);
    }

    // Tile missing — queue a render job (if queue has room and not already queued)
    const job = tileUrlToRenderJob('/tiles' + req.path);
    if (job && !queuedKeys.has(job.key) && renderQueue.length < QUEUE_MAX) {
      queuedKeys.add(job.key);
      renderQueue.push(job);
      console.log(`[ondemand] queued ${job.key} (queue: ${renderQueue.length})`);
    }

    res.status(404).end();
  });
});

// ---------------------------------------------------------------------------
// Dynmap live-data proxy (configuration + world polling)
// ---------------------------------------------------------------------------
app.use('/up', createProxyMiddleware({
  target: DYNMAP_BASE,
  changeOrigin: true,
}));

// ---------------------------------------------------------------------------
// Skin face endpoint
// ---------------------------------------------------------------------------
app.get('/api/skin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const size = req.query.size || 32;
    const url = `https://mc-heads.net/avatar/${encodeURIComponent(id)}/${size}`;
    const response = await fetch(url, { timeout: 5000 });
    if (!response.ok) throw new Error('skin source error');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    response.body.pipe(res);
  } catch {
    const fallback = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    res.set('Content-Type', 'image/png');
    res.send(fallback);
  }
});

// ---------------------------------------------------------------------------
// Aggregate status endpoint
// ---------------------------------------------------------------------------
app.get('/api/status', async (req, res) => {
  try {
    const [cfgRes, worldRes] = await Promise.all([
      fetch(`${DYNMAP_BASE}/up/configuration`),
      fetch(`${DYNMAP_BASE}/up/world/world/0`),
    ]);
    const config = await cfgRes.json();
    const world  = await worldRes.json();
    res.json({ config, world });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// React frontend
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Servermap backend running on port ${PORT}`);
  console.log(`Tiles from ${TILES_DIR}`);
  console.log(`On-demand render: 1 job every ${RENDER_INTERVAL_MS / 1000}s via screen "${MINECRAFT_SCREEN}"`);
});
