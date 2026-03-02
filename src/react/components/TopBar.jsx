import React from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { TierBadge } from './Badge.jsx';

export function TopBar() {
  const { gameState, engines } = useGame();
  if (!gameState?.userTeam) return null;

  const { userTeam, currentSeason, currentDate, currentTier } = gameState;
  const { CalendarEngine, SalaryCapEngine, FinanceEngine, CoachEngine } = engines;

  // Format date
  let dateStr = '—';
  if (currentDate && CalendarEngine?.formatDateDisplay) {
    dateStr = CalendarEngine.formatDateDisplay(currentDate);
  }

  // Format season
  const seasonStr = `${currentSeason}–${String((currentSeason + 1) % 100).padStart(2, '0')}`;

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(250, 249, 247, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border-subtle)',
      padding: '0 var(--space-6)',
      height: 'var(--topbar-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left: Logo + Team */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <span style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--color-text)',
          letterSpacing: '-0.02em',
        }}>
          The Association
        </span>
        <div style={{
          width: 1,
          height: 24,
          background: 'var(--color-border)',
        }} />
        <TierBadge tier={currentTier} />
        <span style={{
          fontSize: 'var(--text-base)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--color-text)',
        }}>
          {userTeam.city} {userTeam.teamName || userTeam.name}
        </span>
      </div>

      {/* Center: Record + Season */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-6)',
      }}>
        <Stat label="Record" value={`${userTeam.wins}–${userTeam.losses}`}
          valueColor={userTeam.wins > userTeam.losses ? 'var(--color-win)' :
                      userTeam.wins < userTeam.losses ? 'var(--color-loss)' :
                      'var(--color-text)'} />
        <Stat label="Season" value={seasonStr} />
        <Stat label="Date" value={dateStr} />
      </div>

      {/* Right: Quick nav */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
      }}>
        <TopBarButton label="Menu" icon="⚙️" onClick={() => window.openGameMenu?.()} />
      </div>
    </header>
  );
}

function Stat({ label, value, valueColor }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 'var(--text-xs)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 'var(--weight-medium)',
        marginBottom: 1,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 'var(--text-base)',
        fontWeight: 'var(--weight-semi)',
        color: valueColor || 'var(--color-text)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}

function TopBarButton({ label, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '6px 10px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: 'transparent',
        color: 'var(--color-text-secondary)',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-medium)',
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'background var(--duration-fast) ease',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-bg-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      {icon && <span>{icon}</span>}
      {label}
    </button>
  );
}
