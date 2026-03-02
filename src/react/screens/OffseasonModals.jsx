import React, { useState, useEffect, useMemo } from 'react';
import { useGame } from '../hooks/GameBridge.jsx';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal.jsx';
import { Button } from '../components/Button.jsx';
import { Badge } from '../components/Badge.jsx';

/* ═══════════════════════════════════════════════════════════════
   OffseasonModals — React wrapper for offseason phase content.

   Each legacy offseason modal populates an HTML container and
   unhides it. We intercept by:
   1. Watching for gameState.offseasonPhase changes
   2. Intercepting legacy modal show calls via window hooks
   3. Displaying React versions that read computed data from gameState
   4. Delegating to legacy continue functions on button clicks

   This file exports a single <OffseasonModals> component that
   manages all phase modals internally.
   ═══════════════════════════════════════════════════════════════ */

export function OffseasonModals() {
  const { gameState, refresh } = useGame();
  const [activeModal, setActiveModal] = useState(null);
  // Extra data from legacy hooks
  const [seasonEndHTML, setSeasonEndHTML] = useState('');
  const [postseasonHTML, setPostseasonHTML] = useState('');
  const [developmentHTML, setDevelopmentHTML] = useState('');
  const [financialTransitionHTML, setFinancialTransitionHTML] = useState('');
  const [complianceHTML, setComplianceHTML] = useState('');
  const [playoffHTML, setPlayoffHTML] = useState('');
  const [draftHTML, setDraftHTML] = useState('');
  const [freeAgencyHTML, setFreeAgencyHTML] = useState('');
  const [collegeGradHTML, setCollegeGradHTML] = useState('');
  const [ownerModeHTML, setOwnerModeHTML] = useState('');
  const [rosterMgmtHTML, setRosterMgmtHTML] = useState('');
  const [bracketHTML, setBracketHTML] = useState('');
  const [allStarHTML, setAllStarHTML] = useState('');
  const [injuryHTML, setInjuryHTML] = useState('');

  // Intercept legacy modal show calls
  useEffect(() => {
    // Use MutationObserver to detect when legacy code shows a modal
    const observeModals = [
      { id: 'seasonEndModal', key: 'seasonEnd', content: 'seasonEndContent', setter: setSeasonEndHTML },
      { id: 'championshipPlayoffModal', key: 'postseason', content: 'championshipPlayoffContent', setter: setPostseasonHTML },
      { id: 'playoffModal', key: 'playoff', content: 'playoffContent', setter: setPlayoffHTML },
      { id: 'developmentModal', key: 'development', content: 'developmentSummary', setter: setDevelopmentHTML },
      { id: 'financialTransitionModal', key: 'financialTransition', content: 'financialTransitionContent', setter: setFinancialTransitionHTML },
      { id: 'complianceModal', key: 'compliance', content: 'complianceModalContent', setter: setComplianceHTML },
      { id: 'draftResultsModal', key: 'draft', content: null, setter: setDraftHTML },
      { id: 'freeAgencyModal', key: 'freeAgency', content: null, setter: setFreeAgencyHTML },
      { id: 'collegeGradFAModal', key: 'collegeGrad', content: null, setter: setCollegeGradHTML },
      { id: 'financeDashboardModal', key: 'ownerMode', content: null, setter: setOwnerModeHTML },
      { id: 'rosterModal', key: 'rosterMgmt', content: null, setter: setRosterMgmtHTML },
      { id: 'bracketViewerModal', key: 'bracket', content: 'bracketViewerContent', setter: setBracketHTML },
      { id: 'allStarModal', key: 'allStar', content: null, setter: setAllStarHTML },
      { id: 'injuryModal', key: 'injury', content: null, setter: setInjuryHTML },
    ];

    // Use MutationObserver to detect when legacy code shows a modal
    const observers = [];
    observeModals.forEach(({ id, key, content, setter }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => {
          if (m.type === 'attributes' && m.attributeName === 'class') {
            const isVisible = !el.classList.contains('hidden');
            if (isVisible) {
              // Legacy just showed this modal — intercept it
              el.classList.add('hidden'); // re-hide legacy
              // Grab content from specific content div or from .modal-content
              const contentEl = content
                ? document.getElementById(content)
                : el.querySelector('.modal-content');
              if (contentEl) setter(contentEl.innerHTML);
              setActiveModal(key);
            }
          }
        });
      });

      observer.observe(el, { attributes: true, attributeFilter: ['class'] });
      observers.push(observer);
    });

    return () => {
      observers.forEach(o => o.disconnect());
    };
  }, []);

  const handleClose = (legacyCloseAction) => {
    setActiveModal(null);
    if (legacyCloseAction) legacyCloseAction();
    refresh?.();
  };

  // Also listen for legacy code hiding modals (e.g. onclick buttons inside the content)
  // When a legacy button hides its modal, we need to dismiss our React wrapper too
  useEffect(() => {
    const modalIds = [
      'seasonEndModal', 'championshipPlayoffModal', 'playoffModal',
      'developmentModal', 'financialTransitionModal', 'complianceModal',
      'draftResultsModal', 'freeAgencyModal', 'collegeGradFAModal',
      'financeDashboardModal',
    ];

    const handleLegacyHide = () => {
      // A brief delay so the legacy code finishes its work first
      setTimeout(() => {
        // If our active modal's legacy counterpart got hidden, dismiss React modal
        setActiveModal(prev => {
          if (!prev) return prev;
          const mapping = {
            seasonEnd: 'seasonEndModal',
            postseason: 'championshipPlayoffModal',
            playoff: 'playoffModal',
            development: 'developmentModal',
            financialTransition: 'financialTransitionModal',
            compliance: 'complianceModal',
            draft: 'draftResultsModal',
            freeAgency: 'freeAgencyModal',
            collegeGrad: 'collegeGradFAModal',
            ownerMode: 'financeDashboardModal',
            rosterMgmt: 'rosterModal',
            bracket: 'bracketViewerModal',
            allStar: 'allStarModal',
            injury: 'injuryModal',
          };
          const legacyId = mapping[prev];
          if (legacyId) {
            const el = document.getElementById(legacyId);
            if (el && el.classList.contains('hidden')) {
              return null; // Close React modal
            }
          }
          return prev;
        });
        refresh?.();
      }, 100);
    };

    // Poll periodically to detect legacy button-triggered closes
    const pollInterval = setInterval(handleLegacyHide, 300);

    return () => clearInterval(pollInterval);
  }, [refresh]);

  return (
    <>
      <LegacyContentModal
        isOpen={activeModal === 'seasonEnd'}
        title="🏁 Season Complete"
        html={seasonEndHTML}
        onClose={() => handleClose(() => {
          document.getElementById('seasonEndModal')?.classList.add('hidden');
        })}
        maxWidth={1000}
      />
      <LegacyContentModal
        isOpen={activeModal === 'postseason'}
        title="🏆 Postseason Results"
        html={postseasonHTML}
        onClose={() => handleClose(() => {
          document.getElementById('championshipPlayoffModal')?.classList.add('hidden');
        })}
        maxWidth={1000}
      />
      <LegacyContentModal
        isOpen={activeModal === 'playoff'}
        title="🏆 Playoffs"
        html={playoffHTML}
        onClose={() => handleClose(() => {
          document.getElementById('playoffModal')?.classList.add('hidden');
        })}
        maxWidth={1000}
      />
      <LegacyContentModal
        isOpen={activeModal === 'development'}
        title="🌟 Player Development Report"
        html={developmentHTML}
        onClose={() => handleClose(() => {
          document.getElementById('developmentModal')?.classList.add('hidden');
        })}
        maxWidth={800}
      />
      <LegacyContentModal
        isOpen={activeModal === 'financialTransition'}
        title="💰 Financial Transition"
        html={financialTransitionHTML}
        onClose={() => handleClose(() => {
          document.getElementById('financialTransitionModal')?.classList.add('hidden');
        })}
        maxWidth={900}
      />
      <LegacyContentModal
        isOpen={activeModal === 'compliance'}
        title="📋 Roster Compliance"
        html={complianceHTML}
        onClose={() => handleClose(() => {
          document.getElementById('complianceModal')?.classList.add('hidden');
        })}
        maxWidth={700}
      />
      <LegacyContentModal
        isOpen={activeModal === 'draft'}
        title="🎓 Draft Results"
        html={draftHTML}
        onClose={() => handleClose(() => {
          document.getElementById('draftResultsModal')?.classList.add('hidden');
        })}
        maxWidth={1200}
      />
      <LegacyContentModal
        isOpen={activeModal === 'freeAgency'}
        title="🤝 Free Agency"
        html={freeAgencyHTML}
        onClose={() => handleClose(() => {
          document.getElementById('freeAgencyModal')?.classList.add('hidden');
        })}
        maxWidth={1100}
        noHeader
      />
      <LegacyContentModal
        isOpen={activeModal === 'collegeGrad'}
        title="🎓 College Graduate Free Agency"
        html={collegeGradHTML}
        onClose={() => handleClose(() => {
          document.getElementById('collegeGradFAModal')?.classList.add('hidden');
        })}
        maxWidth={1000}
        noHeader
      />
      <LegacyContentModal
        isOpen={activeModal === 'ownerMode'}
        title="💼 Offseason Management"
        html={ownerModeHTML}
        onClose={() => handleClose(() => {
          document.getElementById('financeDashboardModal')?.classList.add('hidden');
        })}
        maxWidth={1100}
        noHeader
      />
      <LegacyContentModal
        isOpen={activeModal === 'rosterMgmt'}
        title="📋 Roster Management"
        html={rosterMgmtHTML}
        onClose={() => handleClose(() => {
          document.getElementById('rosterModal')?.classList.add('hidden');
        })}
        maxWidth={1600}
        noHeader
      />
      <LegacyContentModal
        isOpen={activeModal === 'bracket'}
        title="🏆 Bracket Viewer"
        html={bracketHTML}
        onClose={() => handleClose(() => {
          document.getElementById('bracketViewerModal')?.classList.add('hidden');
        })}
        maxWidth={1400}
      />
      <LegacyContentModal
        isOpen={activeModal === 'allStar'}
        title="⭐ All-Star Weekend"
        html={allStarHTML}
        onClose={() => handleClose(() => {
          document.getElementById('allStarModal')?.classList.add('hidden');
        })}
        maxWidth={900}
        noHeader
      />
      <LegacyContentModal
        isOpen={activeModal === 'injury'}
        title="🏥 Injury Report"
        html={injuryHTML}
        onClose={() => handleClose(() => {
          document.getElementById('injuryModal')?.classList.add('hidden');
        })}
        maxWidth={600}
        noHeader
      />
    </>
  );
}


