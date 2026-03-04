import React from 'react';

export function Card({
  children,
  padding = 'md',
  interactive = false,
  onClick,
  style,
  className = '',
  ...props
}) {
  const paddings = {
    none: {},
    sm: { padding: '10px 12px' },
    md: { padding: '14px 16px' },
    lg: { padding: '16px 20px' },
  };

  return (
    <div
      className={`card ${className}`}
      style={{
        background: 'var(--color-bg-raised)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        transition: 'box-shadow var(--duration-fast) ease',
        ...(interactive ? { cursor: 'pointer' } : {}),
        ...(paddings[padding] || {}),
        ...style,
      }}
      onClick={onClick}
      onMouseEnter={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      } : undefined}
      onMouseLeave={interactive ? (e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, style, action }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 'var(--space-2)',
      ...style,
    }}>
      <div style={{
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-semi)',
        color: 'var(--color-text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        {children}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardValue({ children, style, color, size = 'lg' }) {
  const sizes = {
    sm: 'var(--text-md)',
    md: 'var(--text-lg)',
    lg: 'var(--text-2xl)',
    xl: 'var(--text-3xl)',
  };
  return (
    <div style={{
      fontSize: sizes[size] || sizes.lg,
      fontWeight: 'var(--weight-bold)',
      color: color || 'var(--color-text)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 'var(--leading-tight)',
      letterSpacing: '-0.02em',
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardSubtext({ children, style }) {
  return (
    <div style={{
      fontSize: 'var(--text-sm)',
      color: 'var(--color-text-tertiary)',
      marginTop: 'var(--space-1)',
      ...style,
    }}>
      {children}
    </div>
  );
}
