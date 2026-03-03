import React, { useState, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

/* ═══════════════════════════════════════════════════════════════
   ContractDecisionsModal — Expired Contract Re-sign/Release

   Shows expiring players with re-sign or release choices.
   Tracks decisions and cap impact in real-time.

   Props:
   - isOpen: boolean
   - data: { players: [], capSpace, rosterCount, formatCurrency, getRatingColor, determineContractLength }
   - onConfirm: (decisions: {playerId: 'resign'|'release'}) => void
   ═══════════════════════════════════════════════════════════════ */

export function ContractDecisionsModal({ isOpen, data, onConfirm }) {
  const [decisions, setDecisions] = useState({});

  if (!isOpen || !data) return null;

  const { players = [], capSpace, rosterCount, formatCurrency, getRatingColor, determineContractLength } = data;
  const fc = formatCurrency || ((v) => '$' + (v / 1e6).toFixed(1) + 'M');
  const rc = getRatingColor || (() => 'var(--color-text)');

  const resignedSalary = players
    .filter(p => decisions[p.id] === 'resign')
    .reduce((sum, p) => sum + (p.salary || 0), 0);

  const resignedCount = Object.values(decisions).filter(d => d === 'resign').length;
  const releasedCount = Object.values(decisions).filter(d => d === 'release').length;
  const remainingCap = capSpace - resignedSalary;
  const decidedAll = Object.keys(decisions).length === players.length;

  const toggle = (playerId, action) => {
    setDecisions(prev => ({ ...prev, [playerId]: action }));
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} maxWidth={650} zIndex={1300}>
      <ModalHeader>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          📝 Contract Decisions
        </span>
      </ModalHeader>

      {/* Summary bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)',
        padding: 'var(--space-4) var(--space-5)',
        background: 'var(--color-bg-sunken)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <SummaryCell label="Expiring" value={players.length} color="var(--color-warning)" />
        <SummaryCell label="Cap Space" value={fc(remainingCap)} color={remainingCap >= 0 ? 'var(--color-win)' : 'var(--color-loss)'} />
        <SummaryCell label="After Decisions" value={`${rosterCount + resignedCount} players`} />
      </div>

      <ModalBody style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {players.map(player => {
            const decision = decisions[player.id];
            const newYears = determineContractLength ? determineContractLength(player.age, player.rating) : 2;
            const canAfford = player.salary <= remainingCap || decision === 'resign';

            return (
              <div key={player.id} style={{
                padding: 'var(--space-3)',
                background: 'var(--color-bg-sunken)',
                borderRadius: 'var(--radius-md)',
                border: decision === 'resign'
                  ? '2px solid var(--color-win)'
                  : decision === 'release'
                    ? '2px solid var(--color-loss)'
                    : '2px solid transparent',
                transition: 'border-color 0.2s ease',
              }}>
                {/* Player info */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  marginBottom: 'var(--space-2)',
                }}>
                  <div>
                    <span style={{ fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)' }}>{player.name}</span>
                    <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                      {player.position} · Age {player.age}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: rc(player.rating), fontWeight: 'var(--weight-bold)' }}>{player.rating}</span>
                    <span style={{ color: 'var(--color-text-tertiary)' }}>{fc(player.salary)}/yr</span>
                    <span style={{ color: 'var(--color-warning)', fontSize: 'var(--text-xs)' }}>{newYears}yr new</span>
                  </div>
                </div>

                {/* Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                  <button
                    onClick={() => toggle(player.id, 'resign')}
                    disabled={!canAfford && decision !== 'resign'}
                    style={{
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: !canAfford && decision !== 'resign' ? 'not-allowed' : 'pointer',
                      opacity: !canAfford && decision !== 'resign' ? 0.3 : 1,
                      background: decision === 'resign' ? 'var(--color-win)' : 'var(--color-win-bg)',
                      color: decision === 'resign' ? '#fff' : 'var(--color-win)',
                      fontWeight: 'var(--weight-semi)',
                      fontSize: 'var(--text-xs)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ✅ Re-sign ({newYears}yr)
                  </button>
                  <button
                    onClick={() => toggle(player.id, 'release')}
                    style={{
                      padding: 'var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      border: 'none',
                      cursor: 'pointer',
                      background: decision === 'release' ? 'var(--color-loss)' : 'var(--color-loss-bg)',
                      color: decision === 'release' ? '#fff' : 'var(--color-loss)',
                      fontWeight: 'var(--weight-semi)',
                      fontSize: 'var(--text-xs)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    ❌ Release to FA
                  </button>
                </div>

                {/* Can't afford warning */}
                {!canAfford && decision !== 'resign' && (
                  <div style={{ fontSize: '11px', color: 'var(--color-loss)', marginTop: 'var(--space-1)' }}>
                    ⚠️ Cannot afford — {fc(player.salary - remainingCap)} over remaining cap
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ModalBody>

      <ModalFooter>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
            {Object.keys(decisions).length}/{players.length} decided
            {resignedCount > 0 && <span style={{ color: 'var(--color-win)' }}> · {resignedCount} re-signed</span>}
            {releasedCount > 0 && <span style={{ color: 'var(--color-loss)' }}> · {releasedCount} released</span>}
          </div>
          <Button
            variant="primary"
            disabled={!decidedAll}
            onClick={() => onConfirm(decisions)}
            style={{ opacity: decidedAll ? 1 : 0.4, minWidth: 150 }}
          >
            {decidedAll ? 'Confirm Decisions' : `${players.length - Object.keys(decisions).length} remaining`}
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

function SummaryCell({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)', color: color || 'var(--color-text)' }}>{value}</div>
    </div>
  );
}