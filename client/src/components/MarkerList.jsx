import React, { useState } from 'react';

import { gemStyle } from '../lib/markerColors';

function worldLabel(name) {
  const n = (name || '').toLowerCase();
  if (n === 'dim-1' || n.includes('nether')) return 'Незер';
  if (n === 'dim1' || n.includes('the_end') || n.endsWith('_end')) return 'Энд';
  if (n === 'world' || n.includes('overworld')) return 'Обычный мир';
  return name || '';
}

export default function MarkerList({ markers, onMarkerClick, onDelete, onAdd }) {
  const [collapsed, setCollapsed] = useState(false);

  const sorted = [...markers].sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );

  return (
    <div style={{ ...styles.panel, width: collapsed ? 44 : 240 }}>
      <button
        style={styles.toggle}
        onClick={() => setCollapsed(v => !v)}
        title={collapsed ? 'Показать метки' : 'Скрыть'}
      >
        {collapsed ? '‹' : '›'}
      </button>

      {!collapsed && (
        <>
          <div style={styles.header}>
            <span>
              Метки
              <span style={styles.badge}>{markers.length}</span>
            </span>
            <button style={styles.addBtn} onClick={onAdd} title="Добавить метку">
              + Метка
            </button>
          </div>

          <div style={styles.list}>
            {sorted.length === 0 && (
              <div style={styles.empty}>
                Меток пока нет. Нажмите «+ Метка», чтобы добавить первую.
              </div>
            )}
            {sorted.map(m => (
              <div key={m.id} style={styles.row}>
                <button style={styles.rowMain} onClick={() => onMarkerClick(m)}>
                  <span
                    className="crystal-mini"
                    style={gemStyle(m.color, { glow: 5, dropShadow: false })}
                  />
                  <div style={styles.info}>
                    <span style={styles.name}>{m.label}</span>
                    <span style={styles.coords}>
                      {m.x}, {m.y}, {m.z}
                    </span>
                    <span style={styles.meta}>
                      {worldLabel(m.world)} · {m.author}
                    </span>
                  </div>
                </button>
                <button
                  style={styles.del}
                  onClick={() => onDelete(m)}
                  title="Удалить метку"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  panel: {
    position: 'absolute',
    top: 12,
    left: 12,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    overflow: 'hidden',
    transition: 'width 0.2s ease',
    zIndex: 900,
    boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
  },
  toggle: {
    position: 'absolute',
    top: 8,
    right: 8,
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 18,
    lineHeight: 1,
    padding: 2,
    zIndex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 30px 8px 12px',
    fontSize: 12,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border)',
  },
  badge: {
    background: 'var(--surface2)',
    borderRadius: 10,
    padding: '1px 7px',
    fontSize: 12,
    color: 'var(--accent)',
    fontWeight: 700,
    marginLeft: 6,
  },
  addBtn: {
    background: 'var(--accent)',
    border: 'none',
    color: '#000',
    fontWeight: 700,
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 6,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  list: {
    maxHeight: 'calc(100vh - 160px)',
    overflowY: 'auto',
  },
  empty: {
    padding: '12px',
    fontSize: 12,
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  row: {
    display: 'flex',
    alignItems: 'stretch',
    borderBottom: '1px solid var(--border)',
  },
  rowMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
    padding: '8px 4px 8px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    color: 'var(--text)',
  },
  info: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  name: {
    fontSize: 13,
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  coords: {
    fontSize: 11,
    color: 'var(--accent)',
    fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  meta: {
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  del: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: 13,
    padding: '0 10px',
    flexShrink: 0,
  },
};
