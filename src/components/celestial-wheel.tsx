/**
 * CelestialWheel — a refined animated degree-wheel visual for the landing
 * page. Purely decorative (aria-hidden); honors reduced motion via CSS.
 */

export function CelestialWheel({ size = 420 }: { size?: number }) {
  const cx = 200;
  const cy = 200;
  const rOuter = 186;
  const rMid = 150;
  const rInner = 96;

  const ticks = Array.from({ length: 360 }, (_, i) => {
    const a = (i / 360) * 2 * Math.PI;
    const major = i % 30 === 0;
    const r1 = major ? rOuter - 14 : rOuter - 8;
    return (
      <line
        key={i}
        x1={cx + Math.cos(a) * r1}
        y1={cy + Math.sin(a) * r1}
        x2={cx + Math.cos(a) * rOuter}
        y2={cy + Math.sin(a) * rOuter}
        stroke={major ? "#C9A227" : "#7E8CA3"}
        strokeOpacity={major ? 0.8 : 0.35}
        strokeWidth={major ? 1.6 : 0.8}
      />
    );
  });

  const markers = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 2 * Math.PI - Math.PI / 2;
    const x = cx + Math.cos(a) * rMid;
    const y = cy + Math.sin(a) * rMid;
    const glyphs = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
    return (
      <text
        key={i}
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="17"
        fill={i === 0 ? "#C9A227" : "#8A7CA8"}
        opacity="0.9"
      >
        {glyphs[i]}
      </text>
    );
  });

  const stars = Array.from({ length: 26 }, (_, i) => {
    const a = (i * 137.5 * Math.PI) / 180;
    const r = 20 + ((i * 53) % 165);
    return (
      <circle
        key={i}
        cx={cx + Math.cos(a) * r}
        cy={cy + Math.sin(a) * r}
        r={i % 5 === 0 ? 1.6 : 1}
        fill={i % 4 === 0 ? "#C9A227" : "#A9B4C4"}
        opacity={0.5 + (i % 4) * 0.12}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className="animate-wheel"
      role="presentation"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="wheelBg" cx="50%" cy="44%" r="62%">
          <stop offset="0%" stopColor="#182240" />
          <stop offset="100%" stopColor="#0B1020" />
        </radialGradient>
        <linearGradient id="wheelRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C9A227" stopOpacity="0.9" />
          <stop offset="50%" stopColor="#8A7CA8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#C9A227" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <circle cx={cx} cy={cy} r={rOuter} fill="url(#wheelBg)" />
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke="url(#wheelRing)" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r={rMid} fill="none" stroke="#7E8CA3" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke="#C9A227" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="2 5" />
      {ticks}
      {markers}
      {stars}
      <circle cx={cx} cy={cy} r={4} fill="#E3C766" />
      <circle cx={cx} cy={cy} r={7} fill="none" stroke="#C96A4B" strokeOpacity="0.8" />
    </svg>
  );
}
