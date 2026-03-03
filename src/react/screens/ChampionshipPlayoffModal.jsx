import React from 'react';
import { Modal, ModalHeader, ModalBody } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function ChampionshipPlayoffModal({ isOpen, data, onClose }) {
  if (!isOpen || !data) return null;

  const { mode } = data;

  return (
    <Modal isOpen={isOpen} onClose={null} maxWidth={1200} zIndex={1300}>
      <ModalBody style={{ maxHeight: '80vh', overflowY: 'auto', padding: 'var(--space-5)' }}>
        {mode === 'missed' && <MissedView data={data} />}
        {mode === 'round' && <RoundView data={data} />}
        {mode === 'complete' && <CompleteView data={data} />}
      </ModalBody>
    </Modal>
  );
}

/* ── Missed Playoffs ── */
function MissedView({ data }) {
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-5) 0' }}>
      <div style={{ fontSize: '2.5em', marginBottom: 'var(--space-5)' }}>{'\ud83c\udfc6'} Tier 1 Championship Playoffs</div>
      <div style={{ fontSize: '1.6em', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
        Your team did not make the playoffs
      </div>
      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
        <Button variant="secondary" onClick={() => window.simAllChampionshipRounds?.()}>
          {'\u23e9'} Sim to Finals
        </Button>
        <Button variant="primary" onClick={() => window.skipChampionshipPlayoffs?.()}>
          {'\u23ed\ufe0f'} Skip to Off-Season
        </Button>
      </div>
    </div>
  );
}

/* ── Round Results ── */
function RoundView({ data }) {
  const { roundName, roundNumber, eastSeries, westSeries, finalsSeries, userTeamId } = data;
  const isFinals = finalsSeries && finalsSeries.length > 0;
  const champion = isFinals ? finalsSeries[0].result.winner : null;
  const isUserChampion = champion && champion.id === userTeamId;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{ fontSize: '2.5em', fontWeight: 'var(--weight-bold)' }}>{'\ud83c\udfc6'} {roundName}</div>
      </div>

      {eastSeries && eastSeries.length > 0 && (
        <>
          <div style={{
            fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)',
            color: 'var(--color-warning)', margin: 'var(--space-5) 0 var(--space-3)',
          }}>Eastern Conference</div>
          {eastSeries.map((s, i) => (
            <SeriesCard key={`e${i}`} series={s} userTeamId={userTeamId} />
          ))}
        </>
      )}

      {westSeries && westSeries.length > 0 && (
        <>
          <div style={{
            fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semi)',
            color: 'var(--color-accent)', margin: 'var(--space-5) 0 var(--space-3)',
          }}>Western Conference</div>
          {westSeries.map((s, i) => (
            <SeriesCard key={`w${i}`} series={s} userTeamId={userTeamId} />
          ))}
        </>
      )}

      {isFinals && (
        <>
          <div style={{
            fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)',
            color: '#ffd700', textAlign: 'center',
            margin: 'var(--space-5) 0 var(--space-3)',
          }}>{'\ud83c\udfc6'} NBA FINALS {'\ud83c\udfc6'}</div>
          {finalsSeries.map((s, i) => (
            <SeriesCard key={`f${i}`} series={s} userTeamId={userTeamId} isFinals />
          ))}

          {/* Champion Banner */}
          <div style={{
            marginTop: 'var(--space-6)', padding: 'var(--space-6)',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            borderRadius: 'var(--radius-xl)', textAlign: 'center', color: '#1e3c72',
          }}>
            <div style={{ fontSize: '3em', marginBottom: 'var(--space-2)' }}>{'\ud83c\udfc6'}</div>
            <div style={{ fontSize: '2em', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
              {champion.name}
            </div>
            <div style={{ fontSize: '1.4em', fontWeight: 'var(--weight-bold)' }}>
              {isUserChampion ? 'YOU ARE THE CHAMPION!' : 'NBA CHAMPIONS'}
            </div>
          </div>
        </>
      )}

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 'var(--space-3)', justifyContent: 'center',
        marginTop: 'var(--space-6)',
      }}>
        <Button variant="ghost" onClick={() => window.openBracketViewer?.()}
          style={{ opacity: 0.6 }}>
          {'\ud83d\udcca'} View Bracket
        </Button>
        {roundNumber < 4 && (
          <Button variant="secondary" onClick={() => window.simAllChampionshipRounds?.()}
            style={{ opacity: 0.7 }}>
            Sim All
          </Button>
        )}
        <Button variant="primary" onClick={() => window.continueAfterChampionshipRound?.()}>
          {roundNumber < 4 ? 'Continue to Next Round' : 'Continue to Draft'}
        </Button>
      </div>
    </div>
  );
}

/* ── Complete Quick ── */
function CompleteView({ data }) {
  const { championName } = data;
  return (
    <div style={{ textAlign: 'center', padding: 'var(--space-5) 0' }}>
      <div style={{ fontSize: '2.5em', marginBottom: 'var(--space-5)' }}>{'\ud83c\udfc6'} Championship Complete</div>

      <div style={{
        marginTop: 'var(--space-6)', padding: 'var(--space-6)',
        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
        borderRadius: 'var(--radius-xl)', color: '#1e3c72',
      }}>
        <div style={{ fontSize: '3em', marginBottom: 'var(--space-2)' }}>{'\ud83c\udfc6'}</div>
        <div style={{ fontSize: '2em', fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>{championName}</div>
        <div style={{ fontSize: '1.4em', fontWeight: 'var(--weight-bold)' }}>NBA CHAMPIONS</div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
        <Button variant="ghost" onClick={() => window.openBracketViewer?.()}
          style={{ opacity: 0.6 }}>
          {'\ud83d\udcca'} View Bracket
        </Button>
        <Button variant="primary" onClick={() => window.skipChampionshipPlayoffs?.()}>
          Continue to Off-Season
        </Button>
      </div>
    </div>
  );
}

/* ── Series Card ── */
function SeriesCard({ series, userTeamId, isFinals }) {
  const r = series.result;
  const isUserInvolved = r.higherSeed?.id === userTeamId || r.lowerSeed?.id === userTeamId;

  return (
    <div style={{
      background: isUserInvolved ? 'var(--color-accent)20' : 'var(--color-bg-sunken)',
      padding: 'var(--space-4)', marginBottom: 'var(--space-4)',
      borderRadius: 'var(--radius-lg)',
      border: `2px solid ${isUserInvolved ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
          {r.winner.name} defeat {r.loser.name}
        </div>
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-text-secondary)' }}>
          Series: {r.seriesScore}
        </div>
      </div>

      {/* Game-by-game */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', maxWidth: 600, margin: '0 auto' }}>
        {(r.games || []).map((game, idx) => {
          const homeWon = game.winner.id === game.homeTeam.id;
          return (
            <div key={idx} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-bg-active)', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
            }}>
              <span style={{ flex: '0 0 60px' }}>Game {game.gameNumber}</span>
              <span style={{
                flex: 2, textAlign: 'right',
                fontWeight: homeWon ? 'var(--weight-bold)' : 'var(--weight-normal)',
                opacity: homeWon ? 1 : 0.6,
              }}>{game.homeTeam.name} {game.homeScore}</span>
              <span style={{ margin: '0 var(--space-3)', color: 'var(--color-text-tertiary)' }}>-</span>
              <span style={{
                flex: 2, textAlign: 'left',
                fontWeight: !homeWon ? 'var(--weight-bold)' : 'var(--weight-normal)',
                opacity: !homeWon ? 1 : 0.6,
              }}>{game.awayScore} {game.awayTeam.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
