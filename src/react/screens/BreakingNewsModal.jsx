import React from 'react';
import { Modal, ModalBody } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function BreakingNewsModal({ isOpen, data, onClose }) {
  if (!isOpen || !data) return null;

  const { team1Name, team2Name, t1Gave, t2Gave, tierLabel } = data;

  return (
    <Modal isOpen={isOpen} onClose={null} maxWidth={480} zIndex={10001}>
      <ModalBody style={{ padding: 0 }}>
        <div style={{ borderTop: '3px solid var(--color-loss)' }}>
          <div style={{ padding: '24px 28px' }}>
            {/* Breaking label */}
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--color-loss)',
              textTransform: 'uppercase', letterSpacing: '0.12em',
              marginBottom: 6,
            }}>
              Breaking
            </div>

            {/* Headline */}
            <div style={{
              fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)',
              letterSpacing: '-0.01em', marginBottom: 20,
            }}>
              {tierLabel} Trade Alert
            </div>

            {/* Trade columns */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              gap: 12, marginBottom: 24,
            }}>
              <TradeColumn teamName={team1Name} sends={t1Gave} />
              <div style={{
                display: 'flex', alignItems: 'center',
                color: 'var(--color-text-tertiary)', fontSize: 16,
              }}>⇄</div>
              <TradeColumn teamName={team2Name} sends={t2Gave} />
            </div>

            {/* Continue */}
            <div style={{ textAlign: 'center' }}>
              <Button variant="primary" onClick={onClose}>Continue</Button>
            </div>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

function TradeColumn({ teamName, sends }) {
  return (
    <div style={{
      background: 'var(--color-bg-sunken)',
      border: '1px solid var(--color-border-subtle)',
      padding: '12px 14px',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>{teamName}</div>
      <div style={{
        fontSize: 10, color: 'var(--color-text-tertiary)', marginBottom: 4,
      }}>Send</div>
      <div style={{ fontSize: 'var(--text-sm)' }}>{sends}</div>
    </div>
  );
}
