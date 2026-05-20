// Shared Dynmap projection helpers. Mirrors the formulas in PlayerMarkers and
// CursorCoords so map markers line up with the tiles rendered by DynmapLayer.

export const FLAT_WORLDTOMAP = [4, 0, 0, 0, 0, -4, 0, 1, 0];

// Dynmap HDProjection.fromLocationToLatLng — Minecraft (x, y, z) → [lat, lng].
export function mcToLatLng(worldtomap, mapzoomout, tilescale, x, y, z) {
  const div = 1 << mapzoomout;
  const lng = (worldtomap[0] * x + worldtomap[1] * y + worldtomap[2] * z) / div;
  const mapY = worldtomap[3] * x + worldtomap[4] * y + worldtomap[5] * z;
  const lat = -(((128 << tilescale) - mapY) / div);
  return [lat, lng];
}

// Inverse projection — Leaflet lat/lng → Minecraft (x, z). The projection is
// degenerate (two map outputs, three world axes), so block height is assumed.
export function latLngToMc(worldtomap, mapzoomout, tilescale, lat, lng, y = 64) {
  const div = 1 << mapzoomout;
  const a = lng * div - worldtomap[1] * y;
  const b = (128 << tilescale) + lat * div - worldtomap[4] * y;
  const det = worldtomap[0] * worldtomap[5] - worldtomap[2] * worldtomap[3];
  const x = (a * worldtomap[5] - worldtomap[2] * b) / det;
  const z = (worldtomap[0] * b - worldtomap[3] * a) / det;
  return { x: Math.round(x), z: Math.round(z) };
}

// Pull the projection parameters for a given world + renderer out of the config.
export function mapProjection(config, world, renderer) {
  const worldConfig = config?.worlds?.find(w => w.name === world);
  const mapConfig = worldConfig?.maps?.find(
    m => m.prefix === renderer || m.name === renderer
  );
  return {
    worldtomap: mapConfig?.worldtomap ?? FLAT_WORLDTOMAP,
    mapzoomout: mapConfig?.mapzoomout ?? 5,
    tilescale: mapConfig?.tilescale ?? 0,
  };
}
