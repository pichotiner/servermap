import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Converts Minecraft X/Z to Leaflet lat/lng for the Dynmap flat projection
function mcToLatLng(x, z, map) {
  // Dynmap flat: each tile = 128 blocks, tileSize=128
  // The CRS maps x→lng, z→lat with y inverted
  return map.unproject([x, z], map.getMaxZoom());
}

export default function DynmapLayer({ world, renderer }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!world || !renderer) return;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }

    // Dynmap uses a custom CRS — we mirror it with a simple TileLayer
    // URL pattern: /tiles/{world}/{renderer}/{z}/{x}_{y}.png
    // Leaflet expects {z}/{x}/{y}, so we use a custom getTileUrl
    const layer = L.tileLayer('', {
      tileSize: 128,
      minZoom: 0,
      maxZoom: 6,
      noWrap: true,
      attribution: 'Dynmap',
    });

    layer.getTileUrl = function (coords) {
      // Dynmap z-levels go from 0 (most zoomed out) upward
      // Leaflet zoom and Dynmap zoom are inversely related when maxZoom is fixed
      const dz = this.options.maxZoom - coords.z;
      const dx = coords.x;
      const dy = coords.y;
      return `/tiles/${world}/${renderer}/${dz}/${dx}_${dy}.png`;
    };

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      map.removeLayer(layer);
    };
  }, [map, world, renderer]);

  return null;
}

export { mcToLatLng };
