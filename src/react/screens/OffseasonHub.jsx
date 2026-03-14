// ═══════════════════════════════════════════════════════════════════
// OffseasonHub — Full-screen offseason hub
//
// Replaces the dashboard (sidebar + main) during the offseason.
// Activated via window._reactShowOffseasonHub(data) from OffseasonController.
// Hands back to season setup via data.onComplete() when done.
//
// Design: mirrors DashboardScreen layout with offseason-specific content.
// ═══════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';

// Import existing screens for reuse
import { RosterScreen } from './RosterScreen.jsx';
import { FinancesScreen } from './FinancesScreen.jsx';
import { HistoryScreen } from './HistoryScreen.jsx';
import { CoachScreen } from './CoachScreen.jsx';
import { ScoutingScreen } from './ScoutingScreen.jsx';
import GlossaryScreen from './GlossaryScreen.jsx';

// ─── Offseason phase definitions ─────────────────────────────────────────────
const OFFSEASON_PHASES = [
  { key: 'season_ended', label: 'End' },
  { key: 'postseason', label: 'Playoffs' },
  { key: 'promo_rel', label: 'P/R' },
  { key: 'draft', label: 'Draft' },
  { key: 'college_fa', label: 'CFA' },
  { key: 'development', label: 'Dev' },
  { key: 'free_agency', label: 'FA' },
  { key: 'training_camp', label: 'Camp' },
  { key: 'roster_compliance', label: 'Cuts' },
  { key: 'setup_complete', label: 'Ready' },
];

// ─── Navigation items (mirrors Sidebar but for offseason) ────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'roster', label: 'Roster' },
  { id: 'freeagency', label: 'Free Agency' },
  { id: 'trades', label: 'Trades' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'coach', label: 'Coach' },
  { id: 'finances', label: 'Finances' },
  { id: 'history', label: 'History' },
  { id: 'glossary', label: 'Glossary' },
];

