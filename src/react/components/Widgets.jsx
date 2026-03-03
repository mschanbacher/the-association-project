import React from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Card, CardHeader, CardValue, CardSubtext } from './Card.jsx';
import { Badge, RatingBadge, TierBadge } from './Badge.jsx';

/* ═══════════════════════════════════════════════════════════════
   Team Summary Widget
   ═══════════════════════════════════════════════════════════════ */
export function TeamSummaryWidget() {
  const { gameState, engines } = useGame();
  if (!gameState?.userTeam) return null;

  const { userTeam, currentTier, gamesPlayed, totalGames } = gameState;
  const { LeagueManager, SalaryCapEngine, FinanceEngine, CoachEngine } = engines;

  const strength = LeagueManager?.calculateTeamStrength?.(userTeam) || 0;
  FinanceEngine?.ensureFinances?.(userTeam);
  const capSpace = SalaryCapEngine?.getRemainingCap?.(userTeam) || 0;
  const effCap = SalaryCapEngine?.getEffectiveCap?.(userTeam) || 0;

  const coach = userTeam.coach;

  // Win percentage
  const totalPlayed = userTeam.wins + userTeam.losses;
  const pct = totalPlayed > 0 ? ((userTeam.wins / totalPlayed) * 100).toFixed(1) : '—';

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>Team Overview</CardHeader>

      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        <span style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
        }}>
          {userTeam.name}
        </span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 'var(--space-4)',
      }}>
        <MiniStat
          label="Record"
          value={`${userTeam.wins}–${userTeam.losses}`}
          sub={`${pct}% · ${gamesPlayed}/${totalGames} games`}
          color={userTeam.wins > userTeam.losses ? 'var(--color-win)' :
                 userTeam.wins < userTeam.losses ? 'var(--color-loss)' : undefined}
        />
        <MiniStat
          label="Strength"
          value={`${Math.round(strength)}`}
          sub="Team Rating"
          color={ratingColor(strength)}
        />
        <MiniStat
          label="Cap Space"
          value={formatCurrencyShort(capSpace)}
          sub={`of ${formatCurrencyShort(effCap)}`}
          color={capSpace > 0 ? 'var(--color-win)' : 'var(--color-loss)'}
        />
        <MiniStat
          label="Coach"
          value={coach ? coach.name.split(' ').pop() : 'None'}
          sub={coach ? `${coach.overall} OVR · ${coach.archetype}` : 'Click to hire'}
          color={coach ? ratingColor(coach.overall) : 'var(--color-loss)'}
        />
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Next Game Widget
   ═══════════════════════════════════════════════════════════════ */
export function NextGameWidget() {
  const { gameState, engines } = useGame();
  if (!gameState?.userTeam) return null;

  const { userTeam, schedule, currentTier } = gameState;
  const { LeagueManager } = engines;

  // Find next unplayed game
  const nextGame = schedule?.find(g =>
    !g.played && (g.home === userTeam.id || g.away === userTeam.id)
  );

  if (!nextGame) {
    return (
      <Card padding="lg" className="animate-slide-up">
        <CardHeader>Next Game</CardHeader>
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-6) 0',
          color: 'var(--color-text-tertiary)',
        }}>
          Season complete
        </div>
      </Card>
    );
  }

  const isHome = nextGame.home === userTeam.id;
  const opponentId = isHome ? nextGame.away : nextGame.home;
  const teams = currentTier === 1 ? gameState.tier1Teams :
                currentTier === 2 ? gameState.tier2Teams : gameState.tier3Teams;
  const opponent = teams.find(t => t.id === opponentId);
  const oppStrength = opponent ? Math.round(LeagueManager?.calculateTeamStrength?.(opponent) || 0) : '?';

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>Next Game</CardHeader>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Your team */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-1)',
          }}>
            {userTeam.name}
          </div>
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            {userTeam.wins}–{userTeam.losses}
          </div>
        </div>

        {/* VS */}
        <div style={{
          padding: '0 var(--space-4)',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-semi)',
            color: 'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            {isHome ? 'HOME' : 'AWAY'}
          </div>
          <div style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            color: 'var(--color-text-tertiary)',
            margin: 'var(--space-1) 0',
          }}>
            vs
          </div>
          {nextGame.date && (
            <div style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
            }}>
              {nextGame.date}
            </div>
          )}
        </div>

        {/* Opponent */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--weight-bold)',
            marginBottom: 'var(--space-1)',
          }}>
            {opponent?.city || 'TBD'}
          </div>
          <div style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text-secondary)',
          }}>
            {opponent ? `${opponent.wins}–${opponent.losses}` : '—'} · {oppStrength} STR
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Standings Snapshot Widget
   ═══════════════════════════════════════════════════════════════ */
