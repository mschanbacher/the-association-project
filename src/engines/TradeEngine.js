// ═══════════════════════════════════════════════════════════════════
// TradeEngine — Trade evaluation, AI trade logic, execution
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState.
// Caller passes teams, rosters, and trade details as parameters.
//

export class TradeEngine {

    // ─────────────────────────────────────────────────────────────
    // TRADE EVALUATION
    // ─────────────────────────────────────────────────────────────

    /**
     * AI evaluates a proposed trade.
     * @param {Object} params
     * @param {Array} params.userGivesPlayers - Players user is sending
     * @param {Array} params.aiGivesPlayers - Players AI is sending
     * @param {Array} params.userGivesPicks - Draft picks user is sending
     * @param {Array} params.userReceivesPicks - Draft picks AI is sending
     * @param {Object} params.aiTeam - AI team object
     * @param {Function} params.calculatePickValue - (year, round) => number
     * @param {Function} params.getEffectiveCap - (team) => number
     * @param {Function} params.calculateTeamSalary - (team) => number
     * @param {Function} params.formatCurrency - (amount) => string
     * @returns {{ accepted: boolean, reason: string }}
     */
    static evaluateTrade(params) {
        const {
            userGivesPlayers, aiGivesPlayers,
            userGivesPicks = [], userReceivesPicks = [],
            aiTeam,
            calculatePickValue, getEffectiveCap, calculateTeamSalary, formatCurrency
        } = params;

        // 1. Total value (players + picks)
        let userGivesValue = userGivesPlayers.reduce((sum, p) => sum + p.rating, 0);
        let aiGivesValue = aiGivesPlayers.reduce((sum, p) => sum + p.rating, 0);

        userGivesPicks.forEach(pick => { userGivesValue += calculatePickValue(pick.year, pick.round); });
        userReceivesPicks.forEach(pick => { aiGivesValue += calculatePickValue(pick.year, pick.round); });

        const valueDiff = aiGivesValue - userGivesValue;

        // 2. Salary matching (±$2M)
        const userGivesSalary = userGivesPlayers.reduce((sum, p) => sum + p.salary, 0);
        const aiGivesSalary = aiGivesPlayers.reduce((sum, p) => sum + p.salary, 0);
        const salaryDiff = Math.abs(aiGivesSalary - userGivesSalary);

        if (userGivesPlayers.length > 0 && aiGivesPlayers.length > 0 && salaryDiff > 2000000) {
            return { accepted: false, reason: `Salaries don't match. Need to be within $2M (currently ${formatCurrency(salaryDiff)} apart).` };
        }

        // 3. Cap check for AI
        if (userGivesPlayers.length > 0) {
            const currentAiSalary = calculateTeamSalary(aiTeam);
            const aiSalaryCap = getEffectiveCap(aiTeam);
            const aiSalaryAfterTrade = currentAiSalary - aiGivesSalary + userGivesSalary;
            if (aiSalaryAfterTrade > aiSalaryCap) {
                return { accepted: false, reason: `This trade would put us over the salary cap. We can't afford it.` };
            }
        }

        // 4. Scoring
        let aiScore = 0;

        if (valueDiff > 10) {
            return { accepted: false, reason: `We're giving up way too much value (${valueDiff} rating points). Not happening.` };
        } else if (valueDiff > 5) aiScore -= 10;
        else if (valueDiff >= 0) aiScore += (valueDiff * 2);
        else if (valueDiff >= -5) aiScore += 5;
        else aiScore += 10;

        // 5. Position needs
        const aiPosCounts = { 'PG': 0, 'SG': 0, 'SF': 0, 'PF': 0, 'C': 0 };
        aiTeam.roster.forEach(p => { aiPosCounts[p.position]++; });

        userGivesPlayers.forEach(p => {
            aiPosCounts[p.position]--;
            if (aiPosCounts[p.position] < 2) aiScore += 8;
            else if (aiPosCounts[p.position] < 3) aiScore += 3;
        });
        aiGivesPlayers.forEach(p => {
            aiPosCounts[p.position]++;
            if (aiPosCounts[p.position] <= 2) aiScore -= 8;
            else if (aiPosCounts[p.position] === 3) aiScore -= 2;
        });

        // 6. Contract length
        if (userGivesPlayers.length > 0 && aiGivesPlayers.length > 0) {
            const userAvgContract = userGivesPlayers.reduce((s, p) => s + (p.contractYears || 1), 0) / userGivesPlayers.length;
            const aiAvgContract = aiGivesPlayers.reduce((s, p) => s + (p.contractYears || 1), 0) / aiGivesPlayers.length;
            if (userAvgContract >= aiAvgContract + 1) aiScore += 5;
            else if (aiAvgContract >= userAvgContract + 1) aiScore -= 3;
        }

        // 7. Age/timeline
        if (aiTeam.roster.length > 0 && userGivesPlayers.length > 0) {
            const aiAvgAge = aiTeam.roster.reduce((s, p) => s + p.age, 0) / aiTeam.roster.length;
            const userGivesAvgAge = userGivesPlayers.reduce((s, p) => s + p.age, 0) / userGivesPlayers.length;

            if (aiAvgAge < 26) {
                if (userGivesAvgAge < 26) aiScore += 5;
                else if (userGivesAvgAge > 30) aiScore -= 5;
            } else if (aiAvgAge > 29) {
                if (userGivesAvgAge >= 27 && userGivesAvgAge <= 31) aiScore += 5;
                else if (userGivesAvgAge < 23) aiScore -= 3;
            }
        }

        // 8. Decision
        if (aiScore >= 15) return { accepted: true, reason: `This trade makes sense for us. We like the value and fit.` };
        if (aiScore >= 8) return { accepted: true, reason: `It's not perfect, but we'll accept this deal.` };
        if (aiScore >= 0) return { accepted: false, reason: `This trade doesn't work for us. We'd need better players or better fit.` };
        return { accepted: false, reason: `Not interested. This doesn't help our team at all.` };
    }

