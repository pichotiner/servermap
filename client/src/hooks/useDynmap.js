import { useState, useEffect, useRef, useCallback } from 'react';

const API = '';

export function useDynmap(worldName = 'world') {
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState(null);
  const timestampRef = useRef(0);
  const timerRef = useRef(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API}/up/configuration`);
      if (!res.ok) throw new Error(`config ${res.status}`);
      const data = await res.json();
      setConfig(data);
      setError(null);
      return data;
    } catch (e) {
      setError(e.message);
      setOnline(false);
    }
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(
        `${API}/up/world/${worldName}/${timestampRef.current}`
      );
      if (!res.ok) throw new Error(`world ${res.status}`);
      const data = await res.json();

      if (data.timestamp) timestampRef.current = data.timestamp;

      setPlayers(data.players || []);
      setOnline(true);
      setError(null);

      const delay = data.timeofday !== undefined ? 2000 : 3000;
      timerRef.current = setTimeout(poll, delay);
    } catch (e) {
      setError(e.message);
      setOnline(false);
      timerRef.current = setTimeout(poll, 5000);
    }
  }, [worldName]);

  useEffect(() => {
    fetchConfig().then(() => poll());
    return () => clearTimeout(timerRef.current);
  }, [fetchConfig, poll]);

  return { config, players, online, error };
}
