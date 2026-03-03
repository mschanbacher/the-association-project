import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

/* ═══════════════════════════════════════════════════════════════
   DevelopmentModal — Player Development Report
   
   Shows improvements, declines, and retirements after the
   development phase of the offseason.
   
   Props:
   - isOpen: boolean
   - data: { improvements, declines, userRetirements, notableRetirements, allRetirementsCount }
   - onContinue: () => void
   ═══════════════════════════════════════════════════════════════ */

export function DevelopmentModal({ isOpen, data, onContinue }) {
  const [tab, setTab] = useState('summary');

  if (!isOpen || !data) return null;

  const { improvements = [], declines = [], userRetirements = [], notableRetirements = [], allRetirementsCount = 0 } = data;
  const hasContent = improvements.length > 0 || declines.length > 0 || userRetirements.length > 0 || notableRetirements.length > 0;

  const tabs = [
    { key: 'summary', label: 'Summary', count: null },
    improvements.length > 0 && { key: 'improved', label: 'Improved', count: improvements.length, color: 'var(--color-win)' },
    declines.length > 0 && { key: 'declined', label: 'Declined', count: declines.length, color: 'var(--color-loss)' },
    (userRetirements.length > 0 || notableRetirements.length > 0) && { key: 'retired', label: 'Retired', count: allRetirementsCount || notableRetirements.length, color: 'var(--color-warning)' },
  ].filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onContinue} maxWidth={700} zIndex={1300}>
      <ModalHeader onClose={onContinue}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          🌟 Player Development Report
        </span>
      </ModalHeader>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div style={{
          display: 'flex', gap: 2, padding: '0 var(--space-5)',
          borderBottom: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-sunken)',
        }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'none', border: 'none',
                borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                color: tab === t.key ? 'var(--color-text)' : 'var(--color-text-tertiary)',
                fontWeight: tab === t.key ? 'var(--weight-semi)' : 'var(--weight-normal)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                transition: 'all var(--duration-fast) ease',
              }}
            >
              {t.label}
              {t.count !== null && (
                <span style={{
                  fontSize: '10px', padding: '1px 6px',
                  background: tab === t.key ? (t.color || 'var(--color-accent)') + '18' : 'var(--color-bg-active)',
                  color: tab === t.key ? (t.color || 'var(--color-accent)') : 'var(--color-text-tertiary)',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 'var(--weight-semi)',
                }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>
      )}

      <ModalBody style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {!hasContent && (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-tertiary)' }}>
            No significant player changes this offseason.
          </div>
        )}

        {/* Summary tab */}
        {tab === 'summary' && hasContent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              <StatBox label="Improved" value={improvements.length} color="var(--color-win)" icon="📈" />
              <StatBox label="Declined" value={declines.length} color="var(--color-loss)" icon="📉" />
              <StatBox label="Retired" value={allRetirementsCount} color="var(--color-warning)" icon="👋" />
            </div>

            {/* User team retirements featured */}
            {userRetirements.length > 0 && (
              <Section title="Your Team — Retirements" color="var(--color-warning)">
                {userRetirements.map((r, i) => (
                  <RetirementCard key={i} player={r} featured />
                ))}
              </Section>
            )}

            {/* Top improvements preview */}
            {improvements.length > 0 && (
              <Section title="Biggest Improvements" color="var(--color-win)">
                {improvements.slice(0, 3).map((log, i) => (
                  <RatingChangeRow key={i} log={log} />
                ))}
                {improvements.length > 3 && (
                  <button
                    onClick={() => setTab('improved')}
                    style={seeAllStyle}
                  >
                    See all {improvements.length} →
                  </button>
                )}
              </Section>
            )}

            {/* Top declines preview */}
            {declines.length > 0 && (
              <Section title="Biggest Declines" color="var(--color-loss)">
                {declines.slice(0, 3).map((log, i) => (
                  <RatingChangeRow key={i} log={log} />
                ))}
                {declines.length > 3 && (
                  <button
                    onClick={() => setTab('declined')}
                    style={seeAllStyle}
                  >
                    See all {declines.length} →
                  </button>
                )}
              </Section>
            )}
          </div>
        )}

        {/* Improved tab */}
        {tab === 'improved' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {improvements.map((log, i) => (
              <RatingChangeRow key={i} log={log} />
            ))}
          </div>
        )}

        {/* Declined tab */}
        {tab === 'declined' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {declines.map((log, i) => (
              <RatingChangeRow key={i} log={log} />
            ))}
          </div>
        )}

        {/* Retired tab */}
        {tab === 'retired' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {userRetirements.length > 0 && (
              <Section title="Your Team" color="var(--color-warning)">
                {userRetirements.map((r, i) => (
                  <RetirementCard key={i} player={r} featured />
                ))}
              </Section>
            )}
            {notableRetirements.length > 0 && (
              <Section title={`Notable League Retirements (${allRetirementsCount} total)`} color="var(--color-text-tertiary)">
                <div style={{ fontSize: 'var(--text-xs)' }}>
                  {notableRetirements.map((r, i) => (
                    <RetirementRow key={i} player={r} />
                  ))}
                </div>
                <div style={{
                  textAlign: 'center', fontSize: '11px',
                  color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)',
                }}>
                  🏅 Legendary career · ⭐ Hall of Fame candidate
                </div>
              </Section>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="primary" onClick={onContinue} style={{ minWidth: 160 }}>
          Continue to Free Agency
        </Button>
      </ModalFooter>
    </Modal>
  );
}


