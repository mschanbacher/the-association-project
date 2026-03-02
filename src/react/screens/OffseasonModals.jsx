import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Modal } from '../components/Modal.jsx';

/* ═══════════════════════════════════════════════════════════════
   OffseasonModals — intercepts legacy modal shows and re-renders
   their content inside React Modal containers.
   
   Strategy: Override classList.remove on each legacy modal element
   so that when legacy code tries to show a modal (by removing
   the 'hidden' class), we capture the content and show it in
   React instead. This fires synchronously at the exact point
   of the show call — no race conditions.
   ═══════════════════════════════════════════════════════════════ */

const MODAL_CONFIG = [
  { id: 'seasonEndModal',             key: 'seasonEnd',           content: 'seasonEndContent',              title: '🏁 Season Complete',             maxWidth: 1000 },
  { id: 'championshipPlayoffModal',   key: 'postseason',          content: 'championshipPlayoffContent',    title: '🏆 Postseason Results',          maxWidth: 1000 },
  { id: 'playoffModal',               key: 'playoff',             content: 'playoffContent',                title: '🏆 Playoffs',                   maxWidth: 1000 },
  { id: 'developmentModal',           key: 'development',         content: 'developmentSummary',            title: '🌟 Player Development Report',   maxWidth: 800 },
  { id: 'financialTransitionModal',   key: 'financialTransition', content: 'financialTransitionContent',    title: '💰 Financial Transition',        maxWidth: 900 },
  { id: 'complianceModal',            key: 'compliance',          content: 'complianceModalContent',        title: '📋 Roster Compliance',           maxWidth: 700 },
  { id: 'draftResultsModal',          key: 'draft',               content: null,                            title: '🎓 Draft Results',               maxWidth: 1200 },
  { id: 'freeAgencyModal',            key: 'freeAgency',          content: null,                            title: '🤝 Free Agency',                 maxWidth: 1100, noHeader: true },
  { id: 'collegeGradFAModal',         key: 'collegeGrad',         content: null,                            title: '🎓 College Graduate Free Agency', maxWidth: 1000, noHeader: true },
  { id: 'financeDashboardModal',      key: 'ownerMode',           content: null,                            title: '💼 Offseason Management',        maxWidth: 1100, noHeader: true },
  { id: 'rosterModal',                key: 'rosterMgmt',          content: null,                            title: '📋 Roster Management',           maxWidth: 1600, noHeader: true },
  { id: 'bracketViewerModal',         key: 'bracket',             content: 'bracketViewerContent',          title: '🏆 Bracket Viewer',              maxWidth: 1400 },
  { id: 'allStarModal',               key: 'allStar',             content: null,                            title: '⭐ All-Star Weekend',            maxWidth: 900, noHeader: true },
  { id: 'injuryModal',                key: 'injury',              content: null,                            title: '🏥 Injury Report',               maxWidth: 600, noHeader: true },
];

export function OffseasonModals() {
  const { refresh } = useGame();
  const [activeModal, setActiveModal] = useState(null);
  const [modalHTML, setModalHTML] = useState('');
  const [modalConfig, setModalConfig] = useState(null);

  // Patch legacy modal elements so classList.remove('hidden') routes to React
  useEffect(() => {
    const cleanups = [];

    MODAL_CONFIG.forEach(cfg => {
      const el = document.getElementById(cfg.id);
      if (!el) return;

      // Save original classList methods
      const origRemove = DOMTokenList.prototype.remove.bind(el.classList);

      // Create patched remove
      const patchedRemove = function(...args) {
        if (args.includes('hidden') || args[0] === 'hidden') {
          // Legacy is trying to show this modal — intercept!
          // Grab content
          const contentEl = cfg.content
            ? document.getElementById(cfg.content)
            : el.querySelector('.modal-content');
          const html = contentEl ? contentEl.innerHTML : '';

          if (html) {
            // Show in React instead — do NOT remove 'hidden' from legacy
            setModalHTML(html);
            setModalConfig(cfg);
            setActiveModal(cfg.key);
            console.log(`🔄 Intercepted: ${cfg.id} → React (${html.length} chars)`);
          } else {
            // No content captured — fall through to legacy
            console.warn(`⚠️ No content for ${cfg.id}, falling through to legacy`);
            origRemove(...args);
          }
          return;
        }
        origRemove(...args);
      };

      // Monkey-patch the specific element's classList.remove
      el.classList.remove = patchedRemove;

      cleanups.push(() => {
        el.classList.remove = origRemove;
      });
    });

    return () => cleanups.forEach(fn => fn());
  }, []);

  const handleClose = useCallback(() => {
    if (modalConfig) {
      // Ensure legacy modal has 'hidden' (it should, but be safe)
      const el = document.getElementById(modalConfig.id);
      if (el) el.classList.add('hidden');
    }
    setActiveModal(null);
    setModalHTML('');
    setModalConfig(null);
    refresh?.();
  }, [modalConfig, refresh]);

  if (!activeModal || !modalConfig || !modalHTML) return null;

  return (
    <Modal isOpen={true} onClose={handleClose} maxWidth={modalConfig.maxWidth} zIndex={1200} noBg>
      {!modalConfig.noHeader && (
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {modalConfig.title}
          </h2>
          <button onClick={handleClose} style={closeBtnStyle}>✕</button>
        </div>
      )}
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        padding: modalConfig.noHeader ? '24px' : '16px 24px 24px',
        borderRadius: modalConfig.noHeader ? 'var(--radius-xl)' : '0 0 var(--radius-xl) var(--radius-xl)',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative',
      }}>
        {modalConfig.noHeader && (
          <button onClick={handleClose} style={{ ...closeBtnStyle, position: 'sticky', top: 0, float: 'right', zIndex: 10, marginBottom: 8 }}>✕</button>
        )}
        <div
          dangerouslySetInnerHTML={{ __html: modalHTML }}
          style={{ color: '#e8e8e8', fontSize: '14px', lineHeight: '1.6' }}
        />
      </div>
    </Modal>
  );
}

const closeBtnStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  color: '#fff',
  borderRadius: '6px',
  padding: '4px 12px',
  cursor: 'pointer',
  fontSize: '14px',
};
