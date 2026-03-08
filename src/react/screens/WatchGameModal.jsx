import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, ModalBody } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

/**
 * WatchGameModal — native React live game viewer.
 *
 * Win probability chart:
 *  - X-axis: game time in minutes (0–48), Q boundary markers
 *  - Y-axis: user team win probability, home always at bottom (KenPom convention)
 *  - Line color: green >55%, gray 45–55% tossup, red <45%
 *  - No background fills — line tells the story
 *  - Pre-game prob seeded from roster rating differential
 */
export function WatchGameModal({ isOpen, data, onClose }) {
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [finalData, setFinalData] = useState(null);
  const [winProbPoints, setWinProbPoints] = useState([]);
  const [currentWinProb, setCurrentWinProb] = useState(null);
  const winProbPointsRef = useRef([]);

  const homeScoreRef = useRef(null);
  const awayScoreRef = useRef(null);
  const clockRef = useRef(null);
  const quarterScoresRef = useRef(null);
  const momentumRef = useRef(null);
  const playsRef = useRef(null);
  const leadersRef = useRef(null);

  useEffect(() => {
    if (isOpen && data) {
      const root = document.documentElement;
      root.style.setProperty('--color-away', '#6B6B65');
      root.style.setProperty('--color-home', getComputedStyle(root).getPropertyValue('--color-accent').trim() || '#1B4D3E');
    }
  }, [isOpen, data?.awayTeamFullName]);

  useEffect(() => {
    if (isOpen) {
      window._wgRefs = {
        homeScore: homeScoreRef.current,
        awayScore: awayScoreRef.current,
        clock: clockRef.current,
        quarterScores: quarterScoresRef.current,
        momentum: momentumRef.current,
        plays: playsRef.current,
        leaders: leadersRef.current,
        setGameOver: (resultData) => { setGameOver(true); setFinalData(resultData); },
        setSpeed: (s) => setSpeed(s),
        setPaused: (p) => setPaused(p),
        // Win probability hooks — called from GameSimController
        setPreGameWinProb: (prob) => {
          const initial = [{ elapsedSeconds: 0, prob }];
          winProbPointsRef.current = initial;
          setWinProbPoints(initial);
          setCurrentWinProb(prob);
        },
        pushWinProb: (elapsedSeconds, prob) => {
          const next = [...winProbPointsRef.current, { elapsedSeconds, prob }];
          winProbPointsRef.current = next;
          setWinProbPoints(next);
          setCurrentWinProb(prob);
        },
      };
    }
    return () => { window._wgRefs = null; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && data) {
      setSpeed(1); setPaused(false); setGameOver(false); setFinalData(null);
      setWinProbPoints([]); setCurrentWinProb(null);
      winProbPointsRef.current = [];
      if (playsRef.current) playsRef.current.innerHTML = '';
      if (leadersRef.current) leadersRef.current.innerHTML = '';
    }
  }, [isOpen, data?.homeName, data?.awayName]);

  const handleSpeed = useCallback((s) => { setSpeed(s); window.watchGameSetSpeed?.(s); }, []);
  const handlePause = useCallback(() => { setPaused(p => !p); window.watchGameTogglePause?.(); }, []);

  if (!isOpen || !data) return null;
  const { homeName, awayName, playoffContext, userIsHome } = data;

  // ── Chart geometry ──
  const CHART_H = 130;
  const CHART_W = 920;
  const TOTAL_GAME_SECONDS = 2880;

  // Y: prob=1.0 → top (away winning), prob=0.0 → bottom (home winning)
  // "User winning" always pushes line toward 100%
  const probToY = (prob) => (1 - prob) * CHART_H;
  const elapsedToX = (s) => (s / TOTAL_GAME_SECONDS) * CHART_W;

  // Build color-segmented polyline groups
  const buildSegments = (points) => {
    if (points.length < 2) return [];
    const C_WIN  = '#2D7A4F';
    const C_LOSS = '#B5403A';
    const C_EVEN = '#C0C0BA';
    const color = (p) => p > 0.55 ? C_WIN : p < 0.45 ? C_LOSS : C_EVEN;

    const segs = [];
    let start = 0;
    for (let i = 1; i <= points.length; i++) {
      const isLast = i === points.length;
      if (isLast || color(points[i].prob) !== color(points[start].prob)) {
        const pts = points.slice(start, i);
        segs.push({ color: color(points[start].prob), points: isLast ? pts : [...pts, points[i]] });
        start = i - 1;
      }
    }
    return segs;
  };

  const segments = buildSegments(winProbPoints);
  const lastPoint = winProbPoints[winProbPoints.length - 1];
  const cursorX = lastPoint ? elapsedToX(lastPoint.elapsedSeconds) : null;
  const cursorY = lastPoint ? probToY(lastPoint.prob) : null;

  // Live percentage display
  // prob is always "user's win probability"
  // Away = left column, Home = right column (layout matches scoreboard)
  const userProb = currentWinProb !== null ? Math.round(currentWinProb * 100) : null;
  const oppProb  = userProb !== null ? 100 - userProb : null;
  const awayProb = userIsHome ? oppProb  : userProb;
  const homeProb = userIsHome ? userProb : oppProb;

  const probColor = (p) => {
    if (p === null) return 'var(--color-text-tertiary)';
    // Color from the user's perspective
    const isUser = userIsHome ? (p === homeProb) : (p === awayProb);
    if (!isUser) return 'var(--color-text-secondary)';
    if (p > 55) return 'var(--color-win)';
    if (p < 45) return 'var(--color-loss)';
    return 'var(--color-text-secondary)';
  };

  const fmtProb = (p) => p !== null ? `${p}%` : '--';

  return (
    <Modal isOpen={isOpen} onClose={null} maxWidth={1000} zIndex={1400}>
      <ModalBody style={{ maxHeight: '95vh', overflow: 'hidden', padding: 0 }}>
        <div style={S.container}>
          {/* Playoff context */}
          {playoffContext && (
            <div style={S.contextBanner}>{playoffContext}</div>
          )}

          {/* Scoreboard */}
          <div style={S.scoreboard}>
            <div style={S.scoreRow}>
              <div style={S.teamScore}>
                <div style={{ ...S.teamLabel, color: 'var(--color-away)' }}>AWAY</div>
                <div style={S.teamName}>{awayName}</div>
                <div ref={awayScoreRef} style={S.score}>0</div>
              </div>
              <div style={S.clockArea}>
                <div ref={clockRef} style={S.clock}>Q1 12:00</div>
                <div ref={quarterScoresRef} style={S.quarterScores} />
              </div>
              <div style={S.teamScore}>
                <div style={{ ...S.teamLabel, color: 'var(--color-home)' }}>HOME</div>
                <div style={S.teamName}>{homeName}</div>
                <div ref={homeScoreRef} style={{ ...S.score, color: 'var(--color-home)' }}>0</div>
              </div>
            </div>

            {/* Momentum */}
            <div style={S.momentumRow}>
              <span style={S.momentumLabel}>AWY</span>
              <div style={S.momentumTrack}>
                <div ref={momentumRef} style={S.momentumBar} />
              </div>
              <span style={S.momentumLabel}>HME</span>
            </div>

            {/* ── Win Probability ── */}
            <div style={S.winProbStrip}>
              {/* Header: title left, live numbers right aligned to scoreboard */}
              <div style={S.winProbHeader}>
                <span style={S.winProbTitle}>Win Probability</span>
                <div style={S.winProbNumbers}>
                  <span style={{ ...S.winProbPct, color: probColor(awayProb) }}>{fmtProb(awayProb)}</span>
                  <span style={S.winProbTeamLabel}>{awayName}</span>
                  <span style={S.winProbDivider}>·</span>
                  <span style={S.winProbTeamLabel}>{homeName}</span>
                  <span style={{ ...S.winProbPct, color: probColor(homeProb) }}>{fmtProb(homeProb)}</span>
                </div>
              </div>

              {/* SVG chart */}
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H + 20}`}
                preserveAspectRatio="none"
                style={{ width: '100%', height: CHART_H + 20, display: 'block' }}
              >
                {/* Quarter boundary lines */}
                {[720, 1440, 2160].map((s, i) => (
                  <line key={i}
                    x1={elapsedToX(s)} y1={0}
                    x2={elapsedToX(s)} y2={CHART_H}
                    stroke="#E8E7E3" strokeWidth={1} strokeDasharray="3,3"
                  />
                ))}

                {/* 50% baseline */}
                <line
                  x1={0} y1={CHART_H / 2}
                  x2={CHART_W} y2={CHART_H / 2}
                  stroke="#E8E7E3" strokeWidth={1.5}
                />

                {/* Probability line — color-segmented */}
                {segments.map((seg, i) => (
                  <polyline key={i}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={seg.points
                      .map(p => `${elapsedToX(p.elapsedSeconds).toFixed(1)},${probToY(p.prob).toFixed(1)}`)
                      .join(' ')}
                  />
                ))}

                {/* Current position cursor */}
                {cursorX !== null && (
                  <>
                    <line
                      x1={cursorX} y1={2} x2={cursorX} y2={CHART_H - 2}
                      stroke="#1B4D3E" strokeWidth={1.5} strokeDasharray="2,3" opacity={0.45}
                    />
                    <circle cx={cursorX} cy={cursorY} r={3.5} fill="#1B4D3E" />
                  </>
                )}

                {/* X-axis minute labels */}
                {[
                  { s: 0,    label: '0' },
                  { s: 720,  label: 'Q2' },
                  { s: 1440, label: 'Q3' },
                  { s: 2160, label: 'Q4' },
                  { s: 2880, label: '48' },
                ].map(({ s, label }) => (
                  <text key={label}
                    x={elapsedToX(s)} y={CHART_H + 14}
                    fontSize={9} fill="#A0A09A"
                    fontFamily="DM Sans, sans-serif"
                    textAnchor="middle"
                  >{label}</text>
                ))}

                {/* Y-axis orientation labels — Away top, Home bottom, mirrored both sides */}
                <text x={5}           y={11}          fontSize={9} fill="#A0A09A" fontFamily="DM Sans, sans-serif" textAnchor="start">Away</text>
                <text x={5}           y={CHART_H - 3} fontSize={9} fill="#A0A09A" fontFamily="DM Sans, sans-serif" textAnchor="start">Home</text>
                <text x={CHART_W - 5} y={11}          fontSize={9} fill="#A0A09A" fontFamily="DM Sans, sans-serif" textAnchor="end">Away</text>
                <text x={CHART_W - 5} y={CHART_H - 3} fontSize={9} fill="#A0A09A" fontFamily="DM Sans, sans-serif" textAnchor="end">Home</text>
              </svg>
            </div>
          </div>

          {/* Speed controls */}
          <div style={S.controls}>
            <span style={S.controlLabel}>Speed</span>
            {[1, 3, 10, 999].map(s => (
              <button key={s} onClick={() => handleSpeed(s)} style={{
                ...S.controlBtn,
                background: speed === s ? 'var(--color-accent)' : 'transparent',
                color: speed === s ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                fontWeight: speed === s ? 600 : 400,
              }}>
                {s === 999 ? 'Max' : `${s}x`}
              </button>
            ))}
            <div style={S.controlDivider} />
            <button onClick={handlePause} style={{
              ...S.controlBtn,
              background: paused ? 'var(--color-win)' : 'transparent',
              color: paused ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}>
              {paused ? 'Play' : 'Pause'}
            </button>
            <button onClick={() => window.watchGameSkip?.()} style={S.controlBtn}>
              Skip
            </button>
          </div>

          {/* Main: play-by-play + leaders */}
          <div style={S.mainArea}>
            <div style={S.playsPanel}>
              <div style={S.panelHeader}>Play-by-Play</div>
              <div ref={playsRef} style={S.playsFeed} />
            </div>
            <div style={S.leadersPanel}>
              <div style={S.panelHeader}>Leaders</div>
              <div ref={leadersRef} style={S.leadersFeed} />
            </div>
          </div>

          {/* Game over */}
          {gameOver && (
            <div style={S.gameOverBar}>
              {finalData && (
                <div style={S.finalText}>
                  <span style={{ color: finalData.won ? 'var(--color-win)' : 'var(--color-loss)' }}>
                    {finalData.won ? 'VICTORY' : 'DEFEAT'}
                  </span>
                  {' — FINAL'}{finalData.isOvertime ? ' (OT)' : ''}: {finalData.awayScore} – {finalData.homeScore}
                </div>
              )}
              <Button variant="primary" onClick={() => window.watchGameClose?.()}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}

const S = {
  container: {
    display: 'flex', flexDirection: 'column', height: '90vh',
    background: 'var(--color-bg)', color: 'var(--color-text)',
    fontFamily: 'var(--font-body)',
  },
  contextBanner: {
    textAlign: 'center', padding: '6px',
    background: 'var(--color-accent-bg)', color: 'var(--color-accent)',
    fontSize: 'var(--text-xs)', fontWeight: 600,
    borderBottom: '1px solid var(--color-accent-border)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  scoreboard: {
    background: 'var(--color-bg-raised)', padding: '20px 24px 0',
    borderBottom: '1px solid var(--color-border)', flexShrink: 0,
  },
  scoreRow: {
    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 48,
  },
  teamScore: { textAlign: 'center', minWidth: 160 },
  teamLabel: { fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 2 },
  teamName: { fontSize: 'var(--text-md)', fontWeight: 600, marginBottom: 4 },
  score: { fontSize: 48, fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-mono)' },
  clockArea: { textAlign: 'center' },
  clock: { fontSize: 18, fontWeight: 700, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' },
  quarterScores: { fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 4 },
  momentumRow: {
    marginTop: 12, marginBottom: 12,
    display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
  },
  momentumLabel: { fontSize: 10, color: 'var(--color-text-tertiary)' },
  momentumTrack: {
    width: 200, height: 3, background: 'var(--color-bg-sunken)',
    position: 'relative', overflow: 'hidden',
  },
  momentumBar: {
    position: 'absolute', top: 0, height: '100%',
    background: 'var(--color-accent)', transition: 'left 0.3s, width 0.3s',
    left: '50%', width: 0,
  },
  winProbStrip: {
    borderTop: '1px solid var(--color-border-subtle)',
    paddingTop: 10,
  },
  winProbHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 6, paddingLeft: 4, paddingRight: 4,
  },
  winProbTitle: {
    fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
    letterSpacing: '0.08em', color: 'var(--color-text-tertiary)',
  },
  winProbNumbers: {
    display: 'flex', alignItems: 'center', gap: 5,
  },
  winProbPct: {
    fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)',
  },
  winProbTeamLabel: {
    fontSize: 10, color: 'var(--color-text-tertiary)',
  },
  winProbDivider: {
    fontSize: 11, color: 'var(--color-border)', margin: '0 3px',
  },
  controls: {
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    gap: 4, padding: '8px 24px',
    borderBottom: '1px solid var(--color-border-subtle)', flexShrink: 0,
  },
  controlLabel: {
    fontSize: 10, color: 'var(--color-text-tertiary)', textTransform: 'uppercase',
    letterSpacing: '0.06em', marginRight: 8,
  },
  controlBtn: {
    padding: '4px 12px', border: 'none',
    background: 'transparent', color: 'var(--color-text-secondary)',
    cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-body)',
    transition: 'all 100ms ease',
  },
  controlDivider: { width: 1, height: 14, background: 'var(--color-border)', margin: '0 6px' },
  mainArea: {
    flex: 1, display: 'grid', gridTemplateColumns: '1fr 240px', overflow: 'hidden',
  },
  playsPanel: {
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    borderRight: '1px solid var(--color-border-subtle)',
  },
  panelHeader: {
    padding: '8px 12px', fontWeight: 600, fontSize: 10,
    color: 'var(--color-text-tertiary)',
    borderBottom: '1px solid var(--color-border-subtle)',
    flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  playsFeed: { flex: 1, overflowY: 'auto', padding: '4px 0' },
  leadersPanel: { display: 'flex', flexDirection: 'column', flexShrink: 0 },
  leadersFeed: { flex: 1, overflowY: 'auto', padding: '8px 12px' },
  gameOverBar: {
    padding: '16px 20px', textAlign: 'center',
    background: 'var(--color-bg-raised)',
    borderTop: '2px solid var(--color-accent)', flexShrink: 0,
  },
  finalText: { fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: 'var(--font-mono)' },
};
