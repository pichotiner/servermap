import { useState, useEffect, useRef, useCallback } from 'react';

// Global map markers — fetched once, then re-polled so markers added by other
// users appear without a reload.
export function useMarkers() {
  const [markers, setMarkers] = useState([]);
  const activeRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/markers');
      if (!res.ok) throw new Error(`markers ${res.status}`);
      const data = await res.json();
      if (activeRef.current) setMarkers(Array.isArray(data) ? data : []);
    } catch {
      // Keep the markers we already have on a transient failure.
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => {
      activeRef.current = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const addMarker = useCallback(async (data) => {
    const res = await fetch('/api/markers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Не удалось сохранить метку');
    }
    const marker = await res.json();
    setMarkers(prev => [...prev, marker]);
    return marker;
  }, []);

  const removeMarker = useCallback(async (id) => {
    const res = await fetch(`/api/markers/${id}`, { method: 'DELETE' });
    if (!res.ok && res.status !== 404) {
      throw new Error('Не удалось удалить метку');
    }
    setMarkers(prev => prev.filter(m => m.id !== id));
  }, []);

  return { markers, addMarker, removeMarker, refresh };
}
