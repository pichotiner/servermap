import React from 'react';

function pluralPlayers(n) {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'игрок';
  if (d10 >= 2 && d10 <= 4 && (d100 < 10 || d100 >= 20)) return 'игрока';
  return 'игроков';
}

export default function ServerStatus({ online, players, config, error }) {
  const playerCount = players.length;
  const serverTitle = config?.title || 'Minecraft Server';

  return (
    <div className="statusbar">
      <div className="statusbar-left">
        <span
          className="statusbar-dot"
          style={{ background: online ? 'var(--green)' : 'var(--red)' }}
        />
        <span className="statusbar-title">{serverTitle}</span>
        <span className="statusbar-status">
          {online ? 'Online' : error ? 'Offline' : 'Connecting…'}
        </span>
      </div>

      <div className="statusbar-right">
        {online && (
          <span className="statusbar-players">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
            <span className="statusbar-count">{playerCount}</span>
            {' '}{pluralPlayers(playerCount)} online
          </span>
        )}
        <span className="statusbar-brand">
          <span className="logo-block" />
          <span className="statusbar-brand-text">ServerMap</span>
        </span>
      </div>
    </div>
  );
}
