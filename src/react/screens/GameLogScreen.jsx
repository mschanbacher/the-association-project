import React, { useState, useMemo } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Card } from '../components/Card.jsx';

/**
 * GameLogScreen - Shows all regular season games with expandable box scores
 * 
 * Design standards:
 * - Zero border-radius
 * - No emoji
 * - DM Sans + JetBrains Mono
 * - 8px spacing rhythm
 */

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pctFmt(m, a) {
  if (!a || a === 0) return '—';
  return ((m / a) * 100).toFixed(1);
}

// Game Score (Hollinger)
const ORB_RATE = { PG: 0.06, SG: 0.08, SF: 0.12, PF: 0.22, C: 0.28 };
function calcGameScore(p) {
  const orbRate = ORB_RATE[p.pos] || 0.10;
  const orb = Math.round((p.reb || 0) * orbRate);
  const drb = (p.reb || 0) - orb;
  return (
    (p.pts || 0) * 1.0 +
    (p.fgm || 0) * 0.4 -
    (p.fga || 0) * 0.7 -
    ((p.fta || 0) - (p.ftm || 0)) * 0.4 +
    orb * 0.7 +
    drb * 0.3 +
    (p.stl || 0) * 1.0 +
    (p.ast || 0) * 0.7 +
    (p.blk || 0) * 0.7 -
    (p.pf || 0) * 0.4 -
    (p.to || 0) * 1.0
  );
}