/* ═══════════════════════════════════════════════════════════════
   LegacyContentModal — displays legacy HTML inside a React Modal.
   
   This is a bridge component: it takes innerHTML generated by
   UIRenderer and displays it inside our React Modal system.
   The content retains all onclick handlers from the legacy code
   since we use dangerouslySetInnerHTML.
   
   This approach lets us progressively migrate: the visual frame
   is React (blur backdrop, slide animation, ESC to close) while
   the content remains legacy HTML until we convert each piece.
   ═══════════════════════════════════════════════════════════════ */
function LegacyContentModal({ isOpen, title, html, onClose, maxWidth = 900, noHeader = false }) {
  if (!isOpen || !html) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth={maxWidth} zIndex={1200} noBg>
      {!noHeader && (
        <div style={{
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <h2 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-bold)', color: '#fff' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', borderRadius: 'var(--radius-sm)',
              padding: '4px 12px', cursor: 'pointer', fontSize: 'var(--text-sm)',
            }}
          >✕</button>
        </div>
      )}
      <div style={{
        background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
        padding: noHeader ? 'var(--space-5)' : 'var(--space-4) var(--space-5) var(--space-5)',
        borderRadius: noHeader ? 'var(--radius-xl)' : '0 0 var(--radius-xl) var(--radius-xl)',
        maxHeight: '80vh',
        overflowY: 'auto',
        position: 'relative',
      }}>
        {noHeader && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 12, right: 16,
              background: 'rgba(255,255,255,0.15)', border: 'none',
              color: '#fff', borderRadius: 'var(--radius-sm)',
              padding: '4px 12px', cursor: 'pointer', fontSize: '14px',
              zIndex: 10,
            }}
          >✕</button>
        )}
        <div
          className="legacy-offseason-content"
          dangerouslySetInnerHTML={{ __html: html }}
          style={{
            color: '#e8e8e8',
            fontSize: '14px',
            lineHeight: '1.6',
          }}
        />
      </div>
    </Modal>
  );
}
