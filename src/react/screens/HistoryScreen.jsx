import React, { useMemo } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Card } from '../components/Card.jsx';
import { Badge } from '../components/Badge.jsx';

const rankSuffix = n => {
  if (!n && n !== 0) return '';
  const v = n % 100;
  if (v >= 11 && v <= 13) return n + 'th';
  const last = n % 10;
  if (last === 1) return n + 'st';
  if (last === 2) return n + 'nd';
  if (last === 3) return n + 'rd';
  return n + 'th';
};
const winColor = (w, l) => {
  const total = (w || 0) + (l || 0);
  const p = total > 0 ? w / total : 0.5;
  return p >= 0.6 ? 'var(--color-win)' : p <= 0.4 ? 'var(--color-loss)' : 'var(--color-text)';
};
// Use real totalTeams from snapshot; fall back to known sizes for legacy entries
const getTotalTeams = ut => ut.totalTeams || (ut.tier === 1 ? 30 : ut.tier === 2 ? 86 : 144);
const tierLabel = t => ({ 1: 'Tier 1 · NAPL', 2: 'Tier 2 · NARBL', 3: 'Tier 3 · MBL' })[t] || `Tier ${t}`;

export function HistoryScreen() {
  const { gameState, isReady } = useGame();

  if (!isReady || !gameState) return <Loader text="Loading history…" />;

  const history = gameState._raw?._fullSeasonHistory || gameState._raw?.fullSeasonHistory || [];

  if (history.length === 0) {
    return (
      <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-6)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: 0, marginBottom: 'var(--space-6)' }}>
          Franchise History
        </h2>
        <Card padding="lg">
          <div style={{ textAlign: 'center', padding: 'var(--space-10) 0', color: 'var(--color-text-tertiary)' }}>
            <p style={{ fontSize: 'var(--text-md)', marginBottom: 'var(--space-2)' }}>No completed seasons yet.</p>
            <p style={{ fontSize: 'var(--text-sm)' }}>Complete your first season to start building your franchise history.</p>
          </div>
        </Card>
      </div>
    );
  }

  const stats = useMemo(() => {
    let wins = 0, losses = 0, championships = 0, playoffApps = 0;
    history.forEach(s => {
      const ut = s.userTeam;
      if (!ut) return;
      wins += ut.wins || 0;
      losses += ut.losses || 0;
      const po = ut.playoff;
      if (po && po.result !== 'missed') playoffApps++;
      if (po && po.result === 'champion') championships++;
      else if (!po && s.champions) {
        const champ = ut.tier === 1 ? s.champions.tier1 : ut.tier === 2 ? s.champions.tier2 : s.champions.tier3;
        if (champ && champ.id === ut.id) championships++;
      }
    });
    const total = wins + losses;
    const pct = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
    return { wins, losses, championships, pct, seasons: history.length, playoffApps };
  }, [history]);

  const sorted = useMemo(() =>
    [...history].sort((a, b) => {
      const aYear = parseInt((a.seasonLabel || a.season || '').split('-')[0]) || 0;
      const bYear = parseInt((b.seasonLabel || b.season || '').split('-')[0]) || 0;
      return bYear - aYear;
    }), [history]);

  return (
    <div style={{
      maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-6)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
    }}>
      <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--weight-bold)', margin: 0 }}>
        Franchise History
      </h2>

      {/* All-time summary */}
      <Card padding="lg" className="animate-slide-up">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', textAlign: 'center' }}>
          <AllTimeStat label="Seasons"        value={stats.seasons}                color="var(--color-info)" />
          <AllTimeStat label="All-Time Record" value={`${stats.wins}–${stats.losses}`} color="var(--color-win)" />
          <AllTimeStat label="Playoff Apps"   value={stats.playoffApps}            color="var(--color-accent)" />
          <AllTimeStat label="Championships"  value={stats.championships}           color="var(--color-tier1)" />
        </div>
      </Card>

      {/* Season Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {sorted.map((season, i) => (
          <SeasonCard key={season.season || i} season={season} />
        ))}
      </div>
    </div>
  );
}

/* ─── Playoff Badge ────────────────────────────────────────────────── */
function PlayoffBadge({ playoff }) {
  if (!playoff) return null;
  const { result, label, seed, conf } = playoff;

  if (result === 'missed') {
    return (
      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
        Missed Playoffs
      </span>
    );
  }

  const isChamp = result === 'champion';
  const seedStr = seed ? `#${seed} ${conf || ''} · ` : '';

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', fontSize: 11, fontWeight: 600,
      background: isChamp ? 'var(--color-accent-bg)' : 'rgba(102,126,234,0.08)',
      border: `1px solid ${isChamp ? 'var(--color-accent-border)' : 'rgba(102,126,234,0.3)'}`,
      color: isChamp ? 'var(--color-accent)' : '#667eea',
    }}>
      {isChamp && '🏆 '}
      {seedStr}{label}
    </span>
  );
}

