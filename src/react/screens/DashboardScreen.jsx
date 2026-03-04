import React from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import {
  TeamSummaryWidget,
  NextGameWidget,
  StandingsWidget,
  RecentActivityWidget,
  RosterQuickWidget,
} from '../components/Widgets.jsx';

export function DashboardScreen() {
  const { gameState, isReady } = useGame();

  if (!isReady || !gameState?.userTeam) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '60vh', color: 'var(--color-text-tertiary)',
      }}>
        Loading…
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 'var(--content-max)',
      margin: '0 auto',
      padding: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--gap)',
    }}>
      {/* Row 1: Team Summary (metrics) */}
      <TeamSummaryWidget />

      {/* Row 2: Next Game + Division Standings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 'var(--gap)',
      }}>
        <NextGameWidget />
        <StandingsWidget />
      </div>

      {/* Row 3: Roster + Recent Activity */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--gap)',
      }}>
        <RosterQuickWidget />
        <RecentActivityWidget />
      </div>
    </div>
  );
}
