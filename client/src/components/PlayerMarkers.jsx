import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const FLAT_WORLDTOMAP = [4, 0, 0, 0, 0, -4, 0, 1, 0];

// Dynmap HDProjection.fromLocationToLatLng (see hdmap.js): converts a
// Minecraft block position (x, y, z) into a Leaflet LatLng under CRS.Simple,
// so player markers line up with the tiles rendered by DynmapLayer.
function mcToLatLng(worldtomap, mapzoomout, tilescale, x, y, z) {
  const div = 1 << mapzoomout;
  const lng = (worldtomap[0] * x + worldtomap[1] * y + worldtomap[2] * z) / div;
  const mapY = worldtomap[3] * x + worldtomap[4] * y + worldtomap[5] * z;
  const lat = -(((128 << tilescale) - mapY) / div);
  return L.latLng(lat, lng);
}

function buildIcon(id, name) {
  const src = `/api/skin/${encodeURIComponent(id)}?size=32`;
  return L.divIcon({
    className: '',
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:3px;
        pointer-events:none;
      ">
        <div style="
          width:38px;height:38px;
          border:2px solid #ffe16e;
          border-radius:6px;
          background:#1a1a1a;
          overflow:hidden;
          box-shadow:0 2px 8px rgba(0,0,0,0.8);
        ">
          <img
            src="${src}"
            width="34" height="34"
            style="image-rendering:pixelated;display:block;"
          />
        </div>
        <span style="
          background:rgba(20,20,20,0.92);
          color:#e8e8e8;
          font-size:11px;
          font-weight:600;
          padding:1px 5px;
          border-radius:4px;
          border:1px solid #3a3a3a;
          white-space:nowrap;
          font-family:system-ui,sans-serif;
        ">${name}</span>
      </div>
    `,
    iconSize: [38, 60],
    iconAnchor: [19, 19],
  });
}

export default function PlayerMarkers({ players, focusPlayer, config, world, renderer }) {
  const map = useMap();
  const markersRef = useRef({});

  const worldConfig = config?.worlds?.find(w => w.name === world);
  const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);
  const worldtomap = mapConfig?.worldtomap ?? FLAT_WORLDTOMAP;
  const mapzoomout = mapConfig?.mapzoomout ?? 5;
  const tilescale = mapConfig?.tilescale ?? 0;

  useEffect(() => {
    const currentNames = new Set(players.map(p => p.account));

    // Remove stale markers
    for (const name of Object.keys(markersRef.current)) {
      if (!currentNames.has(name)) {
        markersRef.current[name].remove();
        delete markersRef.current[name];
      }
    }

    for (const player of players) {
      const { account, uuid, x, y, z } = player;
      const latlng = mcToLatLng(worldtomap, mapzoomout, tilescale, x ?? 0, y ?? 0, z ?? 0);

      if (markersRef.current[account]) {
        markersRef.current[account].setLatLng(latlng);
      } else {
        const marker = L.marker(latlng, {
          icon: buildIcon(uuid || account, account),
          zIndexOffset: 1000,
        });
        marker.bindTooltip(account, { permanent: false, direction: 'top' });
        marker.addTo(map);
        markersRef.current[account] = marker;
      }
    }
  }, [map, players, worldtomap, mapzoomout, tilescale]);

  // Pan to focused player
  useEffect(() => {
    if (!focusPlayer) return;
    const player = players.find(p => p.account === focusPlayer);
    if (!player) return;
    const latlng = mcToLatLng(worldtomap, mapzoomout, tilescale, player.x ?? 0, player.y ?? 0, player.z ?? 0);
    map.setView(latlng, map.getZoom(), { animate: true });
  }, [focusPlayer, players, map, worldtomap, mapzoomout, tilescale]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
    };
  }, []);

  return null;
}
