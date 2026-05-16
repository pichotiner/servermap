import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function DynmapLayer({ world, renderer }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.tileLayer('', {
      tileSize: 128,
      minZoom: 0,
      maxZoom: 4,
      noWrap: true,
      crossOrigin: 'anonymous',
    });

    layer.getTileUrl = function (coords) {
      // Dynmap region-based tile system
      // Each region is 16x16 tiles = 2048x2048 blocks
      const tileSize = 16;

      // Calculate region and tile within region
      const regionX = Math.floor(coords.x / tileSize);
      const regionZ = Math.floor(coords.y / tileSize);
      const tileX = coords.x % tileSize;
      const tileY = coords.y % tileSize;

      // Calculate zoom prefix (z, z2, z3, etc.)
      const zoomPrefix = coords.z > 0 ? `z${coords.z}_` : '';

      return `/tiles/${world}/${renderer}/${regionX}_${regionZ}/${zoomPrefix}${tileX}_${tileY}.jpg`;
    };

    layer.addTo(map);
    layerRef.current = layer;

    // Default center + zoom
    setTimeout(() => {
      map.setView([0, 0], 2);
    }, 100);

    return () => {
      map.removeLayer(layer);
    };
  }, [map, world, renderer]);

  return null;
}

