import React, { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'roster',    label: 'Roster' },
  { id: 'standings', label: 'Standings' },
  { id: 'schedule',  label: 'Schedule' },
  { id: 'gamelog',   label: 'Game Log' },
  { id: 'finances',  label: 'Finances' },
  { id: 'scouting',  label: 'Scouting' },
  { id: 'coach',     label: 'Coach' },
  { id: 'history',   label: 'History' },
  { id: 'glossary',  label: 'Glossary' },
];

export function Sidebar({ activeScreen, onNavigate }) {
  const [hoveredItem, setHoveredItem] = useState(null);

  return (
    <nav style={{
      width: 'var(--sidebar-width)',
      minHeight: 'calc(100vh - var(--topbar-height))',
      background: 'var(--color-bg-raised)',
      borderRight: '1px solid var(--color-border-subtle)',
      padding: 'var(--space-4) var(--space-2)',
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
    }}>
      {navItems.map(item => {
        const isActive = activeScreen === item.id;
        const isHovered = hoveredItem === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onNavigate?.(item.id)}
            onMouseEnter={() => setHoveredItem(item.id)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 12px',
              border: 'none',
              background: isActive ? 'var(--color-accent-bg)' :
                          isHovered ? 'var(--color-bg-hover)' :
                          'transparent',
              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: isActive ? 'var(--weight-semi)' : 'var(--weight-medium)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              transition: 'all var(--duration-fast) ease',
              letterSpacing: '-0.005em',
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
