import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

const SEVERITY_STYLES = {
  'minor':         { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  'moderate':      { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  'severe':        { color: 'var(--color-loss)',    bg: 'var(--color-loss-bg)' },
  'season-ending': { color: 'var(--color-loss)',    bg: 'var(--color-loss-bg)' },
};

export function InjuryModal({ isOpen, data, onDecision }) {
  const [selected, setSelected] = useState(null);

  if (!isOpen || !data) return null;

  const { team, player, injury, isUserTeam, aiDecision, dpeEligible, dpeAmount, formatCurrency } = data;
  const sev = SEVERITY_STYLES[injury.severity] || SEVERITY_STYLES.moderate;
  const canChoose = isUserTeam && injury.canPlayThrough;
  const isSevere = isUserTeam && !injury.canPlayThrough;

  const handleConfirm = () => {
    if (canChoose && !selected) return;
    const decision = canChoose ? selected : isSevere ? 'rest' : 'continue';
    setSelected(null);
    onDecision(decision);
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} maxWidth={500} zIndex={1300}>
      <ModalBody style={{ padding: 0 }}>
        <div style={{ borderTop: `3px solid ${sev.color}` }}>
          {/* Header */}
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid var(--color-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
          }}>
            <div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: sev.color,
                textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4,
              }}>Injury Report</div>
              <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>
                {team.city} {team.name}
              </div>
            </div>
            <div style={{
              fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
              textTransform: 'capitalize',
            }}>{injury.severity}</div>
          </div>

          <div style={{ padding: '20px 24px' }}>
            {/* Player info */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px', background: 'var(--color-bg-sunken)',
              border: '1px solid var(--color-border-subtle)', marginBottom: 16,
            }}>
              <div style={{
                width: 40, height: 40, background: 'var(--color-accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-inverse)', fontWeight: 700,
                fontSize: 15, fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>{player.rating}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>{player.name}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {player.position} · {player.age}yo
                </div>
              </div>
            </div>

            {/* Injury detail */}
            <div style={{
              padding: '12px 14px', background: sev.bg,
              border: `1px solid ${sev.color}20`, marginBottom: 20,
            }}>
              <div style={{
                fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)',
                color: sev.color, marginBottom: 2,
              }}>{injury.name}</div>
              <div style={{
                fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
                textTransform: 'capitalize',
              }}>{injury.severity} injury</div>
            </div>

            {/* ── AI Decision (non-user team) ── */}
            {!isUserTeam && (
              <div style={{
                padding: '12px 14px', background: 'var(--color-bg-sunken)',
                border: '1px solid var(--color-border-subtle)',
              }}>
                <div style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                  {team.name} has placed <strong>{player.name}</strong>{' '}
                  {aiDecision === 'rest' ? 'on the injury report' : 'as day-to-day'}.
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {aiDecision === 'rest'
                    ? `Expected return: ${injury.gamesRemaining === 999 ? 'End of season' : injury.gamesRemaining + ' games'}`
                    : `Playing through — ${injury.gamesRemainingIfPlaying} games to full recovery`
                  }
                </div>
              </div>
            )}

            {/* ── User Choice: Rest vs Play Through ── */}
            {canChoose && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--gap)', marginBottom: 16 }}>
                  {/* Rest */}
                  <OptionCard
                    selected={selected === 'rest'}
                    onClick={() => setSelected('rest')}
                    title="Rest"
                    tag="Recommended"
                    tagColor="var(--color-win)"
                    selectedColor="var(--color-win)"
                    selectedBg="var(--color-win-bg)"
                    details={[
                      { label: 'Out', value: `${injury.gamesRemaining} games` },
                      { label: 'Returns', value: 'at 100% health' },
                    ]}
                  />
                  {/* Play Through */}
                  <OptionCard
                    selected={selected === 'playThrough'}
                    onClick={() => setSelected('playThrough')}
                    title="Play Through"
                    tag="Risk"
                    tagColor="var(--color-warning)"
                    selectedColor="var(--color-warning)"
                    selectedBg="var(--color-warning-bg)"
                    details={[
                      { label: 'Rating', value: `${player.rating} → ${player.rating + injury.ratingPenalty}`, isRatingDrop: true },
                      { label: 'Recovery', value: `${injury.gamesRemainingIfPlaying} games` },
                    ]}
                  />
                </div>
                {!selected && (
                  <div style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                    Select a treatment option to continue
                  </div>
                )}
              </>
            )}

            {/* ── Severe / Season-Ending (no choice) ── */}
            {isSevere && (
              <div style={{
                padding: '12px 14px', background: 'var(--color-loss-bg)',
                border: '1px solid var(--color-loss)',
              }}>
                <div style={{
                  fontWeight: 600, color: 'var(--color-loss)',
                  marginBottom: 4, fontSize: 'var(--text-sm)',
                }}>Placed on Injured Reserve</div>
                <div style={{ fontSize: 'var(--text-sm)', marginBottom: 4 }}>
                  Expected return: {injury.gamesRemaining === 999 ? 'End of season' : `${injury.gamesRemaining} games`}
                </div>
                {injury.carryOver && (
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-loss)', fontWeight: 600 }}>
                    Will miss start of next season
                  </div>
                )}
                {dpeEligible && (
                  <div style={{
                    marginTop: 12, padding: '10px 12px',
                    background: 'var(--color-accent-bg)',
                    border: '1px solid var(--color-accent-border)',
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-accent)', fontSize: 'var(--text-sm)' }}>
                      Disabled Player Exception Approved
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      Sign a replacement for {formatCurrency ? formatCurrency(dpeAmount) : `$${(dpeAmount / 1e6).toFixed(1)}M`}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        <Button
          variant={canChoose && !selected ? 'secondary' : 'primary'}
          disabled={canChoose && !selected}
          onClick={handleConfirm}
          style={{ minWidth: 160 }}
        >
          {canChoose ? 'Confirm Decision' : 'Continue'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function OptionCard({ selected, onClick, title, tag, tagColor, selectedColor, selectedBg, details }) {
  return (
    <div onClick={onClick} style={{
      padding: 14, cursor: 'pointer',
      border: `2px solid ${selected ? selectedColor : 'var(--color-border)'}`,
      background: selected ? selectedBg : 'var(--color-bg-raised)',
      transition: 'all 100ms ease',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 10,
      }}>
        <div style={{
          fontWeight: 600, fontSize: 'var(--text-sm)',
          color: selected ? selectedColor : 'var(--color-text)',
        }}>{title}</div>
        <div style={{
          fontSize: 10, fontWeight: 600, color: tagColor,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>{tag}</div>
      </div>
      {details.map((d, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)',
          marginBottom: i < details.length - 1 ? 3 : 0,
        }}>
          <span>{d.label}</span>
          {d.isRatingDrop ? (
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              <span style={{ fontWeight: 600 }}>{d.value.split(' → ')[0]}</span>
              <span style={{ color: 'var(--color-text-tertiary)' }}> → </span>
              <span style={{ fontWeight: 600, color: 'var(--color-loss)' }}>{d.value.split(' → ')[1]}</span>
            </span>
          ) : (
            <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{d.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}
