/**
 * GamePipeline — Possession-by-possession basketball simulation
 * 
 * Produces the same output format as StatEngine.generateGame() so the rest
 * of the system (stat accumulation, standings, etc.) doesn't care which path was used.
 * 
 * Two modes:
 *   1. resolve() — run the entire game instantly, return final result
 *   2. step()    — advance one possession, return events (for coach mode / live view)
 * 
 * Architecture:
 *   - GamePipeline manages game state (clock, score, quarter, lineups)
 *   - Each possession resolves: who has ball → action → outcome → stats updated
 *   - Events emitted at each step for UI consumption
 */

import { CoachEngine } from './CoachEngine.js';

// ═══════════════════════════════════════════════════════════════
// POSSESSION OUTCOMES
// ═══════════════════════════════════════════════════════════════

const ShotType = {
    TWO_POINT: '2pt',
    THREE_POINT: '3pt',
    FREE_THROW: 'ft'
};

const PossessionResult = {
    MADE_TWO: 'made_2pt',
    MADE_THREE: 'made_3pt',
    MISSED: 'missed',
    TURNOVER: 'turnover',
    FOUL_SHOOTING: 'foul_shooting',
    FOUL_NON_SHOOTING: 'foul_non_shooting',
    AND_ONE: 'and_one'
};

// ═══════════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════════

class GameState {
    constructor(homeTeam, awayTeam, options = {}) {
        this.homeTeam = homeTeam;
        this.awayTeam = awayTeam;
        this.isPlayoffs = options.isPlayoffs || false;
        this.tier = options.tier || homeTeam.tier || 1;

        // Score
        this.homeScore = 0;
        this.awayScore = 0;
        this.quarterScores = { home: [0, 0, 0, 0], away: [0, 0, 0, 0] };

        // Clock
        this.quarter = 1;
        this.possession = 0;
        this.possessionsPerQuarter = this._getPossessionsPerQuarter();
        this.totalPossessions = this.possessionsPerQuarter * 4;

        // Possession tracking
        this.offenseIsHome = Math.random() < 0.5; // Coin flip for first possession
        this.events = [];
        this.isComplete = false;
        this.isOvertime = false;

        // Momentum (-10 to +10, positive = home advantage)
        this.momentum = 0;
        this.homeRun = 0; // consecutive home scores
        this.awayRun = 0; // consecutive away scores

        // Player stats (accumulated per possession)
        this.homePlayerStats = {};
        this.awayPlayerStats = {};

        // Timeouts remaining
        this.homeTimeouts = 7;
        this.awayTimeouts = 7;
    }

    _getPossessionsPerQuarter() {
        // NBA averages ~100 possessions per game per team = ~25 per quarter
        // Slight variance by tier
        const base = { 1: 25, 2: 24, 3: 23 };
        return (base[this.tier] || 25) + Math.floor(Math.random() * 3) - 1;
    }

    get clock() {
        const possInQuarter = this.possession % this.possessionsPerQuarter;
        const minutesLeft = 12 - (possInQuarter / this.possessionsPerQuarter) * 12;
        return {
            quarter: this.quarter,
            minutesLeft: Math.max(0, minutesLeft),
            display: `Q${this.quarter} ${Math.floor(minutesLeft)}:${String(Math.floor((minutesLeft % 1) * 60)).padStart(2, '0')}`
        };
    }
}

// ═══════════════════════════════════════════════════════════════
// GAME PIPELINE
// ═══════════════════════════════════════════════════════════════

export class GamePipeline {

    /**
     * Run an entire game and return result compatible with StatEngine.generateGame()
     */
    static resolve(homeTeam, awayTeam, options = {}) {
        const game = new GameState(homeTeam, awayTeam, options);
        const setup = GamePipeline._setupTeams(game);

        // Run all possessions
        while (!game.isComplete) {
            GamePipeline._stepPossession(game, setup);
        }

        return GamePipeline._buildResult(game, setup);
    }

