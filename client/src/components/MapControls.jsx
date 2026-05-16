import React from 'react';
import { useMap } from 'react-leaflet';

export default function MapControls({ config, currentWorld, currentRenderer, onWorldChange, onRendererChange }) {
  const map = useMap();

  const worlds = config?.worlds ?? [];
  const world = worlds.find(w => w.name === currentWorld);
  const maps = world?.maps ?? [];

  return (
    <div style={styles.container}>
      {worlds.length > 1 && (
        <div style={styles.group}>
          <label style={styles.label}>Мир</label>
          <div style={styles.pills}>
            {worlds.map(w => (
              <button
                key={w.name}
                style={{
                  ...styles.pill,
                  ...(w.name === currentWorld ? styles.pillActive : {}),
                }}
                onClick={() => onWorldChange(w.name)}
              >
                {w.title || w.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {maps.length > 1 && (
        <div style={styles.group}>
          <label style={styles.label}>Вид</label>
          <div style={styles.pills}>
            {maps.map(m => (
              <button
                key={m.name}
                style={{
                  ...styles.pill,
                  ...(m.name === currentRenderer ? styles.pillActive : {}),
                }}
                onClick={() => onRendererChange(m.name)}
              >
                {m.title || m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.group}>
        <div style={styles.zoom}>
          <button style={styles.zoomBtn} onClick={() => map.zoomIn()}>+</button>
          <button style={styles.zoomBtn} onClick={() => map.zoomOut()}>−</button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    zIndex: 900,
  },
  group: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '8px 10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  label: {
    display: 'block',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: 5,
  },
  pills: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
  },
  pill: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    padding: '3px 10px',
    borderRadius: 20,
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  pillActive: {
    background: 'var(--accent)',
    borderColor: 'var(--accent)',
    color: '#000',
    fontWeight: 600,
  },
  zoom: {
    display: 'flex',
    gap: 4,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 18,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
};
