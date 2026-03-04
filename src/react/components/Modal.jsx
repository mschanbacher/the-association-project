import React, { useEffect, useCallback } from 'react';

export function Modal({ isOpen, onClose, maxWidth = 700, children, zIndex = 1100, noBg = false }) {
  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape' && onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn var(--duration-normal) var(--ease-out)',
        padding: 'var(--space-6)',
      }}
    >
      <div style={{
        background: noBg ? 'transparent' : 'var(--color-bg-raised)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth,
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        animation: 'slideUp var(--duration-normal) var(--ease-out)',
        position: 'relative',
      }}>
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 'var(--space-4) var(--space-5)',
      borderBottom: '1px solid var(--color-border)',
    }}>
      <div style={{
        fontSize: 'var(--text-md)',
        fontWeight: 'var(--weight-bold)',
      }}>
        {children}
      </div>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'var(--color-bg-sunken)',
          border: 'none',
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
          transition: 'background var(--duration-fast) ease',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-bg-sunken)'}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, style }) {
  return (
    <div style={{ padding: 'var(--space-5)', ...style }}>
      {children}
    </div>
  );
}

export function ModalFooter({ children }) {
  return (
    <div style={{
      padding: 'var(--space-3) var(--space-5)',
      borderTop: '1px solid var(--color-border)',
      display: 'flex',
      justifyContent: 'center',
      gap: 'var(--space-2)',
    }}>
      {children}
    </div>
  );
}
