import React from 'react';

const cardStyles = {
  base: {
    background: 'var(--color-bg-raised)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border-subtle)',
    boxShadow: 'var(--shadow-sm)',
    overflow: 'hidden',
    transition: `box-shadow var(--duration-normal) var(--ease-out),
                 transform var(--duration-normal) var(--ease-out)`,
  },
  interactive: {
    cursor: 'pointer',
  },
  padding: {
    none: {},
    sm: { padding: 'var(--space-3) var(--space-4)' },
    md: { padding: 'var(--space-4) var(--space-5)' },
    lg: { padding: 'var(--space-6)' },
  },
};

export function Card({
  children,
  padding = 'md',
  interactive = false,
  onClick,
  style,
  className = '',
  ...props
}) {
  const handleHover = interactive ? {
    onMouseEnter: (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    },
    onMouseLeave: (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
      e.currentTarget.style.transform = 'translateY(0)';
    },
  } : {};

  return (
    <div
      className={`card ${className}`}
      style={{
        ...cardStyles.base,
        ...(interactive ? cardStyles.interactive : {}),
        ...(cardStyles.padding[padding] || {}),
        ...style,
      }}
      onClick={onClick}
      {...handleHover}
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
      marginBottom: 'var(--space-3)',
      ...style,
    }}>
      <div style={{
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--weight-semi)',
        color: 'var(--color-text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
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
    lg: 'var(--text-xl)',
    xl: 'var(--text-2xl)',
  };
  return (
    <div style={{
      fontSize: sizes[size] || sizes.lg,
      fontWeight: 'var(--weight-bold)',
      color: color || 'var(--color-text)',
      fontVariantNumeric: 'tabular-nums',
      lineHeight: 'var(--leading-tight)',
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
