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
// Phase 1 extractions (pure logic, no UI):
// ✅ ChemistryEngine          — Team chemistry, morale, roster stability
// ✅ InjuryEngine             — Injury types, risk, application, healing
// ✅ FatigueEngine            — Minutes distribution, fatigue, auto-rest
// ✅ SalaryCapEngine          — Cap calculations, floors, tier transitions
// ✅ PlayerDevelopmentEngine  — Aging, rating changes, retirement
// ✅ LeagueManager            — Standings, tiebreakers, team strength
//
// Phase 2 extractions (logic + gameState coupling via wrappers):
// ✅ TeamFactory              — Player/roster generation, salary, contracts, schedules
// ✅ DraftEngine              — Prospects, lottery, pick ownership, Stepien rule
// ✅ TradeEngine              — Trade evaluation, AI proposals, execution
// ✅ FreeAgencyEngine         — AI free agency, signing decisions, offers
//

export { PlayerAttributes } from './engines/PlayerAttributes.js';
export { CoachEngine } from './engines/CoachEngine.js';
export { GameState } from './engines/GameState.js';
export { FinanceEngine, METRO_POPULATIONS, getMetroPopulation, populationToMarketSize } from './engines/FinanceEngine.js';
export { GameEngine } from './engines/GameEngine.js';
export { SimulationController } from './engines/SimulationController.js';
export { GamePipeline } from './engines/GamePipeline.js';
export { CalendarEngine } from './engines/CalendarEngine.js';
export { EventBus, GameEvents, eventBus } from './engines/EventBus.js';
export { StorageEngine } from './engines/StorageEngine.js';
export { UIRenderer } from './engines/UIRenderer.js';
export { ChemistryEngine } from './engines/ChemistryEngine.js';
export { InjuryEngine } from './engines/InjuryEngine.js';
export { FatigueEngine } from './engines/FatigueEngine.js';
export { SalaryCapEngine } from './engines/SalaryCapEngine.js';
export { PlayerDevelopmentEngine } from './engines/PlayerDevelopmentEngine.js';
export { LeagueManager } from './engines/LeagueManager.js';
export { DivisionManager, CITY_TO_DIVISIONS } from './engines/DivisionManager.js';
export { StatEngine } from './engines/StatEngine.js';
export { TeamFactory } from './engines/TeamFactory.js';
export { DraftEngine } from './engines/DraftEngine.js';
export { TradeEngine } from './engines/TradeEngine.js';
export { FreeAgencyEngine } from './engines/FreeAgencyEngine.js';
export { PlayoffEngine } from './engines/PlayoffEngine.js';
export { GMMode } from './engines/GMMode.js';
export { ScoutingEngine } from './engines/ScoutingEngine.js';
export { OwnerEngine } from './engines/OwnerEngine.js';
export { UIHelpers } from './engines/UIHelpers.js';
