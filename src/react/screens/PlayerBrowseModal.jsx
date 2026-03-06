import React, { useState, useMemo } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';
import { Badge } from '../components/Badge.jsx';
import { SparklineGrid } from '../visualizations/SparklineComponents.jsx';
import {
  HEX_AXES, hexComponentsFromAnalytics, hexComponentsFromProfile, hexToArray,
  HexChart, HexAxisTooltip, HexBreakdown, MiniHex,
  SectionLabel, ratingColor,
  PERCENTILE_STATS, MIN_GAMES_PERCENTILE, computePercentile, pctBarColor,
  LeaguePercentileSection, PlayerStatGrid, AttrBars,
} from '../visualizations/PlayerVisuals.jsx';

const POSITIONS = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'];
const MIN_GAMES_PCT = MIN_GAMES_PERCENTILE;

function fmtCurrency(amount) {
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000) return '$' + Math.round(amount / 1000) + 'K';
  return '$' + amount;
}

function executeTradeDirect(userTeam, aiTeam, userGiveIds, aiGiveIds, userGivesPicks, aiGivesPicks, gameState, engines) {
  const TE = engines.TradeEngine || window.TradeEngine;
  if (TE?.executeTrade) {
    TE.executeTrade({
      team1: userTeam, team2: aiTeam,
      team1GivesPlayerIds: userGiveIds, team2GivesPlayerIds: aiGiveIds,
      team1GivesPicks: userGivesPicks, team2GivesPicks: aiGivesPicks,
      applyTradePenalty: window.applyTradePenalty || (() => {}),
      initializePlayerChemistry: window.initializePlayerChemistry || (() => {}),
      tradeDraftPick: window.tradeDraftPick || (() => {}),
    });
  }
  if (gameState.tradeHistory) {
    const givePlayers = userGiveIds.map(id => userTeam.roster?.find(p => p.id === id)).filter(Boolean);
    const recvPlayers = aiGiveIds.map(id => aiTeam.roster?.find(p => p.id === id)).filter(Boolean);
    gameState.tradeHistory.push({
      season: gameState.currentSeason, date: gameState.currentDate, tier: gameState.currentTier,
      team1: { id: userTeam.id, name: userTeam.name },
      team2: { id: aiTeam.id, name: aiTeam.name },
      team1Gave: givePlayers.map(p => ({ id: p.id, name: p.name, position: p.position, rating: p.rating })),
      team2Gave: recvPlayers.map(p => ({ id: p.id, name: p.name, position: p.position, rating: p.rating })),
      type: 'user-proposed',
    });
  }
  window.saveGameState?.();
  if (window._notifyReact) window._notifyReact();
}

// ── Guard wrapper ─────────────────────────────────────────────────────────────
export function PlayerBrowseModal({ isOpen, mode, onClose }) {
  const { gameState } = useGame();
  if (!isOpen || !gameState?.userTeam) return null;
  return <PlayerBrowseModalInner mode={mode} onClose={onClose} />;
}