function gmScColor(score) {
  if (score >= 25) return 'var(--color-rating-elite)';
  if (score >= 15) return 'var(--color-rating-good)';
  if (score >= 8) return 'var(--color-text-secondary)';
  if (score >= 3) return 'var(--color-text-tertiary)';
  return 'var(--color-rating-below)';
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function GameLogScreen() {
  const { gameState, isReady } = useGame();
  const [expandedGame, setExpandedGame] = useState(null);

  // Get user's games from schedule
  const games = useMemo(() => {
    if (!isReady || !gameState?.schedule || !gameState?.userTeamId) return [];
    
    const userTeamId = gameState.userTeamId;
    const allTeams = [
      ...(gameState.tier1Teams || []),
      ...(gameState.tier2Teams || []),
      ...(gameState.tier3Teams || []),
    ];
    
    // Find all played games involving user's team
    const userGames = (gameState.schedule || [])
      .filter(g => g.played && (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId))
      .map(g => {
        const isHome = g.homeTeamId === userTeamId;
        const oppTeamId = isHome ? g.awayTeamId : g.homeTeamId;
        const oppTeam = allTeams.find(t => t.id === oppTeamId);
        
        const userScore = isHome ? g.homeScore : g.awayScore;
        const oppScore = isHome ? g.awayScore : g.homeScore;
        const userWon = userScore > oppScore;
        
        return {
          id: g.id || `${g.date}-${g.homeTeamId}-${g.awayTeamId}`,
          date: g.date,
          opponent: oppTeam || { name: 'Unknown', city: '', abbreviation: '???' },
          isHome,
          userScore,
          oppScore,
          userWon,
          boxScore: g.boxScore || null,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Chronological order
    
    return userGames;
  }, [isReady, gameState]);

  const userTeam = useMemo(() => {
    if (!gameState?.userTeamId) return null;
    const allTeams = [
      ...(gameState.tier1Teams || []),
      ...(gameState.tier2Teams || []),
      ...(gameState.tier3Teams || []),
    ];
    return allTeams.find(t => t.id === gameState.userTeamId);
  }, [gameState]);

  if (!isReady || !gameState) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', color: 'var(--color-text-tertiary)',
      }}>
        Loading game log…
      </div>
    );
  }

  const wins = games.filter(g => g.userWon).length;
  const losses = games.filter(g => !g.userWon).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ 
          fontSize: 'var(--text-lg)', 
          fontWeight: 'var(--weight-bold)', 
          margin: 0,
          color: 'var(--color-text)',
        }}>
          Game Log
        </h2>
        <div style={{ 
          fontSize: 'var(--text-sm)', 
          color: 'var(--color-text-tertiary)', 
          marginTop: 4,
          fontFamily: 'var(--font-mono)',
        }}>
          {wins}–{losses} · {games.length} games played
        </div>
      </div>

      {/* Game List */}
      {games.length === 0 ? (
        <Card>
          <div style={{ 
            textAlign: 'center', 
            padding: 'var(--space-6)', 
            color: 'var(--color-text-tertiary)',
          }}>
            No games played yet
          </div>
        </Card>
      ) : (
        <Card padding="none">
          {/* Column Headers */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '64px 1fr 56px 72px',
            padding: '8px 16px',
            borderBottom: '1px solid var(--color-border)',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semi)',
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <div>Date</div>
            <div>Opponent</div>
            <div style={{ textAlign: 'center' }}>Result</div>
            <div style={{ textAlign: 'right' }}>Score</div>
          </div>

          {/* Game Rows */}
          {games.map((game) => (
            <div key={game.id}>
              {/* Clickable Row */}
              <div
                onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '64px 1fr 56px 72px',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                  background: expandedGame === game.id ? 'var(--color-bg-sunken)' : 'transparent',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => {
                  if (expandedGame !== game.id) e.currentTarget.style.background = 'var(--color-bg-sunken)';
                }}
                onMouseLeave={(e) => {
                  if (expandedGame !== game.id) e.currentTarget.style.background = 'transparent';
                }}
              >
                {/* Date */}
                <div style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: 'var(--text-sm)', 
                  color: 'var(--color-text-secondary)',
                }}>
                  {formatDate(game.date)}
                </div>

                {/* Opponent */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ 
                    fontSize: 'var(--text-xs)', 
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    width: 16,
                  }}>
                    {game.isHome ? 'vs' : '@'}
                  </span>
                  <span style={{ 
                    fontSize: 'var(--text-base)', 
                    fontWeight: 'var(--weight-medium)', 
                    color: 'var(--color-text)',
                  }}>
                    {game.opponent.city} {game.opponent.name}
                  </span>
                </div>

                {/* Result Badge */}
                <div style={{ textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 'var(--weight-bold)',
                    fontFamily: 'var(--font-mono)',
                    background: game.userWon ? 'var(--color-win-bg)' : 'var(--color-loss-bg)',
                    color: game.userWon ? 'var(--color-win)' : 'var(--color-loss)',
                  }}>
                    {game.userWon ? 'W' : 'L'}
                  </span>
                </div>

                {/* Score */}
                <div style={{ 
                  textAlign: 'right', 
                  fontFamily: 'var(--font-mono)', 
                  fontSize: 'var(--text-base)',
                  fontWeight: 'var(--weight-semi)',
                  color: 'var(--color-text)',
                }}>
                  {game.userScore}–{game.oppScore}
                </div>
              </div>

              {/* Expanded Box Score */}
              {expandedGame === game.id && (
                <div style={{ 
                  padding: '16px', 
                  background: 'var(--color-bg-sunken)', 
                  borderBottom: '1px solid var(--color-border)',
                }}>
                  {game.boxScore ? (
                    <BoxScoreExpanded 
                      data={game.boxScore} 
                      userTeamName={userTeam?.name}
                      userTeamCity={userTeam?.city}
                    />
                  ) : (
                    <div style={{ 
                      textAlign: 'center', 
                      padding: 'var(--space-4)', 
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--text-sm)',
                    }}>
                      Box score not available for this game
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── Box Score Expanded ────────────────────────────────────────────────────────
function BoxScoreExpanded({ data, userTeamName, userTeamCity }) {
  const { home, away, quarterScores } = data;
  
  // Determine which team is user's team
  const isUserHome = (home.name === userTeamName) || 
    (home.city === userTeamCity && home.name === userTeamName);
  const userTeam = isUserHome ? home : away;
  const oppTeam = isUserHome ? away : home;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Scoreboard */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 32, 
        padding: '4px 0',
      }}>
        <ScoreBlock team={away} isWinner={away.score > home.score} />
        <div style={{ 
          fontSize: 'var(--text-sm)', 
          color: 'var(--color-text-tertiary)', 
          fontWeight: 'var(--weight-semi)',
        }}>
          FINAL
        </div>
        <ScoreBlock team={home} isWinner={home.score > away.score} />
      </div>

      {/* Quarter Scores */}
      {quarterScores && quarterScores.home && (
        <QuarterTable home={home} away={away} quarterScores={quarterScores} />
      )}

      {/* Team Box Scores - User's team first */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <TeamBoxTable team={userTeam} isUserTeam={true} />
        <TeamBoxTable team={oppTeam} isUserTeam={false} />
      </div>
    </div>
  );
}

function ScoreBlock({ team, isWinner }) {
  const teamLabel = team.city && team.name 
    ? `${team.city} ${team.name}` 
    : (team.teamName || team.name || 'Team');
  
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ 
        fontSize: 'var(--text-sm)', 
        color: 'var(--color-text-secondary)', 
        marginBottom: 2,
      }}>
        {teamLabel}
      </div>
      <div style={{
        fontSize: 32,
        fontWeight: 'var(--weight-bold)',
        fontFamily: 'var(--font-mono)',
        lineHeight: 1,
        color: isWinner ? 'var(--color-text)' : 'var(--color-text-tertiary)',
      }}>
        {team.score}
      </div>
    </div>
  );
}

