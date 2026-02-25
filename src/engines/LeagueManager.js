// ═══════════════════════════════════════════════════════════════════
// LeagueManager — Standings, tiebreakers, team strength, schedule helpers
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState, no UI.
// All functions take the data they need as parameters.
//
// Responsible for:
//   - Team comparison and sorting (standings)
//   - Tiebreaker resolution (head-to-head, SOS, division)
//   - Team strength calculation (weighted roster rating)
//   - Home court advantage
//

export class LeagueManager {

    // ─────────────────────────────────────────────────────────────
    // HOME COURT ADVANTAGE
    // ─────────────────────────────────────────────────────────────

    /**
     * Get home court advantage rating boost
     * @param {number} tier
     * @returns {number}
     */
    static getHomeCourtAdvantage(tier) {
        return 3; // Flat +3 for now; can be per-team in future
    }

    // ─────────────────────────────────────────────────────────────
    // TEAM STRENGTH
    // ─────────────────────────────────────────────────────────────

    /**
     * Calculate team strength from roster (top 8 weighted average)
     * @param {Object} team - Must have .roster and .rating
     * @returns {number}
     */
    static calculateTeamStrength(team) {
        if (!team.roster || team.roster.length === 0) {
            return team.rating || 70;
        }

        const sortedPlayers = [...team.roster].sort((a, b) => b.rating - a.rating);
        const topPlayers = sortedPlayers.slice(0, Math.min(8, sortedPlayers.length));

        let totalWeight = 0;
        let weightedSum = 0;

        topPlayers.forEach((player, index) => {
            const weight = index < 5 ? 1.0 : 0.6; // Starters vs bench
            weightedSum += player.rating * weight;
            totalWeight += weight;
        });

        const rosterStrength = weightedSum / totalWeight;

        // Blend roster strength (70%) with team rating (30%)
        return (rosterStrength * 0.7) + ((team.rating || 70) * 0.3);
    }

    // ─────────────────────────────────────────────────────────────
    // HEAD-TO-HEAD & STRENGTH OF SCHEDULE
    // ─────────────────────────────────────────────────────────────

    /**
     * Get head-to-head record between two teams from a schedule
     * @param {Object} team1
     * @param {Object} team2
     * @param {Array} schedule - Array of game objects
     * @returns {{ wins: number, losses: number, games: number }}
     */
    static getHeadToHeadRecord(team1, team2, schedule) {
        if (!schedule) return { wins: 0, losses: 0, games: 0 };

        const h2hGames = schedule.filter(g =>
            (g.homeTeamId === team1.id && g.awayTeamId === team2.id) ||
            (g.homeTeamId === team2.id && g.awayTeamId === team1.id)
        ).filter(g => g.played);

        if (h2hGames.length === 0) return { wins: 0, losses: 0, games: 0 };

        let wins = 0;
        let losses = 0;

        h2hGames.forEach(g => {
            const team1IsHome = g.homeTeamId === team1.id;
            const team1Score = team1IsHome ? g.homeScore : g.awayScore;
            const team2Score = team1IsHome ? g.awayScore : g.homeScore;

            if (team1Score > team2Score) wins++;
            else if (team2Score > team1Score) losses++;
        });

        return { wins, losses, games: h2hGames.length };
    }

    /**
     * Calculate strength of schedule (average opponent win%)
     * @param {Object} team
     * @param {Array} schedule - Array of game objects (or allTeams for lookup)
     * @param {Array} [allTeams] - All teams for looking up opponent records
     * @returns {number} 0.0 - 1.0
     */
    static calculateStrengthOfSchedule(team, schedule, allTeams = null) {
        if (!schedule || schedule.length === 0) return 0.500;

        const teamGames = schedule.filter(g =>
            g.homeTeamId === team.id || g.awayTeamId === team.id
        );

        if (teamGames.length === 0) return 0.500;

        const opponentIds = teamGames.map(g =>
            g.homeTeamId === team.id ? g.awayTeamId : g.homeTeamId
        );

        // If no allTeams provided, try using schedule as the teams list
        const teamsSource = allTeams || [];
        const opponents = opponentIds.map(id => teamsSource.find(t => t.id === id)).filter(t => t);

        if (opponents.length === 0) return 0.500;

        const totalOpponentWinPct = opponents.reduce((sum, opp) => {
            const games = opp.wins + opp.losses;
            const winPct = games > 0 ? opp.wins / games : 0.500;
            return sum + winPct;
        }, 0);

        return totalOpponentWinPct / opponents.length;
    }

