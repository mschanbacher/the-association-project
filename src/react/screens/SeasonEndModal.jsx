import React from 'react';
import { Modal, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

// ─── Season End Modal ─────────────────────────────────────────────────────────
// Minimal gate between regular season and PlayoffHub.
// Shows season label + team result, then a single "Begin Playoffs →" button
// which fires onAdvance(nextAction) → advanceToNextSeason → PlayoffHub.
//
// All awards, standings, promo/rel info will live inside PlayoffHub once
// that feature is built. This modal intentionally contains nothing else.
// ─────────────────────────────────────────────────────────────────────────────
export function SeasonEndModal({ isOpen, data, onAdvance }) {
  if (!isOpen || !data) return null;

  const { userTeam, rank, seasonLabel, nextAction, status, statusColor } = data;

  const sfx = (n) => {
    if (n % 10 === 1 && n !== 11) return 'st';
    if (n % 10 === 2 && n !== 12) return 'nd';
    if (n % 10 === 3 && n !== 13) return 'rd';
    return 'th';
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} maxWidth={480} zIndex={1300}>
      <ModalBody style={{ padding: '36px 32px 28px', textAlign: 'center' }}>

        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 500,
          letterSpacing: '0.12em', textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)', marginBottom: 10,
        }}>
          Regular Season Complete
        </div>

        <div style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
          lineHeight: 1.1, marginBottom: 12,
        }}>
          {seasonLabel} Season
        </div>

        <div style={{
          fontSize: 13, fontWeight: 600,
          color: statusColor || 'var(--color-text-secondary)',
          marginBottom: 6,
        }}>
          {status}
        </div>

        <div style={{
          fontSize: 12, color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {userTeam?.name} · {rank}{sfx(rank)} place · {userTeam?.wins}–{userTeam?.losses}
        </div>

      </ModalBody>

      <ModalFooter style={{ justifyContent: 'center', padding: '16px 32px 24px' }}>
        <Button
          variant="primary"
          onClick={() => onAdvance(nextAction)}
          style={{ minWidth: 180, padding: '10px 24px', fontSize: 14 }}
        >
          Begin Playoffs →
        </Button>
      </ModalFooter>
    </Modal>
  );
}
