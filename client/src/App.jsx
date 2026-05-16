import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useDynmap } from './hooks/useDynmap';
import ServerStatus from './components/ServerStatus';
import PlayerList from './components/PlayerList';
import PlayerMarkers from './components/PlayerMarkers';
import DynmapLayer from './components/DynmapLayer';
import MapControls from './components/MapControls';

// Simple CRS matching Dynmap flat projection
const DynmapCRS = L.extend({}, L.CRS.Simple, {
  // No wrapping, no inversion on Y needed since we handle it in getTileUrl
});

export default function App() {
  const [currentWorld, setCurrentWorld] = useState('world');
  const [currentRenderer, setCurrentRenderer] = useState('flat');
  const [focusPlayer, setFocusPlayer] = useState(null);

  const { config, players, online, error } = useDynmap(currentWorld);

  // Once config loads, pick the first world and its first map
  useEffect(() => {
    if (!config?.worlds?.length) return;
    const w = config.worlds[0];
    setCurrentWorld(w.name);
    if (w.maps?.length) setCurrentRenderer(w.maps[0].prefix || w.maps[0].name);
  }, [config]);

  const handlePlayerClick = (player) => {
    setFocusPlayer(player.account);
    // Clear focus after pan so clicking again still works
    setTimeout(() => setFocusPlayer(null), 300);
  };

  const mapStyle = { flex: 1, width: '100%' };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ServerStatus
        online={online}
        players={players}
        config={config}
        error={error}
      />

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapContainer
          center={[0, 0]}
          zoom={0}
          minZoom={0}
          maxZoom={8}
          crs={DynmapCRS}
          style={mapStyle}
          zoomControl={false}
          attributionControl={false}
        >
          <DynmapLayer world={currentWorld} renderer={currentRenderer} config={config} />
          <PlayerMarkers players={players} focusPlayer={focusPlayer} />
          <MapControls
            config={config}
            currentWorld={currentWorld}
            currentRenderer={currentRenderer}
            onWorldChange={w => { setCurrentWorld(w); }}
            onRendererChange={r => setCurrentRenderer(r)}
          />
        </MapContainer>

        <PlayerList players={players} onPlayerClick={handlePlayerClick} />
      </div>
    </div>
  );
}