function QuarterTable({ home, away, quarterScores }) {
  const periods = quarterScores.home?.length || 4;
  
  const getTeamLabel = (team) => {
    if (team.city && team.name) return `${team.city} ${team.name}`;
    return team.teamName || team.name || 'Team';
  };
  
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <table style={{ 
        borderCollapse: 'collapse', 
        fontSize: 'var(--text-xs)', 
        fontFamily: 'var(--font-mono)',
      }}>
        <thead>
          <tr style={{ color: 'var(--color-text-tertiary)' }}>
            <th style={{ padding: '3px 10px', textAlign: 'left' }}></th>
            {Array.from({ length: periods }, (_, i) => (
              <th key={i} style={{ padding: '3px 10px', textAlign: 'center' }}>
                {i < 4 ? `Q${i + 1}` : `OT${i - 3}`}
              </th>
            ))}
            <th style={{ padding: '3px 10px', textAlign: 'center', fontWeight: 'var(--weight-bold)' }}>F</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '3px 10px', color: 'var(--color-text-secondary)' }}>
              {getTeamLabel(away)}
            </td>
            {(quarterScores.away || []).map((q, i) => (
              <td key={i} style={{ padding: '3px 10px', textAlign: 'center' }}>{q}</td>
            ))}
            <td style={{ padding: '3px 10px', textAlign: 'center', fontWeight: 'var(--weight-bold)' }}>
              {away.score}
            </td>
          </tr>
          <tr>
            <td style={{ padding: '3px 10px', color: 'var(--color-text-secondary)' }}>
              {getTeamLabel(home)}
            </td>
            {(quarterScores.home || []).map((q, i) => (
              <td key={i} style={{ padding: '3px 10px', textAlign: 'center' }}>{q}</td>
            ))}
            <td style={{ padding: '3px 10px', textAlign: 'center', fontWeight: 'var(--weight-bold)' }}>
              {home.score}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function TeamBoxTable({ team, isUserTeam }) {
  const players = team.players || [];
  const starters = players.filter(p => p.starter);
  const bench = players.filter(p => !p.starter);

  const topScorer = players.reduce((best, p) => 
    (p.pts || 0) > (best.pts || 0) ? p : best, { pts: -1 }
  );

  const totals = players.reduce((t, p) => ({
    pts: t.pts + (p.pts || 0),
    reb: t.reb + (p.reb || 0),
    ast: t.ast + (p.ast || 0),
    stl: t.stl + (p.stl || 0),
    blk: t.blk + (p.blk || 0),
    to: t.to + (p.to || 0),
    fgm: t.fgm + (p.fgm || 0),
    fga: t.fga + (p.fga || 0),
    tpm: t.tpm + (p.tpm || 0),
    tpa: t.tpa + (p.tpa || 0),
    ftm: t.ftm + (p.ftm || 0),
    fta: t.fta + (p.fta || 0),
  }), { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, to: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0 });

  const teamLabel = team.city && team.name 
    ? `${team.city} ${team.name}` 
    : (team.teamName || team.name || 'Team');

  const cellStyle = { padding: '4px 6px', textAlign: 'center' };
  const leftCellStyle = { ...cellStyle, textAlign: 'left' };

  return (
    <div>
      {/* Team Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 6,
        borderBottom: '2px solid var(--color-border)',
        marginBottom: 4,
      }}>
        <div style={{ 
          fontWeight: 'var(--weight-bold)', 
          fontSize: 'var(--text-base)', 
          color: isUserTeam ? 'var(--color-accent)' : 'var(--color-text)',
        }}>
          {teamLabel} — {team.score}
        </div>
        <div style={{
          display: 'flex',
          gap: 12,
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          <span>FG {totals.fgm}–{totals.fga} ({pctFmt(totals.fgm, totals.fga)})</span>
          <span>3P {totals.tpm}–{totals.tpa} ({pctFmt(totals.tpm, totals.tpa)})</span>
          <span>FT {totals.ftm}–{totals.fta} ({pctFmt(totals.ftm, totals.fta)})</span>
        </div>
      </div>

      {/* Stats Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--text-xs)',
          fontFamily: 'var(--font-mono)',
          whiteSpace: 'nowrap',
        }}>
          <thead>
            <tr style={{ 
              color: 'var(--color-text-tertiary)',
              borderBottom: '1px solid var(--color-border-subtle)',
            }}>
              <th style={{ ...leftCellStyle, fontWeight: 'var(--weight-semi)' }}>Player</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>MIN</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)', color: 'var(--color-rating-good)' }}>GmSc</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-bold)' }}>PTS</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>REB</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>AST</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>STL</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>BLK</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>TO</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>FG</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>FG%</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>3PT</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>3P%</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>FT</th>
              <th style={{ ...cellStyle, fontWeight: 'var(--weight-semi)' }}>+/-</th>
            </tr>
          </thead>
          <tbody>
            {starters.map((p, i) => (
              <PlayerRow key={i} p={p} isTopScorer={p.name === topScorer.name} />
            ))}
            {bench.length > 0 && (
              <tr>
                <td colSpan={15} style={{
                  padding: '5px 6px 3px',
                  fontSize: 'var(--text-xs)',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--color-text-tertiary)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}>
                  Bench
                </td>
              </tr>
            )}
            {bench.map((p, i) => (
              <PlayerRow key={`b${i}`} p={p} isTopScorer={p.name === topScorer.name} />
            ))}
            {/* Totals Row */}
            <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 'var(--weight-bold)' }}>
              <td style={leftCellStyle}>TOTAL</td>
              <td style={cellStyle}></td>
              <td style={cellStyle}></td>
              <td style={cellStyle}>{totals.pts}</td>
              <td style={cellStyle}>{totals.reb}</td>
              <td style={cellStyle}>{totals.ast}</td>
              <td style={cellStyle}>{totals.stl}</td>
              <td style={cellStyle}>{totals.blk}</td>
              <td style={cellStyle}>{totals.to}</td>
              <td style={cellStyle}>{totals.fgm}–{totals.fga}</td>
              <td style={cellStyle}>{pctFmt(totals.fgm, totals.fga)}</td>
              <td style={cellStyle}>{totals.tpm}–{totals.tpa}</td>
              <td style={cellStyle}>{pctFmt(totals.tpm, totals.tpa)}</td>
              <td style={cellStyle}>{totals.ftm}–{totals.fta}</td>
              <td style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayerRow({ p, isTopScorer }) {
  const gameScore = calcGameScore(p);
  const pm = p.pm || 0;
  const pmColor = pm > 0 ? 'var(--color-win)' : pm < 0 ? 'var(--color-loss)' : 'var(--color-text-tertiary)';
  const pmLabel = pm > 0 ? `+${pm}` : `${pm}`;

  const cellStyle = { padding: '4px 6px', textAlign: 'center' };
  const leftCellStyle = { ...cellStyle, textAlign: 'left' };

  return (
    <tr style={{
      borderBottom: '1px solid var(--color-border-subtle)',
      background: isTopScorer ? 'var(--color-accent-bg)' : 'transparent',
    }}>
      <td style={leftCellStyle}>
        <span style={{ fontWeight: 'var(--weight-medium)', fontFamily: 'var(--font-body)' }}>
          {p.name}
        </span>
        {' '}
        <span style={{ color: 'var(--color-text-tertiary)' }}>{p.pos}</span>
      </td>
      <td style={cellStyle}>{p.min}</td>
      <td style={{ ...cellStyle, fontWeight: 'var(--weight-semi)', color: gmScColor(gameScore) }}>
        {gameScore.toFixed(1)}
      </td>
      <td style={{ ...cellStyle, fontWeight: 'var(--weight-bold)' }}>{p.pts}</td>
      <td style={cellStyle}>{p.reb}</td>
      <td style={cellStyle}>{p.ast}</td>
      <td style={cellStyle}>{p.stl}</td>
      <td style={cellStyle}>{p.blk}</td>
      <td style={cellStyle}>{p.to}</td>
      <td style={cellStyle}>{p.fgm}–{p.fga}</td>
      <td style={cellStyle}>{pctFmt(p.fgm, p.fga)}</td>
      <td style={cellStyle}>{p.tpm}–{p.tpa}</td>
      <td style={cellStyle}>{pctFmt(p.tpm, p.tpa)}</td>
      <td style={cellStyle}>{p.ftm}–{p.fta}</td>
      <td style={{ ...cellStyle, fontWeight: 'var(--weight-semi)', color: pmColor }}>{pmLabel}</td>
    </tr>
  );
}

export default GameLogScreen;