/* ── Sub-components ── */

function StatBox({ label, value, color, icon }) {
  return (
    <div style={{
      textAlign: 'center', padding: 'var(--space-3)',
      background: color + '08', borderRadius: 'var(--radius-md)',
      border: `1px solid ${color}15`,
    }}>
      <div style={{ fontSize: '20px', marginBottom: 2 }}>{icon}</div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', color }}>{value}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div>
      <div style={{
        fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semi)',
        color, marginBottom: 'var(--space-2)',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function RatingChangeRow({ log }) {
  const isUp = log.change > 0;
  const color = isUp ? 'var(--color-win)' : 'var(--color-loss)';
  const bg = isUp ? 'var(--color-win-bg)' : 'var(--color-loss-bg)';

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--space-2) var(--space-3)',
      background: bg, borderRadius: 'var(--radius-sm)',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)' }}>{log.name}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {log.position} · {log.age}yo
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{log.oldRating}</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
        <span style={{ fontWeight: 'var(--weight-bold)', color }}>{log.newRating}</span>
        <span style={{
          fontSize: '11px', padding: '0 5px',
          background: color + '15', color,
          borderRadius: 'var(--radius-full)', fontWeight: 'var(--weight-semi)',
        }}>
          {isUp ? '+' : ''}{log.change}
        </span>
      </div>
    </div>
  );
}

function RetirementCard({ player, featured }) {
  const peakColor = player.peakRating >= 90 ? 'var(--color-tier1)' : player.peakRating >= 80 ? 'var(--color-win)' : 'var(--color-info)';

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--space-3)',
      background: featured ? 'var(--color-warning-bg)' : 'var(--color-bg-sunken)',
      borderRadius: 'var(--radius-sm)',
      borderLeft: featured ? '3px solid var(--color-warning)' : 'none',
      marginBottom: 'var(--space-2)',
    }}>
      <div>
        <div style={{ fontWeight: 'var(--weight-semi)', fontSize: 'var(--text-sm)' }}>{player.name}</div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {player.position} · Age {player.age}
          {player.college && <span> · 🎓 {player.college}</span>}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-warning)', fontWeight: 'var(--weight-semi)' }}>
          {player.rating} OVR
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
          Peak {player.peakRating} · {player.careerLength}yr
        </div>
      </div>
    </div>
  );
}

function RetirementRow({ player }) {
  const peakColor = player.peakRating >= 90 ? 'var(--color-tier1)' : player.peakRating >= 85 ? 'var(--color-win)' : 'var(--color-info)';
  const badge = player.peakRating >= 93 ? ' 🏅' : player.peakRating >= 88 && player.careerLength >= 12 ? ' ⭐' : '';

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 'var(--space-2) var(--space-3)',
      borderBottom: '1px solid var(--color-border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <span style={{ fontWeight: 'var(--weight-semi)' }}>{player.name}{badge}</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{player.position}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <span style={{ color: peakColor, fontWeight: 'var(--weight-semi)' }}>{player.peakRating}</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>{player.careerLength}yr</span>
        <span style={{ color: 'var(--color-text-tertiary)' }}>T{player.tier} {player.teamName}</span>
      </div>
    </div>
  );
}

const seeAllStyle = {
  background: 'none', border: 'none', color: 'var(--color-accent)',
  fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 'var(--space-2) 0',
  fontWeight: 'var(--weight-semi)',
};