export function StandingsWidget() {
  const { gameState, engines } = useGame();
  if (!gameState?.userTeam) return null;

  const { currentTier, userTeam } = gameState;
  const { LeagueManager } = engines;

  const teams = currentTier === 1 ? gameState.tier1Teams :
                currentTier === 2 ? gameState.tier2Teams : gameState.tier3Teams;

  // Filter to user's division
  const divisionTeams = teams.filter(t => t.division === userTeam.division);

  // Sort standings
  const sorted = LeagueManager?.sortTeamsByStandings
    ? LeagueManager.sortTeamsByStandings([...divisionTeams], gameState.schedule)
    : [...divisionTeams].sort((a, b) => (b.wins - b.losses) - (a.wins - a.losses));

  // Find user's position
  const userIdx = sorted.findIndex(t => t.id === userTeam.id);

  // Show all division teams
  const visible = sorted;

  return (
    <Card padding="none" className="animate-slide-up" style={{ gridColumn: 'span 2' }}>
      <div style={{ padding: 'var(--space-4) var(--space-5) var(--space-3)' }}>
        <CardHeader action={
          <button
            onClick={() => window._reactNavigate?.('standings')}
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--color-accent)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
            }}
          >
            Full Standings →
          </button>
        }>
          {userTeam.division} Division
        </CardHeader>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 'var(--text-sm)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          <thead>
            <tr style={{
              borderBottom: '1px solid var(--color-border)',
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <th style={{ ...thStyle, paddingLeft: 'var(--space-5)', width: 40, textAlign: 'center' }}>#</th>
              <th style={{ ...thStyle, textAlign: 'left' }}>Team</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>W</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>L</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>PCT</th>
              <th style={{ ...thStyle, textAlign: 'center', paddingRight: 'var(--space-5)' }}>GB</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((team, i) => {
              const rank = i + 1;
              const isUser = team.id === userTeam.id;
              const totalPlayed = team.wins + team.losses;
              const pct = totalPlayed > 0 ? (team.wins / totalPlayed).toFixed(3).slice(1) : '.000';
              const leaderWins = sorted[0].wins;
              const leaderLosses = sorted[0].losses;
              const gb = rank === 1 ? '—' :
                ((leaderWins - team.wins + team.losses - leaderLosses) / 2).toFixed(1);

              return (
                <tr key={team.id} style={{
                  borderBottom: '1px solid var(--color-border-subtle)',
                  background: isUser ? 'var(--color-accent-light)' : 'transparent',
                  fontWeight: isUser ? 'var(--weight-semi)' : 'var(--weight-normal)',
                  transition: 'background var(--duration-fast) ease',
                }}>
                  <td style={{
                    padding: '8px var(--space-3)',
                    paddingLeft: 'var(--space-5)',
                    textAlign: 'center',
                    color: 'var(--color-text-tertiary)',
                    fontSize: 'var(--text-xs)',
                  }}>
                    {rank}
                  </td>
                  <td style={{
                    padding: '8px var(--space-3)',
                    color: isUser ? 'var(--color-accent)' : 'var(--color-text)',
                  }}>
                    {team.name}
                  </td>
                  <td style={{ ...tdCenter, color: 'var(--color-win)' }}>{team.wins}</td>
                  <td style={{ ...tdCenter, color: 'var(--color-loss)' }}>{team.losses}</td>
                  <td style={tdCenter}>{pct}</td>
                  <td style={{
                    ...tdCenter,
                    paddingRight: 'var(--space-5)',
                    color: 'var(--color-text-tertiary)',
                  }}>
                    {gb}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Recent Activity Widget
   ═══════════════════════════════════════════════════════════════ */
export function RecentActivityWidget() {
  const { gameState } = useGame();
  if (!gameState?.userTeam) return null;

  const { tradeHistory, userTeam } = gameState;

  // Get last 5 trades
  const recentTrades = (tradeHistory || []).slice(-5).reverse();

  return (
    <Card padding="lg" className="animate-slide-up">
      <CardHeader>Recent Transactions</CardHeader>

      {recentTrades.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-4) 0',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
        }}>
          No transactions yet this season
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {recentTrades.map((trade, i) => {
            const t1Name = trade.team1?.name || trade.team1Name || 'Team';
            const t2Name = trade.team2?.name || trade.team2Name || 'Team';
            const t1Id = trade.team1?.id ?? trade.team1Id;
            const t2Id = trade.team2?.id ?? trade.team2Id;
            const t1Gave = trade.team1Gave || [];
            const t2Gave = trade.team2Gave || [];
            const isUserTrade = t1Id === userTeam.id || t2Id === userTeam.id;

            return (
              <div key={i} style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: isUserTrade ? 'var(--color-accent-light)' : 'var(--color-bg-sunken)',
                border: isUserTrade ? '1px solid var(--color-accent-subtle)' : '1px solid var(--color-border-subtle)',
              }}>
                {/* Header: Team ↔ Team + date */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 'var(--space-2)',
                }}>
                  <div style={{
                    fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)',
                  }}>
                    {t1Name} ↔ {t2Name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {isUserTrade && <Badge variant="accent">Your Team</Badge>}
                    {trade.date && (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                        {trade.date}
                      </span>
                    )}
                  </div>
                </div>

                {/* Trade details */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                  gap: 'var(--space-2)', alignItems: 'start',
                  fontSize: 'var(--text-xs)',
                }}>
                  {/* Team 1 sends */}
                  <div>
                    <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      {t1Name.split(' ').pop()} send:
                    </div>
                    {t1Gave.map((p, j) => (
                      <div key={j} style={{ color: 'var(--color-text-secondary)' }}>
                        {p.name} <span style={{ color: 'var(--color-text-tertiary)' }}>({p.position} {p.rating})</span>
                      </div>
                    ))}
                    {t1Gave.length === 0 && <div style={{ color: 'var(--color-text-tertiary)' }}>—</div>}
                  </div>

                  {/* Arrow */}
                  <div style={{
                    color: 'var(--color-text-tertiary)', alignSelf: 'center',
                    fontSize: 'var(--text-sm)', padding: '0 var(--space-1)',
                  }}>
                    ⇄
                  </div>

                  {/* Team 2 sends */}
                  <div>
                    <div style={{ color: 'var(--color-text-tertiary)', marginBottom: 2 }}>
                      {t2Name.split(' ').pop()} send:
                    </div>
                    {t2Gave.map((p, j) => (
                      <div key={j} style={{ color: 'var(--color-text-secondary)' }}>
                        {p.name} <span style={{ color: 'var(--color-text-tertiary)' }}>({p.position} {p.rating})</span>
                      </div>
                    ))}
                    {t2Gave.length === 0 && <div style={{ color: 'var(--color-text-tertiary)' }}>—</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Roster Quick Look Widget
   ═══════════════════════════════════════════════════════════════ */
export function RosterQuickWidget() {
  const { gameState, engines } = useGame();
  if (!gameState?.userTeam) return null;

  const { userTeam } = gameState;
  const roster = userTeam.roster || [];

  // Top 5 players by rating
  const topPlayers = [...roster]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  return (
    <Card padding="lg" className="animate-slide-up"
      interactive onClick={() => window.openRosterManagementHub?.()}>
      <CardHeader action={
        <span style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-accent)',
          fontWeight: 'var(--weight-medium)',
        }}>
          View All →
        </span>
      }>
        Top Players
      </CardHeader>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {topPlayers.map((p, i) => (
          <div key={p.id || i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: '4px 0',
          }}>
            <span style={{
              width: 22,
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 'var(--weight-medium)',
              textAlign: 'right',
            }}>
              {p.position || '—'}
            </span>
            <span style={{
              flex: 1,
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
            }}>
              {p.name}
            </span>
            <RatingBadge
              rating={p.rating}
              offRating={p.offRating}
              defRating={p.defRating}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}


/* ═══════════════════════════════════════════════════════════════
   Shared Helpers
   ═══════════════════════════════════════════════════════════════ */

function MiniStat({ label, value, sub, color }) {
  return (
    <div>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
        fontWeight: 'var(--weight-medium)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: 'var(--space-1)',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 'var(--weight-bold)',
        color: color || 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 'var(--leading-tight)',
      }}>
        {value}
      </div>
      {sub && (
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          marginTop: 2,
        }}>
          {sub}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '8px var(--space-3)',
  fontWeight: 600,
};

const tdCenter = {
  padding: '8px var(--space-3)',
  textAlign: 'center',
};

function ratingColor(r) {
  if (r >= 85) return 'var(--color-rating-elite)';
  if (r >= 78) return 'var(--color-rating-good)';
  if (r >= 70) return 'var(--color-rating-avg)';
  if (r >= 60) return 'var(--color-rating-below)';
  return 'var(--color-rating-poor)';
}

function formatCurrencyShort(amount) {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
  return '$' + amount;
}
