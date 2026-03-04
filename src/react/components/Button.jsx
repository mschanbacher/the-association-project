import React from 'react';

const baseStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--space-2)',
  fontFamily: 'var(--font-body)',
  fontWeight: 'var(--weight-semi)',
  border: 'none',
  cursor: 'pointer',
  transition: 'all var(--duration-fast) ease',
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const variants = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
  },
  secondary: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text-secondary)',
  },
  danger: {
    background: 'var(--color-loss)',
    color: 'var(--color-text-inverse)',
  },
  success: {
    background: 'var(--color-win)',
    color: 'var(--color-text-inverse)',
  },
};

const sizes = {
  sm: { padding: '6px 12px', fontSize: 'var(--text-xs)' },
  md: { padding: '7px 14px', fontSize: 'var(--text-sm)' },
  lg: { padding: '10px 20px', fontSize: 'var(--text-base)' },
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  style,
  ...props
}) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;

  return (
    <button
      style={{
        ...baseStyle,
        ...v,
        ...s,
        ...(disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '0.85';
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.opacity = '';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function SimButton({ children, icon, onClick, disabled, variant = 'secondary', ...props }) {
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={disabled}
      onClick={onClick}
      style={{ minWidth: 0, fontVariantNumeric: 'tabular-nums' }}
      {...props}
    >
      {icon && <span style={{ fontSize: '0.9em' }}>{icon}</span>}
      {children}
    </Button>
  );
}