    // ─────────────────────────────────────────────────────────────
    // AI TRADE PROPOSAL GENERATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Generate an AI trade proposal targeting a user's team.
     * @param {Object} params
     * @param {Object} params.userTeam
     * @param {Array} params.aiTeams - AI teams in the user's tier
     * @param {Object} [params.draftContext] - { ownership, currentSeason, tier, getPickOwner, violatesStepienRule, calculatePickValue }
     * @returns {Object|null} Proposal or null if none viable
     */
    static generateAiTradeProposal(params) {
        const { userTeam, aiTeams, draftContext } = params;

        const aiTeam = aiTeams[Math.floor(Math.random() * aiTeams.length)];
        if (!aiTeam || !aiTeam.roster || !userTeam.roster) return null;

        // Find AI position needs
        const aiPosCounts = { 'PG': 0, 'SG': 0, 'SF': 0, 'PF': 0, 'C': 0 };
        aiTeam.roster.forEach(p => aiPosCounts[p.position]++);
        const aiNeeds = Object.keys(aiPosCounts).filter(pos => aiPosCounts[pos] < 2);
        if (aiNeeds.length === 0) return null;

        // Find user players that fill needs
        const candidates = userTeam.roster.filter(p => aiNeeds.includes(p.position) && p.rating >= 65);
        if (candidates.length === 0) return null;

        // Pick 1-2 players
        const numToTake = Math.random() > 0.7 ? 2 : 1;
        const userGives = [];
        const pool = [...candidates];
        for (let i = 0; i < Math.min(numToTake, pool.length); i++) {
            const idx = Math.floor(Math.random() * pool.length);
            userGives.push(pool.splice(idx, 1)[0]);
        }

        const userGivesValue = userGives.reduce((s, p) => s + p.rating, 0);
        const userGivesSalary = userGives.reduce((s, p) => s + p.salary, 0);

        // Find AI players to match value
        const aiGives = [];
        let currentValue = 0;
        let currentSalary = 0;

        const sortedAiPlayers = [...aiTeam.roster].sort((a, b) =>
            Math.abs((userGivesValue - currentValue) - a.rating) - Math.abs((userGivesValue - currentValue) - b.rating)
        );

        for (const player of sortedAiPlayers) {
            if (currentValue >= userGivesValue - 5 && currentValue <= userGivesValue + 5) {
                if (Math.abs((currentSalary + player.salary) - userGivesSalary) <= 2000000) break;
            }
            if (aiGives.length < 3) {
                aiGives.push(player);
                currentValue += player.rating;
                currentSalary += player.salary;
            }
            if (currentValue >= userGivesValue + 10) break;
        }

        const valueDiffAbs = Math.abs(currentValue - userGivesValue);
        const salaryDiffAbs = Math.abs(currentSalary - userGivesSalary);

        if (valueDiffAbs > 10 || salaryDiffAbs > 2000000 || aiGives.length === 0) return null;

        // Consider adding draft pick if T1 and value gap exists
        let aiGivesPicks = [];
        if (draftContext && draftContext.tier === 1 && currentValue < userGivesValue - 3) {
            const gap = userGivesValue - currentValue;
            const roundsToTry = gap > 25 ? [1, 2] : [2, 1];

            for (const round of roundsToTry) {
                for (let y = draftContext.currentSeason; y <= draftContext.currentSeason + 2; y++) {
                    const owner = draftContext.getPickOwner(aiTeam.id, y, round);
                    if (owner === aiTeam.id && !draftContext.violatesStepienRule(aiTeam.id, y, round)) {
                        const pickValue = draftContext.calculatePickValue(y, round);
                        if (currentValue + pickValue <= userGivesValue + 15) {
                            aiGivesPicks.push({ originalTeamId: aiTeam.id, year: y, round });
                            currentValue += pickValue;
                        }
                        break;
                    }
                }
                if (aiGivesPicks.length > 0) break;
            }
        }

        return {
            aiTeamId: aiTeam.id,
            aiTeamName: aiTeam.name,
            userGives,
            aiGives,
            aiGivesPicks
        };
    }

