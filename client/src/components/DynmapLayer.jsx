import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const TILES_PER_REGION = 32;

function dynmapUrl(world, renderer, maxZoom, x, y, z) {
  const zOut = maxZoom - z;
  const scale = 1 << zOut;
  const nativeTx = x * scale;
  const nativeTy = y * scale;
  const regionX = Math.floor(nativeTx / TILES_PER_REGION);
  const regionZ = Math.floor(nativeTy / TILES_PER_REGION);
  const localX = ((nativeTx % TILES_PER_REGION) + TILES_PER_REGION) % TILES_PER_REGION;
  const localZ = ((nativeTy % TILES_PER_REGION) + TILES_PER_REGION) % TILES_PER_REGION;
  const prefix = zOut === 0 ? '' : 'z'.repeat(zOut) + '_';
  return `/tiles/${world}/${renderer}/${regionX}_${regionZ}/${prefix}${localX}_${localZ}.jpg`;
}

export default function DynmapLayer({ world, renderer, config }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer || !config) return;

    const worldConfig = config.worlds?.find(w => w.name === world);
    const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);
    const maxZoom = mapConfig?.mapzoomout ?? 5;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    const DynmapGrid = L.GridLayer.extend({
      createTile(coords, done) {
        const tile = document.createElement('img');
        tile.onload = () => done(null, tile);
        tile.onerror = () => done(null, tile);
        tile.src = dynmapUrl(world, renderer, maxZoom, coords.x, coords.y, coords.z);
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

