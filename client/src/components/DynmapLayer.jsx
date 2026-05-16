import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Dynmap stores 32x32 native tiles per region directory
const TILES_PER_REGION = 32;

function zoomPrefix(zoomOut) {
  if (zoomOut === 0) return '';
  if (zoomOut === 1) return 'z_';
  return `z${zoomOut}_`;
}

export default function DynmapLayer({ world, renderer, config }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer || !config) return;

    const worldConfig = config.worlds?.find(w => w.name === world);
    const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);

    const maxZoom = (mapConfig?.mapzoomout ?? 5);

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
      // z = Leaflet zoom level (0 = most zoomed out, maxZoom = most zoomed in)
      // zoomOut = how many levels below native resolution
      const zOut = maxZoom - z;
      const scale = 1 << zOut; // 2^zOut native tiles per zoom-tile

      // Absolute native tile coordinates
      const nativeTx = x * scale;
      const nativeTy = y * scale;

      // Region (which 32x32 block of native tiles)
      const regionX = Math.floor(nativeTx / TILES_PER_REGION);
      const regionZ = Math.floor(nativeTy / TILES_PER_REGION);

      // Local tile within region at the current zoom level
      const localPerRegion = TILES_PER_REGION / scale;
      const rawLocalX = nativeTx - regionX * TILES_PER_REGION;
      const rawLocalZ = nativeTy - regionZ * TILES_PER_REGION;
      const localX = Math.floor(rawLocalX / scale);
      const localZ = Math.floor(rawLocalZ / scale);

      return `/tiles/${world}/${renderer}/${regionX}_${regionZ}/${zoomPrefix(zOut)}${localX}_${localZ}.jpg`;
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

