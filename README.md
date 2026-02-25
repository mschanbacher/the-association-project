# 🏀 The Association Project

A comprehensive basketball league management simulation featuring a three-tier promotion/relegation system with 260 teams, realistic player economics, coaching systems, and authentic basketball mechanics.

## Quick Start

```bash
# Install dependencies (first time only)
npm install

# Build the playable game (single HTML file)
npm run build

# The game is at dist/index.html — open it in any browser

# Optional: Live dev server with hot reload
npm run dev
```

## Project Structure

```
the-association-project/
├── index.html                  # Main HTML + remaining inline game code
├── src/
│   ├── main.js                 # Module entry point (currently unused by build)
│   ├── engines/
│   │   ├── PlayerAttributes.js # Player generation, attributes, measurables
│   │   ├── CoachEngine.js      # Coach traits, archetypes, game modifiers
│   │   ├── GameState.js        # Central state, serialization/compression
│   │   ├── FinanceEngine.js    # Revenue, metro populations, market sizing
│   │   └── PlayoffEngine.js    # Playoff brackets (not yet wired — inline)
│   └── ui/                     # (Future: extracted UI modal code)
├── package.json
├── vite.config.js              # Vite build config → single HTML output
└── dist/                       # Built output (gitignored)
    └── index.html              # ← This is the playable game
```

## Architecture

The game is being migrated from a single monolithic HTML file (~21K lines) to a modular architecture. Currently in **Phase 1**:

- ✅ **Extracted**: PlayerAttributes, CoachEngine, GameState, FinanceEngine
- ⬜ **Next**: SimEngine, DraftEngine, ScoutingEngine
- ⬜ **Future**: UI modals, IndexedDB saves, full module system

Extracted modules are imported via `<script type="module">` and exposed to `window` for backward compatibility with the remaining inline code.

## Claude Workflow

This project is developed collaboratively with Claude. The workflow:

1. Claude clones the repo at the start of each session
2. Makes changes to source files
3. Builds and tests
4. Provides updated files to commit and push

## Game Features

- **Three-tier league**: 30 T1 teams ($100M cap), 86 T2 ($12M cap), 144 T3 ($1.5M cap)
- **Promotion/Relegation**: Performance-based movement between tiers
- **Coaching System**: 7 traits affecting gameplay, archetypes, development bonuses
- **Player Attributes**: 9 attributes (4 physical, 5 mental) with position-specific weighting
- **Scouting Center**: League scanner, college pipeline, watch list, team fit analysis
- **Financial System**: Metro population-based revenue, salary caps, parachute payments
- **College Graduate FA**: Annual pipeline of 90-120 young players for T2/T3
- **Player Retirement**: Age-based with Hall of Fame tracking
- **Full Statistics**: Per-player stats, end-of-season awards, historical tracking