    // ─────────────────────────────────────────────────────────────
    // DIVISION HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Calculate division dominance (games ahead of 2nd place)
     * @param {Object} team
     * @param {Array} allTeamsInDivision
     * @returns {number}
     */
    static getDivisionDominance(team, allTeamsInDivision) {
        const sorted = [...allTeamsInDivision].sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.pointDiff - a.pointDiff;
        });

        const teamIndex = sorted.findIndex(t => t.id === team.id);
        if (teamIndex === 0 && sorted.length > 1) {
            return sorted[0].wins - sorted[1].wins;
        }
        return 0;
    }

    /**
     * Calculate division margin (games ahead/behind, averaged)
     * Used for Tier 3 tiebreakers
     * @param {Object} team
     * @param {Array} divisionTeams
     * @returns {number}
     */
    static getDivisionMargin(team, divisionTeams) {
        if (!divisionTeams || divisionTeams.length < 2) return 0;

        const sorted = [...divisionTeams].sort((a, b) => b.wins - a.wins);
        const teamIndex = sorted.findIndex(t => t.id === team.id);
        if (teamIndex === -1 || teamIndex === sorted.length - 1) return 0;

        if (teamIndex === 0) {
            const secondPlace = sorted[1];
            const gamesAhead = team.wins - secondPlace.wins;
            const lossesBack = secondPlace.losses - team.losses;
            return (gamesAhead + lossesBack) / 2;
        }

        return 0;
    }

    // ─────────────────────────────────────────────────────────────
    // TEAM COMPARISON & SORTING
    // ─────────────────────────────────────────────────────────────

    /**
     * Comprehensive team comparison with multi-level tiebreakers (variant 1)
     * Used when allTeams context and options are available.
     * @param {Object} team1
     * @param {Object} team2
     * @param {Array} allTeams
     * @param {Object} context - { useDivisionDominance: bool }
     * @returns {number} negative = team1 better, positive = team2 better
     */
    static compareTeamsWithTiebreakers(team1, team2, allTeams, context = {}) {
        // Level 1: Win percentage
        const team1WinPct = (team1.wins + team1.losses) > 0 ?
            team1.wins / (team1.wins + team1.losses) : 0;
        const team2WinPct = (team2.wins + team2.losses) > 0 ?
            team2.wins / (team2.wins + team2.losses) : 0;

        if (Math.abs(team1WinPct - team2WinPct) > 0.001) {
            return team2WinPct - team1WinPct;
        }

        // Level 2: Head-to-head (requires schedule — uses simplified H2H here)
        const h2h = LeagueManager.getHeadToHeadRecord(team1, team2);
        if (!h2h.tied) {
            return h2h.team2Wins - h2h.team1Wins;
        }

        // Level 3: Strength of schedule
        const team1SOS = LeagueManager.calculateStrengthOfSchedule(team1, allTeams);
        const team2SOS = LeagueManager.calculateStrengthOfSchedule(team2, allTeams);

        if (Math.abs(team1SOS - team2SOS) > 0.01) {
            return team2SOS - team1SOS;
        }

        // Level 4: Division dominance
        if (context.useDivisionDominance && team1.division === team2.division) {
            const divisionTeams = allTeams.filter(t => t.division === team1.division);
            const team1Dominance = LeagueManager.getDivisionDominance(team1, divisionTeams);
            const team2Dominance = LeagueManager.getDivisionDominance(team2, divisionTeams);

            if (team1Dominance !== team2Dominance) {
                return team2Dominance - team1Dominance;
            }
        }

        // Level 5: Point differential
        return team2.pointDiff - team1.pointDiff;
    }

    /**
     * Sort teams using multi-level tiebreakers (variant 1)
     * @param {Array} teams
     * @param {Array} allTeams
     * @param {Object} context
     * @returns {Array} Sorted copy
     */
    static sortTeamsWithTiebreakers(teams, allTeams = null, context = {}) {
        if (!allTeams) allTeams = teams;
        return [...teams].sort((a, b) => {
            return LeagueManager.compareTeamsWithTiebreakers(a, b, allTeams, context);
        });
    }

    /**
     * Comprehensive team comparison (variant 2 — schedule-aware)
     * @param {Object} team1
     * @param {Object} team2
     * @param {Array} schedule - Game array for H2H and SOS
     * @param {Array} [allTeams] - For division tiebreaker lookups
     * @returns {number}
     */
    static compareTeams(team1, team2, schedule = null, allTeams = null) {
        // 1. Win percentage
        const team1Games = team1.wins + team1.losses;
        const team2Games = team2.wins + team2.losses;
        const team1WinPct = team1Games > 0 ? team1.wins / team1Games : 0;
        const team2WinPct = team2Games > 0 ? team2.wins / team2Games : 0;

        if (Math.abs(team1WinPct - team2WinPct) > 0.001) {
            return team2WinPct - team1WinPct;
        }

        // 2. Head-to-head
        if (schedule) {
            const h2h = LeagueManager.getHeadToHeadRecord(team1, team2, schedule);
            if (h2h.games > 0) {
                if (h2h.wins > h2h.losses) return -1;
                if (h2h.losses > h2h.wins) return 1;
            }

            // 3. Strength of schedule
            const sos1 = LeagueManager.calculateStrengthOfSchedule(team1, schedule, allTeams);
            const sos2 = LeagueManager.calculateStrengthOfSchedule(team2, schedule, allTeams);
            if (Math.abs(sos1 - sos2) > 0.01) {
                return sos2 - sos1;
            }
        }

        // 4. Division margin
        if (team1.division === team2.division && allTeams) {
            const divisionTeams = allTeams.filter(t => t.division === team1.division);
            const margin1 = LeagueManager.getDivisionMargin(team1, divisionTeams);
            const margin2 = LeagueManager.getDivisionMargin(team2, divisionTeams);
            if (Math.abs(margin1 - margin2) > 0.1) {
                return margin2 - margin1;
            }
        }

        // 5. Point differential
        return team2.pointDiff - team1.pointDiff;
    }

    /**
     * Sort teams by standings using comprehensive tiebreakers
     * @param {Array} teams
     * @param {Array} schedule
     * @param {Array} [allTeams]
     * @returns {Array} Sorted copy
     */
    static sortTeamsByStandings(teams, schedule = null, allTeams = null) {
        return [...teams].sort((a, b) => LeagueManager.compareTeams(a, b, schedule, allTeams));
    }

    // ─────────────────────────────────────────────────────────────
    // PROMOTION / RELEGATION EXECUTION
    // ─────────────────────────────────────────────────────────────

    /**
     * Execute promotion/relegation tier swaps.
     * Pure execution — takes the four lists of teams that are moving
     * and physically moves them between tier arrays.
     *
     * Handles: pre-flight validation, tier array mutations, financial
     * adjustments (parachute/promotion), division reassignment,
     * division rebalancing, duplicate/count verification, and
     * user tier tracking.
     *
     * @param {Object} params
     * @param {Array}  params.t1Relegated - Teams dropping from T1 to T2
     * @param {Array}  params.t2PromotedToT1 - Teams rising from T2 to T1
     * @param {Array}  params.t2RelegatedToT3 - Teams dropping from T2 to T3
     * @param {Array}  params.t3PromotedToT2 - Teams rising from T3 to T2
     * @param {Object} params.gameState - gameState with tier arrays + userTeamId
     * @param {Object} deps - { SalaryCapEngine, DivisionManager }
     * @returns {{ success: boolean, error?: string }}
     */
    static executePromotionRelegation(params, deps) {
        const { t1Relegated, t2PromotedToT1, t2RelegatedToT3, t3PromotedToT2, gameState } = params;
        const { SalaryCapEngine: SCE, DivisionManager: DM } = deps;

        // ── Pre-flight: verify tier counts before touching anything ──
        if (gameState.tier1Teams.length !== 30 || gameState.tier2Teams.length !== 86 || gameState.tier3Teams.length !== 144) {
            const msg = `Tier counts already wrong! T1:${gameState.tier1Teams.length} T2:${gameState.tier2Teams.length} T3:${gameState.tier3Teams.length}`;
            console.error('🚨 CANNOT EXECUTE PROMOTION/RELEGATION -', msg);
            return { success: false, error: msg };
        }

        const t1RelegatedIds = t1Relegated.map(t => t.id);
        const t2PromotedToT1Ids = t2PromotedToT1.map(t => t.id);
        const t2RelegatedToT3Ids = t2RelegatedToT3.map(t => t.id);
        const t3PromotedToT2Ids = t3PromotedToT2.map(t => t.id);

        // ── Overlap check ──
        const overlap = t2PromotedToT1Ids.filter(id => t2RelegatedToT3Ids.includes(id));
        if (overlap.length > 0) {
            console.error('🚨 CRITICAL: Same team in BOTH T2 promotion AND relegation!', overlap);
        }

        console.log('=== PROMOTION/RELEGATION ===');
        console.log('T1→T2 Relegated:', t1Relegated.map(t => t.name));
        console.log('T2→T1 Promoted:', t2PromotedToT1.map(t => t.name));
        console.log('T2→T3 Relegated:', t2RelegatedToT3.map(t => t.name));
        console.log('T3→T2 Promoted:', t3PromotedToT2.map(t => t.name));

        // ── Remove moving teams from current tiers ──
        gameState.tier1Teams = gameState.tier1Teams.filter(t => !t1RelegatedIds.includes(t.id));
        gameState.tier2Teams = gameState.tier2Teams.filter(t =>
            !t2PromotedToT1Ids.includes(t.id) && !t2RelegatedToT3Ids.includes(t.id)
        );
        gameState.tier3Teams = gameState.tier3Teams.filter(t => !t3PromotedToT2Ids.includes(t.id));

        // ── Apply financial adjustments, update tier, assign division, push to new tier ──
        t1Relegated.forEach(team => {
            SCE.applyParachutePayment(team, 1, 2);
            team.tier = 2;
            team.division = DM.assignDivision(team.name, 2);
            gameState.tier2Teams.push(team);
        });

        t2PromotedToT1.forEach(team => {
            SCE.applyPromotionBonus(team, 2, 1);
            team.tier = 1;
            team.division = DM.assignDivision(team.name, 1);
            gameState.tier1Teams.push(team);
        });

        // Track promoted teams for draft compensatory picks
        gameState.promotedToT1 = t2PromotedToT1.map(t => t.id);

        t2RelegatedToT3.forEach(team => {
            SCE.applyParachutePayment(team, 2, 3);
            team.tier = 3;
            team.division = DM.assignDivision(team.name, 3);
            gameState.tier3Teams.push(team);
        });

        t3PromotedToT2.forEach(team => {
            SCE.applyPromotionBonus(team, 3, 2);
            team.tier = 2;
            team.division = DM.assignDivision(team.name, 2);
            gameState.tier2Teams.push(team);
        });

        // ── Rebalance divisions ──
        DM.balanceTier1(gameState.tier1Teams);
        DM.balanceTier2(gameState.tier2Teams);
        DM.balanceTier3(gameState.tier3Teams);

        // ── Validate results ──
        const t1Ids = gameState.tier1Teams.map(t => t.id);
        const t2Ids = gameState.tier2Teams.map(t => t.id);
        const t3Ids = gameState.tier3Teams.map(t => t.id);
        const t1Dupes = t1Ids.filter((id, idx) => t1Ids.indexOf(id) !== idx);
        const t2Dupes = t2Ids.filter((id, idx) => t2Ids.indexOf(id) !== idx);
        const t3Dupes = t3Ids.filter((id, idx) => t3Ids.indexOf(id) !== idx);

        if (t1Dupes.length) console.error('⚠️ DUPLICATE TEAMS IN TIER 1:', t1Dupes);
        if (t2Dupes.length) console.error('⚠️ DUPLICATE TEAMS IN TIER 2:', t2Dupes);
        if (t3Dupes.length) console.error('⚠️ DUPLICATE TEAMS IN TIER 3:', t3Dupes);

        console.log('T1 after:', gameState.tier1Teams.length, '(30)');
        console.log('T2 after:', gameState.tier2Teams.length, '(86)');
        console.log('T3 after:', gameState.tier3Teams.length, '(144)');

        if (gameState.tier1Teams.length !== 30 || gameState.tier2Teams.length !== 86 || gameState.tier3Teams.length !== 144) {
            console.error('❌ TIER COUNT ERROR after promo/rel!');
        } else {
            console.log('✅ Tier counts correct!');
        }

        // ── Update user's tier ──
        if (gameState.tier1Teams.find(t => t.id === gameState.userTeamId)) {
            gameState.currentTier = 1;
        } else if (gameState.tier2Teams.find(t => t.id === gameState.userTeamId)) {
            gameState.currentTier = 2;
        } else {
            gameState.currentTier = 3;
        }

        console.log('✅ User now in Tier', gameState.currentTier);
        return { success: true };
    }
}