// ── Main component ────────────────────────────────────────────────────────────
function PlayerBrowseModalInner({ mode, onClose }) {
  const { gameState, engines } = useGame();
  const [posFilter, setPosFilter]             = useState('ALL');
  const [search, setSearch]                   = useState('');
  const [sortKey, setSortKey]                 = useState('rating');
  const [sortDir, setSortDir]                 = useState('desc');
  const [selectedTeamId, setSelectedTeamId]   = useState(null);
  const [expandedRightId, setExpandedRightId] = useState(null);
  const [expandedLeftId, setExpandedLeftId]   = useState(null);
  const [watchedIds, setWatchedIds] = useState(() => {
    const wl = gameState?.scoutingWatchList || [];
    return new Set(wl.map(w => String(w.id)));
  });

  // Trade state
  const [userGives, setUserGives]                   = useState([]);
  const [userReceives, setUserReceives]             = useState([]);
  const [userGivesPicks, setUserGivesPicks]         = useState([]);
  const [userReceivesPicks, setUserReceivesPicks]   = useState([]);
  const [tradeResult, setTradeResult]               = useState(null);

  const { StatEngine } = engines;
  const userTeam    = gameState.userTeam;
  const currentTier = gameState.currentTier || 1;
  const raw         = gameState._raw || gameState;

  const allTierTeams = useMemo(() => (
    currentTier === 1 ? gameState.tier1Teams
    : currentTier === 2 ? gameState.tier2Teams
    : gameState.tier3Teams || []
  ), [currentTier, gameState]);

  const otherTeams = useMemo(() =>
    (allTierTeams || [])
      .filter(t => String(t.id) !== String(userTeam.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [allTierTeams, userTeam.id]);

  const partnerTeam = useMemo(() =>
    selectedTeamId ? otherTeams.find(t => String(t.id) === String(selectedTeamId)) : null,
    [selectedTeamId, otherTeams]);

  const maxGames      = currentTier === 1 ? 82 : currentTier === 2 ? 60 : 40;
  const tradeDeadline = Math.floor(maxGames * 0.75);
  const gamesPlayed   = (userTeam.wins || 0) + (userTeam.losses || 0);
  const seasonComplete = raw.schedule?.every(g => g.played);
  const pastDeadline  = gamesPlayed >= tradeDeadline && !seasonComplete;

  const tierPool = useMemo(() => {
    const pool = [];
    (allTierTeams || []).forEach(t => {
      (t.roster || []).forEach(p => {
        if (!p.seasonStats || p.seasonStats.gamesPlayed < MIN_GAMES_PCT) return;
        const a = StatEngine?.getSeasonAverages?.(p);
        if (a) pool.push({ pos: p.position, avgs: a });
      });
    });
    return pool;
  }, [allTierTeams, StatEngine]);

  const fc = window.formatCurrency || fmtCurrency;

  const enrich = (players) => players.map(p => {
    const avgs      = StatEngine?.getSeasonAverages?.(p) || null;
    const analytics = StatEngine?.getPlayerAnalytics?.(p, null) || null;
    const hexObj    = analytics
      ? hexComponentsFromAnalytics(analytics, avgs)
      : hexComponentsFromProfile(p);
    const hex = hexObj
      ? HEX_AXES.map(ax => ({ label: ax.short, value: hexObj[ax.key] ?? 0, max: ax.max }))
      : null;
    return { ...p, _avgs: avgs, _analytics: analytics, _hexObj: hexObj, _hex: hex };
  });

  const userRosterEnriched = useMemo(() =>
    enrich([...(userTeam.roster || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0))),
    [userTeam.roster, StatEngine]);

  const rightRawPool = useMemo(() => {
    if (mode === 'freeAgents') return (gameState.freeAgents || []).map(p => ({ ...p, _teamName: 'Free Agent' }));
    if (!selectedTeamId) return [];
    const team = otherTeams.find(t => String(t.id) === String(selectedTeamId));
    return (team?.roster || []).map(p => ({ ...p, _teamName: team.name, _teamId: team.id }));
  }, [mode, gameState.freeAgents, selectedTeamId, otherTeams]);

  const rightEnriched = useMemo(() => enrich(rightRawPool), [rightRawPool, StatEngine]);

  const rightFiltered = useMemo(() => {
    let list = rightEnriched;
    if (posFilter !== 'ALL') list = list.filter(p => p.position === posFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'ppg':    va = a._avgs?.pointsPerGame   || 0; vb = b._avgs?.pointsPerGame   || 0; break;
        case 'rpg':    va = a._avgs?.reboundsPerGame || 0; vb = b._avgs?.reboundsPerGame || 0; break;
        case 'apg':    va = a._avgs?.assistsPerGame  || 0; vb = b._avgs?.assistsPerGame  || 0; break;
        case 'age':    va = a.age    || 0; vb = b.age    || 0; break;
        case 'salary': va = a.salary || 0; vb = b.salary || 0; break;
        default:       va = a.rating || 0; vb = b.rating || 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [rightEnriched, posFilter, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleWatch = (playerId) => {
    const idStr = String(playerId);
    const rc = window.rosterController || window.RosterController;
    if (watchedIds.has(idStr)) {
      rc?.removeFromWatchList?.(playerId);
      setWatchedIds(prev => { const n = new Set(prev); n.delete(idStr); return n; });
    } else {
      rc?.addToWatchList?.(playerId);
      setWatchedIds(prev => new Set([...prev, idStr]));
    }
  };

  // Trade handlers
  const resetTrade = () => {
    setUserGives([]); setUserReceives([]);
    setUserGivesPicks([]); setUserReceivesPicks([]);
    setTradeResult(null);
  };

  const handleSelectTeam = (teamId) => {
    setSelectedTeamId(teamId || null);
    setSearch(''); setPosFilter('ALL'); setExpandedRightId(null);
    resetTrade();
  };

  const toggleGive    = (id) => { setTradeResult(null); setUserGives(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); };
  const toggleReceive = (id) => { setTradeResult(null); setUserReceives(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); };

  const toggleGivePick = (pick) => {
    setTradeResult(null);
    setUserGivesPicks(prev => {
      const e = prev.some(p => p.originalTeamId === pick.originalTeamId && p.year === pick.year && p.round === pick.round);
      return e ? prev.filter(p => !(p.originalTeamId === pick.originalTeamId && p.year === pick.year && p.round === pick.round)) : [...prev, pick];
    });
  };
  const toggleReceivePick = (pick) => {
    setTradeResult(null);
    setUserReceivesPicks(prev => {
      const e = prev.some(p => p.originalTeamId === pick.originalTeamId && p.year === pick.year && p.round === pick.round);
      return e ? prev.filter(p => !(p.originalTeamId === pick.originalTeamId && p.year === pick.year && p.round === pick.round)) : [...prev, pick];
    });
  };

  const handlePropose = () => {
    const hasGives    = userGives.length > 0 || userGivesPicks.length > 0;
    const hasReceives = userReceives.length > 0 || userReceivesPicks.length > 0;
    if (!hasGives || !hasReceives || !partnerTeam) return;

    const userAfter = userTeam.roster.length - userGives.length + userReceives.length;
    const aiAfter   = partnerTeam.roster.length - userReceives.length + userGives.length;
    if (userAfter < 12 || userAfter > 15) {
      setTradeResult({ accepted: false, reason: `Your roster would have ${userAfter} players. Must be 12–15.` }); return;
    }
    if (aiAfter < 12 || aiAfter > 15) {
      setTradeResult({ accepted: false, reason: `${partnerTeam.name} would have ${aiAfter} players. Must be 12–15.` }); return;
    }

    const TE = engines.TradeEngine || window.TradeEngine;
    if (!TE?.evaluateTrade) { setTradeResult({ accepted: false, reason: 'Trade engine not available.' }); return; }

    const result = TE.evaluateTrade({
      userGivesPlayers:   userGives.map(id => userTeam.roster.find(p => p.id === id)).filter(Boolean),
      aiGivesPlayers:     userReceives.map(id => partnerTeam.roster.find(p => p.id === id)).filter(Boolean),
      userGivesPicks:     currentTier === 1 ? userGivesPicks : [],
      userReceivesPicks:  currentTier === 1 ? userReceivesPicks : [],
      aiTeam: partnerTeam,
      calculatePickValue: window.calculatePickValue || ((y, r) => r === 1 ? 30 : 15),
      getEffectiveCap:    window.getEffectiveCap || (() => 100000000),
      calculateTeamSalary: window.calculateTeamSalary || (() => 0),
      formatCurrency: fc,
    });

    setTradeResult(result);
    if (result.accepted) {
      if (window.executeTrade) {
        window.executeTrade(Number(selectedTeamId), userGives, userReceives, userGivesPicks, userReceivesPicks);
      } else {
        executeTradeDirect(userTeam, partnerTeam, userGives, userReceives, userGivesPicks, userReceivesPicks, raw, engines);
      }
      setTimeout(() => onClose(), 1800);
    }
  };

  const toggleLeft  = (id) => setExpandedLeftId(prev  => prev === id ? null : id);
  const toggleRight = (id) => setExpandedRightId(prev => prev === id ? null : id);

  const userPosCounts = useMemo(() => {
    const counts = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
    (userTeam.roster || []).forEach(p => { if (counts[p.position] != null) counts[p.position]++; });
    return counts;
  }, [userTeam.roster]);

  const totalSalary  = (userTeam.roster || []).reduce((s, p) => s + (p.salary || 0), 0);
  const cap          = userTeam.salaryCap || (currentTier === 1 ? 136000000 : currentTier === 2 ? 85000000 : 55000000);
  const capRemaining = cap - totalSalary;
  const hasGives     = userGives.length > 0 || userGivesPicks.length > 0;
  const hasReceives  = userReceives.length > 0 || userReceivesPicks.length > 0;

  return (
    <Modal isOpen={true} onClose={onClose} maxWidth={1140}>
      <ModalHeader onClose={onClose}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {mode === 'freeAgents' ? 'Free Agents' : 'Trade Center'}
          {mode === 'trade' && pastDeadline && <Badge variant="loss">Past Deadline</Badge>}
        </div>
      </ModalHeader>

      <ModalBody style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', height: '74vh' }}>

          {/* ══ LEFT: Your Roster ══ */}
          <div style={{ borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid var(--color-border-subtle)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Your Roster
                <span style={{ fontWeight: 400, marginLeft: 6 }}>{userTeam.roster?.length || 0}/15</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', textAlign: 'center', marginBottom: 6 }}>
                {['PG','SG','SF','PF','C'].map(pos => (
                  <div key={pos}>
                    <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{pos}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: userPosCounts[pos] === 0 ? 'var(--color-loss)' : 'var(--color-text)' }}>{userPosCounts[pos]}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                Cap space: <strong style={{ fontFamily: 'var(--font-mono)', color: capRemaining < 0 ? 'var(--color-loss)' : 'var(--color-text)' }}>{fc(capRemaining)}</strong>
              </div>
              {mode === 'trade' && partnerTeam && (
                <div style={{ marginTop: 6, fontSize: 9, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                  Click a player to include in trade
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {userRosterEnriched.map(p => (
                <div key={p.id}>
                  <RosterRow
                    player={p} fc={fc}
                    expanded={expandedLeftId === p.id}
                    onToggle={() => toggleLeft(p.id)}
                    tradeMode={mode === 'trade' && !!partnerTeam}
                    selected={userGives.includes(p.id)}
                    onSelect={() => toggleGive(p.id)}
                  />
                  {expandedLeftId === p.id && <PlayerDetailCompact player={p} tierPool={tierPool} />}
                </div>
              ))}
            </div>

            {mode === 'trade' && partnerTeam && currentTier === 1 && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 14px', flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Your Picks
                </div>
                <PicksList teamId={userTeam.id} selectedPicks={userGivesPicks} onToggle={toggleGivePick} gameState={raw} side="user" />
              </div>
            )}
          </div>

          {/* ══ RIGHT ══ */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {mode === 'trade' && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Browse Team</span>
                <select
                  value={selectedTeamId || ''}
                  onChange={e => handleSelectTeam(e.target.value)}
                  style={{ flex: 1, padding: '5px 8px', fontSize: 'var(--text-xs)', border: '1px solid var(--color-border)', background: 'var(--color-bg-sunken)', color: selectedTeamId ? 'var(--color-text)' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <option value="">— Select a team —</option>
                  {otherTeams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.wins || 0}–{t.losses || 0})</option>)}
                </select>
                {(userGives.length > 0 || userReceives.length > 0) && (
                  <span style={{ fontSize: 10, color: 'var(--color-accent)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {userGives.length} ↔ {userReceives.length}
                  </span>
                )}
              </div>
            )}

            {mode === 'freeAgents' && (
              <div style={{ padding: '10px 16px 8px', borderBottom: '1px solid var(--color-border-subtle)', fontSize: 10, color: 'var(--color-text-tertiary)', flexShrink: 0 }}>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available Free Agents</span>
                <span style={{ marginLeft: 8 }}>{rightFiltered.length} players · Watched players surface first in offseason FA</span>
              </div>
            )}

            {(mode === 'freeAgents' || selectedTeamId) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', borderBottom: '1px solid var(--color-border-subtle)', flexWrap: 'wrap', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 1 }}>
                  {POSITIONS.map(pos => (
                    <button key={pos} onClick={() => setPosFilter(pos)} style={{
                      padding: '3px 8px', fontSize: 10, border: 'none', cursor: 'pointer',
                      background: posFilter === pos ? 'var(--color-accent)' : 'transparent',
                      color: posFilter === pos ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
                      fontWeight: posFilter === pos ? 600 : 400, fontFamily: 'var(--font-body)',
                    }}>{pos === 'ALL' ? 'All' : pos}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                  {[{key:'rating',label:'OVR'},{key:'ppg',label:'PPG'},{key:'rpg',label:'RPG'},{key:'apg',label:'APG'},{key:'age',label:'Age'},{key:'salary',label:'Salary'}].map(s => (
                    <button key={s.key} onClick={() => handleSort(s.key)} style={{
                      padding: '3px 7px', fontSize: 10,
                      border: `1px solid ${sortKey === s.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                      background: sortKey === s.key ? 'var(--color-accent-bg)' : 'transparent',
                      color: sortKey === s.key ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                      fontWeight: sortKey === s.key ? 600 : 400, fontFamily: 'var(--font-body)', cursor: 'pointer',
                    }}>
                      {s.label}{sortKey === s.key && <span style={{marginLeft:2,fontSize:7}}>{sortDir==='desc'?'▼':'▲'}</span>}
                    </button>
                  ))}
                </div>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" style={{
                  padding: '3px 8px', fontSize: 'var(--text-xs)', width: 110,
                  border: '1px solid var(--color-border)', background: 'var(--color-bg-sunken)',
                  color: 'var(--color-text)', fontFamily: 'var(--font-body)',
                }} />
              </div>
            )}

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {mode === 'trade' && !selectedTeamId ? (
                <EmptyState>Select a team to browse their roster</EmptyState>
              ) : rightFiltered.length === 0 ? (
                <EmptyState>No players match your filters</EmptyState>
              ) : rightFiltered.map(p => (
                <div key={p.id}>
                  <PlayerCard
                    player={p} mode={mode}
                    isWatched={watchedIds.has(String(p.id))}
                    fc={fc} onWatch={toggleWatch}
                    userPosCounts={userPosCounts}
                    expanded={expandedRightId === p.id}
                    onToggle={() => toggleRight(p.id)}
                    selected={userReceives.includes(p.id)}
                    onSelect={mode === 'trade' && partnerTeam ? () => toggleReceive(p.id) : null}
                  />
                  {expandedRightId === p.id && <PlayerDetailFull player={p} tierPool={tierPool} currentTier={currentTier} />}
                </div>
              ))}
            </div>

            {mode === 'trade' && partnerTeam && currentTier === 1 && (
              <div style={{ borderTop: '1px solid var(--color-border)', padding: '8px 16px', flexShrink: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
                  Their Picks
                </div>
                <PicksList teamId={partnerTeam.id} selectedPicks={userReceivesPicks} onToggle={toggleReceivePick} gameState={raw} side="ai" />
              </div>
            )}
          </div>
        </div>

        {/* Trade summary bar */}
        {mode === 'trade' && partnerTeam && (
          <TradeSummaryBar
            userTeam={userTeam} partnerTeam={partnerTeam}
            userGives={userGives} userReceives={userReceives}
            userGivesPicks={userGivesPicks} userReceivesPicks={userReceivesPicks}
            tradeResult={tradeResult} fc={fc}
          />
        )}
      </ModalBody>

      {mode === 'trade' && partnerTeam && !pastDeadline && (
        <ModalFooter>
          <Button variant="ghost" onClick={resetTrade} disabled={!hasGives && !hasReceives}>Reset</Button>
          <Button
            variant="primary" onClick={handlePropose}
            disabled={!hasGives || !hasReceives || tradeResult?.accepted}
          >
            {tradeResult?.accepted ? '✓ Trade Accepted!' : 'Propose Trade'}
          </Button>
        </ModalFooter>
      )}
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Trade Summary Bar
// ══════════════════════════════════════════════════════════════════════════════
function TradeSummaryBar({ userTeam, partnerTeam, userGives, userReceives, userGivesPicks, userReceivesPicks, tradeResult, fc }) {
  const calcPickValue = window.calculatePickValue || ((y, r) => r === 1 ? 30 : 15);
  let givesVal = 0, givesSal = 0, receivesVal = 0, receivesSal = 0;
  userGives.forEach(id => { const p = userTeam.roster?.find(pl => pl.id === id); if (p) { givesVal += (p.rating || 0); givesSal += (p.salary || 0); }});
  userReceives.forEach(id => { const p = partnerTeam.roster?.find(pl => pl.id === id); if (p) { receivesVal += (p.rating || 0); receivesSal += (p.salary || 0); }});
  userGivesPicks.forEach(pick => { givesVal += calcPickValue(pick.year, pick.round); });
  userReceivesPicks.forEach(pick => { receivesVal += calcPickValue(pick.year, pick.round); });

  const net       = receivesVal - givesVal;
  const userAfter = (userTeam.roster?.length || 0) - userGives.length + userReceives.length;
  const givesNames    = [...userGives.map(id => userTeam.roster?.find(p => p.id === id)?.name || '?'), ...userGivesPicks.map(p => `${p.year} R${p.round}`)];
  const receivesNames = [...userReceives.map(id => partnerTeam.roster?.find(p => p.id === id)?.name || '?'), ...userReceivesPicks.map(p => `${p.year} R${p.round}`)];
  const hasAssets = givesNames.length > 0 || receivesNames.length > 0;

  return (
    <div style={{ borderTop: '2px solid var(--color-border)', background: 'var(--color-bg-raised)', padding: '10px 20px', minHeight: 50 }}>
      {!hasAssets ? (
        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', lineHeight: '30px' }}>
          ← Click a player on your roster to offer &nbsp;·&nbsp; Click a player on their roster to request
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>You send</span>
            {givesNames.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>nothing</span>
              : givesNames.map((n, i) => <span key={i} style={{ fontSize: 11, color: 'var(--color-loss)', fontWeight: 600, background: 'rgba(234,67,53,0.08)', padding: '2px 7px', border: '1px solid rgba(234,67,53,0.2)' }}>{n}</span>)
            }
          </div>
          <span style={{ fontSize: 16, color: 'var(--color-text-tertiary)', opacity: 0.4 }}>⇄</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>You receive</span>
            {receivesNames.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>nothing</span>
              : receivesNames.map((n, i) => <span key={i} style={{ fontSize: 11, color: 'var(--color-win)', fontWeight: 600, background: 'rgba(52,168,83,0.08)', padding: '2px 7px', border: '1px solid rgba(52,168,83,0.2)' }}>{n}</span>)
            }
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center', fontSize: 11 }}>
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              Value <strong style={{ color: 'var(--color-text)' }}>{Math.round(givesVal)}</strong> → <strong style={{ color: 'var(--color-text)' }}>{Math.round(receivesVal)}</strong>
            </span>
            <span style={{ fontWeight: 700, color: net > 3 ? 'var(--color-win)' : net < -3 ? 'var(--color-loss)' : 'var(--color-text-secondary)' }}>
              {net > 0 ? '+' : ''}{Math.round(net)} net
            </span>
            <span style={{ color: 'var(--color-text-tertiary)' }}>
              Roster after: <strong style={{ color: (userAfter < 12 || userAfter > 15) ? 'var(--color-loss)' : 'var(--color-text)' }}>{userAfter}/15</strong>
            </span>
          </div>
          {tradeResult && (
            <div style={{
              padding: '4px 10px',
              background: tradeResult.accepted ? 'rgba(52,168,83,0.1)' : 'rgba(234,67,53,0.1)',
              border: `1px solid ${tradeResult.accepted ? 'rgba(52,168,83,0.3)' : 'rgba(234,67,53,0.3)'}`,
              color: tradeResult.accepted ? 'var(--color-win)' : 'var(--color-loss)',
              fontSize: 12, fontWeight: 700,
            }}>
              {tradeResult.accepted ? '✓ Accepted' : `✗ Declined — ${tradeResult.reason || ''}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Picks list — compact toggleable pick chips
// ══════════════════════════════════════════════════════════════════════════════
function PicksList({ teamId, selectedPicks, onToggle, gameState, side }) {
  const currentYear = gameState.currentSeason || 2025;
  const picks = useMemo(() => {
    const result = [];
    const getOwner = window.getPickOwner || ((tid, y, r) => tid);
    for (let year = currentYear; year <= currentYear + 3; year++) {
      [1, 2].forEach(round => {
        const owned = getOwner(teamId, year, round) === teamId;
        result.push({ teamId, year, round, owned });
      });
    }
    return result;
  }, [teamId, currentYear]);

  const color   = side === 'user' ? 'var(--color-loss)' : 'var(--color-win)';
  const colorBg = side === 'user' ? 'rgba(234,67,53,0.08)' : 'rgba(52,168,83,0.08)';

  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {picks.map((pick, i) => {
        if (!pick.owned) return (
          <span key={i} style={{ fontSize: 9, padding: '2px 6px', color: 'var(--color-text-tertiary)', opacity: 0.35, border: '1px solid var(--color-border)', textDecoration: 'line-through' }}>
            {pick.year}R{pick.round}
          </span>
        );
        const selected = selectedPicks.some(p => p.originalTeamId === pick.teamId && p.year === pick.year && p.round === pick.round);
        return (
          <button key={i} onClick={() => onToggle({ originalTeamId: pick.teamId, year: pick.year, round: pick.round })} style={{
            fontSize: 9, padding: '2px 6px', cursor: 'pointer',
            border: `1px solid ${selected ? color : 'var(--color-border)'}`,
            background: selected ? colorBg : 'transparent',
            color: selected ? color : 'var(--color-text-tertiary)',
            fontWeight: selected ? 700 : 400, fontFamily: 'var(--font-body)',
          }}>
            {pick.year}R{pick.round}
          </button>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEFT PANEL — Roster row
// ══════════════════════════════════════════════════════════════════════════════
function RosterRow({ player: p, fc, expanded, onToggle, tradeMode, selected, onSelect }) {
  const rc  = ratingColor(p.rating || 0);
  const ppg = p._avgs?.pointsPerGame != null ? p._avgs.pointsPerGame.toFixed(1) : null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 14px', borderBottom: '1px solid var(--color-border-subtle)',
        fontSize: 'var(--text-xs)',
        background: selected ? 'rgba(234,67,53,0.09)' : expanded ? 'var(--color-accent-bg)' : 'transparent',
        borderLeft: selected ? '3px solid var(--color-loss)' : '3px solid transparent',
        transition: 'background 80ms',
      }}
    >
      {/* Trade checkbox — click to toggle selection */}
      {tradeMode && (
        <div
          onClick={onSelect}
          style={{
            width: 14, height: 14, flexShrink: 0, marginRight: 6, cursor: 'pointer',
            border: `2px solid ${selected ? 'var(--color-loss)' : 'var(--color-border)'}`,
            background: selected ? 'var(--color-loss)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, color: '#fff',
          }}
        >{selected && '✓'}</div>
      )}
      {/* Name area — in trade mode clicking selects; in browse mode clicking expands */}
      <div
        onClick={tradeMode ? onSelect : onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1, cursor: 'pointer' }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: rc, flexShrink: 0, minWidth: 24 }}>{p.rating}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{p.position} · {p.age}yo · {fc(p.salary || 0)}/{p.contractYears || 1}yr</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {ppg && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--color-text-secondary)' }}>{ppg}</span>}
        {/* Always show expand button — in trade mode it's the only way to expand */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{
            padding: '2px 5px', fontSize: 8, cursor: 'pointer',
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
          }}
        >{expanded ? '▲' : '▼'}</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LEFT PANEL — Compact detail
// ══════════════════════════════════════════════════════════════════════════════
function PlayerDetailCompact({ player: p }) {
  const [hoveredAxis, setHoveredAxis] = useState(null);
  const components = p._hexObj;
  if (!components) return null;

  return (
    <div style={{ padding: '12px 14px 16px', background: 'var(--color-accent-bg)', borderBottom: '1px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ratingColor(p.rating), lineHeight: 1 }}>{p.rating}</div>
          <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>OVR</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{p.offRating || '—'}</div>
          <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>OFF</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{p.defRating || '—'}</div>
          <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)' }}>DEF</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
        <HexChart components={components} size={160} hoveredAxis={hoveredAxis} onHoverAxis={setHoveredAxis} />
      </div>
      <HexBreakdown components={components} hoveredAxis={hoveredAxis} onHoverAxis={setHoveredAxis} />
      {p.gameLog && p.gameLog.length >= 3 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Season Arc</div>
          <SparklineGrid gameLog={p.gameLog} compact={true} />
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL — Full detail
// ══════════════════════════════════════════════════════════════════════════════
function PlayerDetailFull({ player: p, tierPool, currentTier }) {
  const [hoveredAxis, setHoveredAxis] = useState(null);
  const components   = p._hexObj;
  const avgs         = p._avgs;
  const analytics    = p._analytics;
  const isProjection = components?.isProjection;
  const total = components ? HEX_AXES.reduce((s, ax) => s + (components[ax.key] ?? 0), 0) : 0;

  const verdictColors = { great_deal: 'var(--color-win)', good_value: 'var(--color-win)', fair: 'var(--color-text-secondary)', overpaid: 'var(--color-loss)' };
  const verdictLabels = { great_deal: 'Great Deal', good_value: 'Good Value', fair: 'Fair', overpaid: 'Overpaid' };

  return (
    <div style={{ padding: '16px 20px 20px', background: 'var(--color-accent-bg)', borderBottom: '2px solid var(--color-border)' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', color: ratingColor(p.rating), lineHeight: 1 }}>{p.rating}</div>
          <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Overall</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{p.offRating || '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>OFF</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{p.defRating || '—'}</div>
            <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>DEF</div>
          </div>
        </div>
        {analytics?.role && <div style={{ fontSize: 11, color: 'var(--color-accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{analytics.role}</div>}
        <div style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 12 }}>
          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
            {window.formatCurrency?.(p.salary || 0) || `$${((p.salary||0)/1e6).toFixed(1)}M`} · {p.contractYears || 1}yr
          </div>
          {analytics?.contractVerdict && verdictLabels[analytics.contractVerdict] && (
            <div style={{ marginTop: 2, fontWeight: 600, fontSize: 11, color: verdictColors[analytics.contractVerdict] }}>{verdictLabels[analytics.contractVerdict]}</div>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}><PlayerStatGrid avgs={avgs} analytics={analytics} /></div>

      {components && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <SectionLabel style={{ marginBottom: 0 }}>Player Profile</SectionLabel>
            {isProjection && <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--color-warning)', border: '1px solid var(--color-warning)', padding: '1px 5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre-Season Projection</span>}
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <HexChart components={components} size={160} hoveredAxis={hoveredAxis} onHoverAxis={setHoveredAxis} />
              <div style={{ position: 'absolute', top: 0, left: 168, opacity: hoveredAxis !== null ? 1 : 0, pointerEvents: 'none', transition: 'opacity 100ms', zIndex: 10 }}>
                <HexAxisTooltip axis={hoveredAxis !== null ? HEX_AXES[hoveredAxis] : null} components={components} />
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <HexBreakdown components={components} hoveredAxis={hoveredAxis} onHoverAxis={setHoveredAxis} />
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--font-mono)', lineHeight: 1, color: total >= 60 ? 'var(--color-rating-elite)' : total >= 40 ? 'var(--color-rating-good)' : total >= 25 ? 'var(--color-rating-avg)' : 'var(--color-rating-poor)' }}>{total}</span>
                <div style={{ fontSize: 9, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value Score</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <LeaguePercentileSection avgs={avgs} tierPool={tierPool} playerPos={p.position} currentTier={currentTier} />
      </div>

      {p.gameLog && p.gameLog.length >= 3 && (
        <div style={{ marginBottom: 16 }}>
          <SectionLabel>Season Arc</SectionLabel>
          <SparklineGrid gameLog={p.gameLog} />
        </div>
      )}

      <AttrBars attributes={p.attributes} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RIGHT PANEL — Player card row
// ══════════════════════════════════════════════════════════════════════════════
function PlayerCard({ player: p, mode, isWatched, fc, onWatch, userPosCounts, expanded, onToggle, selected, onSelect }) {
  const rc       = ratingColor(p.rating || 0);
  const avgs     = p._avgs;
  const posCount = userPosCounts[p.position] || 0;
  const needsPos = posCount === 0;
  const deepPos  = posCount >= 3;

  const ppg = avgs?.pointsPerGame  != null ? avgs.pointsPerGame.toFixed(1)  : '—';
  const rpg = avgs?.reboundsPerGame != null ? avgs.reboundsPerGame.toFixed(1) : '—';
  const apg = avgs?.assistsPerGame  != null ? avgs.assistsPerGame.toFixed(1)  : '—';
  const ts  = avgs?.trueShootingPct != null ? (avgs.trueShootingPct * 100).toFixed(1) + '%' : '—';

  return (
    <div
      onClick={onSelect || onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 16px', borderBottom: '1px solid var(--color-border-subtle)',
        cursor: 'pointer',
        background: selected ? 'rgba(52,168,83,0.09)' : expanded ? 'var(--color-accent-bg)' : 'transparent',
        borderLeft: selected ? '3px solid var(--color-win)' : '3px solid transparent',
        transition: 'background 80ms',
      }}
    >
      {mode === 'trade' && (
        <div style={{
          width: 14, height: 14, flexShrink: 0,
          border: `2px solid ${selected ? 'var(--color-win)' : 'var(--color-border)'}`,
          background: selected ? 'var(--color-win)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 9, color: '#fff',
        }}>{selected && '✓'}</div>
      )}

      <div style={{ minWidth: 32, textAlign: 'center', fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: rc, lineHeight: 1 }}>{p.rating || '—'}</div>

      <div style={{ minWidth: 148, flex: '0 0 auto' }}>
        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 2 }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-inverse)', background: 'var(--color-text-secondary)', padding: '1px 4px' }}>{p.position}</span>
          <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>{p.age}yo</span>
          {needsPos && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-win)', border: '1px solid var(--color-win)', padding: '1px 3px' }}>NEED</span>}
          {deepPos  && <span style={{ fontSize: 8, color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border)', padding: '1px 3px' }}>deep</span>}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>
          {fc(p.salary || 0)}/yr · {p.contractYears ?? '?'}yr
          {p._teamName && p._teamName !== 'Free Agent' && <span style={{ marginLeft: 6 }}>{p._teamName}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '0 12px', borderLeft: '1px solid var(--color-border-subtle)', borderRight: '1px solid var(--color-border-subtle)' }}>
        <StatPill label="PPG" value={ppg} />
        <StatPill label="RPG" value={rpg} />
        <StatPill label="APG" value={apg} />
        <StatPill label="TS%"  value={ts}  />
      </div>

      <MiniHex components={p._hex} size={44} />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {mode === 'freeAgents' && (
          <button onClick={e => { e.stopPropagation(); onWatch(p.id); }} style={{
            padding: '4px 10px',
            border: `1px solid ${isWatched ? 'var(--color-accent)' : 'var(--color-border)'}`,
            background: isWatched ? 'var(--color-accent-bg)' : 'transparent',
            color: isWatched ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontWeight: isWatched ? 600 : 400, fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            {isWatched ? '★ Watching' : '☆ Watch'}
          </button>
        )}
        {/* In trade mode, a separate expand button to see stats without toggling selection */}
        {mode === 'trade' && (
          <button onClick={e => { e.stopPropagation(); onToggle(); }} style={{
            padding: '3px 7px', fontSize: 9, cursor: 'pointer',
            border: '1px solid var(--color-border)', background: 'transparent',
            color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-body)',
          }} title="View stats">
            {expanded ? '▲' : '▼'}
          </button>
        )}
        {mode === 'freeAgents' && (
          <span style={{ fontSize: 9, color: 'var(--color-text-tertiary)' }}>{expanded ? '▲' : '▼'}</span>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 36 }}>
      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text)', lineHeight: 1.2 }}>{value ?? '—'}</div>
      <div style={{ fontSize: 8, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginTop: 1 }}>{label}</div>
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>
      {children}
    </div>
  );
}