    // ─────────────────────────────────────────────────────────────
    // AI-TO-AI TRADE GENERATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Attempt to generate and validate an AI-to-AI trade.
     * Both sides must agree (evaluateTrade score >= 8).
     * @param {Object} params
     * @param {Array} params.teams - All teams in this tier
     * @param {number} params.userTeamId - Exclude user's team
     * @param {Object} [params.draftContext] - For T1 pick trades
     * @param {Function} params.calculatePickValue
     * @param {Function} params.getEffectiveCap
     * @param {Function} params.calculateTeamSalary
     * @param {Function} params.formatCurrency
     * @returns {Object|null} { team1, team2, team1Gives, team2Gives, team1GivesPicks, team2GivesPicks } or null
     */
    static generateAiToAiTrade(params) {
        const { teams, userTeamId, draftContext,
                calculatePickValue, getEffectiveCap, calculateTeamSalary, formatCurrency } = params;

        const aiTeams = teams.filter(t => t.id !== userTeamId && t.roster && t.roster.length >= 8);
        if (aiTeams.length < 2) return null;

        // Pick two random teams
        const shuffled = [...aiTeams].sort(() => Math.random() - 0.5);
        const team1 = shuffled[0];
        const team2 = shuffled[1];

        // Find each team's position needs
        const getNeeds = (team) => {
            const counts = { PG: 0, SG: 0, SF: 0, PF: 0, C: 0 };
            team.roster.forEach(p => counts[p.position]++);
            return Object.keys(counts).filter(pos => counts[pos] < 2);
        };

        const needs1 = getNeeds(team1);
        const needs2 = getNeeds(team2);

        // Try need-based trade first, fall back to value trade
        let team1Gives = [];
        let team2Gives = [];

        if (needs1.length > 0 && needs2.length > 0) {
            // Team1 needs positions that team2 has surplus, and vice versa
            const t2Candidates = team2.roster.filter(p => needs1.includes(p.position) && p.rating >= 60);
            const t1Candidates = team1.roster.filter(p => needs2.includes(p.position) && p.rating >= 60);

            if (t2Candidates.length > 0 && t1Candidates.length > 0) {
                team2Gives = [t2Candidates[Math.floor(Math.random() * t2Candidates.length)]];
                // Find matching value from team1
                const targetValue = team2Gives[0].rating;
                const targetSalary = team2Gives[0].salary;
                const sorted = [...t1Candidates].sort((a, b) =>
                    Math.abs(a.rating - targetValue) - Math.abs(b.rating - targetValue)
                );
                for (const candidate of sorted) {
                    if (Math.abs(candidate.salary - targetSalary) <= 2000000 &&
                        Math.abs(candidate.rating - targetValue) <= 8) {
                        team1Gives = [candidate];
                        break;
                    }
                }
            }
        }

        // Fall back: value-based trade (swap similar-rated players at different positions)
        if (team1Gives.length === 0 || team2Gives.length === 0) {
            const t1Pool = team1.roster.filter(p => p.rating >= 60).sort(() => Math.random() - 0.5);
            const t2Pool = team2.roster.filter(p => p.rating >= 60).sort(() => Math.random() - 0.5);

            for (const p1 of t1Pool) {
                for (const p2 of t2Pool) {
                    if (p1.position !== p2.position &&
                        Math.abs(p1.rating - p2.rating) <= 8 &&
                        Math.abs(p1.salary - p2.salary) <= 2000000) {
                        team1Gives = [p1];
                        team2Gives = [p2];
                        break;
                    }
                }
                if (team1Gives.length > 0) break;
            }
        }

        if (team1Gives.length === 0 || team2Gives.length === 0) return null;

        // Both sides evaluate
        const eval1 = TradeEngine.evaluateTrade({
            userGivesPlayers: team1Gives, aiGivesPlayers: team2Gives,
            aiTeam: team1,
            calculatePickValue: calculatePickValue || (() => 0),
            getEffectiveCap, calculateTeamSalary,
            formatCurrency: formatCurrency || (v => `$${v}`)
        });

        // For AI-AI, we flip perspective: team2 is "AI" evaluating what they give up
        const eval2 = TradeEngine.evaluateTrade({
            userGivesPlayers: team2Gives, aiGivesPlayers: team1Gives,
            aiTeam: team2,
            calculatePickValue: calculatePickValue || (() => 0),
            getEffectiveCap, calculateTeamSalary,
            formatCurrency: formatCurrency || (v => `$${v}`)
        });

        // Both must agree
        if (!eval1.accepted || !eval2.accepted) return null;

        return {
            team1, team2,
            team1Gives, team2Gives,
            team1GivesPicks: [], team2GivesPicks: []
        };
    }

