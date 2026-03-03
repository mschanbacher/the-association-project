import React from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function AllStarModal({ isOpen, data, onContinue }) {
  if (!isOpen || !data) return null;

  const { results = [], userTeamId } = data;

  const userAllStars = [];
  for (const r of results) {
    const inEast = r.selections.east.filter(p => p.team.id === userTeamId);
    const inWest = r.selections.west.filter(p => p.team.id === userTeamId);
    userAllStars.push(...inEast, ...inWest);
  }

  return (
    <Modal isOpen={isOpen} onClose={onContinue} maxWidth={700} zIndex={1300}>
      <ModalHeader onClose={onContinue}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          ⭐ All-Star Weekend
        </span>
      </ModalHeader>

      <ModalBody style={{ maxHeight: '60vh', overflowY: 'auto' }}>
        {userAllStars.length > 0 ? (
          <div style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-info-bg)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-info)20', marginBottom: 'var(--space-4)',
          }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)', color: 'var(--color-info)', marginBottom: 'var(--space-2)' }}>
              Your All-Stars ({userAllStars.length})
            </div>
            {userAllStars.map((p, i) => (
              <div key={i} style={{ fontSize: 'var(--text-sm)', marginBottom: 2 }}>
                <strong>{p.player.name}</strong> ({p.player.position})
                <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>
                  {p.avgs.pointsPerGame} PPG · {p.avgs.reboundsPerGame} RPG · {p.avgs.assistsPerGame} APG
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }}>
            Your team did not have any All-Star selections this season.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {results.map((r, idx) => (
            <TierGame key={idx} result={r} userTeamId={userTeamId} />
          ))}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button variant="primary" onClick={onContinue} style={{ minWidth: 180 }}>
          Continue Season →
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function TierGame({ result, userTeamId }) {
  const { selections, gameResult, label, color } = result;
  const eastWon = gameResult.winner === 'East';
  const mvp = gameResult.gameMVP;

  return (
    <div style={{
      padding: 'var(--space-4)', background: 'var(--color-bg-sunken)',
      borderRadius: 'var(--radius-md)', border: `1px solid ${color}20`,
    }}>
      <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)', color, marginBottom: 'var(--space-3)', textAlign: 'center' }}>
        {label} All-Star Game
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-3)' }}>
        <ScoreBlock label="East" score={gameResult.eastScore} won={eastWon} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>vs</span>
        <ScoreBlock label="West" score={gameResult.westScore} won={!eastWon} />
      </div>

      {mvp && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)', background: 'rgba(255,215,0,0.06)',
          borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)',
          marginBottom: 'var(--space-3)', width: 'fit-content', margin: '0 auto var(--space-3)',
        }}>
          <span>🏆</span>
          <strong>{mvp.player.name}</strong>
          <span style={{ color: 'var(--color-text-tertiary)' }}>
            ({mvp.team.name}) — {mvp.avgs.pointsPerGame} PPG · {mvp.avgs.reboundsPerGame} RPG · {mvp.avgs.assistsPerGame} APG
          </span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <RosterColumn label="East" players={selections.east} userTeamId={userTeamId} mvpId={mvp?.player?.id} />
        <RosterColumn label="West" players={selections.west} userTeamId={userTeamId} mvpId={mvp?.player?.id} />
      </div>
    </div>
  );
}

function ScoreBlock({ label, score, won }) {
  return (
    <div style={{ textAlign: 'center', opacity: won ? 1 : 0.6 }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)', color: won ? 'var(--color-win)' : 'var(--color-text)' }}>{score}</div>
      {won && <div style={{ fontSize: '10px', color: 'var(--color-win)', fontWeight: 'var(--weight-semi)' }}>WIN</div>}
    </div>
  );
}

function RosterColumn({ label, players, userTeamId, mvpId }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semi)', textAlign: 'center', marginBottom: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
        {label} All-Stars
      </div>
      {players.map((p, i) => {
        const isUser = p.team.id === userTeamId;
        const isMvp = mvpId && p.player.id === mvpId;
        return (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '3px var(--space-2)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
            background: isUser ? 'var(--color-info-bg)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
            border: isMvp ? '1px solid rgba(255,215,0,0.2)' : '1px solid transparent',
          }}>
            <span>
              <strong>{p.player.name}</strong>
              <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 4 }}>{p.player.position}</span>
            </span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>{p.team.name.split(' ').pop()}</span>
          </div>
        );
      })}
    </div>
  );
}