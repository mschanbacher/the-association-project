// ═══════════════════════════════════════════════════════════════════
// StatEngine — Statistics, awards, All-Star selection, box scores
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM access, no gameState references.
// Returns HTML strings for awards display but does not manipulate DOM.
//

export const StatEngine = {

    // ─────────────────────────────────────────────────────────────────────────
    // POSITION ARCHETYPES
    // ─────────────────────────────────────────────────────────────────────────
    // Base stats per 36 minutes for a 75-rated player at each position.
    // Primary stats scale more aggressively with rating.
    // Future: player.traits will modify these.
    // ─────────────────────────────────────────────────────────────────────────

    POSITION_ARCHETYPES: {
        PG: {
            points:    { base: 14.0, primary: true },
            rebounds:  { base: 3.0,  primary: false },
            assists:   { base: 7.0,  primary: true },
            steals:    { base: 1.5,  primary: false },
            blocks:    { base: 0.3,  primary: false },
            turnovers: { base: 2.5,  primary: false },
            fouls:     { base: 2.0,  primary: false },
            fgaPer36:     15.0,
            threePtRate:  0.40,
            baseFgPct:    0.430,
            baseThreePct: 0.345,
            ftRate:       0.25,
            baseFtPct:    0.820,
        },
        SG: {
            points:    { base: 16.0, primary: true },
            rebounds:  { base: 3.5,  primary: false },
            assists:   { base: 3.5,  primary: false },
            steals:    { base: 1.2,  primary: false },
            blocks:    { base: 0.3,  primary: false },
            turnovers: { base: 2.0,  primary: false },
            fouls:     { base: 2.2,  primary: false },
            fgaPer36:     16.0,
            threePtRate:  0.42,
            baseFgPct:    0.435,
            baseThreePct: 0.355,
            ftRate:       0.27,
            baseFtPct:    0.810,
        },
        SF: {
            points:    { base: 14.0, primary: true },
            rebounds:  { base: 5.0,  primary: false },
            assists:   { base: 3.0,  primary: false },
            steals:    { base: 1.1,  primary: false },
            blocks:    { base: 0.5,  primary: false },
            turnovers: { base: 1.8,  primary: false },
            fouls:     { base: 2.5,  primary: false },
            fgaPer36:     14.5,
            threePtRate:  0.32,
            baseFgPct:    0.445,
            baseThreePct: 0.345,
            ftRate:       0.28,
            baseFtPct:    0.790,
        },
        PF: {
            points:    { base: 13.0, primary: true },
            rebounds:  { base: 7.5,  primary: true },
            assists:   { base: 2.0,  primary: false },
            steals:    { base: 0.8,  primary: false },
            blocks:    { base: 1.0,  primary: true },
            turnovers: { base: 1.8,  primary: false },
            fouls:     { base: 2.8,  primary: false },
            fgaPer36:     13.5,
            threePtRate:  0.22,
            baseFgPct:    0.475,
            baseThreePct: 0.330,
            ftRate:       0.30,
            baseFtPct:    0.740,
        },
        C: {
            points:    { base: 12.0, primary: true },
            rebounds:  { base: 9.5,  primary: true },
            assists:   { base: 1.5,  primary: false },
            steals:    { base: 0.5,  primary: false },
            blocks:    { base: 1.5,  primary: true },
            turnovers: { base: 1.6,  primary: false },
            fouls:     { base: 3.0,  primary: false },
            fgaPer36:     12.0,
            threePtRate:  0.10,
            baseFgPct:    0.535,
            baseThreePct: 0.305,
            ftRate:       0.32,
            baseFtPct:    0.700,
        }
    },

    TIER_PACE: {
        1: { targetPoints: 104, variance: 8 },  // NBA: strength bonus adds ~3-5, landing ~108-112
        2: { targetPoints: 86,  variance: 9 },   // G-League: with bonus lands ~90-95
        3: { targetPoints: 72,  variance: 10 },   // Low college: with bonus lands ~74-80
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    generateGame(homeTeam, awayTeam, options = {}) {
        const isPlayoffs = options.isPlayoffs || false;
        const tier = options.tier || homeTeam.tier || 1;
        const homeCourtBonus = options.homeCourtBonus !== undefined ? options.homeCourtBonus : 3;
        const getFatiguePenaltyFn = options.getFatiguePenalty || getFatiguePenalty;

        const homeRotation = this._buildRotation(homeTeam, getFatiguePenaltyFn, isPlayoffs);
        const awayRotation = this._buildRotation(awayTeam, getFatiguePenaltyFn, isPlayoffs);

        this._calculateUsageShares(homeRotation);
        this._calculateUsageShares(awayRotation);

        const homeChemistry = this._getChemistryModifier(homeTeam, isPlayoffs);
        const awayChemistry = this._getChemistryModifier(awayTeam, isPlayoffs);

        const homeBoost = homeCourtBonus;

        // === COACH MODIFIERS ===
        const homeCoachMods = CoachEngine.getGameModifiers(homeTeam);
        const awayCoachMods = CoachEngine.getGameModifiers(awayTeam);

        // === MATCHUP MODIFIERS (Phase 2) ===
        // Compare starters head-to-head using measurables and physical attributes
        const homeMatchups = this._calculateMatchupModifiers(homeRotation, awayRotation);
        const awayMatchups = this._calculateMatchupModifiers(awayRotation, homeRotation);

        const homeRawStats = homeRotation.map((entry, idx) =>
            this._generatePlayerGameStats(entry, tier, homeChemistry, homeBoost, isPlayoffs, homeCoachMods, awayCoachMods, homeMatchups[idx] || 0)
        );
        const awayRawStats = awayRotation.map((entry, idx) =>
            this._generatePlayerGameStats(entry, tier, awayChemistry, 0, isPlayoffs, awayCoachMods, homeCoachMods, awayMatchups[idx] || 0)
        );

        const pace = this.TIER_PACE[tier] || this.TIER_PACE[1];
        // Coach pace modifiers adjust target points
        const homePaceAdj = homeCoachMods.paceModifier + awayCoachMods.paceModifier * 0.3; // Opponent pace has 30% influence
        const awayPaceAdj = awayCoachMods.paceModifier + homeCoachMods.paceModifier * 0.3;
        const homePace = { targetPoints: pace.targetPoints + 3 + homePaceAdj + homeCoachMods.overallBonus + homeCoachMods.adaptabilityBonus, variance: pace.variance };
        const awayPace = { targetPoints: pace.targetPoints - 1 + awayPaceAdj + awayCoachMods.overallBonus + awayCoachMods.adaptabilityBonus, variance: pace.variance };

        const homeStats = this._normalizeTeamStats(homeRawStats, homePace, homeTeam, tier);
        const awayStats = this._normalizeTeamStats(awayRawStats, awayPace, awayTeam, tier);

        this._reconcileAssists(homeStats);
        this._reconcileAssists(awayStats);

        let homeScore = homeStats.reduce((sum, s) => sum + s.points, 0);
        let awayScore = awayStats.reduce((sum, s) => sum + s.points, 0);

        if (homeScore === awayScore) {
            const otTeam = Math.random() < 0.55 ? homeStats : awayStats;
            const starter = otTeam.find(s => s.gamesStarted > 0) || otTeam[0];
            if (starter) {
                const otPoints = 2 + Math.floor(Math.random() * 4);
                starter.points += otPoints;
                starter.fieldGoalsMade += 1;
                starter.fieldGoalsAttempted += 2;
                homeScore = homeStats.reduce((sum, s) => sum + s.points, 0);
                awayScore = awayStats.reduce((sum, s) => sum + s.points, 0);
            }
            if (homeScore === awayScore) {
                if (homeStats.length > 0) {
                    homeStats[0].points += 1;
                    homeStats[0].freeThrowsMade += 1;
                    homeStats[0].freeThrowsAttempted += 1;
                    homeScore += 1;
                } else {
                    homeScore += 1; // Force tiebreak even if stats empty
                }
            }
        }

        const homeWon = homeScore > awayScore;
        const diff = homeScore - awayScore;

        return {
            homeTeam: homeTeam,
            awayTeam: awayTeam,
            homeScore: homeScore,
            awayScore: awayScore,
            winner: homeWon ? homeTeam : awayTeam,
            loser: homeWon ? awayTeam : homeTeam,
            homeWon: homeWon,
            pointDiff: diff,
            homePlayerStats: homeStats,
            awayPlayerStats: awayStats
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // MATCHUP MODIFIER CALCULATOR (Phase 2)
    // ─────────────────────────────────────────────────────────────────────────
    // Compares starters head-to-head using physical measurables and attributes.
    // Returns an array of modifiers (one per rotation slot, 0 for bench).
    // Starters get ±0 to ±4 based on matchup advantages.
    // Bench players get a diluted average of the team's matchup edge.

    _calculateMatchupModifiers(myRotation, theirRotation) {
        const mods = new Array(myRotation.length).fill(0);
        if (myRotation.length === 0 || theirRotation.length === 0) return mods;

        // Get starters (first 5) from each rotation
        const myStarters = myRotation.slice(0, Math.min(5, myRotation.length));
        const theirStarters = theirRotation.slice(0, Math.min(5, theirRotation.length));

        let totalStarterEdge = 0;

        for (let i = 0; i < myStarters.length; i++) {
            const me = myStarters[i].player;
            const them = theirStarters[i] ? theirStarters[i].player : null;
            if (!them) continue;

            let matchupEdge = 0;

            // --- Physical measurables comparison ---
            const myM = me.measurables || {};
            const theirM = them.measurables || {};

            // Height advantage: ±2 max (0.15 per inch diff)
            const heightDiff = (myM.height || 78) - (theirM.height || 78);
            matchupEdge += Math.max(-2, Math.min(2, heightDiff * 0.15));

            // Wingspan advantage: ±1.5 max (0.12 per inch diff)
            const wingDiff = (myM.wingspan || 82) - (theirM.wingspan || 82);
            matchupEdge += Math.max(-1.5, Math.min(1.5, wingDiff * 0.12));

            // --- Physical attribute comparison ---
            const myA = me.attributes || {};
            const theirA = them.attributes || {};

            // Speed advantage: ±1.5 max (faster player gets offensive edge)
            const speedDiff = (myA.speed || 50) - (theirA.speed || 50);
            matchupEdge += Math.max(-1.5, Math.min(1.5, speedDiff * 0.02));

            // Strength advantage: ±1.5 max (stronger player wins boards/post)
            const strDiff = (myA.strength || 50) - (theirA.strength || 50);
            matchupEdge += Math.max(-1.5, Math.min(1.5, strDiff * 0.015));

            // Cap total per-matchup to ±4
            matchupEdge = Math.max(-4, Math.min(4, matchupEdge));

            mods[i] = matchupEdge;
            totalStarterEdge += matchupEdge;
        }

        // Bench players get a diluted version of the team's average matchup edge
        // (bench matchups are more fluid and less predictable)
        const avgEdge = myStarters.length > 0 ? (totalStarterEdge / myStarters.length) * 0.3 : 0;
        for (let i = 5; i < mods.length; i++) {
            mods[i] = avgEdge;
        }

        return mods;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ROTATION BUILDER
    // ─────────────────────────────────────────────────────────────────────────

    _buildRotation(team, getFatiguePenaltyFn, isPlayoffs) {
        if (!team.roster || team.roster.length === 0) return [];

        const available = team.roster
            .filter(p => {
                if (p.injuryStatus === 'out') return false;
                if (p.resting) return false;
                return true;
            })
            .map(p => {
                let effectiveRating = p.rating;
                if (p.injuryStatus === 'day-to-day' && p.injury && p.injury.ratingPenalty) {
                    effectiveRating += p.injury.ratingPenalty;
                }
                effectiveRating += getFatiguePenaltyFn(p.fatigue || 0);
                effectiveRating = Math.max(50, effectiveRating);
                return { player: p, effectiveRating };
            });

        if (available.length === 0) return [];

        const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
        const starters = [];
        const usedIds = new Set();

        positions.forEach(pos => {
            const candidates = available
                .filter(e => e.player.position === pos && !usedIds.has(e.player.id))
                .sort((a, b) => b.effectiveRating - a.effectiveRating);
            if (candidates.length > 0) {
                starters.push(candidates[0]);
                usedIds.add(candidates[0].player.id);
            } else {
                const fallback = available
                    .filter(e => !usedIds.has(e.player.id))
                    .sort((a, b) => b.effectiveRating - a.effectiveRating)[0];
                if (fallback) {
                    starters.push(fallback);
                    usedIds.add(fallback.player.id);
                }
            }
        });

        const bench = available
            .filter(e => !usedIds.has(e.player.id))
            .sort((a, b) => b.effectiveRating - a.effectiveRating);

        const rotation = [...starters, ...bench];

        // Use coach-driven minutes distribution if team has a coach
        const minutesSlots = CoachEngine.getMinutesDistribution(team.coach, isPlayoffs);

        let totalAssigned = 0;
        const entries = rotation.map((entry, index) => {
            if (index >= minutesSlots.length) {
                return { ...entry, minutes: 0, isStarter: false };
            }
            const baseMinutes = minutesSlots[index];
            const variance = index < 5 ? 2 : 1;
            const minutes = Math.max(0, baseMinutes + Math.floor((Math.random() - 0.5) * 2 * variance + 0.5));
            totalAssigned += minutes;
            return { ...entry, minutes, isStarter: index < 5 };
        });

        // Adjust to hit exactly 240 total minutes
        const totalAfter = entries.reduce((sum, e) => sum + e.minutes, 0);
        let diff = 240 - totalAfter;
        if (diff !== 0) {
            const adjustable = entries.filter(e => e.minutes > 0).slice(0, 8);
            let idx = 0;
            while (diff !== 0 && adjustable.length > 0) {
                if (diff > 0) {
                    adjustable[idx % adjustable.length].minutes += 1;
                    diff--;
                } else if (adjustable[idx % adjustable.length].minutes > 1) {
                    adjustable[idx % adjustable.length].minutes -= 1;
                    diff++;
                }
                idx++;
                if (idx > 100) break;
            }
        }

        return entries;
    },

    _calculateUsageShares(rotation) {
        if (rotation.length === 0) return;
        const activePlayers = rotation.filter(e => e.minutes > 0);
        if (activePlayers.length === 0) return;

        const totalMinutes = activePlayers.reduce((sum, e) => sum + e.minutes, 0);
        const weightedAvgRating = activePlayers.reduce((sum, e) =>
            sum + e.effectiveRating * e.minutes, 0) / totalMinutes;

        activePlayers.forEach(entry => {
            const ratingDelta = entry.effectiveRating - weightedAvgRating;
            const usageRaw = 1.0 + (ratingDelta / 40);
            entry.usageShare = Math.max(0.4, Math.min(1.8, usageRaw));
        });

        rotation.filter(e => e.minutes === 0).forEach(e => { e.usageShare = 0; });
    },

    _getChemistryModifier(team, isPlayoffs) {
        if (!team.roster || team.roster.length === 0) return 1.0;
        const totalChem = team.roster.reduce((sum, p) => sum + (p.chemistry || 75), 0);
        const avgChem = totalChem / team.roster.length;
        let modifier = (avgChem - 75) / 500;
        if (isPlayoffs) modifier *= 2;
        return 1.0 + modifier;
    },

    // ─────────────────────────────────────────────────────────────────────────
    // PER-PLAYER STAT GENERATION
    // ─────────────────────────────────────────────────────────────────────────

    _generatePlayerGameStats(entry, tier, chemModifier, homeBoost, isPlayoffs, teamCoachMods, opponentCoachMods, matchupModifier) {
        const { player, effectiveRating, minutes, isStarter, usageShare } = entry;

        if (minutes === 0) return this._emptyStatLine(player, isStarter);

        const position = player.position || 'SF';
        const archetype = this.POSITION_ARCHETYPES[position] || this.POSITION_ARCHETYPES['SF'];

        // === MATCHUP MODIFIER (Phase 2) ===
        // Positive = advantage against opponent, negative = disadvantage
        const matchupMod = matchupModifier || 0;

        // === CLUTCH MODIFIER (Phase 2) ===
        // In playoffs, high-clutch players get a boost, low-clutch players get penalized
        let clutchMod = 0;
        if (isPlayoffs && player.attributes) {
            const clutch = player.attributes.clutch || 50;
            // 50 = neutral, 90 = +2.0, 20 = -1.5
            clutchMod = (clutch - 50) * 0.05;
        }

        // === COACHABILITY MODIFIER (Phase 2) ===
        // Scales how much coach modifiers apply to this specific player
        // High coachability = full coach effect, low = diminished
        let coachEffectScale = 1.0;
        if (player.attributes) {
            const coachability = player.attributes.coachability || 50;
            // 50 = 1.0x (neutral), 90 = 1.3x, 20 = 0.7x
            coachEffectScale = 0.7 + (coachability / 100) * 0.6;
        }

        const boostedRating = effectiveRating + homeBoost + matchupMod + clutchMod;
        const ratingDelta = boostedRating - 75;
        const primaryScale = 1.0 + (ratingDelta * 0.020);
        const secondaryScale = 1.0 + (ratingDelta * 0.008);
        const minutesFactor = minutes / 36;
        const usageMod = usageShare || 1.0;
        const chemMod = chemModifier || 1.0;

        // Coach-driven trait modifiers — scaled by individual coachability
        const cm = teamCoachMods || CoachEngine._defaultModifiers();
        const opp = opponentCoachMods || CoachEngine._defaultModifiers();
        const scaledAssistMult = 1.0 + (cm.assistMultiplier - 1.0) * coachEffectScale;
        const scaledStealBlockMult = 1.0 + (cm.stealBlockMultiplier - 1.0) * coachEffectScale;
        const scaledTOMod = 1.0 + (cm.turnoverModifier - 1.0) * coachEffectScale;
        const scaledFoulMod = 1.0 + (cm.foulModifier - 1.0) * coachEffectScale;
        const scaledThreePtMod = cm.threePtRateModifier * coachEffectScale;
        const scaledDefMod = opp.defenseModifier * coachEffectScale;

        const traitMods = {
            points: 1.0,
            rebounds: 1.0,
            assists: scaledAssistMult,
            steals: scaledStealBlockMult,
            blocks: scaledStealBlockMult
        };

        const statLine = {
            playerId: player.id,
            playerName: player.name,
            position: position,
            team: null,
            gamesPlayed: 1,
            gamesStarted: isStarter ? 1 : 0,
            minutesPlayed: minutes,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
            turnovers: 0, fouls: 0,
            fieldGoalsMade: 0, fieldGoalsAttempted: 0,
            threePointersMade: 0, threePointersAttempted: 0,
            freeThrowsMade: 0, freeThrowsAttempted: 0,
        };

        const generateStat = (archetypeStat, traitMod) => {
            const scale = archetypeStat.primary ? primaryScale : secondaryScale;
            const base = archetypeStat.base * scale * minutesFactor * chemMod * traitMod;
            const usageEffect = archetypeStat.primary ? usageMod : (1.0 + (usageMod - 1.0) * 0.3);
            const expected = base * usageEffect;
            const variance = this._normalRandom() * 0.40;
            return Math.max(0, expected * (1 + variance));
        };

        statLine.rebounds  = Math.round(generateStat(archetype.rebounds, traitMods.rebounds));
        statLine.assists   = Math.round(generateStat(archetype.assists, traitMods.assists));
        statLine.steals    = Math.round(generateStat(archetype.steals, traitMods.steals));
        statLine.blocks    = Math.round(generateStat(archetype.blocks, traitMods.blocks));
        statLine.turnovers = Math.round(generateStat(archetype.turnovers, scaledTOMod));
        statLine.fouls     = Math.max(0, Math.min(6, Math.round(generateStat(archetype.fouls, scaledFoulMod))));

        // === ATTRIBUTE-BASED STAT ADJUSTMENTS ===
        if (player.attributes) {
            const a = player.attributes;
            // Verticality + Strength boost rebounds (max ±2)
            const reboundBoost = ((a.verticality || 50) - 50 + (a.strength || 50) - 50) * 0.015 * minutesFactor;
            statLine.rebounds = Math.max(0, Math.round(statLine.rebounds + reboundBoost));
            // Basketball IQ boosts assists and reduces turnovers
            const iqMod = ((a.basketballIQ || 50) - 50) * 0.01 * minutesFactor;
            statLine.assists = Math.max(0, Math.round(statLine.assists + iqMod * 1.5));
            statLine.turnovers = Math.max(0, Math.round(statLine.turnovers - iqMod * 0.8));
            // Verticality boosts blocks
            const vertBlockBoost = ((a.verticality || 50) - 50) * 0.008 * minutesFactor;
            statLine.blocks = Math.max(0, Math.round(statLine.blocks + vertBlockBoost));
            // Speed boosts steals
            const speedStealBoost = ((a.speed || 50) - 50) * 0.006 * minutesFactor;
            statLine.steals = Math.max(0, Math.round(statLine.steals + speedStealBoost));
        }

        // Shooting — coach modifiers scaled by coachability
        const fgaBase = archetype.fgaPer36 * minutesFactor * usageMod;
        const fgaVariance = 1 + this._normalRandom() * 0.25;
        const fga = Math.max(1, Math.round(fgaBase * fgaVariance));
        // Coach 3PT tendency shifts the three-point attempt rate (scaled by coachability)
        const adjustedThreePtRate = Math.max(0.05, Math.min(0.60, archetype.threePtRate + scaledThreePtMod));
        const threePA = Math.round(fga * adjustedThreePtRate);
        const twoPA = fga - threePA;

        const fgPctBonus = ratingDelta * 0.003;
        const threePctBonus = ratingDelta * 0.0015;
        const ftPctBonus = ratingDelta * 0.002;
        const shootingHeat = this._normalRandom() * 0.06;
        // Opponent defensive intensity affects shooting (scaled by their coachability aggregate)
        const oppDefPenalty = scaledDefMod;

        const twoPtPct = Math.max(0.30, Math.min(0.62, (archetype.baseFgPct + 0.04) + fgPctBonus + shootingHeat + oppDefPenalty));
        const threePtPct = Math.max(0.15, Math.min(0.45, archetype.baseThreePct + threePctBonus + shootingHeat + oppDefPenalty * 0.8));
        const ftPct = Math.max(0.40, Math.min(0.95, archetype.baseFtPct + ftPctBonus + (this._normalRandom() * 0.05)));

        const twoPM = this._binomialRoll(twoPA, twoPtPct);
        const threePM = this._binomialRoll(threePA, threePtPct);

        statLine.fieldGoalsMade = twoPM + threePM;
        statLine.fieldGoalsAttempted = fga;
        statLine.threePointersMade = threePM;
        statLine.threePointersAttempted = threePA;

        const ftaBase = fga * archetype.ftRate;
        const fta = Math.max(0, Math.round(ftaBase * (1 + this._normalRandom() * 0.4)));
        const ftm = this._binomialRoll(fta, ftPct);
        statLine.freeThrowsMade = ftm;
        statLine.freeThrowsAttempted = fta;

        statLine.points = (twoPM * 2) + (threePM * 3) + ftm;
        return statLine;
    },

    _normalizeTeamStats(playerStats, pace, team, tier) {
        const rawTotal = playerStats.reduce((sum, s) => sum + s.points, 0);
        if (rawTotal === 0) return playerStats;

        const teamStrength = this._quickTeamStrength(playerStats);
        const strengthDelta = teamStrength - 75;
        // Lower tiers: strength differences matter more
        const strengthMult = tier === 1 ? 0.3 : tier === 2 ? 0.5 : 0.7;
        const strengthBonus = strengthDelta * strengthMult;
        const targetBase = pace.targetPoints + strengthBonus;
        const target = targetBase + (Math.random() - 0.5) * pace.variance * 2;
        const scaleFactor = target / rawTotal;

        // Normalize to keep scores realistic — lower tiers allow wider swing
        const clampRange = tier === 1 ? 0.25 : tier === 2 ? 0.35 : 0.45;
        return playerStats.map(stat => {
            if (stat.minutesPlayed === 0) return stat;
            const scaled = { ...stat };
            const pointScale = Math.max(1 - clampRange, Math.min(1 + clampRange, scaleFactor));

            scaled.fieldGoalsAttempted = Math.max(1, Math.round(stat.fieldGoalsAttempted * pointScale));
            scaled.threePointersAttempted = Math.max(0, Math.round(stat.threePointersAttempted * pointScale));
            scaled.freeThrowsAttempted = Math.max(0, Math.round(stat.freeThrowsAttempted * pointScale));

            const fgPct = stat.fieldGoalsAttempted > 0 ? stat.fieldGoalsMade / stat.fieldGoalsAttempted : 0.45;
            const threePct = stat.threePointersAttempted > 0 ? stat.threePointersMade / stat.threePointersAttempted : 0.33;
            const ftPct = stat.freeThrowsAttempted > 0 ? stat.freeThrowsMade / stat.freeThrowsAttempted : 0.75;

            const twoPA = scaled.fieldGoalsAttempted - scaled.threePointersAttempted;
            const twoPtPctEff = stat.fieldGoalsAttempted > 0
                ? ((stat.fieldGoalsMade - stat.threePointersMade) / Math.max(1, stat.fieldGoalsAttempted - stat.threePointersAttempted))
                : 0.48;

            const newTwoPM = this._binomialRoll(twoPA, twoPtPctEff);
            const newThreePM = this._binomialRoll(scaled.threePointersAttempted, threePct);
            const newFTM = this._binomialRoll(scaled.freeThrowsAttempted, ftPct);

            scaled.fieldGoalsMade = newTwoPM + newThreePM;
            scaled.threePointersMade = newThreePM;
            scaled.freeThrowsMade = newFTM;
            scaled.points = (newTwoPM * 2) + (newThreePM * 3) + newFTM;
            return scaled;
        });
    },

    _reconcileAssists(teamStats) {
        const totalFGM = teamStats.reduce((sum, s) => sum + s.fieldGoalsMade, 0);
        const totalAssists = teamStats.reduce((sum, s) => sum + s.assists, 0);
        const maxAssists = Math.floor(totalFGM * 0.65);
        if (totalAssists > maxAssists && totalAssists > 0) {
            const scaleFactor = maxAssists / totalAssists;
            teamStats.forEach(stat => {
                stat.assists = Math.max(0, Math.round(stat.assists * scaleFactor));
            });
        }
    },

    _emptyStatLine(player, isStarter) {
        return {
            playerId: player.id, playerName: player.name, position: player.position,
            team: null, gamesPlayed: 0, gamesStarted: 0, minutesPlayed: 0,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
            turnovers: 0, fouls: 0,
            fieldGoalsMade: 0, fieldGoalsAttempted: 0,
            threePointersMade: 0, threePointersAttempted: 0,
            freeThrowsMade: 0, freeThrowsAttempted: 0,
        };
    },

    _quickTeamStrength(playerStats) {
        const activePlayers = playerStats.filter(s => s.minutesPlayed > 0);
        if (activePlayers.length === 0) return 75;
        const totalPoints = activePlayers.reduce((sum, s) => sum + s.points, 0);
        const totalMinutes = activePlayers.reduce((sum, s) => sum + s.minutesPlayed, 0);
        const ppm = totalPoints / Math.max(1, totalMinutes);
        return 50 + ppm * 80;
    },

    _normalRandom() {
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(Math.max(0.0001, u1))) * Math.cos(2 * Math.PI * u2);
        return Math.max(-2.5, Math.min(2.5, z));
    },

    _binomialRoll(attempts, probability) {
        if (attempts <= 0) return 0;
        probability = Math.max(0, Math.min(1, probability));
        if (attempts <= 20) {
            let successes = 0;
            for (let i = 0; i < attempts; i++) {
                if (Math.random() < probability) successes++;
            }
            return successes;
        } else {
            const mean = attempts * probability;
            const stddev = Math.sqrt(attempts * probability * (1 - probability));
            const result = mean + this._normalRandom() * stddev;
            return Math.max(0, Math.min(attempts, Math.round(result)));
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // SEASON STATS MANAGEMENT
    // ─────────────────────────────────────────────────────────────────────────

    initializeSeasonStats(player) {
        player.seasonStats = {
            gamesPlayed: 0, gamesStarted: 0, minutesPlayed: 0,
            points: 0, rebounds: 0, assists: 0, steals: 0, blocks: 0,
            turnovers: 0, fouls: 0,
            fieldGoalsMade: 0, fieldGoalsAttempted: 0,
            threePointersMade: 0, threePointersAttempted: 0,
            freeThrowsMade: 0, freeThrowsAttempted: 0,
        };
    },

    accumulateStats(player, gameStatLine) {
        if (!player.seasonStats) this.initializeSeasonStats(player);
        const s = player.seasonStats;
        const g = gameStatLine;
        s.gamesPlayed += g.gamesPlayed;
        s.gamesStarted += g.gamesStarted;
        s.minutesPlayed += g.minutesPlayed;
        s.points += g.points;
        s.rebounds += g.rebounds;
        s.assists += g.assists;
        s.steals += g.steals;
        s.blocks += g.blocks;
        s.turnovers += g.turnovers;
        s.fouls += g.fouls;
        s.fieldGoalsMade += g.fieldGoalsMade;
        s.fieldGoalsAttempted += g.fieldGoalsAttempted;
        s.threePointersMade += g.threePointersMade;
        s.threePointersAttempted += g.threePointersAttempted;
        s.freeThrowsMade += g.freeThrowsMade;
        s.freeThrowsAttempted += g.freeThrowsAttempted;
    },

    getSeasonAverages(player) {
        const s = player.seasonStats;
        if (!s || s.gamesPlayed === 0) return null;
        const gp = s.gamesPlayed;
        return {
            gamesPlayed: gp,
            gamesStarted: s.gamesStarted,
            minutesPerGame:  +(s.minutesPlayed / gp).toFixed(1),
            pointsPerGame:   +(s.points / gp).toFixed(1),
            reboundsPerGame: +(s.rebounds / gp).toFixed(1),
            assistsPerGame:  +(s.assists / gp).toFixed(1),
            stealsPerGame:   +(s.steals / gp).toFixed(1),
            blocksPerGame:   +(s.blocks / gp).toFixed(1),
            turnoversPerGame: +(s.turnovers / gp).toFixed(1),
            foulsPerGame:    +(s.fouls / gp).toFixed(1),
            fieldGoalPct:    s.fieldGoalsAttempted > 0 ? +(s.fieldGoalsMade / s.fieldGoalsAttempted).toFixed(3) : 0,
            threePointPct:   s.threePointersAttempted > 0 ? +(s.threePointersMade / s.threePointersAttempted).toFixed(3) : 0,
            freeThrowPct:    s.freeThrowsAttempted > 0 ? +(s.freeThrowsMade / s.freeThrowsAttempted).toFixed(3) : 0,
            totalPoints: s.points,
            totalRebounds: s.rebounds,
            totalAssists: s.assists,
            totalSteals: s.steals,
            totalBlocks: s.blocks,
        };
    },

    archiveSeasonStats(player) {
        if (player.seasonStats && player.seasonStats.gamesPlayed > 0) {
            player.previousSeasonStats = { ...player.seasonStats };
            player.previousSeasonAverages = this.getSeasonAverages(player);
        }
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AWARDS CALCULATION ENGINE
    // ─────────────────────────────────────────────────────────────────────────
    // Calculates end-of-season awards for a given set of teams.
    // Call once per tier at season end.
    //
    // Awards: MVP, DPOY, ROY, Sixth Man, Most Improved, All-League (1st/2nd)
    //
    // @param {Array} teams - Array of team objects with rosters
    // @param {number} minGamesPlayed - Minimum games to qualify (default: 50% of season)
    // @param {number} tier - Tier level (for display purposes)
    // @returns {Object} Award winners
    // ─────────────────────────────────────────────────────────────────────────

    calculateAwards(teams, minGamesPlayed = 0, tier = 1) {
        // Gather all eligible players with season averages
        const allPlayers = [];
        teams.forEach(team => {
            if (!team.roster) return;
            team.roster.forEach(player => {
                if (!player.seasonStats || player.seasonStats.gamesPlayed < minGamesPlayed) return;
                const avgs = this.getSeasonAverages(player);
                if (!avgs) return;
                allPlayers.push({
                    player: player,
                    team: team,
                    avgs: avgs,
                });
            });
        });

        if (allPlayers.length === 0) {
            return { mvp: null, dpoy: null, roy: null, sixthMan: null, mostImproved: null, allLeagueFirst: [], allLeagueSecond: [] };
        }

        // ── MVP ──
        // Weighted composite: scoring, assists, rebounds, efficiency, team success
        const maxTeamWins = Math.max(...teams.map(t => t.wins || 0));
        const mvpScores = allPlayers
            .filter(p => p.avgs.gamesStarted >= p.avgs.gamesPlayed * 0.6) // Must be a starter
            .map(p => {
                const a = p.avgs;
                const teamWinPct = (p.team.wins || 0) / Math.max(1, (p.team.wins || 0) + (p.team.losses || 0));
                // Scoring: up to 30 points
                const scoringScore = Math.min(30, a.pointsPerGame * 1.0);
                // Assists: up to 15 points
                const assistScore = Math.min(15, a.assistsPerGame * 1.5);
                // Rebounds: up to 15 points
                const reboundScore = Math.min(15, a.reboundsPerGame * 1.2);
                // Efficiency (FG%): up to 10 points
                const efficiencyScore = a.fieldGoalPct * 20;
                // Team success: up to 30 points (heavily weighted — MVP must be on a good team)
                const teamScore = teamWinPct * 30;
                // Penalty for turnovers
                const toPenalty = a.turnoversPerGame * 0.5;
                
                return {
                    ...p,
                    mvpScore: scoringScore + assistScore + reboundScore + efficiencyScore + teamScore - toPenalty
                };
            })
            .sort((a, b) => b.mvpScore - a.mvpScore);

        // ── DPOY ──
        // Steals, blocks, team defensive performance (lower opponent scoring = better)
        const dpoyScores = allPlayers
            .filter(p => p.avgs.gamesStarted >= p.avgs.gamesPlayed * 0.5)
            .map(p => {
                const a = p.avgs;
                // Blocks: up to 40 points (heavily weighted for DPOY)
                const blockScore = a.blocksPerGame * 15;
                // Steals: up to 30 points
                const stealScore = a.stealsPerGame * 15;
                // Rebounds: up to 15 points (contesting shots, securing possessions)
                const reboundScore = a.reboundsPerGame * 1.0;
                // Position bonus: C and PF naturally contend more
                const posBonus = (p.player.position === 'C' ? 3 : p.player.position === 'PF' ? 2 : 0);
                // Minutes: must actually play significant minutes
                const minutesBonus = Math.min(5, a.minutesPerGame * 0.15);
                
                return {
                    ...p,
                    dpoyScore: blockScore + stealScore + reboundScore + posBonus + minutesBonus
                };
            })
            .sort((a, b) => b.dpoyScore - a.dpoyScore);

        // ── ROY (Rookie of the Year) ──
        // Best first-year player. In this game, "rookie" = age 19-20 in their first season
        // Since we don't track draft year yet, use age <= 21 as proxy
        const rookies = allPlayers
            .filter(p => p.player.age <= 21)
            .map(p => {
                const a = p.avgs;
                const royScore = (a.pointsPerGame * 1.0) + (a.assistsPerGame * 1.2) + 
                                 (a.reboundsPerGame * 0.8) + (a.stealsPerGame * 2) + (a.blocksPerGame * 2) +
                                 (a.minutesPerGame * 0.1);
                return { ...p, royScore };
            })
            .sort((a, b) => b.royScore - a.royScore);

        // ── Sixth Man of the Year ──
        // Best bench player (started < 40% of games played)
        const sixthManCandidates = allPlayers
            .filter(p => p.avgs.gamesStarted < p.avgs.gamesPlayed * 0.4 && p.avgs.gamesPlayed >= minGamesPlayed * 0.7)
            .map(p => {
                const a = p.avgs;
                const sixthScore = (a.pointsPerGame * 1.2) + (a.assistsPerGame * 1.5) + 
                                   (a.reboundsPerGame * 0.8) + (a.stealsPerGame * 2) + (a.blocksPerGame * 2);
                return { ...p, sixthScore };
            })
            .sort((a, b) => b.sixthScore - a.sixthScore);

        // ── Most Improved Player ──
        // Largest positive delta in composite stat score vs previous season
        const mipCandidates = allPlayers
            .filter(p => p.player.previousSeasonAverages && p.player.previousSeasonAverages.gamesPlayed >= 20)
            .map(p => {
                const curr = p.avgs;
                const prev = p.player.previousSeasonAverages;
                // Composite improvement
                const currComposite = curr.pointsPerGame + curr.assistsPerGame + curr.reboundsPerGame + 
                                      (curr.stealsPerGame * 2) + (curr.blocksPerGame * 2);
                const prevComposite = prev.pointsPerGame + prev.assistsPerGame + prev.reboundsPerGame + 
                                      (prev.stealsPerGame * 2) + (prev.blocksPerGame * 2);
                const improvement = currComposite - prevComposite;
                return { ...p, improvement, prevAvgs: prev };
            })
            .filter(p => p.improvement > 0)
            .sort((a, b) => b.improvement - a.improvement);

        // ── All-League Teams ──
        // Best 5 players by position: 2 guards (PG/SG), 2 forwards (SF/PF), 1 center (C)
        // First team: top at each position. Second team: next best.
        const allLeagueScores = allPlayers
            .filter(p => p.avgs.gamesStarted >= p.avgs.gamesPlayed * 0.5)
            .map(p => {
                const a = p.avgs;
                const allLeagueScore = (a.pointsPerGame * 1.0) + (a.assistsPerGame * 1.3) + 
                                       (a.reboundsPerGame * 1.0) + (a.stealsPerGame * 2.5) + 
                                       (a.blocksPerGame * 2.5) + (a.fieldGoalPct * 10) -
                                       (a.turnoversPerGame * 0.8);
                return { ...p, allLeagueScore };
            })
            .sort((a, b) => b.allLeagueScore - a.allLeagueScore);

        const buildAllLeagueTeam = (candidates, excludeIds = new Set()) => {
            const team = { G1: null, G2: null, F1: null, F2: null, C: null };
            const used = new Set(excludeIds);
            
            const guards = candidates.filter(p => (p.player.position === 'PG' || p.player.position === 'SG') && !used.has(p.player.id));
            const forwards = candidates.filter(p => (p.player.position === 'SF' || p.player.position === 'PF') && !used.has(p.player.id));
            const centers = candidates.filter(p => p.player.position === 'C' && !used.has(p.player.id));
            
            if (guards.length >= 1) { team.G1 = guards[0]; used.add(guards[0].player.id); }
            if (guards.length >= 2) { team.G2 = guards[1]; used.add(guards[1].player.id); }
            if (forwards.length >= 1) { team.F1 = forwards[0]; used.add(forwards[0].player.id); }
            if (forwards.length >= 2) { team.F2 = forwards[1]; used.add(forwards[1].player.id); }
            if (centers.length >= 1) { team.C = centers[0]; used.add(centers[0].player.id); }
            
            return { team, usedIds: used };
        };

        const firstTeamResult = buildAllLeagueTeam(allLeagueScores);
        const secondTeamResult = buildAllLeagueTeam(allLeagueScores, firstTeamResult.usedIds);

        // ── Stat Leaders ──
        const statLeaders = {
            scoring: [...allPlayers].sort((a, b) => b.avgs.pointsPerGame - a.avgs.pointsPerGame).slice(0, 3),
            rebounds: [...allPlayers].sort((a, b) => b.avgs.reboundsPerGame - a.avgs.reboundsPerGame).slice(0, 3),
            assists: [...allPlayers].sort((a, b) => b.avgs.assistsPerGame - a.avgs.assistsPerGame).slice(0, 3),
            steals: [...allPlayers].sort((a, b) => b.avgs.stealsPerGame - a.avgs.stealsPerGame).slice(0, 3),
            blocks: [...allPlayers].sort((a, b) => b.avgs.blocksPerGame - a.avgs.blocksPerGame).slice(0, 3),
        };

        return {
            mvp: mvpScores.length > 0 ? mvpScores[0] : null,
            dpoy: dpoyScores.length > 0 ? dpoyScores[0] : null,
            roy: rookies.length > 0 ? rookies[0] : null,
            sixthMan: sixthManCandidates.length > 0 ? sixthManCandidates[0] : null,
            mostImproved: mipCandidates.length > 0 ? mipCandidates[0] : null,
            allLeagueFirst: firstTeamResult.team,
            allLeagueSecond: secondTeamResult.team,
            statLeaders: statLeaders,
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ALL-STAR SELECTION & GAME
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Select All-Star rosters for a tier
     * Picks 12 per conference: 2 PG, 2 SG, 2 SF, 2 PF, 2 C, 2 wildcards
     * @param {Array} teams - All teams in the tier
     * @param {number} minGames - Minimum games played to qualify
     * @param {Object} conferenceMap - { teamId: 'East'|'West' }
     * @returns {Object} { east: [...players], west: [...players], mvpFavorites: {east, west} }
     */
    selectAllStars(teams, minGames, conferenceMap) {
        const allPlayers = [];
        teams.forEach(team => {
            if (!team.roster) return;
            team.roster.forEach(player => {
                if (!player.seasonStats || player.seasonStats.gamesPlayed < minGames) return;
                const avgs = this.getSeasonAverages(player);
                if (!avgs) return;
                
                // All-Star score: balanced scoring, assists, rebounds, efficiency
                const score = (avgs.pointsPerGame * 1.0) + (avgs.assistsPerGame * 1.3) + 
                              (avgs.reboundsPerGame * 1.0) + (avgs.stealsPerGame * 2.0) + 
                              (avgs.blocksPerGame * 2.0) + (avgs.fieldGoalPct * 8) -
                              (avgs.turnoversPerGame * 0.5);
                
                const conf = conferenceMap[team.id] || 'East';
                allPlayers.push({ player, team, avgs, score, conference: conf });
            });
        });
        
        const buildRoster = (candidates, count = 12) => {
            const roster = [];
            const used = new Set();
            
            // Position slots: 2 per position
            const positionSlots = { PG: 2, SG: 2, SF: 2, PF: 2, C: 2 };
            const sorted = [...candidates].sort((a, b) => b.score - a.score);
            
            // Fill position slots first
            for (const p of sorted) {
                if (roster.length >= count - 2) break; // Leave 2 wildcard slots
                const pos = p.player.position;
                if (positionSlots[pos] > 0 && !used.has(p.player.id)) {
                    roster.push(p);
                    used.add(p.player.id);
                    positionSlots[pos]--;
                }
            }
            
            // Fill remaining with wildcards (best remaining regardless of position)
            for (const p of sorted) {
                if (roster.length >= count) break;
                if (!used.has(p.player.id)) {
                    roster.push(p);
                    used.add(p.player.id);
                }
            }
            
            return roster;
        };
        
        const eastCandidates = allPlayers.filter(p => p.conference === 'East');
        const westCandidates = allPlayers.filter(p => p.conference === 'West');
        
        const east = buildRoster(eastCandidates, 12);
        const west = buildRoster(westCandidates, 12);
        
        return {
            east: east,
            west: west,
            eastMVPFavorite: east.length > 0 ? east[0] : null,
            westMVPFavorite: west.length > 0 ? west[0] : null
        };
    },
    
    /**
     * Simulate an All-Star game between two rosters
     * Creates temporary team objects and runs through GameEngine
     * @returns {Object} Game result with box score highlights
     */
    simulateAllStarGame(eastRoster, westRoster, tierLabel) {
        // Build temporary team objects for the game engine
        const buildTeam = (roster, name, id) => {
            const players = roster.map((p, idx) => {
                // Clone player with boosted ratings for All-Star showcase
                // Clear injury/fatigue/resting so All-Star players are always available
                return {
                    ...p.player,
                    id: `allstar_${id}_${idx}`,
                    _realId: p.player.id,
                    _realTeam: p.team.name,
                    injuryStatus: 'healthy',
                    injury: null,
                    resting: false,
                    fatigue: 0
                };
            });
            
            // Calculate average rating from the roster
            const avgRating = Math.round(players.reduce((sum, p) => sum + (p.rating || 75), 0) / players.length);
            
            return {
                id: `allstar_${id}`,
                name: name,
                city: name,
                abbrev: id.toUpperCase(),
                tier: 1,
                rating: Math.min(95, avgRating + 5), // Slight boost since these are all-stars
                roster: players,
                wins: 0,
                losses: 0,
                pointDiff: 0,
                salaryCap: 100000000,
                totalSalary: 0,
                chemistry: 50
            };
        };
        
        const eastTeam = buildTeam(eastRoster, `${tierLabel} East All-Stars`, 'east');
        const westTeam = buildTeam(westRoster, `${tierLabel} West All-Stars`, 'west');
        
        // Simulate the game (All-Star games tend to be high-scoring)
        const result = GameEngine.calculateGameOutcome(eastTeam, westTeam, false);
        
        // Boost scores to feel more like an All-Star game (typically higher scoring)
        const scoreBoost = Math.floor(Math.random() * 15) + 10;
        result.homeScore += scoreBoost;
        result.awayScore += scoreBoost;
        
        // Pick game MVP (highest scorer from winning team)
        const winnerRoster = result.winner.id === eastTeam.id ? eastRoster : westRoster;
        const gameMVP = winnerRoster.length > 0 ? winnerRoster[Math.floor(Math.random() * Math.min(3, winnerRoster.length))] : null;
        
        return {
            eastScore: result.homeScore,
            westScore: result.awayScore,
            winner: result.homeScore > result.awayScore ? 'East' : 'West',
            gameMVP: gameMVP,
            eastTeam,
            westTeam
        };
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AWARDS HTML GENERATOR
    // ─────────────────────────────────────────────────────────────────────────
    // Generates the HTML for displaying awards in the season-end modal.
    // ─────────────────────────────────────────────────────────────────────────

    generateAwardsHTML(awards, tierLabel) {
        if (!awards) return '';

        const awardCard = (emoji, title, winner, extraInfo = '') => {
            if (!winner) return '';
            const a = winner.avgs;
            return `
                <div style="background: rgba(255,215,0,0.08); border: 1px solid rgba(255,215,0,0.2); border-radius: 10px; padding: 15px; text-align: center;">
                    <div style="font-size: 2em; margin-bottom: 5px;">${emoji}</div>
                    <div style="font-size: 0.85em; color: #ffd700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${title}</div>
                    <div style="font-size: 1.2em; font-weight: bold; margin-bottom: 4px;">${winner.player.name}</div>
                    <div style="font-size: 0.9em; opacity: 0.8;">${winner.team.name} · ${winner.player.position}</div>
                    <div style="font-size: 0.85em; opacity: 0.7; margin-top: 6px;">
                        ${a.pointsPerGame} PPG · ${a.reboundsPerGame} RPG · ${a.assistsPerGame} APG
                    </div>
                    ${extraInfo ? `<div style="font-size: 0.8em; opacity: 0.6; margin-top: 4px;">${extraInfo}</div>` : ''}
                </div>
            `;
        };

        const mvpExtra = awards.mvp ? `${awards.mvp.avgs.fieldGoalPct.toFixed(1)}% FG · ${awards.mvp.team.wins}-${awards.mvp.team.losses}` : '';
        const dpoyExtra = awards.dpoy ? `${awards.dpoy.avgs.stealsPerGame} SPG · ${awards.dpoy.avgs.blocksPerGame} BPG` : '';
        const mipExtra = awards.mostImproved && awards.mostImproved.prevAvgs ? 
            `+${awards.mostImproved.improvement.toFixed(1)} composite improvement` : '';

        // All-League team display
        const allLeagueRow = (label, team) => {
            if (!team) return '';
            const slots = [team.G1, team.G2, team.F1, team.F2, team.C].filter(p => p);
            if (slots.length === 0) return '';
            return `
                <div style="margin: 10px 0;">
                    <div style="font-size: 0.9em; color: #ffd700; font-weight: bold; margin-bottom: 8px;">${label}</div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px;">
                        ${slots.map(p => `
                            <div style="background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 6px; min-width: 140px;">
                                <div style="font-weight: bold; font-size: 0.95em;">${p.player.name}</div>
                                <div style="font-size: 0.8em; opacity: 0.7;">${p.player.position} · ${p.team.name}</div>
                                <div style="font-size: 0.8em; opacity: 0.6;">${p.avgs.pointsPerGame}/${p.avgs.reboundsPerGame}/${p.avgs.assistsPerGame}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        // Stat leaders display
        const statLeaderRow = (label, leaders) => {
            if (!leaders || leaders.length === 0) return '';
            return leaders.map((p, i) => 
                `<span style="opacity: ${1 - i * 0.2};">${i === 0 ? '👑 ' : ''}${p.player.name} (${label === 'PPG' ? p.avgs.pointsPerGame : label === 'RPG' ? p.avgs.reboundsPerGame : label === 'APG' ? p.avgs.assistsPerGame : label === 'SPG' ? p.avgs.stealsPerGame : p.avgs.blocksPerGame})</span>`
            ).join(' · ');
        };

        return `
            <!-- ${tierLabel} Season Awards -->
            <div style="background: rgba(255,215,0,0.05); padding: 20px; border-radius: 10px; margin: 20px 0; border: 1px solid rgba(255,215,0,0.15);">
                <h2 style="font-size: 1.6em; margin-bottom: 20px; color: #ffd700;">🏆 ${tierLabel} Season Awards</h2>
                
                <!-- Major Awards -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
                    ${awardCard('🏅', 'MVP', awards.mvp, mvpExtra)}
                    ${awardCard('🛡️', 'Defensive POY', awards.dpoy, dpoyExtra)}
                    ${awardCard('⭐', 'Rookie of the Year', awards.roy)}
                    ${awardCard('💪', 'Sixth Man', awards.sixthMan)}
                    ${awardCard('📈', 'Most Improved', awards.mostImproved, mipExtra)}
                </div>

                <!-- All-League Teams -->
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #ffd700; margin-bottom: 10px; font-size: 1.1em;">All-League Teams</h3>
                    ${allLeagueRow('First Team', awards.allLeagueFirst)}
                    ${allLeagueRow('Second Team', awards.allLeagueSecond)}
                </div>

                <!-- Stat Leaders -->
                <div style="background: rgba(255,255,255,0.03); padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <h3 style="color: #ffd700; margin-bottom: 10px; font-size: 1.1em;">Statistical Leaders</h3>
                    <div style="font-size: 0.9em; text-align: left; line-height: 1.8;">
                        ${awards.statLeaders ? `
                            <div><strong>Scoring:</strong> ${statLeaderRow('PPG', awards.statLeaders.scoring)}</div>
                            <div><strong>Rebounds:</strong> ${statLeaderRow('RPG', awards.statLeaders.rebounds)}</div>
                            <div><strong>Assists:</strong> ${statLeaderRow('APG', awards.statLeaders.assists)}</div>
                            <div><strong>Steals:</strong> ${statLeaderRow('SPG', awards.statLeaders.steals)}</div>
                            <div><strong>Blocks:</strong> ${statLeaderRow('BPG', awards.statLeaders.blocks)}</div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    },
};

