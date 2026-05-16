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

export default function PlayerMarkers({ players, focusPlayer, onFocusComplete, config, world, renderer }) {
  const map = useMap();
  const markersRef = useRef({});
  // Track which world we've already auto-centred on so we re-centre once per world switch.
  const autocenteredWorldRef = useRef(null);

  const worldConfig = config?.worlds?.find(w => w.name === world);
  const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);
  const worldtomap = mapConfig?.worldtomap ?? FLAT_WORLDTOMAP;
  const mapzoomout = mapConfig?.mapzoomout ?? 5;
  const tilescale = mapConfig?.tilescale ?? 0;

  useEffect(() => {
    // Only show markers for players actually in the world being viewed —
    // someone in the Nether must not appear on the Overworld map.
    const visible = players.filter(p => p.world === world);

    // Auto-fit all players into view the first time we see them in this world.
    if (autocenteredWorldRef.current !== world && visible.length > 0) {
      autocenteredWorldRef.current = world;
      const latlngs = visible.map(p =>
        mcToLatLng(worldtomap, mapzoomout, tilescale, p.x ?? 0, p.y ?? 0, p.z ?? 0)
      );
      if (latlngs.length === 1) {
        map.setView(latlngs[0], mapzoomout);
      } else {
        map.fitBounds(L.latLngBounds(latlngs), { maxZoom: mapzoomout, padding: [60, 60] });
      }
    }
    const currentNames = new Set(visible.map(p => p.account));

    // Remove stale markers
    for (const name of Object.keys(markersRef.current)) {
      if (!currentNames.has(name)) {
        markersRef.current[name].remove();
        delete markersRef.current[name];
      }
    }

    for (const player of visible) {
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
  }, [map, players, world, worldtomap, mapzoomout, tilescale]);

  // Fly to the focused player, zooming in to at least the native level.
  // If the player is in another world, wait until App has switched to it
  // (the world prop updates and the players list re-polls).
  useEffect(() => {
    if (!focusPlayer) return;
    const player = players.find(p => p.account === focusPlayer);
    if (!player || player.world !== world) return;
    const latlng = mcToLatLng(worldtomap, mapzoomout, tilescale, player.x ?? 0, player.y ?? 0, player.z ?? 0);
    const targetZoom = Math.max(map.getZoom(), mapzoomout);
    map.flyTo(latlng, targetZoom, { duration: 0.7 });
    onFocusComplete?.();
  }, [focusPlayer, players, world, map, worldtomap, mapzoomout, tilescale]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
    };
  }, []);

  return null;
}
