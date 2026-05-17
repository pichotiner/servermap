import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

import { mcToLatLng, latLngToMc, mapProjection } from '../lib/projection';
import { gemCssString } from '../lib/markerColors';

// Escape user-supplied text before it goes into marker/popup HTML.
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Minecraft-crystal style diamond icon with the label underneath.
function buildCrystalIcon(label, color) {
  return L.divIcon({
    className: '',
    html: `
      <div class="crystal-wrap">
        <div class="crystal-gem" style="${gemCssString(color)}"><span class="crystal-shine"></span></div>
        <span class="crystal-label">${esc(label)}</span>
      </div>
    `,
    iconSize: [24, 48],
    iconAnchor: [12, 12],
  });
}

function popupHtml(m) {
  return `
    <div class="marker-popup">
      <div class="marker-popup-title">${esc(m.label)}</div>
      <div class="marker-popup-coords">
        <span>X <b>${m.x}</b></span>
        <span>Y <b>${m.y}</b></span>
        <span>Z <b>${m.z}</b></span>
      </div>
      <div class="marker-popup-author">Автор: ${esc(m.author)}</div>
    </div>
  `;
}

export default function MapMarkers({
  markers,
  world,
  config,
  renderer,
  focusMarker,
  onFocusComplete,
  pickMode,
  onPick,
}) {
  const map = useMap();
  const markersRef = useRef({});

  const { worldtomap, mapzoomout, tilescale } = mapProjection(config, world, renderer);

  // Render / update / remove markers for the world currently being viewed.
  useEffect(() => {
    const visible = markers.filter(m => m.world === world);
    const ids = new Set(visible.map(m => m.id));

    for (const id of Object.keys(markersRef.current)) {
      if (!ids.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    }

    for (const m of visible) {
      const latlng = mcToLatLng(worldtomap, mapzoomout, tilescale, m.x, m.y, m.z);
      const existing = markersRef.current[m.id];
      if (existing) {
        existing.setLatLng(latlng);
        existing.setIcon(buildCrystalIcon(m.label, m.color));
        existing.getPopup()?.setContent(popupHtml(m));
      } else {
        const marker = L.marker(latlng, {
          icon: buildCrystalIcon(m.label, m.color),
          zIndexOffset: 500,
        });
        marker.bindPopup(popupHtml(m));
        marker.addTo(map);
        markersRef.current[m.id] = marker;
      }
    }
  }, [map, markers, world, worldtomap, mapzoomout, tilescale]);

  // Pick mode — clicking the map reports back the chosen Minecraft coords.
  useEffect(() => {
    if (!pickMode) return;
    const container = map.getContainer();
    const onClick = (e) => {
      const { x, z } = latLngToMc(
        worldtomap, mapzoomout, tilescale, e.latlng.lat, e.latlng.lng
      );
      onPick?.({ x, z });
    };
    map.on('click', onClick);
    L.DomUtil.addClass(container, 'picking');
    return () => {
      map.off('click', onClick);
      L.DomUtil.removeClass(container, 'picking');
    };
  }, [map, pickMode, worldtomap, mapzoomout, tilescale, onPick]);

  // Fly to a focused marker and open its popup once the world matches.
  useEffect(() => {
    if (!focusMarker) return;
    const m = markers.find(x => x.id === focusMarker);
    if (!m || m.world !== world) return;
    const latlng = mcToLatLng(worldtomap, mapzoomout, tilescale, m.x, m.y, m.z);
    map.flyTo(latlng, Math.max(map.getZoom(), mapzoomout), { duration: 0.7 });
    const leafletMarker = markersRef.current[m.id];
    if (leafletMarker) setTimeout(() => leafletMarker.openPopup(), 750);
    onFocusComplete?.();
  }, [focusMarker, markers, world, map, worldtomap, mapzoomout, tilescale]);

  useEffect(() => {
    return () => {
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
    };
  }, []);

  return null;
}
