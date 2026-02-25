// ═══════════════════════════════════════════════════════════════════
// InjuryEngine — Injury types, risk calculation, application, healing
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState, no UI.
// Operates on player/team objects passed as arguments.
//
// Injury flow:
//   1. checkForInjuries() — after each game, roll for each player
//   2. applyInjury()      — set player status based on user/AI decision
//   3. updateInjuries()   — tick down recovery after each game
//   4. healAllInjuries()  — offseason reset (except carryover)
//

export class InjuryEngine {

    // ─────────────────────────────────────────────────────────────
    // INJURY TYPE DEFINITIONS
    // ─────────────────────────────────────────────────────────────

    static INJURY_TYPES = {
        // MINOR (65% of injuries) — can play through with penalty
        ankle_sprain: {
            name: 'Ankle Sprain', severity: 'minor',
            gamesOut: [2, 7], gamesOutIfPlaying: [5, 12],
            ratingPenalty: [-3, -8], canPlayThrough: true,
            allowsDPE: false
        },
        bruised_knee: {
            name: 'Bruised Knee', severity: 'minor',
            gamesOut: [1, 5], gamesOutIfPlaying: [4, 10],
            ratingPenalty: [-3, -6], canPlayThrough: true,
            allowsDPE: false
        },
        minor_hamstring: {
            name: 'Minor Hamstring Strain', severity: 'minor',
            gamesOut: [3, 8], gamesOutIfPlaying: [7, 15],
            ratingPenalty: [-5, -10], canPlayThrough: true,
            allowsDPE: false
        },
        shoulder_contusion: {
            name: 'Shoulder Contusion', severity: 'minor',
            gamesOut: [2, 6], gamesOutIfPlaying: [5, 11],
            ratingPenalty: [-4, -7], canPlayThrough: true,
            allowsDPE: false
        },

        // MODERATE (25% of injuries) — can play through with heavy penalty
        sprained_mcl: {
            name: 'Sprained MCL', severity: 'moderate',
            gamesOut: [10, 20], gamesOutIfPlaying: [18, 35],
            ratingPenalty: [-8, -12], canPlayThrough: true,
            allowsDPE: false
        },
        quad_strain: {
            name: 'Quad Strain', severity: 'moderate',
            gamesOut: [8, 18], gamesOutIfPlaying: [15, 30],
            ratingPenalty: [-8, -12], canPlayThrough: true,
            allowsDPE: false
        },
        back_spasms: {
            name: 'Back Spasms', severity: 'moderate',
            gamesOut: [5, 15], gamesOutIfPlaying: [12, 25],
            ratingPenalty: [-10, -15], canPlayThrough: true,
            allowsDPE: false
        },

        // SEVERE (8% of injuries) — cannot play through
        fractured_foot: {
            name: 'Fractured Foot', severity: 'severe',
            gamesOut: [25, 45], gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: false
        },
        torn_meniscus: {
            name: 'Torn Meniscus', severity: 'severe',
            gamesOut: [20, 40], gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: false
        },
        broken_hand: {
            name: 'Broken Hand', severity: 'severe',
            gamesOut: [15, 30], gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: false
        },

        // SEASON-ENDING (2% of injuries) — triggers DPE for high salaries
        torn_acl: {
            name: 'Torn ACL', severity: 'season-ending',
            gamesOut: 'season', gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: true, carryOver: true
        },
        torn_achilles: {
            name: 'Torn Achilles', severity: 'season-ending',
            gamesOut: 'season', gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: true, carryOver: true
        },
        severe_fracture: {
            name: 'Severe Fracture', severity: 'season-ending',
            gamesOut: 'season', gamesOutIfPlaying: null,
            ratingPenalty: 0, canPlayThrough: false,
            allowsDPE: true, carryOver: true
        }
    };

    // Severity pools for rollForInjury
    static SEVERITY_POOLS = {
        minor:        { threshold: 0.65, keys: ['ankle_sprain', 'bruised_knee', 'minor_hamstring', 'shoulder_contusion'] },
        moderate:     { threshold: 0.90, keys: ['sprained_mcl', 'quad_strain', 'back_spasms'] },
        severe:       { threshold: 0.98, keys: ['fractured_foot', 'torn_meniscus', 'broken_hand'] },
        seasonEnding: { threshold: 1.00, keys: ['torn_acl', 'torn_achilles', 'severe_fracture'] }
    };

    // ─────────────────────────────────────────────────────────────
    // DPE (Disabled Player Exception) THRESHOLDS
    // ─────────────────────────────────────────────────────────────

