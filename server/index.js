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
const MARKERS_FILE = process.env.MARKERS_FILE || path.join(__dirname, 'data', 'markers.json');

app.use(cors());
app.use(express.json());

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
  const job = renderQueue.shift();
  const { world, blockX, blockZ, radius, key } = job;
  const cmd = `screen -S ${MINECRAFT_SCREEN} -X stuff "dynmap radiusrender ${world} ${blockX} ${blockZ} ${radius}\\r"`;
  exec(cmd, (err) => {
    if (key) queuedKeys.delete(key);
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
// Global map markers — anyone can add a labelled xyz point. Persisted as JSON.
// ---------------------------------------------------------------------------
function loadMarkers() {
  try {
    const data = JSON.parse(fs.readFileSync(MARKERS_FILE, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveMarkers(list) {
  fs.mkdirSync(path.dirname(MARKERS_FILE), { recursive: true });
  fs.writeFileSync(MARKERS_FILE, JSON.stringify(list, null, 2));
}

let markers = loadMarkers();

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_MARKER_COLOR = '#9aa0a6';

app.get('/api/markers', (_req, res) => res.json(markers));

app.post('/api/markers', (req, res) => {
  const { world, x, y, z, label, author, color } = req.body || {};
  if (typeof world !== 'string' || !world.trim()) {
    return res.status(400).json({ error: 'world required' });
  }
  const nx = Number(x), ny = Number(y), nz = Number(z);
  if (![nx, ny, nz].every(Number.isFinite)) {
    return res.status(400).json({ error: 'invalid coordinates' });
  }
  const cleanLabel = String(label || '').trim().slice(0, 60);
  if (!cleanLabel) return res.status(400).json({ error: 'label required' });
  const cleanAuthor = String(author || '').trim().slice(0, 32) || 'Аноним';
  const cleanColor = COLOR_RE.test(String(color || '')) ? color : DEFAULT_MARKER_COLOR;

  const marker = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    world: world.trim(),
    x: Math.round(nx),
    y: Math.round(ny),
    z: Math.round(nz),
    label: cleanLabel,
    author: cleanAuthor,
    color: cleanColor,
    createdAt: new Date().toISOString(),
  };
  markers.push(marker);
  saveMarkers(markers);

  // Putting a marker is also a strong "I care what's here" signal — queue a
  // radiusrender so the area reflects recent block changes within a few
  // seconds, in case Dynmap's auto-render hasn't caught up.
  const chunkX = marker.x >> 4;
  const chunkZ = marker.z >> 4;
  const key = `${marker.world}:${chunkX}:${chunkZ}`;
  if (!queuedKeys.has(key) && renderQueue.length < QUEUE_MAX) {
    queuedKeys.add(key);
    renderQueue.push({
      world: marker.world,
      blockX: marker.x,
      blockZ: marker.z,
      radius: 4,
      key,
    });
    console.log(`[markers] queued render at ${marker.world} (${marker.x}, ${marker.z})`);
  }

  res.status(201).json(marker);
});

app.delete('/api/markers/:id', (req, res) => {
  const idx = markers.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  markers.splice(idx, 1);
  saveMarkers(markers);
  res.status(204).end();
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
