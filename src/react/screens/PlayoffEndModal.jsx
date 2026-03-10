import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

// ─── PlayoffEndModal ──────────────────────────────────────────────────────────
// Shows after all playoff games complete:
// • Champions for all 3 tiers
// • Awards per tier (MVP, DPOY, ROY, Sixth Man, Most Improved, All-League)
// • Promotion/Relegation results
// • User's playoff result
// ─────────────────────────────────────────────────────────────────────────────

const TIER = {
  1: { bg: 'rgba(212, 168, 67, 0.06)', border: 'rgba(212, 168, 67, 0.2)', color: '#d4a843', label: 'TIER 1' },
  2: { bg: 'rgba(138, 138, 138, 0.06)', border: 'rgba(138, 138, 138, 0.2)', color: '#8a8a8a', label: 'TIER 2' },
  3: { bg: 'rgba(179, 115, 64, 0.06)', border: 'rgba(179, 115, 64, 0.2)', color: '#b37340', label: 'TIER 3' },
};

function TierTab({ tier, active, onClick }) {
  const t = TIER[tier];
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        background: active ? t.bg : 'transparent',
        border: `1px solid ${active ? t.border : 'var(--color-border)'}`,
        color: active ? t.color : 'var(--color-text-tertiary)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      T{tier}
    </button>
  );
}

