import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';

/* ═══════════════════════════════════════════════════════════════
   OffseasonModals — intercepts legacy modal shows and renders
   their content inside a React-controlled overlay.
   
   Key insight: we can't just copy innerHTML because programmatic
   event handlers (el.onclick = fn) don't survive innerHTML copies.
   Instead, we MOVE the actual .modal-content DOM node from the
   hidden legacy modal into our React overlay container. This
   preserves all event handlers, both inline and programmatic.
   
   When closing, we move the node back to its original parent.
   ═══════════════════════════════════════════════════════════════ */

const MODAL_CONFIG = [
  { id: 'seasonEndModal',             title: '🏁 Season Complete',               maxWidth: 1000 },
  { id: 'championshipPlayoffModal',   title: '🏆 Postseason Results',            maxWidth: 1000 },
  { id: 'playoffModal',               title: '🏆 Playoffs',                     maxWidth: 1000 },
  { id: 'developmentModal',           title: '🌟 Player Development Report',     maxWidth: 800 },
  { id: 'financialTransitionModal',   title: '💰 Financial Transition',          maxWidth: 900 },
  { id: 'complianceModal',            title: '📋 Roster Compliance',             maxWidth: 700 },
  { id: 'draftResultsModal',          title: '🎓 Draft Results',                 maxWidth: 1200 },
  { id: 'freeAgencyModal',            title: '🤝 Free Agency',                   maxWidth: 1100 },
  { id: 'collegeGradFAModal',         title: '🎓 College Graduate Free Agency',  maxWidth: 1000 },
  { id: 'financeDashboardModal',      title: '💼 Offseason Management',          maxWidth: 1100 },
  { id: 'rosterModal',                title: '📋 Roster Management',             maxWidth: 1600 },
  { id: 'bracketViewerModal',         title: '🏆 Bracket Viewer',                maxWidth: 1400 },
  { id: 'allStarModal',               title: '⭐ All-Star Weekend',              maxWidth: 900 },
  { id: 'injuryModal',                title: '🏥 Injury Report',                 maxWidth: 700 },
  { id: 'contractDecisionsModal',     title: '📝 Contract Decisions',            maxWidth: 900 },
  { id: 'coachModal',                 title: '🎓 Coach Management',              maxWidth: 1100 },
  { id: 'calendarModal',              title: '📅 Calendar',                      maxWidth: 1100 },
];

export function OffseasonModals() {
  const { refresh } = useGame();
  const [activeCfg, setActiveCfg] = useState(null);
  const containerRef = useRef(null);
  // Track the original parent and the moved content node
  const movedRef = useRef({ contentNode: null, originalParent: null });

  // Patch legacy modals
  useEffect(() => {
    const cleanups = [];

    MODAL_CONFIG.forEach(cfg => {
      const el = document.getElementById(cfg.id);
      if (!el) return;

      const origRemove = DOMTokenList.prototype.remove.bind(el.classList);

      el.classList.remove = function (...args) {
        if (args.includes('hidden') || args[0] === 'hidden') {
          // Intercept — show in React overlay
          setActiveCfg(cfg);
          console.log(`🔄 Intercepted: ${cfg.id}`);
          return; // Don't actually show the legacy modal
        }
        origRemove(...args);
      };

      cleanups.push(() => { el.classList.remove = origRemove; });
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  // When activeCfg changes, move the DOM content node into our container
  useEffect(() => {
    if (!activeCfg || !containerRef.current) return;

    const legacyModal = document.getElementById(activeCfg.id);
    if (!legacyModal) return;

    // Find the .modal-content child
    const contentNode = legacyModal.querySelector('.modal-content') || legacyModal.querySelector('[class*="modal"]') || legacyModal.firstElementChild;
    if (!contentNode) return;

    // Save reference for restore
    movedRef.current = { contentNode, originalParent: legacyModal };

    // Move the actual DOM node into our React container
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(contentNode);

    // Make sure content is visible (in case it had display:none)
    contentNode.style.display = '';
    contentNode.style.maxHeight = '80vh';
    contentNode.style.overflowY = 'auto';
  }, [activeCfg]);

  const handleClose = useCallback(() => {
    // Move the content node back to its original parent
    const { contentNode, originalParent } = movedRef.current;
    if (contentNode && originalParent) {
      originalParent.appendChild(contentNode);
      // Reset inline overrides
      contentNode.style.maxHeight = '';
      contentNode.style.overflowY = '';
    }
    movedRef.current = { contentNode: null, originalParent: null };

    // Ensure legacy modal stays hidden
    if (activeCfg) {
      const el = document.getElementById(activeCfg.id);
      if (el) el.classList.add('hidden');
    }

    setActiveCfg(null);
    refresh?.();
  }, [activeCfg, refresh]);

  // Also watch for the legacy code hiding the modal from the inside
  // (e.g. an onclick handler calls classList.add('hidden'))
  useEffect(() => {
    if (!activeCfg) return;

    const check = setInterval(() => {
      const el = document.getElementById(activeCfg.id);
      // If the legacy element got 'hidden' added back by an inside button,
      // that means the user completed the interaction
      if (el && el.classList.contains('hidden')) {
        // But we need to check if it's because WE never removed it (it's always hidden)
        // vs a button inside added it. Check if our container still has the content.
        if (containerRef.current && containerRef.current.children.length > 0) {
          // Content is still in our container — the legacy add('hidden') was from
          // a button inside. That's fine — the legacy flow continues.
          // But if a NEW modal was intercepted, activeCfg changed already.
          // If the content was an injury confirm that should close this modal:
          // We don't need to do anything because the next modal intercept or 
          // sim resume will naturally proceed.
        }
      }
    }, 300);

    return () => clearInterval(check);
  }, [activeCfg]);

  // Listen for new interceptions that should replace the current one
  // This happens naturally through setActiveCfg — the old content gets
  // returned and new content gets moved in.

  // ESC to close
  useEffect(() => {
    if (!activeCfg) return;
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [activeCfg, handleClose]);

  if (!activeCfg) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          maxWidth: activeCfg.maxWidth,
          width: '100%',
          animation: 'slideUp 0.2s ease-out',
          position: 'relative',
        }}
      >
        {/* The actual legacy .modal-content gets moved here */}
        <div ref={containerRef} />
      </div>
    </div>
  );
}