    /**
     * Determine if a trade is "notable" enough for Breaking News.
     * Notable = involves a player rated 80+ or a team's top-2 player.
     * @param {Object} trade - { team1, team2, team1Gives, team2Gives }
     * @returns {boolean}
     */
    static isNotableTrade(trade) {
        const allPlayers = [...trade.team1Gives, ...trade.team2Gives];
        // Star player threshold
        if (allPlayers.some(p => p.rating >= 80)) return true;
        // Top-2 player on either team
        const t1Sorted = [...trade.team1.roster].sort((a, b) => b.rating - a.rating);
        const t2Sorted = [...trade.team2.roster].sort((a, b) => b.rating - a.rating);
        const t1Top2 = new Set(t1Sorted.slice(0, 2).map(p => p.id));
        const t2Top2 = new Set(t2Sorted.slice(0, 2).map(p => p.id));
        if (trade.team1Gives.some(p => t1Top2.has(p.id))) return true;
        if (trade.team2Gives.some(p => t2Top2.has(p.id))) return true;
        return false;
    }

    // ─────────────────────────────────────────────────────────────
    // TRADE EXECUTION
    // ─────────────────────────────────────────────────────────────

    /**
     * Execute a trade between two teams. Mutates rosters in place.
     * @param {Object} params
     * @param {Object} params.team1 - First team
     * @param {Object} params.team2 - Second team
     * @param {Array} params.team1GivesPlayerIds - Player IDs from team1
     * @param {Array} params.team2GivesPlayerIds - Player IDs from team2
     * @param {Array} params.team1GivesPicks - Picks from team1
     * @param {Array} params.team2GivesPicks - Picks from team2
     * @param {Object} params.draftOwnership - Pick ownership object
     * @param {Function} params.applyTradePenalty - (team, player) => void
     * @param {Function} params.initializePlayerChemistry - (player) => void
     * @param {Function} params.tradeDraftPick - (from, to, orig, year, round) => void
     * @returns {{ playersToTeam1: Array, playersToTeam2: Array }}
     */
    static executeTrade(params) {
        const {
            team1, team2,
            team1GivesPlayerIds, team2GivesPlayerIds,
            team1GivesPicks = [], team2GivesPicks = [],
            applyTradePenalty, initializePlayerChemistry, tradeDraftPick
        } = params;

        const playersToTeam2 = [];
        const playersToTeam1 = [];

        // Collect players
        team1GivesPlayerIds.forEach(pid => {
            const p = team1.roster.find(p => p.id === pid);
            if (p) playersToTeam2.push(p);
        });
        team2GivesPlayerIds.forEach(pid => {
            const p = team2.roster.find(p => p.id === pid);
            if (p) playersToTeam1.push(p);
        });

        // Trade picks
        team1GivesPicks.forEach(pick => {
            tradeDraftPick(team1.id, team2.id, pick.originalTeamId, pick.year, pick.round);
        });
        team2GivesPicks.forEach(pick => {
            tradeDraftPick(team2.id, team1.id, pick.originalTeamId, pick.year, pick.round);
        });

        // Remove players and apply chemistry penalties
        team1GivesPlayerIds.forEach(pid => {
            const idx = team1.roster.findIndex(p => p.id === pid);
            if (idx !== -1) {
                applyTradePenalty(team1, team1.roster[idx]);
                team1.roster.splice(idx, 1);
            }
        });
        team2GivesPlayerIds.forEach(pid => {
            const idx = team2.roster.findIndex(p => p.id === pid);
            if (idx !== -1) {
                applyTradePenalty(team2, team2.roster[idx]);
                team2.roster.splice(idx, 1);
            }
        });

        // Add players to new teams
        playersToTeam1.forEach(p => { initializePlayerChemistry(p); team1.roster.push(p); });
        playersToTeam2.forEach(p => { initializePlayerChemistry(p); team2.roster.push(p); });

        return { playersToTeam1, playersToTeam2 };
    }
}
