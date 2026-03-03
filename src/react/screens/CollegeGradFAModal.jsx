import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';

const POSITIONS = ['ALL', 'PG', 'SG', 'SF', 'PF', 'C'];
const SORTS = [
  { key: 'rating', label: 'Rating' },
  { key: 'age', label: 'Age' },
  { key: 'salary', label: 'Salary' },
  { key: 'potential', label: 'Potential' },
];

export function CollegeGradFAModal({ isOpen, data, onClose }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [posFilter, setPosFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('rating');

  // Reset selection state when new select-phase data arrives
  const dataPhase = data?.phase || 'select';
  useEffect(() => {
    if (dataPhase === 'select') {
      setSelectedIds(new Set());
      setPosFilter('ALL');
      setSortBy('rating');
    }
  }, [dataPhase]);

  if (!isOpen || !data) return null;
  const fc = data.formatCurrency || (v => `$${(v / 1e6).toFixed(1)}M`);

  if (dataPhase === 'results' && data.results) {
    return (
      <Modal isOpen={isOpen} onClose={null} maxWidth={1000} zIndex={1300}>
        <ModalHeader>{'\ud83c\udf93'} College Graduate Signing Results</ModalHeader>
        <ModalBody style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <ResultsView results={data.results} onContinue={() => window.closeCollegeGradResults?.()} />
        </ModalBody>
      </Modal>
    );
  }

  return (
    <SelectionView
      data={data} fc={fc} selectedIds={selectedIds} setSelectedIds={setSelectedIds}
      posFilter={posFilter} setPosFilter={setPosFilter}
      sortBy={sortBy} setSortBy={setSortBy}
    />
  );
}

/* ── Selection Phase ── */
function SelectionView({ data, fc, selectedIds, setSelectedIds, posFilter, setPosFilter, sortBy, setSortBy }) {
  const { graduates = [], capSpace = 0, rosterSize = 0, season = 0 } = data;

  const filtered = useMemo(() => {
    let list = posFilter === 'ALL' ? [...graduates] : graduates.filter(g => g.position === posFilter);
    if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'age') list.sort((a, b) => a.age - b.age || b.rating - a.rating);
    else if (sortBy === 'salary') list.sort((a, b) => a.salary - b.salary);
    else if (sortBy === 'potential') list.sort((a, b) => b.projectedCeiling - a.projectedCeiling);
    return list;
  }, [graduates, posFilter, sortBy]);

  const selectedPlayers = useMemo(() =>
    graduates.filter(g => selectedIds.has(String(g.id))), [graduates, selectedIds]);

  const estCost = useMemo(() => selectedPlayers.reduce((s, p) => s + p.salary, 0), [selectedPlayers]);
  const remaining = capSpace - estCost;
  const rosterSpace = 15 - rosterSize;

  const toggle = (id) => {
    const idStr = String(id);
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(idStr)) next.delete(idStr); else next.add(idStr);
      return next;
    });
  };

  const handleSubmit = () => {
    if (selectedPlayers.length === 0) { alert('Select at least one player.'); return; }
    if (estCost > capSpace) { alert(`Selections cost ${fc(estCost)} but cap space is ${fc(capSpace)}.`); return; }
    if (selectedPlayers.length > rosterSpace) { alert(`Only ${rosterSpace} roster spot${rosterSpace !== 1 ? 's' : ''} available. You selected ${selectedPlayers.length}.`); return; }
    // Call controller to process
    const ids = selectedPlayers.map(p => String(p.id));
    window._cgSubmitOffers?.(ids);
  };

  return (
    <Modal isOpen={true} onClose={null} maxWidth={1100} zIndex={1300}>
      <ModalHeader>{'\ud83c\udf93'} College Graduate Free Agency</ModalHeader>
      <ModalBody style={{ maxHeight: '78vh', overflowY: 'auto' }}>
        {/* Info */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
          <strong>{graduates.length}</strong> college seniors entering the professional ranks {'\u00b7'} Class of {(season || 0) + 1}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
          <span style={{ fontWeight: 'var(--weight-bold)', color: 'var(--color-win)' }}>Cap Space: {fc(capSpace)}</span>
          <span style={{ color: 'var(--color-text-tertiary)', marginLeft: 'var(--space-2)' }}>Roster: {rosterSize}/15</span>
        </div>

        {/* Tally */}
        {selectedPlayers.length > 0 && (
          <div style={{
            textAlign: 'center', marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-bg-sunken)', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border-subtle)', fontSize: 'var(--text-sm)',
          }}>
            Selected: <strong>{selectedPlayers.length}</strong> {'\u00b7'} Est. Cost: <strong style={{ color: 'var(--color-warning)' }}>{fc(estCost)}</strong> {'\u00b7'} Remaining: <strong style={{ color: remaining >= 0 ? 'var(--color-win)' : 'var(--color-loss)' }}>{fc(remaining)}</strong>
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Position:</span>
            {POSITIONS.map(pos => (
              <button key={pos} onClick={() => setPosFilter(pos)} style={{
                padding: '3px 10px', fontSize: 'var(--text-xs)',
                background: posFilter === pos ? 'var(--color-accent)20' : 'var(--color-bg-active)',
                border: `1px solid ${posFilter === pos ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                borderRadius: 'var(--radius-sm)', color: posFilter === pos ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}>{pos === 'ALL' ? 'All' : pos}</button>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>Sort:</span>
            {SORTS.map(s => (
              <button key={s.key} onClick={() => setSortBy(s.key)} style={{
                padding: '3px 10px', fontSize: 'var(--text-xs)',
                background: sortBy === s.key ? 'var(--color-accent)20' : 'var(--color-bg-active)',
                border: `1px solid ${sortBy === s.key ? 'var(--color-accent)' : 'var(--color-border-subtle)'}`,
                borderRadius: 'var(--radius-sm)', color: sortBy === s.key ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}>{s.label}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--color-text-tertiary)' }}>No graduates match this filter.</div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-active)', position: 'sticky', top: 0, zIndex: 1 }}>
                  {['', 'Player', 'College', 'Pos', 'Age', 'OVR', 'Ceiling', 'Salary'].map((h, i) => (
                    <th key={i} style={{
                      padding: 'var(--space-2)', textAlign: i === 1 ? 'left' : i === 7 ? 'right' : 'center',
                      fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <GradRow key={p.id} player={p} isChecked={selectedIds.has(String(p.id))} onToggle={toggle} fc={fc} getRatingColor={data.getRatingColor} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <Button variant="primary" onClick={handleSubmit} disabled={selectedPlayers.length === 0}>
            {'\ud83d\udcdd'} Submit Offers ({selectedPlayers.length})
          </Button>
          <Button variant="ghost" onClick={() => window.skipCollegeGradFA?.()}>
            Skip {'\u2192'} Continue
          </Button>
        </div>
      </ModalBody>
    </Modal>
  );
}

/* ── Graduate Row ── */
function GradRow({ player, isChecked, onToggle, fc, getRatingColor }) {
  const p = player;
  const tierBadge = p.tier === 2
    ? <span style={{ background: 'var(--color-accent)30', padding: '1px 5px', borderRadius: 3, fontSize: '0.7em', marginLeft: 4 }}>T2</span>
    : <span style={{ background: 'var(--color-bg-active)', padding: '1px 5px', borderRadius: 3, fontSize: '0.7em', marginLeft: 4 }}>T3</span>;

  const ceilingColor = p.projectedCeiling >= 80 ? 'var(--color-win)' : p.projectedCeiling >= 70 ? 'var(--color-warning)' : 'var(--color-text-tertiary)';
  const ratingColor = getRatingColor ? getRatingColor(p.rating) : 'var(--color-text)';

  return (
    <tr style={{
      borderBottom: '1px solid var(--color-border-subtle)',
      background: isChecked ? 'var(--color-win)10' : 'transparent',
    }}>
      <td style={{ padding: 'var(--space-2)' }}>
        <input type="checkbox" checked={isChecked} onChange={() => onToggle(p.id)}
          style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--color-accent)' }} />
      </td>
      <td style={{ padding: 'var(--space-2)' }}>
        <strong>{p.name}</strong>{tierBadge}
        {p._measurables && (
          <div style={{ fontSize: '0.75em', color: 'var(--color-text-tertiary)' }}>{p._measurables}</div>
        )}
      </td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'center', fontSize: 'var(--text-xs)' }}>{'\ud83c\udf93'} {p.college}</td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'center', fontWeight: 'var(--weight-bold)' }}>{p.position}</td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>{p.age}</td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'center', fontWeight: 'var(--weight-bold)', color: ratingColor }}>
        {p.rating}
        {p.offRating !== undefined && (
          <div style={{ fontSize: '0.7em', opacity: 0.6, fontWeight: 'var(--weight-normal)' }}>{p.offRating}/{p.defRating}</div>
        )}
      </td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'center', color: ceilingColor }}>{'\u2191'}{p.projectedCeiling}</td>
      <td style={{ padding: 'var(--space-2)', textAlign: 'right' }}>{fc(p.salary)}</td>
    </tr>
  );
}

/* ── Results Phase ── */
function ResultsView({ results, onContinue }) {
  const { signed, lost, details } = results;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-lg)' }}>
        <span style={{ color: 'var(--color-win)', fontWeight: 'var(--weight-bold)' }}>{signed} signed</span>
        {lost > 0 && <span style={{ marginLeft: 'var(--space-3)', color: 'var(--color-loss)' }}>{lost} chose other teams</span>}
      </div>
      <div style={{ textAlign: 'left', maxWidth: 550, margin: '0 auto' }}>
        {details.map((r, i) => (
          <div key={i} style={{
            padding: 'var(--space-2)', borderBottom: '1px solid var(--color-border-subtle)',
            display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)',
          }}>
            <span><strong>{r.player.name}</strong> ({r.player.position}, {r.player.rating} OVR) — {'\ud83c\udf93'} {r.player.college}</span>
            <span style={{ color: r.signed ? 'var(--color-win)' : 'var(--color-loss)', fontWeight: 'var(--weight-bold)' }}>
              {r.signed ? '\u2705 Signed' : '\u274c Declined'}
            </span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-5)' }}>
        <Button variant="primary" onClick={onContinue}>Continue {'\u2192'}</Button>
      </div>
    </div>
  );
}