function ChampionCard({ tier, team }) {
  const t = TIER[tier];
  if (!team) {
    return (
      <div style={{
        flex: 1,
        minWidth: 160,
        padding: '20px 16px',
        background: t.bg,
        border: `1px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>No champion</div>
      </div>
    );
  }
  
  return (
    <div style={{
      flex: 1,
      minWidth: 160,
      padding: '20px 16px',
      background: t.bg,
      border: `1px solid ${t.border}`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
    }}>
      <div style={{
        fontSize: 9,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.1em',
        color: t.color,
      }}>
        {t.label} CHAMPION
      </div>
      {/* Simple geometric mark */}
      <div style={{
        width: 16,
        height: 16,
        background: t.color,
      }} />
      <div style={{ fontSize: 15, fontWeight: 700, textAlign: 'center', letterSpacing: '-0.01em' }}>
        {team.name}
      </div>
      {team.playoffRecord && (
        <div style={{
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {team.playoffRecord} Playoffs
        </div>
      )}
    </div>
  );
}

function AwardRow({ label, player }) {
  if (!player) return null;
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        width: 100,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        color: 'var(--color-text-tertiary)',
      }}>
        {label}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{player.name}</div>
        <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 2 }}>{player.team}</div>
      </div>
      {player.stats && (
        <div style={{
          fontSize: 10,
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-mono)',
        }}>
          {player.stats}
        </div>
      )}
    </div>
  );
}

function AllLeagueTeam({ title, players }) {
  if (!players || players.length === 0) return null;
  return (
    <div style={{ flex: 1 }}>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        color: 'var(--color-text-tertiary)',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottom: '1px solid var(--color-border)',
      }}>
        {title}
      </div>
      {players.map((p, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0',
          fontSize: 12,
        }}>
          <span style={{
            width: 18,
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-tertiary)',
          }}>
            {p.position || p.pos || '—'}
          </span>
          <span style={{ fontWeight: 500 }}>{p.name}</span>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {p.teamAbbrev || p.team || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function MovementSection({ title, teams, direction, showReason }) {
  if (!teams || teams.length === 0) return null;
  const isUp = direction === 'up';
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
        color: isUp ? 'var(--color-win)' : 'var(--color-loss)',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 12 }}>{isUp ? '↑' : '↓'}</span>
        {title}
      </div>
      {teams.map((team, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 12,
        }}>
          <span style={{ fontWeight: 500 }}>{team.name}</span>
          <span style={{
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}>
            {showReason ? team.reason : (team.record || `${team.wins}-${team.losses}`)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PlayoffEndModal({ isOpen, data, onBeginOffseason }) {
  const [activeAwardsTier, setActiveAwardsTier] = useState(1);
  
  if (!isOpen || !data) return null;

  const {
    season,
    userTeam,
    userResult,
    champions,
    awards,
    promoted,
    relegated,
  } = data;

  const tierAwards = awards?.[`t${activeAwardsTier}`] || {};

  // Format user result text
  const getUserResultText = () => {
    if (!userResult) return null;
    if (userResult.isChampion) return 'Champions';
    if (userResult.round === 'Did not qualify') return 'Did not qualify';
    return `${userResult.eliminated ? 'Eliminated' : 'Lost'} in ${userResult.round}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} maxWidth={760} zIndex={1400}>
      {/* Header */}
      <div style={{
        padding: '32px 32px 24px',
        textAlign: 'center',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontSize: 9,
          fontWeight: 500,
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--color-text-tertiary)',
          marginBottom: 10,
        }}>
          Postseason Complete
        </div>
        <div style={{
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          marginBottom: 16,
        }}>
          {season} Playoffs
        </div>

        {/* User's Result */}
        {userTeam && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 18px',
            background: 'var(--color-bg-sunken)',
            border: '1px solid var(--color-border)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{userTeam.name}</span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>·</span>
            <span style={{
              fontSize: 12,
              color: userResult?.isChampion ? 'var(--color-win)' : 'var(--color-text-secondary)',
            }}>
              {getUserResultText()}
            </span>
            {userResult?.opponent && !userResult?.isChampion && (
              <span style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}>
                {userResult.record} vs {userResult.opponent}
              </span>
            )}
          </div>
        )}
      </div>

      <ModalBody style={{ padding: 0 }}>
        {/* Champions Section */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.08em',
            color: 'var(--color-text-tertiary)',
            marginBottom: 16,
          }}>
            CHAMPIONS
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <ChampionCard tier={1} team={champions?.t1} />
            <ChampionCard tier={2} team={champions?.t2} />
            <ChampionCard tier={3} team={champions?.t3} />
          </div>
        </div>

        {/* Awards Section */}
        {awards && (
          <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{
                fontSize: 10,
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.08em',
                color: 'var(--color-text-tertiary)',
              }}>
                SEASON AWARDS
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[1, 2, 3].map(t => (
                  <TierTab
                    key={t}
                    tier={t}
                    active={activeAwardsTier === t}
                    onClick={() => setActiveAwardsTier(t)}
                  />
                ))}
              </div>
            </div>

            {/* Individual Awards */}
            <div style={{ marginBottom: 20 }}>
              <AwardRow label="MVP" player={tierAwards.mvp} />
              <AwardRow label="DPOY" player={tierAwards.dpoy} />
              <AwardRow label="ROY" player={tierAwards.roy} />
              <AwardRow label="SIXTH MAN" player={tierAwards.sixthMan} />
              <AwardRow label="MOST IMPROVED" player={tierAwards.mostImproved} />
            </div>

            {/* All-League Teams */}
            {(tierAwards.allLeagueFirst?.length > 0 || tierAwards.allLeagueSecond?.length > 0) && (
              <div style={{ display: 'flex', gap: 32, marginTop: 24 }}>
                <AllLeagueTeam title="ALL-LEAGUE FIRST TEAM" players={tierAwards.allLeagueFirst} />
                <AllLeagueTeam title="ALL-LEAGUE SECOND TEAM" players={tierAwards.allLeagueSecond} />
              </div>
            )}
          </div>
        )}

        {/* Tier Movement Section */}
        {(promoted || relegated) && (
          <div style={{ padding: '24px 32px' }}>
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              color: 'var(--color-text-tertiary)',
              marginBottom: 16,
            }}>
              TIER MOVEMENT
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40 }}>
              <div>
                <MovementSection title="PROMOTED TO T1" teams={promoted?.toT1} direction="up" showReason />
                <MovementSection title="PROMOTED TO T2" teams={promoted?.toT2} direction="up" showReason />
              </div>
              <div>
                <MovementSection title="RELEGATED FROM T1" teams={relegated?.fromT1} direction="down" />
                <MovementSection title="RELEGATED FROM T2" teams={relegated?.fromT2} direction="down" />
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      {/* Footer */}
      <ModalFooter style={{ justifyContent: 'center', padding: '20px 32px' }}>
        <Button
          variant="primary"
          onClick={onBeginOffseason}
          style={{ minWidth: 200, padding: '12px 36px', fontSize: 14 }}
        >
          Begin Offseason →
        </Button>
      </ModalFooter>
    </Modal>
  );
}
