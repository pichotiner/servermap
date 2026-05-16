import React, { useState, useEffect, useRef } from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useDynmap } from './hooks/useDynmap';
import ServerStatus from './components/ServerStatus';
import PlayerList from './components/PlayerList';
import PlayerMarkers from './components/PlayerMarkers';
import DynmapLayer from './components/DynmapLayer';
import MapControls from './components/MapControls';
import CursorCoords from './components/CursorCoords';

// Simple CRS matching Dynmap flat projection
const DynmapCRS = L.extend({}, L.CRS.Simple, {
  // No wrapping, no inversion on Y needed since we handle it in getTileUrl
});

export default function App() {
  const [currentWorld, setCurrentWorld] = useState('world');
  const [currentRenderer, setCurrentRenderer] = useState('flat');
  const [focusPlayer, setFocusPlayer] = useState(null);

  const { config, players, online, error } = useDynmap(currentWorld);

  // Pick the first world and its first map — only once, when config loads
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || !config?.worlds?.length) return;
    initRef.current = true;
    const w = config.worlds[0];
    setCurrentWorld(w.name);
    if (w.maps?.length) setCurrentRenderer(w.maps[0].prefix || w.maps[0].name);
  }, [config]);

  // Switching world also resets the renderer to a map that exists in it
  const handleWorldChange = (worldName) => {
    setCurrentWorld(worldName);
    const w = config?.worlds?.find(x => x.name === worldName);
    const firstMap = w?.maps?.[0];
    if (firstMap) setCurrentRenderer(firstMap.prefix || firstMap.name);
  };

  // Clicking a player focuses them — switching to their world first if the
  // player is in a different dimension than the one currently shown.
  const handlePlayerClick = (player) => {
    if (player.world && player.world !== currentWorld) {
      handleWorldChange(player.world);
    }
    setFocusPlayer(player.account);
  };

  // The map's parent is position:relative, so fill it explicitly —
  // a Leaflet container with no resolved height collapses to 0px.
  const mapStyle = { position: 'absolute', inset: 0 };

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
          zoom={3}
          minZoom={0}
          maxZoom={8}
          crs={DynmapCRS}
          style={mapStyle}
          zoomControl={false}
          attributionControl={false}
        >
          <DynmapLayer world={currentWorld} renderer={currentRenderer} config={config} />
          <PlayerMarkers
            players={players}
            focusPlayer={focusPlayer}
            onFocusComplete={() => setFocusPlayer(null)}
            config={config}
            world={currentWorld}
            renderer={currentRenderer}
          />
          <MapControls
            config={config}
            currentWorld={currentWorld}
            currentRenderer={currentRenderer}
            onWorldChange={handleWorldChange}
            onRendererChange={setCurrentRenderer}
          />
          <CursorCoords
            config={config}
            world={currentWorld}
            renderer={currentRenderer}
          />
        </MapContainer>

        <PlayerList players={players} onPlayerClick={handlePlayerClick} />
      </div>
    </div>
  );
}