/* ─── MVP Stats Panel ──────────────────────────────────────────────── */
function MVPPanel({ topPlayer }) {
  if (!topPlayer) return null;
  const hasPts = topPlayer.ppg > 0;

  const blurb = (() => {
    if (!hasPts) return null;
    const { ppg, rpg, apg, spg, bpg, fgPct } = topPlayer;
    const parts = [];
    if (ppg >= 25) parts.push('elite scorer');
    else if (ppg >= 20) parts.push('reliable scorer');
    else if (ppg >= 15) parts.push('solid contributor');
    if (apg >= 7) parts.push('playmaking threat');
    else if (apg >= 5) parts.push('facilitator');
    if (rpg >= 10) parts.push('dominant rebounder');
    else if (rpg >= 7) parts.push('strong rebounder');
    if (spg >= 1.5 || bpg >= 1.5) parts.push('defensive anchor');
    if (fgPct >= 52) parts.push('efficient shooter');
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : null;
  })();

  return (
    <div style={{
      marginTop: 'var(--space-3)', padding: '10px 12px',
      background: 'var(--color-bg-page)',
      border: '1px solid var(--color-border-subtle)',
      borderLeft: '2px solid var(--color-accent)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasPts ? 8 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-bold)' }}>{topPlayer.name}</span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 5px',
            background: 'var(--color-bg-sunken)', color: 'var(--color-text-secondary)',
            border: '1px solid var(--color-border-subtle)',
          }}>{topPlayer.position}</span>
          {blurb && (
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              {blurb}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)' }}>
          {topPlayer.rating} OVR
        </span>
      </div>

      {hasPts && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <StatPill label="PPG" value={topPlayer.ppg} />
            <StatPill label="RPG" value={topPlayer.rpg} />
            <StatPill label="APG" value={topPlayer.apg} />
            {topPlayer.spg > 0 && <StatPill label="SPG" value={topPlayer.spg} />}
            {topPlayer.bpg > 0 && <StatPill label="BPG" value={topPlayer.bpg} />}
          </div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
            FG {topPlayer.fgPct}%
            {topPlayer.threePct > 0 && ` · 3P ${topPlayer.threePct}%`}
            {topPlayer.ftPct > 0  && ` · FT ${topPlayer.ftPct}%`}
            {topPlayer.gamesPlayed > 0 && ` · ${topPlayer.gamesPlayed} GP`}
          </div>
        </>
      )}
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '3px 8px', background: 'var(--color-bg-sunken)',
      border: '1px solid var(--color-border-subtle)', minWidth: 40,
    }}>
      <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>{value}</span>
      <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </span>
    </div>
  );
}

