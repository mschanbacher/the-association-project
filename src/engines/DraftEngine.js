// ═══════════════════════════════════════════════════════════════════
// DraftEngine — Draft prospects, lottery, pick ownership, draft salary
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState.
// Caller passes teams, picks, and context as parameters.
//
// Dependencies (passed as needed):
//   - PlayerAttributes
//   - TeamFactory (for salary, name generation)
//   - SalaryCapEngine (for pick salary scaling)
//

export class DraftEngine {

    // ─────────────────────────────────────────────────────────────
    // LOTTERY ODDS (NBA 2019 flattened style)
    // ─────────────────────────────────────────────────────────────

    static LOTTERY_ODDS_TABLE = [12.5, 10.5, 9.0, 7.5, 6.0, 4.5, 3.0, 2.0, 1.5, 1.0, 0.5];
    static PROMOTED_TEAM_ODDS = 14.0;

    // ─────────────────────────────────────────────────────────────
    // PROSPECT GENERATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Generate a draft class of 100 prospects.
     * @param {number} seasonId - Current season (for unique IDs)
     * @param {Object} deps - { PlayerAttributes, TeamFactory }
     * @returns {Array} Sorted by rating descending
     */
    static generateDraftProspects(seasonId, deps) {
        const { PlayerAttributes: PA, TeamFactory: TF } = deps;
        const prospects = [];
        const startId = 100000 + seasonId * 1000;

        for (let i = 0; i < 100; i++) {
            const firstName = TF.randomFirst();
            const lastName = TF.randomLast();
            const position = TF.randomPosition();

            // Age distribution: 19-22
            const ageWeights = [0.15, 0.30, 0.35, 0.20];
            const random = Math.random();
            let age = 19;
            let cumulative = 0;
            for (let a = 0; a < ageWeights.length; a++) {
                cumulative += ageWeights[a];
                if (random < cumulative) { age = 19 + a; break; }
            }

            // Rating: Normal distribution, mean 65, std 8, clamped 50-85
            const u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
            let rating = Math.round(65 + z * 8);
            rating = Math.max(50, Math.min(85, rating));

            const contractYears = 3;
            const salary = TF.generateSalary(rating, 2);
            const attrData = PA.generateFromRating(position, rating, 1, age);

            prospects.push({
                id: startId + i,
                name: `${firstName} ${lastName}`,
                position, rating: attrData.rating, age, salary, contractYears,
                originalContractLength: contractYears,
                measurables: attrData.measurables,
                attributes: attrData.attributes,
                isDraftProspect: true
            });
        }

        prospects.sort((a, b) => b.rating - a.rating);
        return prospects;
    }

    // ─────────────────────────────────────────────────────────────
    // DRAFT LOTTERY
    // ─────────────────────────────────────────────────────────────

