import { useState, useEffect } from 'react';
import { useMap } from 'react-leaflet';

const FLAT_WORLDTOMAP = [4, 0, 0, 0, 0, -4, 0, 1, 0];

// Inverse of Dynmap's HDProjection.fromLocationToLatLng. The projection is
// degenerate (two map outputs, three world axes), so block height is assumed
// — for the flat renderer y has no effect on x/z anyway.
function latLngToMc(worldtomap, mapzoomout, tilescale, lat, lng) {
  const div = 1 << mapzoomout;
  const y = 64;
  const a = lng * div - worldtomap[1] * y;
  const b = (128 << tilescale) + lat * div - worldtomap[4] * y;
  const det = worldtomap[0] * worldtomap[5] - worldtomap[2] * worldtomap[3];
  const x = (a * worldtomap[5] - worldtomap[2] * b) / det;
  const z = (worldtomap[0] * b - worldtomap[3] * a) / det;
  return { x: Math.round(x), z: Math.round(z) };
}

export default function CursorCoords({ config, world, renderer }) {
  const map = useMap();
  const [coords, setCoords] = useState(null);

  const worldConfig = config?.worlds?.find(w => w.name === world);
  const mapConfig = worldConfig?.maps?.find(m => m.prefix === renderer || m.name === renderer);
  const worldtomap = mapConfig?.worldtomap ?? FLAT_WORLDTOMAP;
  const mapzoomout = mapConfig?.mapzoomout ?? 5;
  const tilescale = mapConfig?.tilescale ?? 0;

  useEffect(() => {
    const onMove = (e) => {
      setCoords(latLngToMc(worldtomap, mapzoomout, tilescale, e.latlng.lat, e.latlng.lng));
    };
    const onOut = () => setCoords(null);
    map.on('mousemove', onMove);
    map.on('mouseout', onOut);
    return () => {
      map.off('mousemove', onMove);
      map.off('mouseout', onOut);
    };
  }, [map, worldtomap, mapzoomout, tilescale]);

  if (!coords) return null;

  return (
    <div style={styles.box}>
      X <span style={styles.val}>{coords.x}</span>
      <span style={styles.sep}>Z</span>
      <span style={styles.val}>{coords.z}</span>
    </div>
  );
}

const styles = {
  box: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 12,
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
    color: 'var(--text-muted)',
    zIndex: 900,
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    pointerEvents: 'none',
  },
  sep: {
    marginLeft: 4,
  },
  val: {
    color: 'var(--accent)',
    fontWeight: 700,
  },
};