/* ─── Season Card ──────────────────────────────────────────────────── */
function SeasonCard({ season }) {
  const ut = season.userTeam;
  if (!ut) return null;

  const isChampion = ut.playoff?.result === 'champion' ||
    (season.champions && (() => {
      const champ = ut.tier === 1 ? season.champions.tier1 : ut.tier === 2 ? season.champions.tier2 : season.champions.tier3;
      return champ && champ.id === ut.id;
    })());

  let promoRelStatus = null;
  if (season.promotions) {
    if ([...(season.promotions.toT1 || []), ...(season.promotions.toT2 || [])].some(t => t.id === ut.id))
      promoRelStatus = 'promoted';
  }
  if (season.relegations) {
    if ([...(season.relegations.fromT1 || []), ...(season.relegations.fromT2 || [])].some(t => t.id === ut.id))
      promoRelStatus = 'relegated';
  }

  const tierAwards = season.awards
    ? (ut.tier === 1 ? season.awards.tier1 : ut.tier === 2 ? season.awards.tier2 : season.awards.tier3)
    : null;
  const userAwards = [];
  if (tierAwards) {
    const awardLabels = { mvp: 'MVP', dpoy: 'DPOY', roy: 'ROY', sixthMan: '6MOY', mostImproved: 'MIP' };
    Object.entries(awardLabels).forEach(([key, label]) => {
      if (tierAwards[key]?.teamId === ut.id) userAwards.push({ label, name: tierAwards[key].name });
    });
  }

  const champLine = season.champions ? [
    season.champions.tier1 ? `T1: ${season.champions.tier1.name}` : null,
    season.champions.tier2 ? `T2: ${season.champions.tier2.name}` : null,
    season.champions.tier3 ? `T3: ${season.champions.tier3.name}` : null,
  ].filter(Boolean).join(' · ') : '';

  return (
    <Card padding="lg" className="animate-slide-up" style={isChampion ? {
      borderColor: 'var(--color-accent-border)', background: 'var(--color-accent-bg)',
    } : {}}>
      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)' }}>
            {season.seasonLabel || season.season}
          </span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
            {tierLabel(ut.tier)}
          </span>
          {promoRelStatus === 'promoted' && <Badge variant="win">Promoted</Badge>}
          {promoRelStatus === 'relegated' && <Badge variant="loss">Relegated</Badge>}
        </div>
        <span style={{
          fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)',
          color: winColor(ut.wins, ut.losses), fontVariantNumeric: 'tabular-nums',
        }}>
          {ut.wins}–{ut.losses}
        </span>
      </div>

      {/* Standing + coach */}
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)' }}>
        Finished {rankSuffix(ut.rank)} of {getTotalTeams(ut)} · Coach: {ut.coachName || '—'}
      </div>

      {/* Playoff badge */}
      {ut.playoff && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <PlayoffBadge playoff={ut.playoff} />
        </div>
      )}

      {/* MVP panel */}
      <MVPPanel topPlayer={ut.topPlayer} />

      {/* User awards */}
      {userAwards.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
          {userAwards.map((a, i) => (
            <Badge key={i} variant="accent">{a.label}: {a.name}</Badge>
          ))}
        </div>
      )}

      {/* League MVP + champions footnote */}
      {(tierAwards?.mvp || champLine) && (
        <div style={{
          marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)',
          borderTop: '1px solid var(--color-border-subtle)',
          fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          {tierAwards?.mvp && (
            <span>
              League MVP: {tierAwards.mvp.name} ({tierAwards.mvp.team}) — {tierAwards.mvp.ppg?.toFixed(1)} PPG, {tierAwards.mvp.rpg?.toFixed(1)} RPG, {tierAwards.mvp.apg?.toFixed(1)} APG
            </span>
          )}
          {champLine && <span>Champions: {champLine}</span>}
        </div>
      )}
    </Card>
  );
}

/* ─── Helpers ──────────────────────────────────────────────────────── */
function AllTimeStat({ label, value, color }) {
  return (
    <div>
      <div style={{
        fontSize: 'var(--text-2xl)', fontWeight: 'var(--weight-bold)',
        color, fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>{label}</div>
    </div>
  );
}

function Loader({ text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', color: 'var(--color-text-tertiary)',
    }}>{text}</div>
  );
}
