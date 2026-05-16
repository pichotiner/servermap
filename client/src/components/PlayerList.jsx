import React, { useState } from 'react';

export default function PlayerList({ players, onPlayerClick }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!players.length) return null;

  return (
    <div style={{ ...styles.panel, width: collapsed ? 44 : 220 }}>
      <button style={styles.toggle} onClick={() => setCollapsed(v => !v)} title={collapsed ? 'Показать игроков' : 'Скрыть'}>
        {collapsed ? '›' : '‹'}
      </button>

      {!collapsed && (
        <>
          <div style={styles.header}>
            Игроки онлайн
            <span style={styles.badge}>{players.length}</span>
          </div>
          <div style={styles.list}>
            {players.map(p => (
              <button key={p.account} style={styles.row} onClick={() => onPlayerClick(p)}>
                <img
                  src={`/api/skin/${p.uuid || p.account}?size=32`}
                  alt={p.account}
                  style={styles.avatar}
                  onError={e => { e.target.src = '/steve.png'; }}
                />
                <div style={styles.info}>
                  <span style={styles.name}>{p.account}</span>
                  <span style={styles.world}>{p.world}</span>
                </div>
              </button>
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
    right: 12,
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
    left: 8,
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
    padding: '10px 12px 8px 30px',
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
  },
  list: {
    maxHeight: 'calc(100vh - 140px)',
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background 0.15s',
    color: 'var(--text)',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 4,
    imageRendering: 'pixelated',
    flexShrink: 0,
    border: '1px solid var(--border)',
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
  world: {
    fontSize: 11,
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