    /**
     * Create an interactive game for step-by-step simulation (coach mode)
     * Returns a game handle with step() and getState() methods
     */
    static create(homeTeam, awayTeam, options = {}) {
        const game = new GameState(homeTeam, awayTeam, options);
        const setup = GamePipeline._setupTeams(game);

        return {
            /** Advance one possession. Returns array of events from this possession. */
            step() {
                if (game.isComplete) return [];
                const eventsBefore = game.events.length;
                GamePipeline._stepPossession(game, setup);
                return game.events.slice(eventsBefore);
            },

            /** Get current game state snapshot */
            getState() {
                return {
                    homeScore: game.homeScore,
                    awayScore: game.awayScore,
                    quarter: game.quarter,
                    clock: game.clock,
                    quarterScores: game.quarterScores,
                    momentum: game.momentum,
                    homeRun: game.homeRun,
                    awayRun: game.awayRun,
                    isComplete: game.isComplete,
                    isOvertime: game.isOvertime,
                    possession: game.possession,
                    offenseIsHome: game.offenseIsHome,
                    homeTimeouts: game.homeTimeouts,
                    awayTimeouts: game.awayTimeouts,
                    homeLineup: setup.homeRotation.filter(e => e.onCourt).map(e => ({
                        name: e.player.name, pos: e.player.position, rating: e.effectiveRating, fatigue: e.fatigue
                    })),
                    awayLineup: setup.awayRotation.filter(e => e.onCourt).map(e => ({
                        name: e.player.name, pos: e.player.position, rating: e.effectiveRating, fatigue: e.fatigue
                    }))
                };
            },

            /** Call a timeout for the given side ('home' or 'away') */
            callTimeout(side) {
                if (side === 'home' && game.homeTimeouts > 0) {
                    game.homeTimeouts--;
                    game.momentum = Math.max(-3, Math.min(3, game.momentum * 0.3));
                    game.events.push({ type: 'timeout', side: 'home', quarter: game.quarter });
                    return true;
                } else if (side === 'away' && game.awayTimeouts > 0) {
                    game.awayTimeouts--;
                    game.momentum = Math.max(-3, Math.min(3, game.momentum * 0.3));
                    game.events.push({ type: 'timeout', side: 'away', quarter: game.quarter });
                    return true;
                }
                return false;
            },

            /** Get final result (only valid after game.isComplete) */
            getResult() {
                return GamePipeline._buildResult(game, setup);
            },

            /** Check if game is over */
            get isComplete() { return game.isComplete; },

            /** Run to completion and return result */
            finish() {
                while (!game.isComplete) {
                    GamePipeline._stepPossession(game, setup);
                }
                return GamePipeline._buildResult(game, setup);
            }
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // SETUP — Build rotations, calculate modifiers
    // ═══════════════════════════════════════════════════════════════

    static _setupTeams(game) {
        const StatEngine = window.StatEngine;
        const getFatiguePenalty = window.getFatiguePenalty || (() => 0);

        const homeRotation = StatEngine._buildRotation(game.homeTeam, getFatiguePenalty, game.isPlayoffs)
            .map(e => ({ ...e, onCourt: e.isStarter, fatigue: 0, fouls: 0 }));
        const awayRotation = StatEngine._buildRotation(game.awayTeam, getFatiguePenalty, game.isPlayoffs)
            .map(e => ({ ...e, onCourt: e.isStarter, fatigue: 0, fouls: 0 }));

        StatEngine._calculateUsageShares(homeRotation);
        StatEngine._calculateUsageShares(awayRotation);

        const homeChemistry = StatEngine._getChemistryModifier(game.homeTeam, game.isPlayoffs);
        const awayChemistry = StatEngine._getChemistryModifier(game.awayTeam, game.isPlayoffs);

        const homeCoachMods = CoachEngine.getGameModifiers(game.homeTeam);
        const awayCoachMods = CoachEngine.getGameModifiers(game.awayTeam);

        const homeCourtBonus = game.tier === 1 ? 3 : game.tier === 2 ? 2.5 : 2;

        // Initialize player stat accumulators
        for (const entry of homeRotation) {
            game.homePlayerStats[entry.player.id] = GamePipeline._emptyStatLine(entry.player, entry.isStarter);
        }
        for (const entry of awayRotation) {
            game.awayPlayerStats[entry.player.id] = GamePipeline._emptyStatLine(entry.player, entry.isStarter);
        }

        return {
            homeRotation, awayRotation,
            homeChemistry, awayChemistry,
            homeCoachMods, awayCoachMods,
            homeCourtBonus
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CORE — Resolve one possession
    // ═══════════════════════════════════════════════════════════════

    static _stepPossession(game, setup) {
        const isHome = game.offenseIsHome;
        const rotation = isHome ? setup.homeRotation : setup.awayRotation;
        const defRotation = isHome ? setup.awayRotation : setup.homeRotation;
        const stats = isHome ? game.homePlayerStats : game.awayPlayerStats;
        const defStats = isHome ? game.awayPlayerStats : game.homePlayerStats;
        const chemistry = isHome ? setup.homeChemistry : setup.awayChemistry;
        const coachMods = isHome ? setup.homeCoachMods : setup.awayCoachMods;
        const defCoachMods = isHome ? setup.awayCoachMods : setup.homeCoachMods;
        const homeBonus = isHome ? setup.homeCourtBonus : 0;
        const momentumBoost = game.momentum * (isHome ? 0.15 : -0.15);

        // Pick the shooter based on usage share among on-court players
        const onCourt = rotation.filter(e => e.onCourt && e.minutes > 0);
        if (onCourt.length === 0) {
            game.offenseIsHome = !game.offenseIsHome;
            game.possession++;
            GamePipeline._checkQuarterEnd(game, setup);
            return;
        }

        const shooter = GamePipeline._pickShooter(onCourt);
        const shooterStats = stats[shooter.player.id];
        const archetype = (window.StatEngine.POSITION_ARCHETYPES || {})[shooter.player.position] || window.StatEngine.POSITION_ARCHETYPES['SF'];

        // Determine possession outcome
        const ratingBonus = (shooter.effectiveRating - 75 + homeBonus + momentumBoost) * 0.004;
        const defenseImpact = (defCoachMods.defenseModifier || 0) * 0.5;
        const chemBonus = (chemistry - 1.0) * 0.03;

        const roll = Math.random();

        // Turnover chance: ~12-15% of possessions
        const toChance = 0.13 - ratingBonus * 0.5 + defenseImpact * 0.3;
        if (roll < Math.max(0.05, Math.min(0.22, toChance))) {
            shooterStats.turnovers++;
            game.events.push({
                type: 'turnover', player: shooter.player.name, side: isHome ? 'home' : 'away',
                quarter: game.quarter, clock: game.clock.display
            });

            // Defender gets steal credit
            const stealer = GamePipeline._pickDefender(defRotation);
            if (stealer && Math.random() < 0.55) {
                defStats[stealer.player.id].steals++;
                game.events.push({
                    type: 'steal', player: stealer.player.name, side: isHome ? 'away' : 'home',
                    quarter: game.quarter
                });
            }

            GamePipeline._endPossession(game, setup, false, isHome);
            return;
        }

        // Foul chance: ~18% of possessions result in some foul
        const foulRoll = Math.random();
        if (foulRoll < 0.18) {
            const fouler = GamePipeline._pickDefender(defRotation);
            if (fouler) {
                defStats[fouler.player.id].fouls++;
                fouler.fouls++;

                // Shooting foul (~45% of fouls)
                if (Math.random() < 0.45) {
                    const isThree = Math.random() < (archetype.threePtRate || 0.3);
                    const ftCount = isThree ? 3 : 2;
                    const ftPct = Math.min(0.95, archetype.baseFtPct + ratingBonus + chemBonus);
                    let ftMade = 0;
                    for (let i = 0; i < ftCount; i++) {
                        shooterStats.freeThrowsAttempted++;
                        if (Math.random() < ftPct) {
                            shooterStats.freeThrowsMade++;
                            shooterStats.points++;
                            ftMade++;
                        }
                    }
                    GamePipeline._addScore(game, isHome, ftMade);
                    game.events.push({
                        type: 'foul_shooting', shooter: shooter.player.name, fouler: fouler.player.name,
                        ftMade, ftAttempted: ftCount, side: isHome ? 'home' : 'away',
                        quarter: game.quarter, clock: game.clock.display
                    });
                    GamePipeline._endPossession(game, setup, ftMade > 0, isHome);
                    return;
                }
                // Non-shooting foul — possession retained, no stat change for shooter
                game.events.push({
                    type: 'foul', fouler: fouler.player.name, side: isHome ? 'away' : 'home',
                    quarter: game.quarter
                });
                // Continue to shot attempt (possession not lost)
            }
        }

        // Shot attempt
        const isThree = Math.random() < (archetype.threePtRate + (coachMods.threePtRateModifier || 0));
        const shotPct = isThree
            ? Math.max(0.20, Math.min(0.50, archetype.baseThreePct + ratingBonus + chemBonus + defenseImpact))
            : Math.max(0.35, Math.min(0.65, archetype.baseFgPct + 0.04 + ratingBonus + chemBonus + defenseImpact));

        shooterStats.fieldGoalsAttempted++;
        if (isThree) shooterStats.threePointersAttempted++;

        if (Math.random() < shotPct) {
            // Made shot
            const points = isThree ? 3 : 2;
            shooterStats.fieldGoalsMade++;
            if (isThree) shooterStats.threePointersMade++;
            shooterStats.points += points;
            GamePipeline._addScore(game, isHome, points);

            // Assist credit (~60% of made baskets)
            if (Math.random() < 0.60) {
                const passer = GamePipeline._pickAssister(onCourt, shooter);
                if (passer) stats[passer.player.id].assists++;
            }

            // And-one chance (~5% of made 2s)
            if (!isThree && Math.random() < 0.05) {
                const ftPct = Math.min(0.95, archetype.baseFtPct + ratingBonus);
                shooterStats.freeThrowsAttempted++;
                if (Math.random() < ftPct) {
                    shooterStats.freeThrowsMade++;
                    shooterStats.points++;
                    GamePipeline._addScore(game, isHome, 1);
                }
                game.events.push({
                    type: 'and_one', player: shooter.player.name, points: points,
                    side: isHome ? 'home' : 'away', quarter: game.quarter, clock: game.clock.display
                });
            }

            game.events.push({
                type: 'made_shot', player: shooter.player.name, points: points,
                shotType: isThree ? '3pt' : '2pt', side: isHome ? 'home' : 'away',
                homeScore: game.homeScore, awayScore: game.awayScore,
                quarter: game.quarter, clock: game.clock.display
            });

            GamePipeline._endPossession(game, setup, true, isHome);
        } else {
            // Missed shot — rebound
            game.events.push({
                type: 'missed_shot', player: shooter.player.name,
                shotType: isThree ? '3pt' : '2pt', side: isHome ? 'home' : 'away',
                quarter: game.quarter, clock: game.clock.display
            });

            // Offensive rebound chance ~25%, defensive ~75%
            if (Math.random() < 0.25) {
                const rebounder = GamePipeline._pickRebounder(onCourt);
                if (rebounder) stats[rebounder.player.id].rebounds++;
                // Offensive rebound — don't switch possession, but still end this possession count
            } else {
                const defOnCourt = defRotation.filter(e => e.onCourt);
                const rebounder = GamePipeline._pickRebounder(defOnCourt);
                if (rebounder) defStats[rebounder.player.id].rebounds++;
            }

            GamePipeline._endPossession(game, setup, false, isHome);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // POSSESSION HELPERS
    // ═══════════════════════════════════════════════════════════════

    static _pickShooter(onCourt) {
        const totalUsage = onCourt.reduce((s, e) => s + (e.usageShare || 1), 0);
        let r = Math.random() * totalUsage;
        for (const entry of onCourt) {
            r -= (entry.usageShare || 1);
            if (r <= 0) return entry;
        }
        return onCourt[onCourt.length - 1];
    }

    static _pickDefender(rotation) {
        const onCourt = rotation.filter(e => e.onCourt);
        return onCourt.length > 0 ? onCourt[Math.floor(Math.random() * onCourt.length)] : null;
    }

    static _pickAssister(onCourt, shooter) {
        const candidates = onCourt.filter(e => e.player.id !== shooter.player.id);
        if (candidates.length === 0) return null;
        // Bias toward PGs and players with high assist archetypes
        const weights = candidates.map(e => {
            const pos = e.player.position || 'SF';
            return pos === 'PG' ? 3 : pos === 'SG' ? 1.5 : 1;
        });
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < candidates.length; i++) {
            r -= weights[i];
            if (r <= 0) return candidates[i];
        }
        return candidates[candidates.length - 1];
    }

    static _pickRebounder(onCourt) {
        if (onCourt.length === 0) return null;
        const weights = onCourt.map(e => {
            const pos = e.player.position || 'SF';
            return pos === 'C' ? 4 : pos === 'PF' ? 3 : pos === 'SF' ? 1.5 : 1;
        });
        const total = weights.reduce((s, w) => s + w, 0);
        let r = Math.random() * total;
        for (let i = 0; i < onCourt.length; i++) {
            r -= weights[i];
            if (r <= 0) return onCourt[i];
        }
        return onCourt[onCourt.length - 1];
    }

    static _addScore(game, isHome, points) {
        if (isHome) {
            game.homeScore += points;
            game.homeRun += points;
            game.awayRun = 0;
            game.momentum = Math.min(10, game.momentum + points * 0.3);
        } else {
            game.awayScore += points;
            game.awayRun += points;
            game.homeRun = 0;
            game.momentum = Math.max(-10, game.momentum - points * 0.3);
        }

        // Track quarter scores
        const qi = Math.min(game.quarter - 1, 3);
        if (qi < 4) {
            if (isHome) game.quarterScores.home[qi] += points;
            else game.quarterScores.away[qi] += points;
        }

        // Emit run events
        const run = isHome ? game.homeRun : game.awayRun;
        if (run >= 8 && run % 4 === 0) {
            game.events.push({
                type: 'run', side: isHome ? 'home' : 'away', run: run,
                quarter: game.quarter
            });
        }
    }

    static _endPossession(game, setup, scored, wasHome) {
        game.possession++;
        game.offenseIsHome = !game.offenseIsHome; // Alternate possession

        // Fatigue accumulation for on-court players
        const allOnCourt = [
            ...setup.homeRotation.filter(e => e.onCourt),
            ...setup.awayRotation.filter(e => e.onCourt)
        ];
        for (const entry of allOnCourt) {
            entry.fatigue += 0.4 + Math.random() * 0.2;
        }

        // Momentum decay
        game.momentum *= 0.97;

        // Auto-substitution at quarter breaks and when fatigued
        GamePipeline._checkQuarterEnd(game, setup);
    }

    static _checkQuarterEnd(game, setup) {
        const possInQuarter = game.possession % game.possessionsPerQuarter;

        if (possInQuarter === 0 && game.possession > 0) {
            if (game.quarter < 4) {
                game.quarter++;
                game.events.push({
                    type: 'quarter_end', quarter: game.quarter - 1,
                    homeScore: game.homeScore, awayScore: game.awayScore
                });
                // Auto-subs at quarter breaks
                GamePipeline._autoSubstitute(setup.homeRotation);
                GamePipeline._autoSubstitute(setup.awayRotation);
                // Reset momentum slightly
                game.momentum *= 0.5;
            } else if (game.quarter === 4) {
                // End of regulation
                if (game.homeScore === game.awayScore) {
                    // Overtime
                    game.isOvertime = true;
                    game.quarter = 5;
                    game.possessionsPerQuarter = 6; // ~5 min OT
                    game.quarterScores.home.push(0);
                    game.quarterScores.away.push(0);
                    game.events.push({ type: 'overtime', homeScore: game.homeScore, awayScore: game.awayScore });
                    GamePipeline._autoSubstitute(setup.homeRotation);
                    GamePipeline._autoSubstitute(setup.awayRotation);
                } else {
                    game.isComplete = true;
                    game.events.push({
                        type: 'game_end', homeScore: game.homeScore, awayScore: game.awayScore,
                        isOvertime: false
                    });
                }
            } else {
                // End of OT period
                if (game.homeScore === game.awayScore) {
                    game.quarter++;
                    game.quarterScores.home.push(0);
                    game.quarterScores.away.push(0);
                    game.events.push({ type: 'overtime', period: game.quarter - 4 });
                } else {
                    game.isComplete = true;
                    game.events.push({
                        type: 'game_end', homeScore: game.homeScore, awayScore: game.awayScore,
                        isOvertime: true
                    });
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // SUBSTITUTION LOGIC
    // ═══════════════════════════════════════════════════════════════

    static _autoSubstitute(rotation) {
        const onCourt = rotation.filter(e => e.onCourt);
        const bench = rotation.filter(e => !e.onCourt && e.minutes > 0);

        // Sub out the most fatigued player if bench is available
        for (const tired of onCourt.sort((a, b) => b.fatigue - a.fatigue)) {
            if (tired.fatigue > 6 && bench.length > 0) {
                // Find best bench replacement at same position or similar
                const sub = bench
                    .sort((a, b) => a.fatigue - b.fatigue)
                    .find(b => !b.onCourt) || bench[0];
                if (sub && sub.fatigue < tired.fatigue - 2) {
                    tired.onCourt = false;
                    sub.onCourt = true;
                    // Partial fatigue recovery for benched player
                    tired.fatigue = Math.max(0, tired.fatigue - 3);
                }
            }
        }

        // Ensure 5 on court
        const currentOnCourt = rotation.filter(e => e.onCourt).length;
        if (currentOnCourt < 5) {
            const available = rotation.filter(e => !e.onCourt && e.minutes > 0)
                .sort((a, b) => b.effectiveRating - a.effectiveRating);
            for (let i = 0; i < Math.min(5 - currentOnCourt, available.length); i++) {
                available[i].onCourt = true;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // RESULT BUILDING — Compatible with StatEngine output
    // ═══════════════════════════════════════════════════════════════

    static _buildResult(game, setup) {
        // Calculate minutes from possessions played
        const totalPoss = game.possession;
        const minutesPerPoss = 48 / (game.possessionsPerQuarter * 4 || 100);

        // Build stat arrays matching StatEngine format
        const buildStats = (rotation, playerStats) => {
            return rotation.map(entry => {
                const s = playerStats[entry.player.id];
                if (!s) return GamePipeline._emptyStatLine(entry.player, entry.isStarter);

                // Estimate minutes from possession involvement
                // Starters ~32-36 min, bench ~12-20 min
                const estMinutes = entry.isStarter
                    ? Math.round(30 + Math.random() * 8)
                    : Math.round(entry.minutes > 0 ? 10 + Math.random() * 14 : 0);

                return {
                    ...s,
                    minutesPlayed: Math.min(48, estMinutes),
                    gamesPlayed: 1,
                    gamesStarted: entry.isStarter ? 1 : 0
                };
            });
        };

        const homeStats = buildStats(setup.homeRotation, game.homePlayerStats);
        const awayStats = buildStats(setup.awayRotation, game.awayPlayerStats);

        // Distribute blocks among defensive players who might have earned them
        GamePipeline._distributeBlocks(homeStats, setup.homeRotation);
        GamePipeline._distributeBlocks(awayStats, setup.awayRotation);

        const homeWon = game.homeScore > game.awayScore;

        return {
            homeTeam: game.homeTeam,
            awayTeam: game.awayTeam,
            homeScore: game.homeScore,
            awayScore: game.awayScore,
            winner: homeWon ? game.homeTeam : game.awayTeam,
            loser: homeWon ? game.awayTeam : game.homeTeam,
            homeWon: homeWon,
            pointDiff: game.homeScore - game.awayScore,
            homePlayerStats: homeStats,
            awayPlayerStats: awayStats,
            // Pipeline-specific extras
            quarterScores: game.quarterScores,
            events: game.events,
            isOvertime: game.isOvertime,
            momentum: game.momentum,
            totalPossessions: game.possession
        };
    }

    static _distributeBlocks(stats, rotation) {
        // Generate a few blocks for big men based on their archetype
        for (const entry of rotation) {
            const pos = entry.player.position || 'SF';
            const s = stats.find(st => st.playerId === entry.player.id);
            if (!s || s.minutesPlayed === 0) continue;
            const blockRate = pos === 'C' ? 0.12 : pos === 'PF' ? 0.08 : 0.02;
            const blocks = Math.floor(s.minutesPlayed * blockRate * (0.5 + Math.random()));
            s.blocks += blocks;
        }
    }

    static _emptyStatLine(player, isStarter) {
        return {
            playerId: player.id,
            playerName: player.name,
            position: player.position || 'SF',
            team: null,
            gamesPlayed: 0,
            gamesStarted: 0,
            minutesPlayed: 0,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
            turnovers: 0, fouls: 0,
            fieldGoalsMade: 0, fieldGoalsAttempted: 0,
            threePointersMade: 0, threePointersAttempted: 0,
            freeThrowsMade: 0, freeThrowsAttempted: 0
        };
    }
}
