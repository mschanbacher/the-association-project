import React from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Button, SimButton } from './Button.jsx';

export function SimControls() {
  const { gameState } = useGame();
  if (!gameState?.userTeam) return null;

  const { isSeasonComplete, offseasonPhase } = gameState;
  const inOffseason = offseasonPhase && offseasonPhase !== 'none';
  const disabled = isSeasonComplete;

  // These call back into the existing game's global functions
  const simNext = () => window.simNextGame?.() || document.getElementById('simNextBtn')?.click();
  const simDay = () => window.simDay?.() || document.getElementById('simDayBtn')?.click();
  const simWeek = () => window.simWeek?.() || document.getElementById('simWeekBtn')?.click();
  const finish = () => window.finishSeason?.() || document.getElementById('finishBtn')?.click();
  const watchGame = () => window.watchNextGame?.() || document.getElementById('watchNextBtn')?.click();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-3) var(--space-4)',
      background: 'var(--color-bg-raised)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-subtle)',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <span style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semi)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginRight: 'var(--space-2)',
      }}>
        Simulate
      </span>

      <SimButton icon="▶" onClick={simNext} disabled={disabled}>
        Next Game
      </SimButton>
      <SimButton icon="▶" onClick={watchGame} disabled={disabled}
        variant="primary">
        Watch
      </SimButton>

      <div style={{
        width: 1, height: 24,
        background: 'var(--color-border)',
        margin: '0 var(--space-1)',
      }} />

      <SimButton icon="1" onClick={simDay} disabled={disabled}>
        Day
      </SimButton>
      <SimButton icon="7" onClick={simWeek} disabled={disabled}>
        Week
      </SimButton>
      <SimButton icon="»" onClick={finish} disabled={disabled && !inOffseason}>
        Finish
      </SimButton>
    </div>
  );
}
