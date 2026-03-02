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
  transition: `all var(--duration-normal) var(--ease-out)`,
  whiteSpace: 'nowrap',
  userSelect: 'none',
};

const variants = {
  primary: {
    background: 'var(--color-accent)',
    color: 'var(--color-text-inverse)',
    boxShadow: '0 1px 3px rgba(224, 122, 58, 0.25)',
  },
  secondary: {
    background: 'var(--color-bg-sunken)',
    color: 'var(--color-text)',
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
  sm: {
    padding: '6px 12px',
    fontSize: 'var(--text-sm)',
    borderRadius: 'var(--radius-sm)',
  },
  md: {
    padding: '8px 16px',
    fontSize: 'var(--text-base)',
    borderRadius: 'var(--radius-md)',
  },
  lg: {
    padding: '10px 20px',
    fontSize: 'var(--text-md)',
    borderRadius: 'var(--radius-md)',
  },
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
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.filter = 'brightness(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.filter = '';
      }}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Sim controls — specialized button group for simulation actions
 */
export function SimButton({ children, icon, onClick, disabled, variant = 'secondary', ...props }) {
  return (
    <Button
      variant={variant}
      size="md"
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 0,
        fontVariantNumeric: 'tabular-nums',
      }}
      {...props}
    >
      {icon && <span style={{ fontSize: '1.1em' }}>{icon}</span>}
      {children}
    </Button>
  );
}