// ─── Phase Tracker Bar ───────────────────────────────────────────────────────
function OffseasonPhaseTracker({ currentPhase }) {
  const currentIdx = OFFSEASON_PHASES.findIndex(p => p.key === currentPhase);

  return (
    <div style={{
      background: 'var(--color-bg-raised)',
      borderBottom: '1px solid var(--color-border-subtle)',
      padding: '8px var(--space-6)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--color-accent)',
        marginRight: 14,
        flexShrink: 0,
      }}>Offseason</div>

      {OFFSEASON_PHASES.map((phase, i) => {
        const isActive = phase.key === currentPhase;
        const isDone = i < currentIdx;
        const isFuture = i > currentIdx;

        return (
          <React.Fragment key={phase.key}>
            {i > 0 && (
              <div style={{
                width: 16,
                height: 2,
                background: isDone ? 'var(--color-accent)' : 'var(--color-border-subtle)',
                flexShrink: 0,
              }} />
            )}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              minWidth: 36,
              flexShrink: 0,
              opacity: isFuture ? 0.5 : 1,
            }}>
              <div style={{
                width: isActive ? 18 : 14,
                height: isActive ? 18 : 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isDone ? 10 : 8,
                fontWeight: 700,
                background: isDone ? 'var(--color-accent)'
                  : isActive ? 'var(--color-bg-raised)'
                  : 'var(--color-bg-sunken)',
                border: isActive ? '2px solid var(--color-accent)'
                  : isDone ? 'none'
                  : '1px solid var(--color-border-subtle)',
                color: isDone ? 'var(--color-text-inverse)'
                  : isActive ? 'var(--color-accent)'
                  : 'var(--color-text-tertiary)',
              }}>
                {isDone ? '+' : (i + 1)}
              </div>
              <span style={{
                fontSize: 8,
                whiteSpace: 'nowrap',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-text)'
                  : isFuture ? 'var(--color-text-tertiary)'
                  : 'var(--color-text-secondary)',
              }}>{phase.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Sidebar Navigation ──────────────────────────────────────────────────────
function OffseasonSidebar({ activeScreen, onNavigate }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <nav style={{
      width: 'var(--sidebar-width)',
      minHeight: 'calc(100vh - var(--topbar-height) - 42px)', // Account for phase tracker
      background: 'var(--color-bg-raised)',
      borderRight: '1px solid var(--color-border-subtle)',
      padding: 'var(--space-4) var(--space-2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = activeScreen === item.id;
        const isHovered = hoveredItem === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              background: isActive ? 'var(--color-accent-bg)' :
                          isHovered ? 'var(--color-bg-hover)' :
                          'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 'var(--weight-semi)' : 'var(--weight-medium)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'all var(--duration-fast) ease',
              letterSpacing: '-0.005em',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

// ─── Dashboard Screen (Offseason version) ────────────────────────────────────
function OffseasonDashboard({ onNavigate, gameState, engines }) {
  const userTeam = gameState?.userTeam;
  if (!userTeam) return null;

  const { LeagueManager, SalaryCapEngine, FinanceEngine } = engines || {};

  // Calculate metrics
  const strength = LeagueManager?.calculateTeamStrength?.(userTeam) || 0;
  FinanceEngine?.ensureFinances?.(userTeam);
  const capSpace = SalaryCapEngine?.getRemainingCap?.(userTeam) || 0;
  const effCap = SalaryCapEngine?.getEffectiveCap?.(userTeam) || 0;
  const rosterSize = userTeam.roster?.length || 0;
  const totalPlayed = userTeam.wins + userTeam.losses;
  const pctStr = totalPlayed > 0 ? ((userTeam.wins / totalPlayed) * 100).toFixed(1) : '—';

  const fmtShort = (amount) => {
    if (amount >= 1e6) return '$' + (amount / 1e6).toFixed(1) + 'M';
    if (amount >= 1e3) return '$' + (amount / 1e3).toFixed(0) + 'K';
    return '$' + amount;
  };

  // Get free agent count
  const raw = gameState._raw || gameState;
  const faCount = raw.freeAgents?.length || 0;

  // Get recent trades for news
  const recentTrades = (raw.tradeHistory || []).slice(-3).reverse();

  // Top players
  const topPlayers = [...(userTeam.roster || [])]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <div style={{
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--gap)',
    }}>
      {/* Row 1: Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)' }}>
        <MetricCard
          label="Record"
          value={`${userTeam.wins}–${userTeam.losses}`}
          detail={`${pctStr}% — Season Complete`}
          valueColor={userTeam.wins > userTeam.losses ? 'var(--color-win)' :
                      userTeam.wins < userTeam.losses ? 'var(--color-loss)' : undefined}
        />
        <MetricCard
          label="Team Rating"
          value={Math.round(strength)}
          detail="League avg: 68"
        />
        <MetricCard
          label="Cap Space"
          value={fmtShort(capSpace)}
          detail={`of ${fmtShort(effCap)}`}
          valueColor={capSpace < 0 ? 'var(--color-loss)' : undefined}
        />
        <MetricCard
          label="Roster"
          value={`${rosterSize} / 20`}
          detail={`${20 - rosterSize} spots available`}
        />
      </div>

      {/* Row 2: Offseason Actions + News */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 'var(--gap)',
      }}>
        {/* Offseason Actions Card */}
        <div style={{
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <CardLabel>Offseason Actions</CardLabel>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ActionButton onClick={() => onNavigate('freeagency')} primary>
              <span>Browse Free Agents</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
              }}>{faCount} available</span>
            </ActionButton>
            <ActionButton onClick={() => onNavigate('trades')}>
              Propose a Trade
            </ActionButton>
            <ActionButton onClick={() => onNavigate('roster')}>
              Manage Roster
            </ActionButton>
          </div>

          {/* Sim Controls */}
          <div style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid var(--color-border-subtle)',
          }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <SimButton onClick={() => window.simDay?.()}>Sim Day</SimButton>
              <SimButton onClick={() => window.simWeek?.()}>Sim Week</SimButton>
            </div>
            <button
              onClick={() => window.simToNextEvent?.()}
              style={{
                width: '100%',
                padding: 10,
                background: 'var(--color-accent)',
                border: 'none',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--color-text-inverse)',
                cursor: 'pointer',
              }}
            >
              Sim to Training Camp
            </button>
          </div>
        </div>

        {/* League News */}
        <div style={{
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4)',
        }}>
          <CardLabel>League News</CardLabel>
          
          {recentTrades.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: 'var(--space-4) 0',
              color: 'var(--color-text-tertiary)',
              fontSize: 'var(--text-sm)',
            }}>
              No recent transactions
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentTrades.map((trade, i) => (
                <NewsItem key={i} trade={trade} isLast={i === recentTrades.length - 1} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Top Players + Recent Transactions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--gap)',
      }}>
        {/* Top Players */}
        <div style={{
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4)',
        }}>
          <CardLabel>Top Players</CardLabel>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {topPlayers.map((player, i) => (
              <div key={player.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0',
                borderBottom: i < topPlayers.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
              }}>
                <RatingBadge rating={player.rating} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
                    {player.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                    {player.position} — {player.age}yo — ${(player.salary / 1e6).toFixed(1)}M
                  </div>
                </div>
              </div>
            ))}
          </div>

          {rosterSize > 3 && (
            <div style={{
              paddingTop: 8,
              marginTop: 8,
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: 11,
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
            }} onClick={() => onNavigate('roster')}>
              +{rosterSize - 3} more — click to view full roster
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: 'var(--color-bg-raised)',
          border: '1px solid var(--color-border-subtle)',
          padding: 'var(--space-4)',
        }}>
          <CardLabel>Recent Transactions</CardLabel>
          
          <div style={{
            textAlign: 'center',
            padding: 'var(--space-4) 0',
            color: 'var(--color-text-tertiary)',
            fontSize: 'var(--text-sm)',
          }}>
            Transaction history will appear here
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Placeholder Screens ─────────────────────────────────────────────────────
function PlaceholderScreen({ title, message }) {
  return (
    <div style={{
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: 'var(--space-6)',
    }}>
      <h2 style={{
        fontSize: 'var(--text-lg)',
        fontWeight: 'var(--weight-semi)',
        marginBottom: 'var(--space-4)',
      }}>{title}</h2>
      <div style={{
        padding: 'var(--space-6)',
        background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border-subtle)',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
      }}>
        {message}
      </div>
    </div>
  );
}

