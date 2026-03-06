/**
 * SparklineComponents.jsx
 * Shared sparkline primitives used by:
 *   - RosterScreen  (per-player Season Arc)
 *   - CoachScreen   (team-aggregate Season Arc)
 *   - Widgets       (Team Form compact widget)
 */
import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// buildTeamLog — aggregate individual player gameLogs into one team-level log
//
// Strategy: for each game index i, average all players who have an entry at i.
// Players who didn't play (injury, roster addition mid-season) are excluded from
// that game's average naturally. pm sums rather than averages (it's a team stat).
// ─────────────────────────────────────────────────────────────────────────────
export function buildTeamLog(roster) {
  if (!roster || roster.length === 0) return [];

  // Find the longest gameLog on the roster — that's how many games have been played
  const maxGames = Math.max(...roster.map(p => p.gameLog?.length || 0));
  if (maxGames < 3) return [];

  const teamLog = [];

  for (let i = 0; i < maxGames; i++) {
    const entries = roster
      .map(p => p.gameLog?.[i])
      .filter(Boolean);

    if (entries.length === 0) continue;

    const n = entries.length;
    const sum = (key) => entries.reduce((s, e) => s + (e[key] || 0), 0);

    // fgPct: weighted by attempts to avoid averaging percentages naively
    const totalFGM = sum('fgm') || entries.reduce((s, e) => {
      // fgPct * ~10 as a proxy if raw fgm not stored — but we store fgPct directly
      // Fallback: simple mean of fgPct
      return s;
    }, 0);

    // fgPct stored as a decimal per entry — simple mean is acceptable at team level
    const avgFgPct = sum('fgPct') / n;

    // pm is a true team-level stat — sum across all players in that game
    const totalPm = sum('pm');

    // gs: average across players (individual impact measure)
    const avgGs = sum('gs') / n;

    teamLog.push({
      g:     entries[0].g,           // game number from first player with an entry
      pts:   sum('pts') / n,
      reb:   sum('reb') / n,
      ast:   sum('ast') / n,
      fgPct: avgFgPct,
      pm:    totalPm,
      gs:    avgGs,
    });
  }

  return teamLog;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline — single stat line chart
// ─────────────────────────────────────────────────────────────────────────────
export function Sparkline({ data, statKey, label, width = 196, height = 56, tooltipLabel }) {
  const [hovered, setHovered] = React.useState(null);
  const svgRef = React.useRef(null);

  if (!data || data.length < 2) return null;

  const values = data.map(d => d[statKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pad = { t: 8, b: 8, l: 2, r: 2 };
  const iW = width - pad.l - pad.r;
  const iH = height - pad.t - pad.b;

  const xPos = i => pad.l + (i / (data.length - 1)) * iW;
  const yPos = v => pad.t + (1 - (v - min) / range) * iH;

  // Rolling average up to each game
  const rollingAvgs = data.map((_, i) => {
    const slice = data.slice(0, i + 1);
    return slice.reduce((s, d) => s + (d[statKey] || 0), 0) / slice.length;
  });

  const dataPath = data.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(d[statKey]).toFixed(1)}`
  ).join(' ');

  const avgPath = rollingAvgs.map((avg, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(avg).toFixed(1)}`
  ).join(' ');

  const seasonAvg = rollingAvgs[rollingAvgs.length - 1] || 0;

  const ptColor = (v, avg) => {
    const delta = avg !== 0 ? (v - avg) / Math.abs(avg) : 0;
    if (delta >  0.20) return 'var(--color-rating-elite)';
    if (delta >  0.06) return 'var(--color-rating-good)';
    if (delta > -0.06) return 'var(--color-rating-avg)';
    if (delta > -0.20) return 'var(--color-warning)';
    return 'var(--color-rating-poor)';
  };

  // Recent trend: last 8 vs prior 8
  const recentN = 8;
  const recent  = values.slice(-recentN);
  const prior   = values.slice(-recentN * 2, -recentN);
  const rMean   = recent.reduce((s, v) => s + v, 0) / recent.length;
  const pMean   = prior.length > 0 ? prior.reduce((s, v) => s + v, 0) / prior.length : rMean;
  const tDelta  = (rMean - pMean) / Math.max(Math.abs(pMean), 0.1);
  const trend   = tDelta > 0.08 ? '↑' : tDelta < -0.08 ? '↓' : '→';
  const tColor  = trend === '↑' ? 'var(--color-win)' : trend === '↓' ? 'var(--color-loss)' : 'var(--color-text-tertiary)';

  const fmt = statKey === 'fgPct'
    ? v => (v * 100).toFixed(1) + '%'
    : statKey === 'pm'
    ? v => (v > 0 ? '+' : '') + Number(v).toFixed(1)
    : v => Number(v).toFixed(1);

  const handleMouseMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - pad.l;
    const idx = Math.max(0, Math.min(data.length - 1, Math.round(x / iW * (data.length - 1))));
    setHovered({ idx, d: data[idx], avg: rollingAvgs[idx] });
  };

  const tooltipXPos = hovered ? xPos(hovered.idx) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)',
          textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            {fmt(seasonAvg)}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: tColor, lineHeight: 1 }}>{trend}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' }} onMouseLeave={() => setHovered(null)}>
        <svg ref={svgRef} width={width} height={height}
          onMouseMove={handleMouseMove}
          style={{ display: 'block', cursor: 'crosshair', overflow: 'visible' }}>

          {/* Data trail — thin, muted */}
          <path d={dataPath} fill="none"
            stroke="var(--color-text-tertiary)" strokeWidth={1} strokeOpacity={0.5}
            strokeLinejoin="round" strokeLinecap="round" />

          {/* Rolling average — solid accent, 1.25px */}
          <path d={avgPath} fill="none"
            stroke="var(--color-accent)" strokeWidth={1.25} strokeOpacity={0.85}
            strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots: every 5th game + last game + hovered */}
          {data.map((d, i) => {
            const isHov = hovered?.idx === i;
            if (!isHov && i % 5 !== 0 && i !== data.length - 1) return null;
            return (
              <circle key={i}
                cx={xPos(i)} cy={yPos(d[statKey])}
                r={isHov ? 4.5 : 2.5}
                fill={ptColor(d[statKey], rollingAvgs[i])}
                opacity={isHov ? 1 : 0.75} />
            );
          })}

          {/* Hover crosshair */}
          {hovered && (
            <line x1={tooltipXPos} y1={pad.t} x2={tooltipXPos} y2={pad.t + iH}
              stroke="var(--color-text-tertiary)" strokeWidth={1} opacity={0.35} />
          )}
        </svg>

        {/* Tooltip */}
        {hovered && (
          <div style={{
            position: 'absolute',
            bottom: height + 4,
            left: Math.max(0, Math.min(tooltipXPos - 32, width - 100)),
            background: 'var(--color-text)', color: '#fff',
            padding: '4px 9px', fontSize: 10, fontFamily: 'var(--font-mono)',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20,
            lineHeight: 1.5,
          }}>
            {tooltipLabel && (
              <div style={{ fontSize: 9, opacity: 0.55, marginBottom: 1 }}>{tooltipLabel}</div>
            )}
            <span style={{ opacity: 0.6 }}>G{hovered.d.g} · </span>
            <strong style={{ color: ptColor(hovered.d[statKey], hovered.avg) }}>
              {fmt(hovered.d[statKey])}
            </strong>
            <span style={{ opacity: 0.5, marginLeft: 5 }}>
              avg {fmt(hovered.avg)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SparklineGrid — 2×3 layout for both player and team arcs
// ─────────────────────────────────────────────────────────────────────────────
export function SparklineGrid({ gameLog, gamesLabel, compact = false }) {
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(compact ? 200 : 600);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w && w > 0) setContainerWidth(w);
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  if (!gameLog || gameLog.length < 3) return null;

  // In compact mode: 2 cols × 3 rows. Full mode: 3 cols × 2 rows.
  const COLS = compact ? 2 : 3;
  const GAP  = compact ? 6 : 16;
  const W    = Math.floor((containerWidth - GAP * (COLS - 1)) / COLS);
  const H    = compact ? 36 : 56;

  const STATS = [
    { key: 'pts',   label: compact ? 'PTS'  : 'Points'     },
    { key: 'reb',   label: compact ? 'REB'  : 'Rebounds'   },
    { key: 'ast',   label: compact ? 'AST'  : 'Assists'    },
    { key: 'fgPct', label: compact ? 'FG%'  : 'FG%'        },
    { key: 'gs',    label: compact ? 'GS'   : 'Game Score' },
    { key: 'pm',    label: compact ? '+/-'  : '+/-'         },
  ];

  // Chunk into rows of COLS
  const rows = [];
  for (let i = 0; i < STATS.length; i += COLS) rows.push(STATS.slice(i, i + COLS));

  return (
    <div ref={containerRef} style={{ overflow: 'hidden', width: '100%' }}>
      {/* Legend row — hide in compact */}
      {!compact && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {gamesLabel || `Season Arc — ${gameLog.length}G`}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 14, height: 1.25, background: 'var(--color-accent)', opacity: 0.85 }} />
              <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>rolling avg</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {['var(--color-rating-elite)','var(--color-rating-good)','var(--color-rating-avg)',
                'var(--color-warning)','var(--color-rating-poor)'].map((c, i) => (
                <div key={i} style={{ width: 5, height: 5, background: c, borderRadius: '50%', opacity: 0.8 }} />
              ))}
              <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', marginLeft: 2 }}>vs avg</span>
            </div>
          </div>
        </div>
      )}

      {rows.map((row, ri) => (
        <div key={ri} style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, 1fr)`,
          gap: `0 ${GAP}px`,
          paddingBottom: compact ? 5 : 10,
          marginBottom: compact ? 5 : 10,
          borderBottom: ri < rows.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
        }}>
          {row.map(s => (
            <Sparkline key={s.key} data={gameLog} statKey={s.key} label={s.label} width={W > 0 ? W : 80} height={H} />
          ))}
        </div>
      ))}

      {!compact && (
        <div style={{ marginTop: 8, fontSize: 9, color: 'var(--color-text-tertiary)' }}>
          ↑↓ = last 8G vs prior 8G · dots colored relative to rolling avg at that point
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TeamFormSparkline — compact single-line GS widget for Dashboard
// ─────────────────────────────────────────────────────────────────────────────
export function TeamFormSparkline({ teamLog, height = 60 }) {
  const [hovered, setHovered] = React.useState(null);
  const [containerWidth, setContainerWidth] = React.useState(300);
  const containerRef = React.useRef(null);
  const svgRef = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    ro.observe(containerRef.current);
    setContainerWidth(containerRef.current.offsetWidth);
    return () => ro.disconnect();
  }, []);

  if (!teamLog || teamLog.length < 3) return null;

  const width = containerWidth;
  const statKey = 'gs';
  const values = teamLog.map(d => d[statKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const pad = { t: 8, b: 8, l: 2, r: 2 };
  const iW = width - pad.l - pad.r;
  const iH = height - pad.t - pad.b;

  const xPos = i => pad.l + (i / (teamLog.length - 1)) * iW;
  const yPos = v => pad.t + (1 - (v - min) / range) * iH;

  const rollingAvgs = teamLog.map((_, i) => {
    const slice = teamLog.slice(0, i + 1);
    return slice.reduce((s, d) => s + d[statKey], 0) / slice.length;
  });

  const dataPath = teamLog.map((d, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(d[statKey]).toFixed(1)}`
  ).join(' ');

  const avgPath = rollingAvgs.map((avg, i) =>
    `${i === 0 ? 'M' : 'L'}${xPos(i).toFixed(1)},${yPos(avg).toFixed(1)}`
  ).join(' ');

  const seasonAvg = rollingAvgs[rollingAvgs.length - 1] || 0;

  const ptColor = (v, avg) => {
    const delta = avg !== 0 ? (v - avg) / Math.abs(avg) : 0;
    if (delta >  0.20) return 'var(--color-rating-elite)';
    if (delta >  0.06) return 'var(--color-rating-good)';
    if (delta > -0.06) return 'var(--color-rating-avg)';
    if (delta > -0.20) return 'var(--color-warning)';
    return 'var(--color-rating-poor)';
  };

  const recentN = 8;
  const recent  = values.slice(-recentN);
  const prior   = values.slice(-recentN * 2, -recentN);
  const rMean   = recent.reduce((s, v) => s + v, 0) / recent.length;
  const pMean   = prior.length > 0 ? prior.reduce((s, v) => s + v, 0) / prior.length : rMean;
  const tDelta  = (rMean - pMean) / Math.max(Math.abs(pMean), 0.1);
  const trend   = tDelta > 0.08 ? '↑' : tDelta < -0.08 ? '↓' : '→';
  const tColor  = trend === '↑' ? 'var(--color-win)' : trend === '↓' ? 'var(--color-loss)' : 'var(--color-text-tertiary)';

  const handleMouseMove = (e) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - pad.l;
    const idx = Math.max(0, Math.min(teamLog.length - 1, Math.round(x / iW * (teamLog.length - 1))));
    setHovered({ idx, d: teamLog[idx], avg: rollingAvgs[idx] });
  };

  const tooltipX = hovered ? xPos(hovered.idx) : 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} onMouseLeave={() => setHovered(null)}>
      <svg ref={svgRef} width={width} height={height}
        onMouseMove={handleMouseMove}
        style={{ display: 'block', cursor: 'crosshair', overflow: 'visible' }}>

        <path d={dataPath} fill="none"
          stroke="var(--color-text-tertiary)" strokeWidth={1} strokeOpacity={0.5}
          strokeLinejoin="round" strokeLinecap="round" />

        <path d={avgPath} fill="none"
          stroke="var(--color-accent)" strokeWidth={1.25} strokeOpacity={0.85}
          strokeLinejoin="round" strokeLinecap="round" />

        {teamLog.map((d, i) => {
          const isHov = hovered?.idx === i;
          if (!isHov && i % 5 !== 0 && i !== teamLog.length - 1) return null;
          return (
            <circle key={i}
              cx={xPos(i)} cy={yPos(d[statKey])}
              r={isHov ? 4.5 : 2.5}
              fill={ptColor(d[statKey], rollingAvgs[i])}
              opacity={isHov ? 1 : 0.75} />
          );
        })}

        {hovered && (
          <line x1={tooltipX} y1={pad.t} x2={tooltipX} y2={pad.t + iH}
            stroke="var(--color-text-tertiary)" strokeWidth={1} opacity={0.35} />
        )}
      </svg>

      {/* Trend badge — bottom right of chart */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-secondary)' }}>
          {seasonAvg.toFixed(1)}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: tColor }}>{trend}</span>
      </div>

      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          bottom: height + 4,
          left: Math.max(0, Math.min(tooltipX - 40, width - 160)),
          background: 'var(--color-text)', color: '#fff',
          padding: '5px 10px', fontSize: 10, fontFamily: 'var(--font-mono)',
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 20,
          lineHeight: 1.6,
        }}>
          <div style={{ fontSize: 9, opacity: 0.5, marginBottom: 1 }}>
            Game Score = pts + assists + stocks – turnovers – missed shots
          </div>
          <span style={{ opacity: 0.6 }}>G{hovered.d.g} · team avg GS: </span>
          <strong style={{ color: ptColor(hovered.d[statKey], hovered.avg) }}>
            {Number(hovered.d[statKey]).toFixed(1)}
          </strong>
          <span style={{ opacity: 0.5, marginLeft: 5 }}>
            (season avg {hovered.avg.toFixed(1)})
          </span>
        </div>
      )}
    </div>
  );
}
