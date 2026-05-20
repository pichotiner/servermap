// Marker colors. Grey is the default; the rest form the picker palette.

export const DEFAULT_COLOR = '#9aa0a6';

export const MARKER_COLORS = [
  '#9aa0a6', // серый (по умолчанию)
  '#f85149', // красный
  '#f0883e', // оранжевый
  '#ffe16e', // жёлтый
  '#3fb950', // зелёный
  '#3fc8de', // голубой
  '#539bf5', // синий
  '#bc8cff', // фиолетовый
  '#ff7bd5', // розовый
  '#ffffff', // белый
];

const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function normalizeColor(c) {
  return COLOR_RE.test(String(c || '')) ? c : DEFAULT_COLOR;
}

function channels(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Mix a color toward white (amount > 0) or black (amount < 0).
function shade(hex, amount) {
  const target = amount < 0 ? 0 : 255;
  const p = Math.abs(amount);
  const [r, g, b] = channels(hex).map(c => Math.round(c + (target - c) * p));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

function rgba(hex, a) {
  const [r, g, b] = channels(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Dynamic CSS for the diamond gem, derived from a single base color so it
// keeps the shiny crystal look at any hue.
export function gemStyle(color, { glow = 9, dropShadow = true } = {}) {
  const c = normalizeColor(color);
  const shadows = [`0 0 ${glow}px ${rgba(c, 0.7)}`];
  if (dropShadow) shadows.push('0 2px 6px rgba(0,0,0,0.7)');
  return {
    background: `linear-gradient(135deg, ${shade(c, 0.45)} 0%, ${c} 48%, ${shade(c, -0.4)} 100%)`,
    borderColor: shade(c, 0.6),
    boxShadow: shadows.join(', '),
  };
}

export function gemCssString(color, opts) {
  const s = gemStyle(color, opts);
  return `background:${s.background};border-color:${s.borderColor};box-shadow:${s.boxShadow};`;
}
