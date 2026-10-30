// Tiny SVG line chart of best cost per step
export default function Convergence({ history }) {
  if (!history?.length) return null;
  const W = 560, H = 140, p = 28;
  const max = Math.max(...history, 1), n = Math.max(history.length - 1, 1);
  const pts = history.map((v, i) => `${p + (i / n) * (W - p * 1.5)},${H - p + 8 - (v / max) * (H - p * 1.6)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Convergence: best cost over time">
      <line x1={p} y1={H - p + 8} x2={W - 8} y2={H - p + 8} className="axis" />
      <line x1={p} y1={8} x2={p} y2={H - p + 8} className="axis" />
      <polyline points={pts} fill="none" className="line" />
      <text x={4} y={16} className="tick">{Math.round(max)}</text>
      <text x={14} y={H - p + 8} className="tick">0</text>
      <text x={W / 2} y={H - 4} textAnchor="middle" className="tick">progress →  (lower cost is better)</text>
    </svg>
  );
}