    static DPE_THRESHOLDS = { 1: 10000000, 2: 1200000, 3: 150000 };
    static DPE_AMOUNTS    = { 1: 5000000, 2: 600000, 3: 75000 };

    static getDPEThreshold(tier) {
        return InjuryEngine.DPE_THRESHOLDS[tier] || InjuryEngine.DPE_THRESHOLDS[3];
    }

    static getDPEAmount(tier) {
        return InjuryEngine.DPE_AMOUNTS[tier] || InjuryEngine.DPE_AMOUNTS[3];
    }

    // ─────────────────────────────────────────────────────────────
    // RISK CALCULATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Calculate injury risk for a player in a single game
     * @param {Object} player
     * @param {boolean} isPlayoffs
     * @returns {number} Probability 0-1
     */
    static calculateRisk(player, isPlayoffs = false) {
        let baseRisk = 0.02; // 2% base chance per game

        // Age factor
        if (player.age >= 35) baseRisk += 0.015;
        else if (player.age >= 33) baseRisk += 0.01;
        else if (player.age >= 30) baseRisk += 0.005;

        // Usage factor (stars play heavy minutes)
        if (player.rating >= 85) baseRisk += 0.005;

        // Fatigue factor — exhausted players have double injury risk
        if (player.fatigue && player.fatigue > 75) {
            baseRisk *= 2;
        }

        return baseRisk;
    }

    // ─────────────────────────────────────────────────────────────
    // INJURY GENERATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Roll for injury TYPE (called after determining a player is injured)
     * @param {Object} player
     * @param {boolean} isPlayoffs
     * @returns {Object} Injury object
     */
    static rollForInjury(player, isPlayoffs = false) {
        const severityRoll = Math.random();
        let injuryPool;

        if (severityRoll < InjuryEngine.SEVERITY_POOLS.minor.threshold) {
            injuryPool = InjuryEngine.SEVERITY_POOLS.minor.keys;
        } else if (severityRoll < InjuryEngine.SEVERITY_POOLS.moderate.threshold) {
            injuryPool = InjuryEngine.SEVERITY_POOLS.moderate.keys;
        } else if (severityRoll < InjuryEngine.SEVERITY_POOLS.severe.threshold) {
            injuryPool = InjuryEngine.SEVERITY_POOLS.severe.keys;
        } else {
            injuryPool = InjuryEngine.SEVERITY_POOLS.seasonEnding.keys;
        }

        const injuryKey = injuryPool[Math.floor(Math.random() * injuryPool.length)];
        return InjuryEngine.createInjury(injuryKey);
    }

    /**
     * Create injury object from injury type key
     * @param {string} injuryKey
     * @returns {Object} Injury object with gamesRemaining, ratingPenalty, etc.
     */
    static createInjury(injuryKey) {
        const injuryDef = InjuryEngine.INJURY_TYPES[injuryKey];
        const injury = {
            type: injuryKey,
            name: injuryDef.name,
            severity: injuryDef.severity,
            canPlayThrough: injuryDef.canPlayThrough,
            allowsDPE: injuryDef.allowsDPE,
            carryOver: injuryDef.carryOver || false,
            occurredInGame: 0 // Set when applied
        };

        if (injuryDef.gamesOut === 'season') {
            injury.gamesRemaining = 999; // Sentinel for "rest of season"
            injury.gamesRemainingIfPlaying = null;
            injury.ratingPenalty = 0;
        } else {
            const [minGames, maxGames] = injuryDef.gamesOut;
            injury.gamesRemaining = Math.floor(minGames + Math.random() * (maxGames - minGames + 1));

            if (injuryDef.canPlayThrough) {
                const [minGamesPlay, maxGamesPlay] = injuryDef.gamesOutIfPlaying;
                injury.gamesRemainingIfPlaying = Math.floor(minGamesPlay + Math.random() * (maxGamesPlay - minGamesPlay + 1));

                const [minPenalty, maxPenalty] = injuryDef.ratingPenalty;
                injury.ratingPenalty = Math.floor(minPenalty + Math.random() * (maxPenalty - minPenalty + 1));
            } else {
                injury.gamesRemainingIfPlaying = null;
                injury.ratingPenalty = 0;
            }
        }

        return injury;
    }

