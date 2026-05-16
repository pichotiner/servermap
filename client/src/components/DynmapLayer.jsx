import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function DynmapLayer({ world, renderer, config }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer || !config) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    const mapConfig = config.worlds?.[0]?.maps?.find(m => m.prefix === renderer);
    if (!mapConfig) return;

    const maxZoom = (mapConfig.mapzoomout ?? 5) + 1;
    const tileSize = 128;
    const tilesPerRegion = 16;
    const blocksPerRegion = tilesPerRegion * tileSize;

    const layer = L.tileLayer('', {
      tileSize,
      minZoom: 0,
      maxZoom,
      noWrap: true,
      crossOrigin: 'anonymous',
    });

    layer.getTileUrl = function (coords) {
      // coords = { x, y, z } from Leaflet
      // At zoom Z, tile (x,y) covers a certain region of the map
      // Map pixels at zoom Z: tile covers (tileSize * 2^(maxZoom-Z)) pixels

      const pixelsPerTile = tileSize * Math.pow(2, maxZoom - coords.z);

      // Map pixel coordinates for this tile
      const mapPixelX = coords.x * pixelsPerTile;
      const mapPixelY = coords.y * pixelsPerTile;

      // Dynmap region and tile within region
      // Regions are 16x16 tiles at native resolution = 2048x2048 pixels
      const regionPixels = tilesPerRegion * tileSize;
      const regionX = Math.floor(mapPixelX / regionPixels);
      const regionY = Math.floor(mapPixelY / regionPixels);

      const tileXInRegion = Math.floor((mapPixelX % regionPixels) / tileSize);
      const tileYInRegion = Math.floor((mapPixelY % regionPixels) / tileSize);

      // Zoom prefix: z = 1x zoom out, z2 = 2x, etc.
      const zoomOut = coords.z;
      const zoomPrefix = zoomOut > 0 ? `z${zoomOut}_` : '';

      return `/tiles/${world}/${renderer}/${regionX}_${regionY}/${zoomPrefix}${tileXInRegion}_${tileYInRegion}.jpg`;
    };

    layer.addTo(map);
    layerRef.current = layer;
    map.setView([0, 0], 0);

    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [map, world, renderer, config]);

  return null;
}

