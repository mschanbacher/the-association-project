// ═══════════════════════════════════════════════════════════════════
// The Association Project — Module Index
// ═══════════════════════════════════════════════════════════════════
//
// This file documents the extracted modules. The actual imports
// happen in the <script type="module"> block in index.html.
//
// Migration status:
// ✅ PlayerAttributes  — Player generation, attributes, measurables
// ✅ CoachEngine       — Coach traits, archetypes, game modifiers
// ✅ GameState         — Central state, serialization/compression
// ✅ FinanceEngine     — Revenue, metro populations, market sizing
// ✅ GameEngine        — Pure basketball simulation functions
// ✅ SimulationController — Game simulation orchestration
// ✅ CalendarEngine    — Season schedule, dates, event tracking
// 🔲 PlayoffEngine    — Stays inline (HTML templates)
// 🔲 StatEngine       — Stays inline (HTML templates)
// 🔲 GMMode           — Stays inline (HTML templates)
// 🔲 ScoutingEngine   — Future extraction
// 🔲 DraftEngine      — Future extraction
// 🔲 UI Modals        — Future extraction
//

export { PlayerAttributes } from './engines/PlayerAttributes.js';
export { CoachEngine } from './engines/CoachEngine.js';
export { GameState } from './engines/GameState.js';
export { FinanceEngine, METRO_POPULATIONS, getMetroPopulation, populationToMarketSize } from './engines/FinanceEngine.js';
export { GameEngine } from './engines/GameEngine.js';
export { SimulationController } from './engines/SimulationController.js';
export { CalendarEngine } from './engines/CalendarEngine.js';
