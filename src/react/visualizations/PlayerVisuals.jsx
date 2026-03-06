import React, { useState } from 'react';

/*
 * PlayerVisuals.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for all player visualization components and helpers.
 * Import from here — never define locally in screens or other components.
 *
 * Exports:
 *   Primitives:    ratingColor, SectionLabel, Tooltip
 *   Hex system:    HEX_AXES, hexComponentsFromAnalytics, hexComponentsFromProfile,
 *                  hexNorm, hexPerfColor, HexChart, HexAxisTooltip, HexBreakdown
 *   Percentile:    PERCENTILE_STATS, MIN_GAMES_PERCENTILE, computePercentile,
 *                  pctBarColor, LeaguePercentileSection
 *   Player detail: PlayerStatGrid, AttrBars
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════════

export function ratingColor(r) {
  if (!r) return 'var(--color-text-tertiary)';
  if (r >= 85) return 'var(--color-rating-elite)';
  if (r >= 78) return 'var(--color-rating-good)';
  if (r >= 70) return 'var(--color-rating-avg)';
  if (r >= 60) return 'var(--color-rating-below)';
  return 'var(--color-rating-poor)';
}

export function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 10, fontWeight: 600, color: 'var(--color-accent)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      marginBottom: 8, ...style,
    }}>
      {children}
    </div>
  );
}

export function Tooltip({ text, children }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = React.useRef(null);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    setVisible(true);
  };

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={() => setVisible(false)} className="stat-tooltip-trigger">
        {children}
      </span>
      {visible && (
        <div className="stat-tooltip" style={{ top: pos.top, left: pos.left }}>
          {text}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HEX CHART SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export const HEX_AXES = [
  { key: 'scoring',    label: 'Scoring',    max: 30, short: 'SCR',
    tip: 'Points per game contribution.\nMax 30 — elite scorers reach the ceiling.' },
  { key: 'efficiency', label: 'Efficiency', max: 20, short: 'EFF',
    tip: 'True Shooting % above league average.\nMax 20 — rewards efficiency over volume.' },
  { key: 'playmaking', label: 'Playmaking', max: 15, short: 'PLY',
    tip: 'Assists weighted against turnovers.\nMax 15 — net creation value.' },
  { key: 'defense',    label: 'Defense',    max: 15, short: 'DEF',
    tip: 'Steals × 3 + Blocks × 2.5.\nMax 15 — defensive impact.' },
  { key: 'rebounding', label: 'Rebounding', max: 10, short: 'REB',
    tip: 'Rebounds per game contribution.\nMax 10.' },
  { key: 'impact',     label: 'Impact',     max: 10, short: '+/-',
    tip: 'Plus/Minus per game — how the score\nmoves while on the court. Can be negative.' },
];

export function hexNorm(components, axis) {
  const v = components[axis.key] ?? 0;
  const n = axis.max > 0 ? v / axis.max : 0;
  return Math.max(0, Math.min(1, n));
}

export function hexPerfColor(n) {
  if (n >= 0.85) return 'var(--color-rating-elite)';
  if (n >= 0.65) return 'var(--color-rating-good)';
  if (n >= 0.35) return 'var(--color-rating-avg)';
  return 'var(--color-rating-poor)';
}

function hexPolar(cx, cy, r, angle) {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

function hexAngle(i) { return (Math.PI * 2 * i) / 6 - Math.PI / 2; }

function hexGridPath(cx, cy, r) {
  return HEX_AXES.map((_, i) => {
    const [x, y] = hexPolar(cx, cy, r, hexAngle(i));
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

// Derive hex components from StatEngine analytics + avgs. Returns null if unavailable.
export function hexComponentsFromAnalytics(analytics, avgs) {
  if (!analytics || !avgs) return null;
  const scoring    = Math.min(30, avgs.pointsPerGame * 1.0);
  const efficiency = avgs.trueShootingPct > 0
    ? Math.min(20, (avgs.trueShootingPct - 0.45) * 200) : 10;
  const playmaking = Math.min(15, (avgs.assistsPerGame * 1.2) - (avgs.turnoversPerGame * 0.8));
  const defense    = Math.min(15, (avgs.stealsPerGame * 3) + (avgs.blocksPerGame * 2.5));
  const rebounding = Math.min(10, avgs.reboundsPerGame * 0.8);
  const impact     = Math.min(10, Math.max(-10, avgs.plusMinusPerGame * 0.8));
  return {
    scoring:    Math.round(Math.max(0, scoring)),
    efficiency: Math.round(Math.max(0, efficiency)),
    playmaking: Math.round(Math.max(0, playmaking)),
    defense:    Math.round(Math.max(0, defense)),
    rebounding: Math.round(Math.max(0, rebounding)),
    impact:     Math.round(impact),
    isProjection: false,
  };
}

// Pre-season fallback from scoring profile + ratings.
export function hexComponentsFromProfile(player) {
  const sp  = player.scoringProfile;
  const r   = player.rating || 60;
  const off = player.offRating || r;
  const def = player.defRating || r;
  const pos = player.position || 'SF';

  const usageMod       = sp ? sp.usageTendency : 1.0;
  const scoring        = Math.min(30, Math.max(0, (off - 60) * 0.6 * usageMod));
  const effScalar      = sp ? sp.efficiency : 1.0;
  const efficiency     = Math.min(20, Math.max(0, (effScalar - 0.88) * 100));
  const playmakingBase = ['PG', 'SG'].includes(pos) ? 1.4 : ['SF'].includes(pos) ? 0.9 : 0.5;
  const playmaking     = Math.min(15, Math.max(0, (off - 60) * 0.3 * playmakingBase));
  const defense        = Math.min(15, Math.max(0, (def - 60) * 0.4));
  const rebBase        = ['C', 'PF'].includes(pos) ? 1.3 : 0.6;
  const rebounding     = Math.min(10, Math.max(0, (def - 60) * 0.2 * rebBase));
  const impact         = Math.min(10, Math.max(-5, (r - 65) * 0.15));

  return {
    scoring:    Math.round(scoring),
    efficiency: Math.round(efficiency),
    playmaking: Math.round(playmaking),
    defense:    Math.round(defense),
    rebounding: Math.round(rebounding),
    impact:     Math.round(impact),
    isProjection: true,
  };
}

// Build normalized hex array for MiniHex: [{ label, value, max }]
export function hexToArray(hexObj) {
  if (!hexObj) return null;
  return HEX_AXES.map(ax => ({ label: ax.short, value: hexObj[ax.key] ?? 0, max: ax.max }));
}

// Full interactive hex chart
export function HexChart({ components, size = 180, hoveredAxis, onHoverAxis }) {
  const cx = size / 2, cy = size / 2;
  const maxR = size * 0.36;
  const rings = [0.25, 0.5, 0.75, 1.0];

  const pts = HEX_AXES.map((axis, i) => {
    const n = hexNorm(components, axis);
    const [x, y] = hexPolar(cx, cy, n * maxR, hexAngle(i));
    return { x, y, n, color: hexPerfColor(n) };
  });

  const outerPts = HEX_AXES.map((_, i) => hexPolar(cx, cy, maxR, hexAngle(i)));
  const dataPath = pts.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
  ).join(' ') + ' Z';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        {pts.map((p, i) => {
          const j = (i + 1) % 6;
          const q = pts[j];
          return (
            <linearGradient key={i} id={`hex-eg-${i}`}
              x1={p.x} y1={p.y} x2={q.x} y2={q.y}
              gradientUnits="userSpaceOnUse">
              <stop offset="0%"   stopColor={p.color} />
              <stop offset="100%" stopColor={q.color} />
            </linearGradient>
          );
        })}
      </defs>

      {rings.map((frac, ri) => (
        <path key={ri} d={hexGridPath(cx, cy, maxR * frac)}
          fill="none"
          stroke={ri === 3 ? 'var(--color-border)' : 'var(--color-border-subtle)'}
          strokeWidth={ri === 3 ? 1 : 0.75} />
      ))}

      {outerPts.map(([ox, oy], i) => (
        <line key={i} x1={cx} y1={cy} x2={ox} y2={oy}
          stroke={hoveredAxis === i ? 'var(--color-border)' : 'var(--color-border-subtle)'}
          strokeWidth={hoveredAxis === i ? 1 : 0.75} />
      ))}

      <path d={dataPath} fill="var(--color-accent)" fillOpacity={0.10} />

      {pts.map((p, i) => {
        const j = (i + 1) % 6;
        const q = pts[j];
        const hot = hoveredAxis === i || hoveredAxis === j;
        return (
          <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y}
            stroke={`url(#hex-eg-${i})`}
            strokeWidth={hot ? 2.5 : 1.8} />
        );
      })}

      {outerPts.map(([ox, oy], i) => (
        <circle key={i} cx={ox} cy={oy} r={10}
          fill="transparent" style={{ cursor: 'default' }}
          onMouseEnter={() => onHoverAxis?.(i)}
          onMouseLeave={() => onHoverAxis?.(null)} />
      ))}

      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y}
          r={hoveredAxis === i ? 4 : 3}
          fill={p.color} stroke="var(--color-bg-raised)" strokeWidth={1.5} />
      ))}

      {outerPts.map(([ox, oy], i) => {
        const n = hexNorm(components, HEX_AXES[i]);
        const hot = hoveredAxis === i;
        const s = hot ? 5 : 3.5;
        return (
          <rect key={i} x={ox - s / 2} y={oy - s / 2} width={s} height={s}
            fill={hexPerfColor(n)} />
        );
      })}

      {HEX_AXES.map((axis, i) => {
        const angle = hexAngle(i);
        const [lx, ly] = hexPolar(cx, cy, maxR + 20, angle);
        const anchor = Math.abs(Math.cos(angle)) < 0.15 ? 'middle'
          : Math.cos(angle) > 0 ? 'start' : 'end';
        const dy = Math.sin(angle) > 0.3 ? '0.9em'
          : Math.sin(angle) < -0.3 ? '0em' : '0.35em';
        const hot = hoveredAxis === i;
        const n = hexNorm(components, axis);
        return (
          <text key={i} x={lx} y={ly}
            textAnchor={anchor} dy={dy}
            fontSize={hot ? 10 : 9}
            fontFamily="var(--font-mono)"
            fontWeight={hot ? 700 : 600}
            fill={hot ? hexPerfColor(n) : 'var(--color-text-tertiary)'}
            letterSpacing="0.04em">
            {axis.short}
          </text>
        );
      })}
    </svg>
  );
}

// Tooltip shown on hex axis hover
export function HexAxisTooltip({ axis, components }) {
  if (!axis || !components) return null;
  const value = components[axis.key] ?? 0;
  const norm  = hexNorm(components, axis);
  const color = hexPerfColor(norm);
  const pct   = Math.round(norm * 100);
  return (
    <div style={{
      background: 'var(--color-bg-raised)',
      border: `1px solid ${color}`,
      padding: '8px 12px', minWidth: 160,
      fontSize: 'var(--text-xs)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      <div style={{ fontWeight: 700, color, marginBottom: 4, fontSize: 'var(--text-sm)' }}>
        {axis.label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 700, color, lineHeight: 1, marginBottom: 4 }}>
        {value}
        <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginLeft: 4 }}>
          / {axis.max}
        </span>
      </div>
      <div style={{ height: 4, background: 'var(--color-bg-sunken)', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color }} />
      </div>
      <div style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.4, whiteSpace: 'pre-line' }}>
        {axis.tip}
      </div>
    </div>
  );
}

// Breakdown bars alongside hex chart
export function HexBreakdown({ components, hoveredAxis, onHoverAxis }) {
  if (!components) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {HEX_AXES.map((axis, i) => {
        const value = components[axis.key] ?? 0;
        const norm  = hexNorm(components, axis);
        const color = hexPerfColor(norm);
        const hot   = hoveredAxis === i;
        return (
          <div key={axis.key}
            onMouseEnter={() => onHoverAxis?.(i)}
            onMouseLeave={() => onHoverAxis?.(null)}
            style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{
                fontSize: 9, fontWeight: hot ? 700 : 600,
                color: hot ? color : 'var(--color-text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                width: 28, flexShrink: 0,
              }}>
                {axis.short}
              </span>
              <div style={{
                flex: 1, height: hot ? 7 : 5,
                background: 'var(--color-bg-sunken)',
                transition: 'height 100ms',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${Math.round(norm * 100)}%`,
                  background: color, opacity: hot ? 1 : 0.75,
                  transition: 'width 200ms, opacity 100ms',
                }} />
              </div>
              <span style={{
                fontSize: hot ? 12 : 11, fontFamily: 'var(--font-mono)',
                fontWeight: hot ? 700 : 600, color: hot ? color : 'var(--color-text-secondary)',
                width: 28, textAlign: 'right', flexShrink: 0,
                transition: 'font-size 100ms',
              }}>
                {value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Compact mini hex for lists/cards (accepts normalized array from hexToArray())
export function MiniHex({ components, size = 48 }) {
  if (!components || !Array.isArray(components) || components.length === 0) return null;
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const n  = components.length;
  const pts = components.map((c, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const norm  = c.max > 0 ? Math.max(0.05, Math.min(1, c.value / c.max)) : 0.05;
    return [cx + r * norm * Math.cos(angle), cy + r * norm * Math.sin(angle)];
  });
  const outline = components.map((_, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  return (
    <svg width={size} height={size} style={{ display: 'block', flexShrink: 0 }}>
      <polygon points={outline.map(p => p.join(',')).join(' ')}
        fill="none" stroke="var(--color-border)" strokeWidth={0.75} />
      <polygon points={pts.map(p => p.join(',')).join(' ')}
        fill="var(--color-accent)" fillOpacity={0.18}
        stroke="var(--color-accent)" strokeWidth={1.25} />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PERCENTILE SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

export const PERCENTILE_STATS = [
  { key: 'pointsPerGame',    label: 'PPG', fmt: v => v.toFixed(1)                        },
  { key: 'reboundsPerGame',  label: 'RPG', fmt: v => v.toFixed(1)                        },
  { key: 'assistsPerGame',   label: 'APG', fmt: v => v.toFixed(1)                        },
  { key: 'stealsPerGame',    label: 'SPG', fmt: v => v.toFixed(1)                        },
  { key: 'blocksPerGame',    label: 'BPG', fmt: v => v.toFixed(1)                        },
  { key: 'trueShootingPct',  label: 'TS%', fmt: v => (v * 100).toFixed(1) + '%'         },
  { key: 'plusMinusPerGame', label: '+/-', fmt: v => (v > 0 ? '+' : '') + v.toFixed(1)  },
];

export const MIN_GAMES_PERCENTILE = 10;

// Returns 0–1 (fraction of pool below value)
export function computePercentile(value, pool) {
  if (pool.length === 0) return 0;
  return pool.filter(v => v < value).length / pool.length;
}

export function pctBarColor(pct) {
  if (pct >= 0.90) return 'var(--color-rating-elite)';
  if (pct >= 0.75) return 'var(--color-rating-good)';
  if (pct >= 0.25) return 'var(--color-rating-avg)';
  return 'var(--color-rating-poor)';
}

/*
 * LeaguePercentileSection
 *
 * Props:
 *   avgs         — StatEngine.getSeasonAverages(player)
 *   tierPool     — [{ pos, avgs }] from all tier teams
 *   playerPos    — player.position
 *   currentTier  — number
 */
