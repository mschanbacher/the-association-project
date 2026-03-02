import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/design-system.css';

/**
 * Mount the React app into #react-root.
 * Called after the existing game code has initialized.
 */
export function mountReactApp() {
  let root = document.getElementById('react-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'react-root';
    document.body.prepend(root);
  }
  
  const reactRoot = createRoot(root);
  reactRoot.render(<App />);
  
  console.log('⚛️ React UI mounted');
  return reactRoot;
}

// Auto-mount when module loads
mountReactApp();
