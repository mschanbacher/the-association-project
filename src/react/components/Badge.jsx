import React from 'react';

const variantStyles = {
  default: { bg: 'var(--color-bg-sunken)', color: 'var(--color-text-secondary)' },
  accent:  { bg: 'var(--color-accent-bg)', color: 'var(--color-accent)' },
  win:     { bg: 'var(--color-win-bg)',  color: 'var(--color-win)' },
  loss:    { bg: 'var(--color-loss-bg)', color: 'var(--color-loss)' },
  info:    { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
  warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
};

export function Badge({ children, variant = 'default', style }) {
  const v = variantStyles[variant] || variantStyles.default;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      padding: '2px 8px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-semi)',
      background: v.bg,
      color: v.color,
      lineHeight: 'var(--leading-tight)',
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {children}
    </span>
  );
}

export function TierBadge({ tier, style }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: '0.04em',
      background: 'var(--color-accent)',
      color: 'var(--color-text-inverse)',
      ...style,
    }}>
      T{tier}
    </span>
  );
}

export function RatingBadge({ rating, offRating, defRating, style }) {
  const color = rating >= 80 ? 'var(--color-rating-elite)' :
                rating >= 70 ? 'var(--color-rating-good)' :
                rating >= 60 ? 'var(--color-rating-avg)' :
                               'var(--color-rating-poor)';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semi)',
      ...style,
    }}>
      <span style={{ color, fontWeight: 'var(--weight-bold)' }}>
        {Math.round(rating)}
      </span>
      {offRating !== undefined && defRating !== undefined && (
        <span style={{
          fontSize: 'var(--text-xs)',
          color: 'var(--color-text-tertiary)',
        }}>
          {Math.round(offRating)}/{Math.round(defRating)}
        </span>
      )}
    </span>
  );
}
