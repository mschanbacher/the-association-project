import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

export function SeasonEndModal({ isOpen, data, onAdvance, onManageRoster, onStay }) {
  const [tab, setTab] = useState('summary');

  if (!isOpen || !data) return null;

  const {
    userTeam, rank, tier, status, statusColor, nextAction, seasonLabel,
    awardsHTML, t1TopTeam, t2Champion, t3Champion,
    t2Promoted, t1Relegated, t3Promoted, tier2Sorted, getRankSuffix
  } = data;

  const sfx = getRankSuffix || ((n) => {
    if (n % 10 === 1 && n !== 11) return 'st';
    if (n % 10 === 2 && n !== 12) return 'nd';
    if (n % 10 === 3 && n !== 13) return 'rd';
    return 'th';
  });

  const tabs = [
    { key: 'summary', label: 'Summary' },
    { key: 'prorel', label: 'Promo / Rel' },
    awardsHTML ? { key: 'awards', label: 'Awards' } : null,
  ].filter(Boolean);

  return (
    <Modal isOpen={isOpen} onClose={onStay} maxWidth={800} zIndex={1300}>
      <div style={{
        padding: 'var(--space-6)', textAlign: 'center',
        background: 'linear-gradient(135deg, var(--color-bg-sunken), var(--color-bg-active))',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}>
        <div style={{ fontSize: '32px', marginBottom: 'var(--space-2)' }}>{'🏀'}</div>
        <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)' }}>
          Season {seasonLabel} Complete
        </div>
        <div style={{
          marginTop: 'var(--space-3)', fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-bold)', color: statusColor,
        }}>
          {status}
        </div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-1)' }}>
          <strong>{userTeam.name}</strong> &mdash; {rank}{sfx(rank)} place &middot; {userTeam.wins}-{userTeam.losses} &middot; Diff: {userTeam.pointDiff > 0 ? '+' : ''}{userTeam.pointDiff}
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 2, padding: '0 var(--space-5)',
        borderBottom: '1px solid var(--color-border-subtle)',
        background: 'var(--color-bg-sunken)',
      }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: 'var(--space-3) var(--space-4)',
            background: 'none', border: 'none',
            borderBottom: tab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            color: tab === t.key ? 'var(--color-text)' : 'var(--color-text-tertiary)',
            fontWeight: tab === t.key ? 'var(--weight-semi)' : 'var(--weight-normal)',
            fontSize: 'var(--text-sm)', cursor: 'pointer',
          }}>{t.label}</button>
        ))}
      </div>

      <ModalBody style={{ maxHeight: '50vh', overflowY: 'auto' }}>
        {tab === 'summary' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
              {t1TopTeam && <LeaderCard tier="Tier 1" color="var(--color-tier1)" team={t1TopTeam} label="Best Record" />}
              {t2Champion && <LeaderCard tier="Tier 2" color="#c0c0c0" team={t2Champion} label="Champion" />}
              {t3Champion && <LeaderCard tier="Tier 3" color="#cd7f32" team={t3Champion} label="Champion" />}
            </div>
          </div>
        )}

        {tab === 'prorel' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            {t2Promoted && <ProRelCard title="Promoted to Tier 1" icon={'\u2B06\uFE0F'} color="var(--color-win)" teams={t2Promoted} />}
            {t1Relegated && <ProRelCard title="Relegated to Tier 2" icon={'\u2B07\uFE0F'} color="var(--color-loss)" teams={t1Relegated} />}
            {t3Promoted && <ProRelCard title="Promoted to Tier 2" icon={'\u2B06\uFE0F'} color="var(--color-win)" teams={t3Promoted} />}
            {tier2Sorted && tier2Sorted.length >= 4 && (
              <ProRelCard title="Relegated to Tier 3" icon={'\u2B07\uFE0F'} color="var(--color-loss)"
                teams={[
                  tier2Sorted[tier2Sorted.length - 1], tier2Sorted[tier2Sorted.length - 2],
                  tier2Sorted[tier2Sorted.length - 3], tier2Sorted[tier2Sorted.length - 4]
                ]} />
            )}
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-2)' }}>
              *Playoff results may adjust final placement
            </div>
          </div>
        )}

        {tab === 'awards' && awardsHTML && (
          <div dangerouslySetInnerHTML={{ __html: awardsHTML }} />
        )}
      </ModalBody>

      <ModalFooter>
        <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={onManageRoster}>Manage Roster</Button>
          <Button variant="primary" onClick={() => onAdvance(nextAction)}>
            Start Playoffs & Off-Season
          </Button>
          <Button variant="ghost" onClick={onStay} style={{ fontSize: 'var(--text-xs)' }}>Stay on Season</Button>
        </div>
      </ModalFooter>
    </Modal>
  );
}

function LeaderCard({ tier, color, team, label }) {
  if (!team) return null;
  return (
    <div style={{
      textAlign: 'center', padding: 'var(--space-3)',
      background: color + '08', borderRadius: 'var(--radius-md)',
      border: '1px solid ' + color + '15',
    }}>
      <div style={{ fontSize: 'var(--text-xs)', color, fontWeight: 'var(--weight-semi)', marginBottom: 2 }}>
        {tier} &mdash; {label}
      </div>
      <div style={{ fontWeight: 'var(--weight-bold)', fontSize: 'var(--text-sm)' }}>{team.name}</div>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
        {team.wins}-{team.losses}
      </div>
    </div>
  );
}

function ProRelCard({ title, icon, color, teams }) {
  if (!teams || teams.length === 0) return null;
  return (
    <div style={{
      padding: 'var(--space-3)', background: color + '08',
      borderRadius: 'var(--radius-md)', border: '1px solid ' + color + '15',
    }}>
      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semi)', color, marginBottom: 'var(--space-2)' }}>
        {icon} {title}
      </div>
      {teams.filter(Boolean).map((t, i) => (
        <div key={i} style={{ fontSize: 'var(--text-xs)', marginBottom: 1 }}>
          <span style={{ fontWeight: i === 0 ? 'var(--weight-semi)' : 'var(--weight-normal)' }}>
            {t.name || t.city} {i === 0 ? '(Auto)' : ''}
          </span>
        </div>
      ))}
    </div>
  );
}