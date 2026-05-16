import React from 'react';

export default function ServerStatus({ online, players, config, error }) {
  const playerCount = players.length;
  const maxPlayers = config?.maxPlayers ?? '?';
  const serverTitle = config?.title || 'Minecraft Server';

  return (
    <div style={styles.bar}>
      <div style={styles.left}>
        <div style={{ ...styles.dot, background: online ? 'var(--green)' : 'var(--red)' }} />
        <span style={styles.title}>{serverTitle}</span>
        <span style={styles.status}>
          {online ? 'ONLINE' : error ? 'OFFLINE' : 'Connecting…'}
        </span>
      </div>

      <div style={styles.right}>
        {online && (
          <span style={styles.players}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 5 }}>
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            {playerCount} / {maxPlayers}
          </span>
        )}
        <span style={styles.brand}>ServerMap</span>
      </div>
    </div>
  );
}

const styles = {
  bar: {
    height: 48,
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    flexShrink: 0,
    zIndex: 1000,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: '0 0 6px currentColor',
  },
  title: {
    fontWeight: 600,
    fontSize: 15,
    color: 'var(--text)',
  },
  status: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  players: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: 'var(--text)',
  },
  brand: {
    fontSize: 13,
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
};
