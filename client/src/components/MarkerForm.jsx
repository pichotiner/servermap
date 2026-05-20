import React, { useState, useEffect } from 'react';

import { MARKER_COLORS, DEFAULT_COLOR, gemStyle } from '../lib/markerColors';

function worldLabel(name) {
  const n = (name || '').toLowerCase();
  if (n === 'dim-1' || n.includes('nether')) return 'Незер';
  if (n === 'dim1' || n.includes('the_end') || n.endsWith('_end')) return 'Энд';
  if (n === 'world' || n.includes('overworld')) return 'Обычный мир';
  return name || '';
}

const AUTHOR_KEY = 'servermap.author';

export default function MarkerForm({
  open,
  worlds,
  currentWorld,
  pickMode,
  pickedCoords,
  onRequestPick,
  onCancel,
  onSubmit,
}) {
  const [label, setLabel] = useState('');
  const [author, setAuthor] = useState('');
  const [world, setWorld] = useState(currentWorld);
  const [x, setX] = useState('');
  const [y, setY] = useState('64');
  const [z, setZ] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Reset the form each time it is freshly opened.
  useEffect(() => {
    if (!open) return;
    setLabel('');
    setX('');
    setY('64');
    setZ('');
    setColor(DEFAULT_COLOR);
    setError(null);
    setBusy(false);
    setWorld(currentWorld);
    setAuthor(localStorage.getItem(AUTHOR_KEY) || '');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Coordinates chosen by clicking the map flow back in here.
  useEffect(() => {
    if (pickedCoords) {
      setX(String(pickedCoords.x));
      setZ(String(pickedCoords.z));
    }
  }, [pickedCoords]);

  if (!open || pickMode) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    const data = {
      world,
      x: Number(x),
      y: Number(y),
      z: Number(z),
      label: label.trim(),
      author: author.trim(),
      color,
    };
    if (!data.label) {
      setError('Введите название метки');
      return;
    }
    if (![data.x, data.y, data.z].every(Number.isFinite)) {
      setError('Введите координаты X, Y и Z');
      return;
    }
    setBusy(true);
    try {
      if (data.author) localStorage.setItem(AUTHOR_KEY, data.author);
      await onSubmit(data);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={styles.overlay} onMouseDown={onCancel}>
      <form
        style={styles.modal}
        onMouseDown={e => e.stopPropagation()}
        onSubmit={submit}
      >
        <div style={styles.title}>Новая метка</div>

        <label style={styles.field}>
          <span style={styles.fieldLabel}>Название</span>
          <input
            style={styles.input}
            value={label}
            onChange={e => setLabel(e.target.value)}
            maxLength={60}
            placeholder="Например: Алмазная шахта"
            autoFocus
          />
        </label>

        <label style={styles.field}>
          <span style={styles.fieldLabel}>Ваше имя</span>
          <input
            style={styles.input}
            value={author}
            onChange={e => setAuthor(e.target.value)}
            maxLength={32}
            placeholder="Аноним"
          />
        </label>

        {worlds.length > 1 && (
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Мир</span>
            <select
              style={styles.input}
              value={world}
              onChange={e => setWorld(e.target.value)}
            >
              {worlds.map(w => (
                <option key={w.name} value={w.name}>
                  {worldLabel(w.name)}
                </option>
              ))}
            </select>
          </label>
        )}

        <div style={styles.coordsRow}>
          <label style={styles.coordField}>
            <span style={styles.fieldLabel}>X</span>
            <input
              style={styles.input}
              value={x}
              onChange={e => setX(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label style={styles.coordField}>
            <span style={styles.fieldLabel}>Y</span>
            <input
              style={styles.input}
              value={y}
              onChange={e => setY(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <label style={styles.coordField}>
            <span style={styles.fieldLabel}>Z</span>
            <input
              style={styles.input}
              value={z}
              onChange={e => setZ(e.target.value)}
              inputMode="numeric"
            />
          </label>
        </div>

        <div style={styles.field}>
          <span style={styles.fieldLabel}>Цвет метки</span>
          <div style={styles.swatches}>
            {MARKER_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                style={{
                  ...styles.swatch,
                  ...gemStyle(c, { glow: 4, dropShadow: false }),
                  outline: c === color ? '2px solid var(--accent)' : 'none',
                }}
              />
            ))}
          </div>
        </div>

        <button type="button" style={styles.pickBtn} onClick={onRequestPick}>
          Указать точку на карте
        </button>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>
            Отмена
          </button>
          <button type="submit" style={styles.submitBtn} disabled={busy}>
            {busy ? 'Сохранение…' : 'Добавить метку'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
  },
  modal: {
    width: 320,
    maxWidth: 'calc(100vw - 32px)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: 18,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text)',
    marginBottom: 2,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  coordsRow: {
    display: 'flex',
    gap: 8,
  },
  coordField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
  },
  input: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text)',
    fontSize: 13,
    padding: '7px 9px',
    width: '100%',
    outline: 'none',
  },
  swatches: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  swatch: {
    width: 24,
    height: 24,
    transform: 'rotate(45deg)',
    borderRadius: 4,
    border: '2px solid',
    cursor: 'pointer',
    outlineOffset: 2,
    margin: 3,
  },
  pickBtn: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 12,
    padding: '7px 9px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  error: {
    fontSize: 12,
    color: 'var(--red)',
  },
  actions: {
    display: 'flex',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: 13,
    padding: '8px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  submitBtn: {
    flex: 2,
    background: 'var(--accent)',
    border: 'none',
    color: '#000',
    fontWeight: 700,
    fontSize: 13,
    padding: '8px',
    borderRadius: 6,
    cursor: 'pointer',
  },
};
