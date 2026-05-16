import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const SCALE = 1 / 32; // Dynmap: 1 block = 1/32 tile pixel at zoom 0, tileSize=128

function mcToLatLng(map, x, z) {
  // Dynmap flat projection: pixel = (x + offset, z + offset)
  // At max native zoom, 1 pixel = 1/2 block (zoom=6 → scale=64)
  const maxZoom = map.getMaxZoom();
  const scale = Math.pow(2, maxZoom); // 64 at zoom 6
  const px = (x / 1) * (scale / 32);
  const py = (z / 1) * (scale / 32);
  return map.unproject([px, py], maxZoom);
}

function buildIcon(uuid, name) {
  const src = `/api/skin/${uuid || name}?size=32`;
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
          border:2px solid #58a6ff;
          border-radius:6px;
          background:#0d1117;
          overflow:hidden;
          box-shadow:0 2px 8px rgba(0,0,0,0.7);
        ">
          <img
            src="${src}"
            width="34" height="34"
            style="image-rendering:pixelated;display:block;"
            onerror="this.src='/steve.png'"
          />
        </div>
        <span style="
          background:rgba(13,17,23,0.85);
          color:#e6edf3;
          font-size:11px;
          font-weight:600;
          padding:1px 5px;
          border-radius:4px;
          border:1px solid #30363d;
          white-space:nowrap;
          font-family:system-ui,sans-serif;
        ">${name}</span>
      </div>
    `,
    iconSize: [38, 60],
    iconAnchor: [19, 19],
  });
}

export default function PlayerMarkers({ players, focusPlayer }) {
  const map = useMap();
  const markersRef = useRef({});

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
      const { account, uuid, x, z } = player;
      const latlng = mcToLatLng(map, x ?? 0, z ?? 0);

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
  }, [map, players]);

  // Pan to focused player
  useEffect(() => {
    if (!focusPlayer) return;
    const player = players.find(p => p.account === focusPlayer);
    if (!player) return;
    const latlng = mcToLatLng(map, player.x ?? 0, player.z ?? 0);
    map.setView(latlng, map.getZoom(), { animate: true });
  }, [focusPlayer, players, map]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
    };
  }, []);

  return null;
}
