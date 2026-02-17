// ═══════════════════════════════════════════════════════════════════
// The Association Project — Main Entry Point
// ═══════════════════════════════════════════════════════════════════
//
// This is the module entry point. Vite bundles all imports into a
// single file. During the migration, we import extracted modules
// and attach them to window so the remaining inline code can still
// access them as globals.
//
// Migration roadmap:
// ✅ Phase 1: Extract self-contained classes (PlayerAttributes, CoachEngine, etc.)
// ⬜ Phase 2: Extract game logic (SimEngine, DraftEngine, etc.)
// ⬜ Phase 3: Extract UI rendering (modals, main screen)
// ⬜ Phase 4: Extract remaining inline code, remove global exposure
// ⬜ Phase 5: Switch to IndexedDB for saves
//

// ─── Extracted Modules ───
import { PlayerAttributes } from './engines/PlayerAttributes.js';
import { CoachEngine } from './engines/CoachEngine.js';
import { PlayoffEngine } from './engines/PlayoffEngine.js';
import { GameState } from './engines/GameState.js';
import { FinanceEngine, METRO_POPULATIONS, getMetroPopulation, populationToMarketSize } from './engines/FinanceEngine.js';

// ─── Expose to global scope for backward compatibility ───
// (Removed as modules are fully integrated)
window.PlayerAttributes = PlayerAttributes;
window.CoachEngine = CoachEngine;
window.PlayoffEngine = PlayoffEngine;
window.GameState = GameState;
window.FinanceEngine = FinanceEngine;
window.METRO_POPULATIONS = METRO_POPULATIONS;
window.getMetroPopulation = getMetroPopulation;
window.populationToMarketSize = populationToMarketSize;

console.log('🏀 The Association Project — Modules loaded');
console.log(`   PlayerAttributes: ${PlayerAttributes.ALL_ATTR_KEYS?.length || '?'} attributes`);
console.log(`   CoachEngine: ${Object.keys(CoachEngine.TRAITS || {}).length} traits`);
console.log(`   FinanceEngine: ${Object.keys(METRO_POPULATIONS).length} cities`);