function FreeAgencyScreen() {
  // For now, trigger the existing FreeAgencyModal inline
  // Phase 2 will embed this properly
  useEffect(() => {
    // Open FA modal when this screen mounts
    if (window._reactShowFA) {
      // We'll wire this up in Phase 2
    }
  }, []);

  return (
    <PlaceholderScreen
      title="Free Agency"
      message="Free agency will be embedded here (Phase 2)"
    />
  );
}

function TradesScreen() {
  return (
    <PlaceholderScreen
      title="Trades"
      message="Trade center will be embedded here (Phase 2)"
    />
  );
}

function CalendarScreen() {
  return (
    <PlaceholderScreen
      title="Offseason Calendar"
      message="Offseason calendar will be embedded here (Phase 2)"
    />
  );
}

// ─── Helper Components ───────────────────────────────────────────────────────
function MetricCard({ label, value, detail, valueColor }) {
  return (
    <div style={{
      background: 'var(--color-bg-raised)',
      border: '1px solid var(--color-border-subtle)',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semi)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 'var(--text-2xl)',
        fontWeight: 'var(--weight-bold)',
        color: valueColor || 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
      }}>{value}</div>
      {detail && (
        <div style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
          marginTop: 4,
        }}>{detail}</div>
      )}
    </div>
  );
}

function CardLabel({ children }) {
  return (
    <div style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semi)',
      color: 'var(--color-text-tertiary)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
      marginBottom: 12,
    }}>{children}</div>
  );
}

function ActionButton({ children, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 14px',
        background: primary ? 'var(--color-accent-bg)' : 'var(--color-bg-sunken)',
        border: `1px solid ${primary ? 'var(--color-accent-border)' : 'var(--color-border-subtle)'}`,
        fontFamily: 'var(--font-body)',
        fontSize: 12,
        fontWeight: 500,
        color: primary ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      {children}
    </button>
  );
}

function SimButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        padding: '8px 6px',
        background: 'var(--color-bg-sunken)',
        border: '1px solid var(--color-border-subtle)',
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function RatingBadge({ rating }) {
  const color = rating >= 85 ? 'var(--color-tier1)'
    : rating >= 75 ? 'var(--color-accent)'
    : 'var(--color-text-tertiary)';

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 6px',
      background: color,
      color: 'var(--color-text-inverse)',
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 600,
    }}>{rating}</span>
  );
}

function NewsItem({ trade, isLast }) {
  const t1Name = trade.team1?.name || trade.team1Name || 'Team';
  const t2Name = trade.team2?.name || trade.team2Name || 'Team';

  return (
    <div style={{
      padding: '10px 0',
      borderBottom: isLast ? 'none' : '1px solid var(--color-border-subtle)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 3,
      }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text)' }}>
          {t1Name} ↔ {t2Name}
        </span>
        {trade.date && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
          }}>{trade.date}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: 1.4 }}>
        Trade completed
      </div>
    </div>
  );
}

// ─── Main OffseasonHub Component ─────────────────────────────────────────────
export function OffseasonHub({ data, onClose }) {
  const { gameState, engines, refresh } = useGame();
  const [activeScreen, setActiveScreen] = useState('dashboard');

  // Get current offseason phase
  const raw = gameState?._raw || gameState;
  const currentPhase = raw?.offseasonPhase || 'free_agency';

  // Screen components map
  const screens = useMemo(() => ({
    dashboard: (
      <OffseasonDashboard
        onNavigate={setActiveScreen}
        gameState={gameState}
        engines={engines}
      />
    ),
    roster: <RosterScreen />,
    freeagency: <FreeAgencyScreen />,
    trades: <TradesScreen />,
    scouting: <ScoutingScreen />,
    calendar: <CalendarScreen />,
    coach: <CoachScreen />,
    finances: <FinancesScreen />,
    history: <HistoryScreen />,
    glossary: <GlossaryScreen />,
  }), [gameState, engines]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
    }}>
      {/* Phase Tracker */}
      <OffseasonPhaseTracker currentPhase={currentPhase} />

      {/* Sidebar + Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <OffseasonSidebar
          activeScreen={activeScreen}
          onNavigate={setActiveScreen}
        />
        <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
          {screens[activeScreen] || screens.dashboard}
        </main>
      </div>
    </div>
  );
}