    /**
     * Simulate the NBA-style draft lottery.
     * @param {Array} tier1Teams
     * @param {Array} promotedTeamIds
     * @returns {{ lotteryResults: Array, playoffTeams: Array }}
     */
    static simulateDraftLottery(tier1Teams, promotedTeamIds) {
        const sortedTeams = [...tier1Teams].sort((a, b) => {
            if (a.wins !== b.wins) return a.wins - b.wins;
            return a.pointDiff - b.pointDiff;
        });

        const promotedTeams = sortedTeams.filter(t => promotedTeamIds.includes(t.id));
        const nonPromotedTeams = sortedTeams.filter(t => !promotedTeamIds.includes(t.id));
        const worstNonPromoted = nonPromotedTeams.slice(0, 11);
        const playoffTeams = nonPromotedTeams.slice(11);

        // Build lottery odds
        const lotteryOdds = [];
        promotedTeams.forEach(team => {
            lotteryOdds.push({ team, odds: DraftEngine.PROMOTED_TEAM_ODDS, originalPosition: null, isPromoted: true });
        });
        worstNonPromoted.forEach((team, index) => {
            lotteryOdds.push({
                team, odds: DraftEngine.LOTTERY_ODDS_TABLE[Math.min(index, DraftEngine.LOTTERY_ODDS_TABLE.length - 1)],
                originalPosition: null, isPromoted: false
            });
        });

        // Assign original positions
        const lotteryTeams = [...promotedTeams, ...worstNonPromoted];
        const lotteryTeamsSorted = [...lotteryTeams].sort((a, b) => {
            if (a.wins !== b.wins) return a.wins - b.wins;
            return a.pointDiff - b.pointDiff;
        });
        lotteryOdds.forEach(entry => {
            entry.originalPosition = lotteryTeamsSorted.findIndex(t => t.id === entry.team.id) + 1;
        });
        lotteryOdds.sort((a, b) => b.odds - a.odds);

        // Draw picks 1-4
        const lotteryResults = [];
        const available = [...lotteryOdds];

        for (let pickNum = 1; pickNum <= 4; pickNum++) {
            if (available.length === 0) break;
            const totalOdds = available.reduce((sum, e) => sum + e.odds, 0);
            const roll = Math.random() * totalOdds;
            let cum = 0;
            let winner = null;
            for (const entry of available) {
                cum += entry.odds;
                if (roll < cum) { winner = entry; break; }
            }
            if (!winner) winner = available[0];

            lotteryResults.push({
                pick: pickNum,
                team: winner.team,
                originalPosition: winner.originalPosition,
                isPromoted: winner.isPromoted,
                jumped: pickNum < winner.originalPosition
            });

            available.splice(available.findIndex(e => e.team.id === winner.team.id), 1);
        }

        // Picks 5-14: remaining by worst record
        available.sort((a, b) => a.originalPosition - b.originalPosition);
        available.forEach((entry, index) => {
            lotteryResults.push({
                pick: 5 + index,
                team: entry.team,
                originalPosition: entry.originalPosition,
                isPromoted: entry.isPromoted,
                jumped: false
            });
        });

        return { lotteryResults, playoffTeams };
    }

    // ─────────────────────────────────────────────────────────────
    // DRAFT PICK OWNERSHIP
    // ─────────────────────────────────────────────────────────────

    /**
     * Initialize pick ownership for all teams (idempotent).
     * @param {Object} ownership - gameState.draftPickOwnership (mutated in place)
     * @param {Array} allTeams
     * @param {number} currentSeason
     */
    static initializePickOwnership(ownership, allTeams, currentSeason) {
        allTeams.forEach(team => {
            if (!ownership[team.id]) ownership[team.id] = {};
            for (let year = currentSeason; year <= currentSeason + 5; year++) {
                if (!ownership[team.id][year]) {
                    ownership[team.id][year] = { round1: team.id, round2: team.id };
                }
            }
        });
    }

    /**
     * Get the current owner of a pick.
     * @param {Object} ownership
     * @param {string|number} originalTeamId
     * @param {number} year
     * @param {number} round
     * @returns {string|number} Owner team ID
     */
    static getPickOwner(ownership, originalTeamId, year, round) {
        const roundKey = `round${round}`;
        if (ownership[originalTeamId] && ownership[originalTeamId][year]) {
            return ownership[originalTeamId][year][roundKey] || originalTeamId;
        }
        return originalTeamId;
    }

    /**
     * Transfer ownership of a draft pick.
     * @param {Object} ownership
     * @param {string|number} originalTeamId
     * @param {string|number} newOwnerId
     * @param {number} year
     * @param {number} round
     */
    static tradePick(ownership, originalTeamId, newOwnerId, year, round) {
        const roundKey = `round${round}`;
        if (!ownership[originalTeamId]) ownership[originalTeamId] = {};
        if (!ownership[originalTeamId][year]) ownership[originalTeamId][year] = {};
        ownership[originalTeamId][year][roundKey] = newOwnerId;
    }

