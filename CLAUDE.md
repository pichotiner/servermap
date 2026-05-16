# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Development (runs backend :3001 + frontend :5173 concurrently)
npm run dev

# Build frontend for production
npm run build

# Start backend only (serves built frontend + proxies Dynmap)
npm start

# Build and restart on production server
npm run build --prefix client && pm2 restart servermap
```

No test suite exists yet.

## Architecture

Two-package monorepo: `server/` (Express, Node.js) and `client/` (React + Vite).

**In production**: a single `pm2` process runs `server/index.js` on port 3001. It serves the built React SPA from `client/dist/` and proxies all Dynmap traffic. nginx on port 80 reverse-proxies to it.

**In dev**: Vite dev server on :5173 proxies `/tiles`, `/up`, `/api` to the Express backend on :3001.

### Data flow

```
Browser → nginx :80 → Express :3001
                           ├─ /tiles/* → Dynmap :8123 (tile images)
                           ├─ /up/*    → Dynmap :8123 (config + player polling)
                           ├─ /api/skin/:uuid → Crafatar (player face images)
                           └─ /*       → client/dist (React SPA)
```

### Frontend components

- **`useDynmap` hook** — fetches `/up/configuration` once, then long-polls `/up/world/{world}/{timestamp}` every 2–3s for live player positions. Returns `{ config, players, online, error }`.
- **`DynmapLayer`** — renders map tiles using `L.GridLayer.extend`. Implements Dynmap's region-based tile coordinate system (see below). Receives `config` to read `mapzoomout` and `prefix`.
- **`PlayerMarkers`** — manages Leaflet markers imperatively via `useRef`. Converts Minecraft (x, z) to Leaflet latLng using `map.unproject`.
- **`PlayerList`** — collapsible sidebar panel; clicking a player calls `onPlayerClick` which sets `focusPlayer` state in App, triggering a map pan in `PlayerMarkers`.
- **`MapControls`** — world/renderer switcher (pill buttons from config) + zoom buttons. Rendered inside `MapContainer` so it can call `useMap()`.
- **`ServerStatus`** — top bar showing online dot, player count, server title from config.

### Dynmap tile coordinate system

This is the most complex part of the codebase. Dynmap stores tiles as
(see Dynmap's own `hdmap.js` — `getTileName` / `getTileInfo`):
```
/tiles/{world}/{prefix}/{x>>5}_{y>>5}/{zoom}{x}_{y}.{fmt}
```

Key facts:
- **Directory groups 32 tiles per axis** (`x>>5`, `y>>5`); the filename keeps the **full** tile coordinate, not an offset within the directory.
- **Y axis is inverted**: the Dynmap tile coordinate is `-(leafletY * scale)`.
- **Zoom-out prefix** uses repeated `z`: native = `""`, zoom-out-1 = `"z_"`, zoom-out-2 = `"zz_"`, ..., zoom-out-5 = `"zzzzz_"` — NOT `"z1_"`, `"z2_"` etc.
- **`mapzoomout`** from config (typically 5) = number of zoom-out levels = Leaflet `maxZoom`
- At Leaflet zoom `z`, the Dynmap zoom-out level is `maxZoom - z` (Leaflet zoom 0 = most zoomed out = longest prefix); tile coordinate `= leafletCoord << zoomOutLevel`.
- **Image format** (`{fmt}`) comes from the map's `image-format` field in the config (default `png`) — it is NOT always `jpg`.

The `dynmapUrl()` function in `DynmapLayer.jsx` implements all of this. When modifying tile logic, verify against actual files on disk at `/home/pichotiner/ServerMine/dynmap/web/tiles/`.

### Player coordinate conversion

`PlayerMarkers` converts a Minecraft `(x, y, z)` position to a Leaflet
`LatLng` with Dynmap's own `HDProjection.fromLocationToLatLng` formula
(`hdmap.js`), reading `worldtomap`, `mapzoomout` and `tilescale` from the
map config so it stays in sync with `DynmapLayer`:
```
lng = (worldtomap[0]*x + worldtomap[1]*y + worldtomap[2]*z) / (1 << mapzoomout)
mapY = worldtomap[3]*x + worldtomap[4]*y + worldtomap[5]*z
lat = -(((128 << tilescale) - mapY) / (1 << mapzoomout))
```
For the flat renderer `worldtomap` is `[4, 0, 0, 0, 0, -4, 0, 1, 0]`
(`map_x = 4*block_x`, `map_y = -4*block_z`).

## Production deployment (Ubuntu + nginx + pm2)

```
Minecraft server:  /home/pichotiner/ServerMine/
Dynmap tiles:      /home/pichotiner/ServerMine/dynmap/web/tiles/
Servermap app:     /opt/servermap/
nginx config:      /etc/nginx/sites-enabled/map.pichotin.ru → proxies to :3001
pm2 process:       servermap (id 0)
Public URL:        http://map.pichotin.ru
Dynmap internal:   http://127.0.0.1:8123
```

Environment variable `DYNMAP_URL` overrides the Dynmap target (default: `http://127.0.0.1:8123`).
