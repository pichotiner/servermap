import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Dynmap uses 32x32 native tiles per region directory
const TILES_PER_REGION = 32;

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

    const layer = L.tileLayer('', {
      tileSize: 128,
      minZoom: 0,
      maxZoom,
      noWrap: true,
      crossOrigin: 'anonymous',
      errorTileUrl: '',
    });

    layer.getTileUrl = function ({ x, y, z }) {
      const zOut = maxZoom - z;        // 0 = native, 5 = most zoomed out
      const scale = 1 << zOut;         // native tiles covered per zoom-tile

      // Absolute native tile coordinates
      const nativeTx = x * scale;
      const nativeTy = y * scale;

      // Which 32x32 region
      const regionX = Math.floor(nativeTx / TILES_PER_REGION);
      const regionZ = Math.floor(nativeTy / TILES_PER_REGION);

      // Native tile offset within the region (always 0-31, handles negatives)
      const localX = ((nativeTx % TILES_PER_REGION) + TILES_PER_REGION) % TILES_PER_REGION;
      const localZ = ((nativeTy % TILES_PER_REGION) + TILES_PER_REGION) % TILES_PER_REGION;

      // Dynmap prefix: '' / 'z_' / 'zz_' / 'zzz_' / 'zzzz_' / 'zzzzz_'
      const prefix = zOut === 0 ? '' : 'z'.repeat(zOut) + '_';

      return `/tiles/${world}/${renderer}/${regionX}_${regionZ}/${prefix}${localX}_${localZ}.jpg`;
    };

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

