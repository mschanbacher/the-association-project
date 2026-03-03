import React, { useState, useMemo } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function DraftResultsModal({ isOpen, data, onContinue }) {
  const [activeTab, setActiveTab] = useState('round1');

  if (!isOpen || !data) return null;

  const { results = [], userTeamId, getRatingColor } = data;
  const rc = getRatingColor || (() => 'var(--color-text)');

  const round1 = useMemo(() => results.filter(r => r.round === 1), [results]);
  const comp = useMemo(() => results.filter(r => r.round === 'Comp'), [results]);
  const round2 = useMemo(() => results.filter(r => r.round === 2), [results]);
  const userPicks = useMemo(() => results.filter(r => r.teamId === userTeamId), [results, userTeamId]);

  const tabs = [
    { key: 'round1', label: 'Round 1', count: round1.length },
    comp.length > 0 ? { key: 'comp', label: 'Comp.', count: comp.length } : null,
    { key: 'round2', label: 'Round 2', count: round2.length },
    { key: 'user', label: 'Your Picks', count: userPicks.length, accent: true },
  ].filter(Boolean);

  const activeResults = activeTab === 'round1' ? round1
    : activeTab === 'comp' ? comp
    : activeTab === 'round2' ? round2
    : userPicks;

  const activeTitle = activeTab === 'round1' ? 'Round 1 Results'
    : activeTab === 'comp' ? 'Compensatory Round (Promoted Teams)'
    : activeTab === 'round2' ? 'Round 2 Results'
    : 'Your Draft Picks';

  return (
    <Modal isOpen={isOpen} onClose={onContinue} maxWidth={750} zIndex={1300}>
      <ModalHeader onClose={onContinue}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {'\ud83c\udf93'} Draft Results
        </span>
      </ModalHeader>

      <div style={{
        display: 'flex', gap: 2, padding: '0 var(--space-5)',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-sunken)',
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'none', border: 'none',
            borderBottom: activeTab === t.key
              ? `2px solid ${t.accent ? 'var(--color-warning)' : 'var(--color-accent)'}`
              : '2px solid transparent',
            color: activeTab === t.key ? 'var(--color-text)' : 'var(--color-text-tertiary)',
            fontWeight: activeTab === t.key ? 'var(--weight-semi)' : 'var(--weight-normal)',
            fontSize: 'var(--text-sm)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
          }}>
            {t.label}
            <span style={{
              fontSize: '10px', padding: '1px 5px',
              background: activeTab === t.key ? 'var(--color-accent)20' : 'var(--color-bg-active)',
              borderRadius: 'var(--radius-full)', color: 'var(--color-text-tertiary)',
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      <ModalBody style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <div style={{
          fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)',
          marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)',
        }}>
          {activeTitle}
        </div>

        {activeResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-tertiary)' }}>
            No picks in this round.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {activeResults.map((result, i) => (
              <PickCard key={i} result={result} userTeamId={userTeamId}
                getRatingColor={rc} isUserTab={activeTab === 'user'} />
            ))}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="primary" onClick={onContinue} style={{ minWidth: 200 }}>
          Continue to Free Agency
        </Button>
      </ModalFooter>
    </Modal>
  );
}

function PickCard({ result, userTeamId, getRatingColor, isUserTab }) {
  const isUser = result.teamId === userTeamId;
  const wasTraded = result.originalTeamId && result.originalTeamId !== result.teamId;
  const roundLabel = result.round === 'Comp' ? 'Comp' : `Rd ${result.round}`;
  const ratingColor = getRatingColor(result.player.rating);
  const hasOffDef = result.player.offRating !== undefined;

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--space-3)',
      background: isUser ? 'var(--color-warning)08' : 'var(--color-bg-sunken)',
      borderRadius: 'var(--radius-md)',
      borderLeft: isUser ? '3px solid var(--color-warning)'
        : result.isCompensatory ? '3px solid var(--color-win)' : '3px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <div style={{
          fontSize: 'var(--text-base)', fontWeight: 'var(--weight-bold)',
          color: isUserTab ? 'var(--color-warning)' : 'var(--color-text-tertiary)',
          minWidth: 44,
        }}>
          {isUserTab ? `${roundLabel} #${result.pick}` : `#${result.pick}`}
        </div>
        <div>
          <div style={{ fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)' }}>
            {result.player.name}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
            {result.player.position} | Age {result.player.age}
            {!isUserTab && (
              <span style={{ marginLeft: 'var(--space-2)' }}>
                {result.teamName}
                {wasTraded && (
                  <span style={{ color: 'var(--color-info)', marginLeft: 4 }}>
                    (via {result.originalTeamName})
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{
          color: ratingColor, fontWeight: 'var(--weight-bold)',
          fontSize: 'var(--text-sm)',
        }}>
          {result.player.rating}
        </div>
        {hasOffDef && (
          <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: 1 }}>
            <span style={{ color: result.player.offRating >= 70 ? '#4ecdc4' : 'var(--color-warning)' }}>
              {result.player.offRating}
            </span>
            {' / '}
            <span style={{ color: result.player.defRating >= 70 ? '#45b7d1' : 'var(--color-warning)' }}>
              {result.player.defRating}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
