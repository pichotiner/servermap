import React, { useState, useEffect, useRef } from 'react';
import { MapContainer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { useDynmap } from './hooks/useDynmap';
import { useMarkers } from './hooks/useMarkers';
import ServerStatus from './components/ServerStatus';
import PlayerList from './components/PlayerList';
import PlayerMarkers from './components/PlayerMarkers';
import MapMarkers from './components/MapMarkers';
import MarkerList from './components/MarkerList';
import MarkerForm from './components/MarkerForm';
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

  const [focusMarker, setFocusMarker] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pickMode, setPickMode] = useState(false);
  const [pickedCoords, setPickedCoords] = useState(null);

  const { config, players, online, error } = useDynmap(currentWorld);
  const { markers, addMarker, removeMarker } = useMarkers();

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

  // Clicking a marker pans to it, switching worlds first if needed.
  const handleMarkerClick = (marker) => {
    if (marker.world && marker.world !== currentWorld) {
      handleWorldChange(marker.world);
    }
    setFocusMarker(marker.id);
  };

  const handleDeleteMarker = (marker) => {
    if (!window.confirm(`Удалить метку «${marker.label}»?`)) return;
    removeMarker(marker.id).catch(e => window.alert(e.message));
  };

  const handleOpenForm = () => {
    setPickedCoords(null);
    setPickMode(false);
    setFormOpen(true);
  };

  const handleCancelForm = () => {
    setFormOpen(false);
    setPickMode(false);
  };

  const handleRequestPick = () => setPickMode(true);

  const handleMapPick = (coords) => {
    setPickedCoords(coords);
    setPickMode(false);
  };

  const handleSubmitMarker = async (data) => {
    const marker = await addMarker(data);
    setFormOpen(false);
    setPickMode(false);
    handleMarkerClick(marker);
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
          zoom={5}
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
          <MapMarkers
            markers={markers}
            world={currentWorld}
            renderer={currentRenderer}
            config={config}
            focusMarker={focusMarker}
            onFocusComplete={() => setFocusMarker(null)}
            pickMode={pickMode}
            onPick={handleMapPick}
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

        <MarkerList
          markers={markers}
          onMarkerClick={handleMarkerClick}
          onDelete={handleDeleteMarker}
          onAdd={handleOpenForm}
        />

        {pickMode && (
          <div style={pickBannerStyle}>
            <span>Кликните на карту, чтобы выбрать координаты метки</span>
            <button style={pickCancelStyle} onClick={() => setPickMode(false)}>
              Отмена
            </button>
          </div>
        )}

        <MarkerForm
          open={formOpen}
          worlds={config?.worlds ?? []}
          currentWorld={currentWorld}
          pickMode={pickMode}
          pickedCoords={pickedCoords}
          onRequestPick={handleRequestPick}
          onCancel={handleCancelForm}
          onSubmit={handleSubmitMarker}
        />
      </div>
    </div>
  );
}

const pickBannerStyle = {
  position: 'absolute',
  top: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  background: 'var(--surface)',
  border: '1px solid var(--accent)',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  color: 'var(--text)',
  zIndex: 1000,
  boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
};

const pickCancelStyle = {
  background: 'var(--surface2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: 12,
  padding: '4px 10px',
  borderRadius: 6,
  cursor: 'pointer',
};
