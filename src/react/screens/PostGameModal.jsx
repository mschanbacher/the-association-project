import React from 'react';
import { Modal, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function PostGameModal({ isOpen, onClose, data, onViewBoxScore }) {
  if (!isOpen || !data) return null;

  const { userTeam, opponent, userWon, topPlayer, date, userRecord } = data;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={560}>
      <ModalBody>
        <div style={{ textAlign: 'center' }}>
          {/* Result */}
          <div style={{
            fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)',
            letterSpacing: '-0.02em',
            color: userWon ? 'var(--color-win)' : 'var(--color-loss)',
            marginBottom: 4,
          }}>
            {userWon ? 'VICTORY' : 'DEFEAT'}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 24 }}>
            {date}
          </div>

          {/* Scores — no dash, just space */}
          <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            gap: 48, marginBottom: 20,
          }}>
            <TeamScore team={userTeam} isWinner={userWon} isUser />
            <TeamScore team={opponent} isWinner={!userWon} />
          </div>

          {/* Record */}
          {userRecord && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginBottom: 24 }}>
              Record: {userRecord.wins}–{userRecord.losses}
            </div>
          )}

          {/* Player of the Game */}
          {topPlayer && (
            <div style={{
              background: 'var(--color-accent-bg)',
              border: '1px solid var(--color-accent-border)',
              padding: '14px 16px', marginBottom: 20, textAlign: 'left',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 10,
              }}>
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 600, color: 'var(--color-text-tertiary)',
                    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4,
                  }}>Player of the Game</div>
                  <div style={{ fontSize: 'var(--text-md)', fontWeight: 'var(--weight-bold)' }}>
                    {topPlayer.name}
                  </div>
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                  {topPlayer.fgm}–{topPlayer.fga} FG
                  ({topPlayer.fga > 0 ? ((topPlayer.fgm / topPlayer.fga) * 100).toFixed(0) : 0}%)
                  · {topPlayer.min} MIN
                </div>
              </div>
              <div style={{ display: 'flex', gap: 24 }}>
                <StatItem value={topPlayer.pts} label="PTS" />
                <StatItem value={topPlayer.reb} label="REB" />
                <StatItem value={topPlayer.ast} label="AST" />
              </div>
            </div>
          )}

          {/* Team Leaders — stacked columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, textAlign: 'left' }}>
            <LeadersColumn team={userTeam} isUser />
            <LeadersColumn team={opponent} />
          </div>
        </div>
      </ModalBody>

      <ModalFooter>
        {onViewBoxScore && (
          <Button variant="secondary" size="sm" onClick={onViewBoxScore}>Box Score</Button>
        )}
        <Button variant="primary" onClick={onClose}>Continue</Button>
      </ModalFooter>
    </Modal>
  );
}

function TeamScore({ team, isWinner, isUser }) {
  const name = team.city ? `${team.city} ${team.name}` : team.name;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        fontSize: 48, fontWeight: 700, lineHeight: 1,
        fontFamily: 'var(--font-mono)',
        color: isWinner && isUser ? 'var(--color-accent)' : 'var(--color-text)',
      }}>
        {team.score}
      </div>
      <div style={{ paddingTop: 4 }}>
        <div style={{
          fontSize: 'var(--text-sm)', fontWeight: 600,
          color: 'var(--color-text-secondary)', lineHeight: 1.2,
        }}>
          {name}
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label }) {
  return (
    <div>
      <div style={{
        fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1.1,
      }}>{value}</div>
      <div style={{
        fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 2,
      }}>{label}</div>
    </div>
  );
}

function LeadersColumn({ team, isUser }) {
  const players = (team.players || []).sort((a, b) => b.pts - a.pts).slice(0, 3);
  const teamName = team.city ? `${team.city} ${team.name}` : team.name;

  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600,
        color: isUser ? 'var(--color-accent)' : 'var(--color-text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
      }}>{teamName}</div>

      {/* Column header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px',
        gap: 4, fontSize: 10, color: 'var(--color-text-tertiary)',
        fontWeight: 600, letterSpacing: '0.04em', marginBottom: 4,
      }}>
        <div></div>
        <div style={{ textAlign: 'right' }}>PTS</div>
        <div style={{ textAlign: 'right' }}>REB</div>
        <div style={{ textAlign: 'right' }}>AST</div>
      </div>

      {players.map((p, i) => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '1fr 36px 36px 36px',
          gap: 4, padding: '4px 0', fontSize: 13,
          borderBottom: i < players.length - 1 ? '1px solid var(--color-border-subtle)' : 'none',
        }}>
          <div style={{ fontWeight: 500 }}>{p.name}</div>
          <div style={{
            textAlign: 'right', fontFamily: 'var(--font-mono)',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>{p.pts}</div>
          <div style={{
            textAlign: 'right', fontFamily: 'var(--font-mono)',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>{p.reb}</div>
          <div style={{
            textAlign: 'right', fontFamily: 'var(--font-mono)',
            fontSize: 12, color: 'var(--color-text-secondary)',
          }}>{p.ast}</div>
        </div>
      ))}
    </div>
  );
}
