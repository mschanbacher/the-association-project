import React from 'react';
import { Modal, ModalBody } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function PlayoffModal({ isOpen, data, onClose }) {
  if (!isOpen || !data) return null;

  const { results, isPromotion, isDivisionPlayoff, msg, userResult, userInvolved } = data;

  const playoffTitle = isDivisionPlayoff
    ? '\ud83c\udfc0 Division Playoffs'
    : isPromotion
      ? '\u2b06\ufe0f Promotion Playoffs'
      : '\u2b07\ufe0f Relegation Playoffs';

  const continueAction = userInvolved ? userResult : 'not-involved';

  return (
    <Modal isOpen={isOpen} onClose={null} maxWidth={1000} zIndex={1300}>
      <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto', padding: 'var(--space-5)' }}>
        <div style={{ textAlign: 'center' }}>
          {/* Title */}
          <div style={{ fontSize: '2.5em', marginBottom: 'var(--space-4)' }}>{playoffTitle}</div>

          {/* User result or not-involved message */}
          {userInvolved && msg ? (
            <div style={{ fontSize: '1.8em', color: msg.color, marginBottom: 'var(--space-6)', fontWeight: 'var(--weight-bold)' }}>
              {msg.text}
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)' }}>
              (Your team did not participate)
            </div>
          )}

          {/* Bracket */}
          {results.isFourTeam ? (
            <FourTeamBracket results={results} />
          ) : (
            <ThreeTeamBracket results={results} isPromotion={isPromotion} />
          )}

          {/* Continue */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <Button variant="primary" size="lg" onClick={() => window.advanceToNextSeason?.(continueAction)}>
              Continue to Championship
            </Button>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
}

/* ── Four-Team Bracket (Semis → Final) ── */
function FourTeamBracket({ results }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-3)' }}>Semifinals</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
        <MatchCard
          team1={{ ...results.seed1, label: '#1 Seed' }}
          team2={{ ...results.seed4, label: '#4 Seed' }}
          winnerId={results.semi1.winner.id}
        />
        <MatchCard
          team1={{ ...results.seed2, label: '#2 Seed' }}
          team2={{ ...results.seed3, label: '#3 Seed' }}
          winnerId={results.semi2.winner.id}
        />
      </div>

      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-3)' }}>Championship</div>
      <MatchCard
        team1={{ ...results.semi1.winner }}
        team2={{ ...results.semi2.winner }}
        winnerId={results.final.winner.id}
      />

      <ResultBox>
        <strong>Champion:</strong> {results.final.winner.name}
      </ResultBox>
    </div>
  );
}

/* ── Three-Team Bracket (Play-In → Final) ── */
function ThreeTeamBracket({ results, isPromotion }) {
  return (
    <div>
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)', marginBottom: 'var(--space-3)' }}>Play-In Game</div>
      <MatchCard
        team1={{ ...results.seed2, label: '#2' }}
        team2={{ ...results.seed3, label: '#3' }}
        winnerId={results.playIn.winner.id}
      />

      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)', margin: 'var(--space-5) 0 var(--space-3)' }}>Final</div>
      <MatchCard
        team1={{ ...results.seed1, label: '#1 - Bye' }}
        team2={{ ...results.playIn.winner }}
        winnerId={results.final.winner.id}
      />

      <ResultBox>
        {isPromotion ? (
          <>
            <div><strong>Promoted:</strong> {results.final.winner.name}, {results.final.loser.name}</div>
            <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              {results.playIn.loser.name} stays in Tier 2
            </div>
          </>
        ) : (
          <>
            <div><strong>Survived:</strong> {results.final.winner.name}</div>
            <div style={{ marginTop: 'var(--space-2)', color: 'var(--color-text-secondary)' }}>
              <strong>Relegated:</strong> {results.final.loser.name}, {results.playIn.loser.name}
            </div>
          </>
        )}
      </ResultBox>
    </div>
  );
}

/* ── Match Card ── */
function MatchCard({ team1, team2, winnerId }) {
  const t1Won = team1.id === winnerId;
  const t2Won = team2.id === winnerId;

  return (
    <div style={{
      background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-subtle)', overflow: 'hidden',
    }}>
      <TeamRow team={team1} won={t1Won} />
      <div style={{ height: 1, background: 'var(--color-border-subtle)' }} />
      <TeamRow team={team2} won={t2Won} />
    </div>
  );
}

function TeamRow({ team, won }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--space-3) var(--space-4)',
      background: won ? 'var(--color-win)10' : 'transparent',
    }}>
      <span style={{
        fontWeight: won ? 'var(--weight-bold)' : 'var(--weight-normal)',
        opacity: won ? 1 : 0.6,
      }}>
        {team.name} {team.label ? <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>({team.label})</span> : null}
      </span>
      <span style={{
        fontWeight: 'var(--weight-bold)',
        color: won ? 'var(--color-win)' : 'var(--color-loss)',
      }}>
        {won ? '\u2705 WIN' : '\u274c LOSS'}
      </span>
    </div>
  );
}

/* ── Result Box ── */
function ResultBox({ children }) {
  return (
    <div style={{
      marginTop: 'var(--space-5)', padding: 'var(--space-4)',
      background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--color-border-subtle)',
      fontSize: 'var(--text-base)',
    }}>
      {children}
    </div>
  );
}
