import React from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import {
  TeamSummaryWidget,
  NextGameWidget,
  StandingsWidget,
  RecentActivityWidget,
  RosterQuickWidget,
  TeamFormWidget,
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

      {/* Row 3: [Team Form stacked above Roster] + Recent Activity full height */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--gap)',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          <TeamFormWidget />
          <RosterQuickWidget />
        </div>
        <RecentActivityWidget />
      </div>
    </div>
  );
}
