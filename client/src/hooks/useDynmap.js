import { useState, useEffect, useRef } from 'react';

const API = '';

export function useDynmap(worldName = 'world') {
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);
  const [online, setOnline] = useState(false);
  const [error, setError] = useState(null);
  const timestampRef = useRef(0);
  const timerRef = useRef(null);

  // Fetch config on mount, retry every 5s until success.
  useEffect(() => {
    let active = true;
    let retryTimer = null;

    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API}/up/configuration`);
        if (!res.ok) throw new Error(`config ${res.status}`);
        const data = await res.json();
        if (active) {
          setConfig(data);
          setError(null);
        }
      } catch (e) {
        if (active) {
          setError(e.message);
          setOnline(false);
          retryTimer = setTimeout(fetchConfig, 5000);
        }
      }
    };

    fetchConfig();
    return () => {
      active = false;
      clearTimeout(retryTimer);
    };
  }, []);

  // Poll the selected world for live player positions; restart on change.
  useEffect(() => {
    let active = true;
    timestampRef.current = 0;
    setPlayers([]);

    const run = async () => {
      try {
        const res = await fetch(`${API}/up/world/${worldName}/${timestampRef.current}`);
        if (!res.ok) throw new Error(`world ${res.status}`);
        const data = await res.json();
        if (!active) return;

        if (data.timestamp) timestampRef.current = data.timestamp;
        setPlayers(data.players || []);
        setOnline(true);
        setError(null);

        const delay = data.timeofday !== undefined ? 2000 : 3000;
        timerRef.current = setTimeout(run, delay);
      } catch (e) {
        if (!active) return;
        setError(e.message);
        setOnline(false);
        timerRef.current = setTimeout(run, 5000);
      }
    };
    run();

    return () => {
      active = false;
      clearTimeout(timerRef.current);
    };
  }, [worldName]);

  return { config, players, online, error };
}
