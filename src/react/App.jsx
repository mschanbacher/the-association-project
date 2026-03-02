import React, { useState, useEffect } from 'react';
import { GameProvider, useGame } from './hooks/GameBridge.jsx';
import { TopBar } from './components/TopBar.jsx';
import { Sidebar } from './components/Sidebar.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';

function AppContent() {
  const { isReady, gameState } = useGame();
  const [activeScreen, setActiveScreen] = useState('dashboard');

  // When the React UI is active, hide the legacy game container.
  // When navigating to legacy screens (roster, trades, etc.),
  // those open as modals on top of the existing DOM — so the React
  // dashboard stays visible underneath.
  useEffect(() => {
    if (isReady && gameState?.userTeam) {
      // Hide the legacy container's main content (info-bar, controls, etc.)
      // but keep it in DOM so modal overlays and global functions still work.
      const gc = document.getElementById('gameContainer');
      if (gc) {
        // Hide the direct children that make up the old dashboard
        // but keep the container visible for modal mounting
        const infoBar = gc.querySelector('.info-bar');
        const controls = gc.querySelector('.controls');
        const legend = gc.querySelector('.legend');
        const standings = gc.querySelector('.standings-wrapper, #standingsContainer');
        const schedule = gc.querySelector('#scheduleContainer');
        const history = gc.querySelector('#historyContainer');

        [infoBar, controls, legend, standings, schedule, history].forEach(el => {
          if (el) el.style.display = 'none';
        });

        // Hide the title and subtitle too
        const h1 = gc.querySelector('h1');
        const subtitle = gc.querySelector('.subtitle');
        if (h1) h1.style.display = 'none';
        if (subtitle) subtitle.style.display = 'none';
      }
    }
  }, [isReady, gameState?.userTeam]);

  if (!isReady || !gameState?.userTeam) {
    // While the game is loading / in team selection, don't show React UI
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--color-bg)',
    }}>
      <TopBar />
      <div style={{
        display: 'flex',
        flex: 1,
      }}>
        <Sidebar activeScreen={activeScreen} onNavigate={setActiveScreen} />
        <main style={{
          flex: 1,
          minWidth: 0,
          overflow: 'auto',
        }}>
          {activeScreen === 'dashboard' && <DashboardScreen />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
}
