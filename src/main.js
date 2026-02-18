// ═══════════════════════════════════════════════════════════════════
// The Association Project — Module Index
// ═══════════════════════════════════════════════════════════════════
//
// Migration status:
// ✅ PlayerAttributes  — Player generation, attributes, measurables
// ✅ CoachEngine       — Coach traits, archetypes, game modifiers
// ✅ GameState         — Central state, serialization/compression
// ✅ FinanceEngine     — Revenue, metro populations, market sizing
// ✅ GameEngine        — Pure basketball simulation functions
// ✅ SimulationController — Game simulation orchestration
// ✅ CalendarEngine    — Season schedule, dates, event tracking
// ✅ EventBus          — Central event system + GameEvents catalog
// ✅ StorageEngine     — IndexedDB persistence + localStorage safety
// ✅ UIRenderer        — Pure rendering functions (data in → HTML out)
// 🔲 PlayoffEngine    — Stays inline (HTML templates, migrating progressively)
// 🔲 StatEngine       — Stays inline (HTML templates, migrating progressively)
// 🔲 GMMode           — Stays inline (HTML templates, migrating progressively)
//

export { PlayerAttributes } from './engines/PlayerAttributes.js';
export { CoachEngine } from './engines/CoachEngine.js';
export { GameState } from './engines/GameState.js';
export { FinanceEngine, METRO_POPULATIONS, getMetroPopulation, populationToMarketSize } from './engines/FinanceEngine.js';
export { GameEngine } from './engines/GameEngine.js';
export { SimulationController } from './engines/SimulationController.js';
export { CalendarEngine } from './engines/CalendarEngine.js';
export { EventBus, GameEvents, eventBus } from './engines/EventBus.js';
export { StorageEngine } from './engines/StorageEngine.js';
export { UIRenderer } from './engines/UIRenderer.js';