    /**
     * Get all picks owned by a team for a given year.
     * @param {Object} ownership
     * @param {string|number} teamId
     * @param {number} year
     * @param {Array} allTeams
     * @returns {Array}
     */
    static getPicksOwnedByTeam(ownership, teamId, year, allTeams) {
        const picks = [];
        allTeams.forEach(originalTeam => {
            [1, 2].forEach(round => {
                const owner = DraftEngine.getPickOwner(ownership, originalTeam.id, year, round);
                if (owner === teamId) {
                    picks.push({
                        originalTeamId: originalTeam.id,
                        originalTeamName: originalTeam.name,
                        year, round
                    });
                }
            });
        });
        return picks;
    }

    /**
     * Check if trading a pick violates Ted Stepien Rule.
     * @param {Object} ownership
     * @param {string|number} teamId
     * @param {number} year
     * @param {number} round
     * @returns {boolean}
     */
    static violatesStepienRule(ownership, teamId, year, round) {
        if (round !== 1) return false;
        const prevOwner = DraftEngine.getPickOwner(ownership, teamId, year - 1, 1);
        const nextOwner = DraftEngine.getPickOwner(ownership, teamId, year + 1, 1);
        return (prevOwner !== teamId && nextOwner !== teamId);
    }

    /**
     * Calculate draft pick value (depreciates over time).
     * @param {number} year
     * @param {number} round
     * @param {number} currentSeason
     * @param {Object} [originalTeamRecord] - { wins, losses }
     * @returns {number}
     */
    static calculatePickValue(year, round, currentSeason, originalTeamRecord = null) {
        const yearsOut = year - currentSeason;
        let baseValue = round === 1 ? 100 : round === 2 ? 40 : 20;
        const timeFactor = Math.pow(0.85, yearsOut);
        let value = baseValue * timeFactor;

        if (originalTeamRecord) {
            const winPct = originalTeamRecord.wins / (originalTeamRecord.wins + originalTeamRecord.losses);
            value *= 1 + (0.5 * (1 - winPct));
        }
        return Math.round(value);
    }

    // ─────────────────────────────────────────────────────────────
    // DRAFT PICK SALARY
    // ─────────────────────────────────────────────────────────────

    /**
     * Get salary for a drafted player based on pick number and tier.
     * @param {number} pickNumber
     * @param {number} tier
     * @param {Object} deps - { SalaryCapEngine }
     * @returns {number}
     */
    static getDraftPickSalary(pickNumber, tier, deps) {
        const { SalaryCapEngine: SC } = deps;
        let baseSalary;
        if (pickNumber <= 10)       baseSalary = 500000 - (pickNumber * 10000);
        else if (pickNumber <= 30)  baseSalary = 400000 - ((pickNumber - 10) * 5000);
        else if (pickNumber <= 60)  baseSalary = 300000 - ((pickNumber - 30) * 3333);
        else if (pickNumber <= 120) baseSalary = 200000 - ((pickNumber - 60) * 833);
        else if (pickNumber <= 260) baseSalary = 150000 - ((pickNumber - 120) * 357);
        else                        baseSalary = Math.max(50000, 100000 - ((pickNumber - 260) * 192));

        const tierMultiplier = SC.getSalaryCap(tier) / SC.SALARY_CAPS[2];
        return Math.round(baseSalary * tierMultiplier);
    }

    // ─────────────────────────────────────────────────────────────
    // AI DRAFT LOGIC
    // ─────────────────────────────────────────────────────────────

    /**
     * AI drafts the best available player for a pick.
     * @param {Object} pick - Draft pick object
     * @param {Array} prospects - Available prospects (mutated: best removed)
     * @param {Object} team - Drafting team
     * @param {Object} deps - { SalaryCapEngine }
     * @returns {Object|null} Draft result
     */
    static aiDraftPick(pick, prospects, team, deps) {
        if (!team || prospects.length === 0) return null;

        prospects.sort((a, b) => b.rating - a.rating);
        const selected = prospects.shift();
        selected.salary = DraftEngine.getDraftPickSalary(pick.pick, team.tier, deps);

        if (!team.roster) team.roster = [];
        team.roster.push(selected);

        return {
            pick: pick.pick,
            round: pick.round,
            teamId: pick.teamId,
            teamName: pick.teamName,
            tier: pick.tier,
            player: selected
        };
    }
}