    // ─────────────────────────────────────────────────────────────
    // GAME-LEVEL OPERATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Check for injuries after a game (both teams)
     * @param {Object} homeTeam
     * @param {Object} awayTeam
     * @param {number} gameNumber - For logging/tracking
     * @param {boolean} isPlayoffs
     * @returns {Array<{team, player, injury}>}
     */
    static checkForInjuries(homeTeam, awayTeam, gameNumber, isPlayoffs = false) {
        const injuries = [];

        console.log(`🏥 Checking for injuries after game ${gameNumber}...`);
        let totalChecks = 0;
        let totalRolls = 0;

        [homeTeam, awayTeam].forEach(team => {
            if (!team.roster) return;

            team.roster.forEach(player => {
                // Skip if already injured
                if (player.injuryStatus !== 'healthy') return;

                totalChecks++;
                const risk = InjuryEngine.calculateRisk(player, isPlayoffs);
                const roll = Math.random();

                if (roll <= risk) {
                    totalRolls++;
                    const injury = InjuryEngine.rollForInjury(player, isPlayoffs);
                    if (injury) {
                        injury.occurredInGame = gameNumber;
                        injuries.push({ team, player, injury });
                        console.log(`  🚑 INJURY: ${player.name} (${team.name}) - ${injury.name} (risk: ${(risk * 100).toFixed(2)}%, roll: ${(roll * 100).toFixed(2)}%)`);
                    }
                }
            });
        });

        console.log(`  Checked ${totalChecks} players, ${totalRolls} injury rolls, ${injuries.length} injuries occurred`);
        return injuries;
    }

    /**
     * Apply injury to player (called after user makes decision in modal)
     * @param {Object} player
     * @param {Object} injury
     * @param {string} decision - 'rest' or 'playThrough'
     * @param {Object} [eventBus] - Optional EventBus for emitting events
     * @param {Object} [GameEvents] - Optional GameEvents enum
     */
    static applyInjury(player, injury, decision, eventBus = null, GameEvents = null) {
        player.injury = injury;

        if (decision === 'rest') {
            player.injuryStatus = 'out';
        } else if (decision === 'playThrough') {
            player.injuryStatus = 'day-to-day';
            player.injury.gamesRemaining = player.injury.gamesRemainingIfPlaying;
        }

        if (eventBus && GameEvents) {
            eventBus.emit(GameEvents.PLAYER_INJURED, {
                playerId: player.id,
                playerName: player.name,
                injuryName: injury.name,
                severity: injury.severity,
                decision: decision,
                gamesOut: injury.gamesRemaining
            });
        }

        console.log(`🚑 ${player.name} injured: ${injury.name} (${injury.severity}) - Decision: ${decision}`);
    }

    /**
     * Update injury status after each game (tick down recovery)
     * @param {Object} team
     */
    static updateInjuries(team) {
        if (!team.roster) return;

        team.roster.forEach(player => {
            if (player.injuryStatus === 'healthy') return;

            if (player.injury && player.injury.gamesRemaining > 0 && player.injury.gamesRemaining < 999) {
                player.injury.gamesRemaining--;

                if (player.injury.gamesRemaining === 0) {
                    console.log(`✅ ${player.name} has recovered from ${player.injury.name}`);
                    player.injuryStatus = 'healthy';
                    player.injury = null;
                }
            }
        });
    }

    /**
     * Heal all injuries during off-season (except carryover injuries like ACL)
     * @param {Object} team
     */
    static healAllInjuries(team) {
        if (!team.roster) return;

        team.roster.forEach(player => {
            if (player.injury && player.injury.carryOver) {
                // Carryover injuries: simulate offseason recovery, 20-40 games into next season
                player.injury.gamesRemaining = Math.floor(20 + Math.random() * 20);
                console.log(`🏥 ${player.name}'s ${player.injury.name} will keep them out 20-40 games next season`);
            } else if (player.injuryStatus !== 'healthy') {
                player.injuryStatus = 'healthy';
                player.injury = null;
            }
        });
    }

    /**
     * Grant Disabled Player Exception to a team
     * @param {Object} team
     * @param {Object} injuredPlayer
     * @returns {Object|null} DPE info or null if not eligible
     */
    static grantDPE(team, injuredPlayer) {
        const threshold = InjuryEngine.getDPEThreshold(team.tier);
        const amount = InjuryEngine.getDPEAmount(team.tier);

        if (!injuredPlayer.salary || injuredPlayer.salary < threshold) {
            return null; // Not eligible
        }

        if (!team.dpe) team.dpe = [];
        const dpe = {
            playerId: injuredPlayer.id,
            playerName: injuredPlayer.name,
            amount: amount,
            season: null // Caller should set this
        };
        team.dpe.push(dpe);

        console.log(`🏥 DPE granted to ${team.name} for ${injuredPlayer.name}: +$${(amount / 1000000).toFixed(1)}M in cap space`);
        return dpe;
    }
}
