import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Dynmap tile path (see hdmap.js getTileName / getTileInfo):
//   /tiles/{world}/{prefix}/{x>>5}_{y>>5}/{zoom}{x}_{y}.{fmt}
// The directory groups 32 tiles per axis and the filename keeps the FULL
// tile coordinate. Dynmap also inverts the Y axis for HD maps.
function dynmapUrl(world, renderer, maxZoom, fmt, x, y, z) {
  const zOut = maxZoom - z;
  const scale = 1 << zOut;
  const tileX = x * scale;
  const tileY = -y * scale;
  const dirX = Math.floor(tileX / 32);
  const dirY = Math.floor(tileY / 32);
  const zoomPrefix = zOut === 0 ? '' : 'z'.repeat(zOut) + '_';
  return `/tiles/${world}/${renderer}/${dirX}_${dirY}/${zoomPrefix}${tileX}_${tileY}.${fmt}`;
}

export default function DynmapLayer({ world, renderer, config }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer || !config) return;

    const worldConfig = config.worlds?.find(w => w.name === world);
    const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);
    const maxZoom = mapConfig?.mapzoomout ?? 5;
    const fmt = mapConfig?.['image-format'] || 'png';

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const DynmapGrid = L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement('img');
        tile.onload = () => done(null, tile);
        tile.onerror = () => done(null, tile);
        tile.src = dynmapUrl(world, renderer, maxZoom, fmt, coords.x, coords.y, coords.z);
        return tile;
      },
    });

    const layer = new DynmapGrid({
      tileSize: 128,
      minZoom: 0,
      maxZoom,
      noWrap: true,
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, world, renderer, config]);

  return null;
}