export function LeaguePercentileSection({ avgs, tierPool, playerPos, currentTier }) {
  const [filterPos, setFilterPos] = useState(false);
  if (!avgs || tierPool.length < 5) return null;

  const activePool = filterPos
    ? tierPool.filter(x => x.pos === playerPos)
    : tierPool;
  const n = activePool.length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <SectionLabel style={{ marginBottom: 0 }}>League Percentiles</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>
            vs {n} {filterPos ? `${playerPos}s` : 'players'} · T{currentTier} · min {MIN_GAMES_PERCENTILE}GP
          </span>
          <button onClick={() => setFilterPos(f => !f)} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '2px 7px',
            border: `1px solid ${filterPos ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: filterPos ? 'var(--color-accent-bg)' : 'transparent',
            cursor: 'pointer', fontFamily: 'var(--font-body)',
          }}>
            <div style={{ width: 5, height: 5, background: filterPos ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }} />
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: filterPos ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {playerPos} only
            </span>
          </button>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 48px 62px', gap: 0, marginBottom: 2 }}>
        <div />
        <div style={{ position: 'relative', height: 12, marginLeft: 6, marginRight: 8 }}>
          <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontSize: 8, color: 'var(--color-text-tertiary)' }}>50th</span>
          <span style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)', fontSize: 8, color: 'var(--color-text-tertiary)', opacity: 0.6 }}>75th</span>
        </div>
        <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stat</div>
        <div style={{ textAlign: 'right', fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rank</div>
      </div>

      {/* Rows */}
      <div style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
        {PERCENTILE_STATS.map((stat, i) => {
          const playerVal = avgs[stat.key];
          if (playerVal == null) return null;
          const poolVals = activePool.map(p => p.avgs[stat.key]).filter(v => v != null);
          if (poolVals.length === 0) return null;
          const pct   = computePercentile(playerVal, poolVals);
          const rank  = Math.round((1 - pct) * n) + 1;
          const color = pctBarColor(pct);
          return (
            <div key={stat.key}>
              <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 48px 62px', gap: 0, alignItems: 'center', padding: '6px 0' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {stat.label}
                </div>
                <div style={{ position: 'relative', height: 14, marginLeft: 6, marginRight: 8, background: 'var(--color-bg-sunken)', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(pct * 100).toFixed(1)}%`, background: color, opacity: 0.75 }} />
                  <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'var(--color-border)' }} />
                  <div style={{ position: 'absolute', top: 0, left: '75%', width: 1, height: '100%', background: 'var(--color-border)', opacity: 0.5 }} />
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
                  {stat.fmt(playerVal)}
                </div>
                <div style={{ textAlign: 'right', fontSize: 9, fontFamily: 'var(--font-mono)' }}>
                  <span style={{ fontWeight: 600, color }}>#{rank}</span>
                  <span style={{ color: 'var(--color-text-tertiary)' }}> / {n}</span>
                </div>
              </div>
              {i < PERCENTILE_STATS.length - 1 && (
                <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        {[
          { color: 'var(--color-rating-elite)', label: 'Top 10%'    },
          { color: 'var(--color-rating-good)',  label: 'Top 25%'    },
          { color: 'var(--color-rating-avg)',   label: 'Middle 50%' },
          { color: 'var(--color-rating-poor)',  label: 'Bottom 25%' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, background: color, opacity: 0.75 }} />
            <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYER DETAIL SECTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * PlayerStatGrid — counting stats + shooting splits
 * Props: avgs (from StatEngine.getSeasonAverages), analytics (from getPlayerAnalytics)
 */
export function PlayerStatGrid({ avgs, analytics }) {
  if (!avgs || !avgs.gamesPlayed) {
    return (
      <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
        No games played this season yet.
      </div>
    );
  }

  const stat = (v, d = 1) => v != null ? Number(v).toFixed(d) : '—';
  const pct  = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—';
  const pm   = (v) => v == null ? '—' : v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1);
  const pmColor = (v) => v > 0 ? 'var(--color-win)' : v < 0 ? 'var(--color-loss)' : 'var(--color-text-tertiary)';

  const flagColors = { warning: 'var(--color-warning)', positive: 'var(--color-win)', info: 'var(--color-accent)' };

  const COUNTING = [
    { label: 'PTS', val: stat(avgs.pointsPerGame) },
    { label: 'REB', val: stat(avgs.reboundsPerGame) },
    { label: 'AST', val: stat(avgs.assistsPerGame) },
    { label: 'STL', val: stat(avgs.stealsPerGame) },
    { label: 'BLK', val: stat(avgs.blocksPerGame) },
    { label: 'TOV', val: stat(avgs.turnoversPerGame) },
  ];

  const SHOOTING = [
    { label: 'FG%', val: pct(avgs.fieldGoalPct) },
    { label: '3P%', val: pct(avgs.threePointPct) },
    { label: 'FT%', val: pct(avgs.freeThrowPct) },
    { label: 'TS%',
      val: pct(avgs.trueShootingPct),
      color: avgs.trueShootingPct >= 0.60 ? 'var(--color-win)' : avgs.trueShootingPct < 0.48 ? 'var(--color-warning)' : 'var(--color-text)',
    },
    { label: '+/-/G', val: pm(avgs.plusMinusPerGame), color: pmColor(avgs.plusMinusPerGame) },
    { label: '+/- TOT', val: pm(avgs.plusMinus), color: pmColor(avgs.plusMinus) },
  ];

  const StatCell = ({ label, val, color }) => (
    <div style={{ textAlign: 'center', padding: '6px 0', background: 'var(--color-bg-raised)', border: '1px solid var(--color-border-subtle)' }}>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--color-text)' }}>{val}</div>
      <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
    </div>
  );

  const Per36Row = ({ label, values }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '64px repeat(6, 1fr)', padding: '6px 0', borderTop: '1px solid var(--color-border-subtle)' }}>
      <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontWeight: 600, alignSelf: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      {values.map((v, i) => (
        <div key={i} style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-text-secondary)' }}>{v}</div>
      ))}
    </div>
  );

  return (
    <div>
      <SectionLabel>This Season — {avgs.gamesPlayed}G · {avgs.minutesPerGame} MPG</SectionLabel>

      {/* Counting stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginBottom: 4 }}>
        {COUNTING.map(s => <StatCell key={s.label} {...s} />)}
      </div>

      {/* Per 36 row */}
      {analytics?.per36 && (
        <Per36Row label="Per 36" values={[
          stat(analytics.per36.points),
          stat(analytics.per36.rebounds),
          stat(analytics.per36.assists),
          stat(analytics.per36.steals),
          stat(analytics.per36.blocks),
          stat(analytics.per36.turnovers),
        ]} />
      )}

      {/* Shooting splits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginTop: 8 }}>
        {SHOOTING.map(s => <StatCell key={s.label} {...s} />)}
      </div>

      {/* Flags */}
      {analytics?.flags?.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {analytics.flags.map((f, i) => (
            <span key={i} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px',
              border: `1px solid ${flagColors[f.type] || 'var(--color-border)'}`,
              color: flagColors[f.type] || 'var(--color-text-secondary)',
            }}>
              {f.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/*
 * AttrBars — three-column attribute section (Offense / Defense / Intangibles)
 * Props: attributes (player.attributes)
 */
export function AttrBars({ attributes }) {
  const attrs = attributes || {};

  const attrColor = (v) =>
    v >= 80 ? 'var(--color-rating-elite)' : v >= 70 ? 'var(--color-rating-good)' :
    v >= 60 ? 'var(--color-rating-avg)'   : 'var(--color-rating-poor)';

  const Bar = ({ label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', width: 100, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 4, background: 'var(--color-bg-sunken)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${value}%`, background: attrColor(value) }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, width: 24, textAlign: 'right', color: attrColor(value) }}>{value}</span>
    </div>
  );

  const GROUPS = [
    { label: 'Offense', keys: [{ key: 'clutch', label: 'Clutch' }, { key: 'basketballIQ', label: 'Basketball IQ' }, { key: 'speed', label: 'Speed' }] },
    { label: 'Defense', keys: [{ key: 'strength', label: 'Strength' }, { key: 'verticality', label: 'Verticality' }, { key: 'endurance', label: 'Endurance' }] },
    { label: 'Intangibles', keys: [{ key: 'workEthic', label: 'Work Ethic' }, { key: 'coachability', label: 'Coachability' }, { key: 'collaboration', label: 'Collaboration' }] },
  ];

  return (
    <div>
      <SectionLabel>Attributes</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {GROUPS.map(g => (
          <div key={g.label}>
            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
              {g.label}
            </div>
            {g.keys.map(({ key, label }) => <Bar key={key} label={label} value={attrs[key] || 50} />)}
          </div>
        ))}
      </div>
    </div>
  );
}
