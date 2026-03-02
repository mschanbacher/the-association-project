import React from 'react';

const tierColors = {
  1: { bg: 'var(--color-tier1-bg)', color: 'var(--color-tier1)', border: '#e8d49b' },
  2: { bg: 'var(--color-tier2-bg)', color: 'var(--color-tier2)', border: '#d0d0d0' },
  3: { bg: 'var(--color-tier3-bg)', color: 'var(--color-tier3)', border: '#d9b89a' },
};

const variantStyles = {
  default: {
    bg: 'var(--color-bg-sunken)',
    color: 'var(--color-text-secondary)',
  },
  accent: {
    bg: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
  },
  win: {
    bg: 'var(--color-win-bg)',
    color: 'var(--color-win)',
  },
  loss: {
    bg: 'var(--color-loss-bg)',
    color: 'var(--color-loss)',
  },
  info: {
    bg: 'var(--color-info-bg)',
    color: 'var(--color-info)',
  },
  warning: {
    bg: 'var(--color-warning-bg)',
    color: 'var(--color-warning)',
  },
};

export function Badge({ children, variant = 'default', style }) {
  const v = variantStyles[variant] || variantStyles.default;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--space-1)',
      padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
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
  const tc = tierColors[tier] || tierColors[1];
  const labels = {
    1: 'TIER 1 · NAPL',
    2: 'TIER 2 · NARBL',
    3: 'TIER 3 · MBL',
  };
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 12px',
      borderRadius: 'var(--radius-full)',
      fontSize: 'var(--text-xs)',
      fontWeight: 'var(--weight-bold)',
      letterSpacing: '0.06em',
      background: tc.bg,
      color: tc.color,
      border: `1px solid ${tc.border}`,
      ...style,
    }}>
      {labels[tier] || `TIER ${tier}`}
    </span>
  );
}

export function RatingBadge({ rating, offRating, defRating, style }) {
  const color = rating >= 85 ? 'var(--color-rating-elite)' :
                rating >= 78 ? 'var(--color-rating-good)' :
                rating >= 70 ? 'var(--color-rating-avg)' :
                rating >= 60 ? 'var(--color-rating-below)' :
                               'var(--color-rating-poor)';
  const bg = rating >= 85 ? '#e8f5ee' :
             rating >= 78 ? '#e8f0fa' :
             rating >= 70 ? '#fdf8ec' :
             rating >= 60 ? '#fdf0e8' :
                            '#fde8e8';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semi)',
      ...style,
    }}>
      <span style={{
        padding: '2px 8px',
        borderRadius: 'var(--radius-sm)',
        background: bg,
        color,
      }}>
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
