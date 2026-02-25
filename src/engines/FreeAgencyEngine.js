// ═══════════════════════════════════════════════════════════════════
// FreeAgencyEngine — AI free agency, signing decisions, offer logic
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState references.
// Caller passes teams, free agents, and cap info as parameters.
//
// Dependencies (passed via deps):
//   - TeamFactory: generateSalary, determineContractLength, getMarketValue
//   - SalaryCapEngine: getEffectiveCap, calculateTeamSalary, getSalaryCap
//

export class FreeAgencyEngine {

    // ─────────────────────────────────────────────────────────────
    // TIER MATCHING
    // ─────────────────────────────────────────────────────────────

    /**
     * Check if a player is a suitable tier match for a team.
     * Centralized so the matching logic is defined in one place.
     */
    static isTierMatch(player, teamTier) {
        return (teamTier === 1 && player.rating >= 70) ||
               (teamTier === 2 && player.rating >= 60 && player.rating <= 90) ||
               (teamTier === 3 && player.rating >= 50 && player.rating <= 80);
    }

    // ─────────────────────────────────────────────────────────────
    // AI CONTRACT DECISIONS (offseason expiry handling)
    // ─────────────────────────────────────────────────────────────

    /**
     * Handle AI team's expired contract decisions.
     * Re-signs or releases players; released players go to freeAgentPool.
     *
     * @param {Object} team
     * @param {Array} expiredPlayers - Players with expired contracts
     * @param {Array} freeAgentPool - Pool to push released players to (mutated)
     * @param {Object} deps - { TeamFactory, getEffectiveCap, calculateTeamSalary }
     * @returns {{ resigned: number, released: number }}
     */
    static handleAITeamFreeAgency(team, expiredPlayers, freeAgentPool, deps) {
        const { TeamFactory: TF, getEffectiveCap, calculateTeamSalary } = deps;
        let resigned = 0;
        let released = 0;

        expiredPlayers.forEach(player => {
            const shouldResign = player.rating >= (team.tier === 1 ? 70 : team.tier === 2 ? 60 : 50);
            const newSalary = TF.generateSalary(player.rating, team.tier);
            const canAfford = calculateTeamSalary(team) - player.salary + newSalary <= getEffectiveCap(team);

            // 50% chance to re-sign if qualifies
            if (shouldResign && canAfford && Math.random() > 0.5) {
                player.salary = newSalary;
                player.tier = team.tier;
                player.contractYears = TF.determineContractLength(player.age, player.rating);
                player.originalContractLength = player.contractYears;
                delete player.preRelegationSalary;
                resigned++;
            } else {
                // Release to free agency
                const index = team.roster.findIndex(p => p.id === player.id);
                if (index !== -1) {
                    team.roster.splice(index, 1);
                    player.previousTeamId = team.id;
                    player.contractYears = TF.determineContractLength(player.age, player.rating);
                    player.originalContractLength = player.contractYears;
                    player.salary = TF.generateSalary(player.rating, team.tier);
                    freeAgentPool.push(player);
                    released++;
                }
            }
        });

        return { resigned, released };
    }

    // ─────────────────────────────────────────────────────────────
    // AI SIGNING PHASE (bulk fill after user FA window)
    // ─────────────────────────────────────────────────────────────

    /**
     * All AI teams scan the free agent pool and sign players to fill gaps.
     * Used after the interactive FA period to fill remaining roster holes.
     *
     * @param {Object} params
     * @param {Array} params.aiTeams - AI teams
     * @param {Array} params.freeAgentPool - Mutable free agent pool
     * @param {Object} deps - { TeamFactory, getEffectiveCap, calculateTeamSalary }
     * @returns {number} Total signings
     */
    static aiSigningPhase(params, deps) {
        const { aiTeams, freeAgentPool } = params;
        const { TeamFactory: TF, getEffectiveCap, calculateTeamSalary } = deps;
        let totalSigned = 0;

        // Shuffle for fairness
        const shuffled = [...aiTeams].sort(() => Math.random() - 0.5);

        shuffled.forEach(team => {
            const cap = getEffectiveCap(team);
            const currentSalary = calculateTeamSalary(team);
            const rosterSize = team.roster ? team.roster.length : 0;

            const needsDepth = rosterSize < 12;
            const hasCapRoom = currentSalary < cap * 0.85;
            if (!needsDepth && !hasCapRoom) return;

            const maxToSign = needsDepth ? (12 - rosterSize) : Math.min(3, 15 - rosterSize);
            let signed = 0;

            const sortedFAs = [...freeAgentPool].sort((a, b) => b.rating - a.rating);

            for (const player of sortedFAs) {
                if (signed >= maxToSign) break;
                if (!FreeAgencyEngine.isTierMatch(player, team.tier)) continue;

                const tierSalary = TF.generateSalary(player.rating, team.tier);
                if (currentSalary + tierSalary > cap) continue;

                const idx = freeAgentPool.findIndex(p => p.id === player.id);
                if (idx !== -1) {
                    freeAgentPool.splice(idx, 1);
                    player.salary = tierSalary;
                    player.tier = team.tier;
                    delete player.preRelegationSalary;
                    team.roster.push(player);
                    signed++;
                    totalSigned++;
                }
            }
        });

        return totalSigned;
    }

    // ─────────────────────────────────────────────────────────────
    // AI FREE AGENCY OFFER GENERATION (interactive FA window)
    // ─────────────────────────────────────────────────────────────

    /**
     * Generate AI team offers during the interactive FA period.
     * Uses market value with randomized ±10% spread for realistic offers.
     *
     * @param {Object} params
     * @param {Array}  params.freeAgents - Available free agents
     * @param {Array}  params.aiTeams - AI teams that can make offers
     * @param {Object} deps - { TeamFactory, SalaryCapEngine }
     * @returns {Array} Array of offer objects: { teamId, playerId, salary, years, tier, teamRating, teamSuccess }
     */
    static generateAIOffers(params, deps) {
        const { freeAgents, aiTeams } = params;
        const { TeamFactory: TF, SalaryCapEngine: SCE } = deps;
        const offers = [];

        aiTeams.forEach(team => {
            const cap = SCE.getEffectiveCap(team);
            const currentSalary = SCE.calculateTeamSalary(team);
            const rosterSize = team.roster ? team.roster.length : 0;
            const capSpace = cap - currentSalary;

            const needsDepth = rosterSize < 12;
            const hasCapRoom = currentSalary < cap * 0.85;
            if (!needsDepth && !hasCapRoom) return;

            const numTargets = needsDepth
                ? Math.min(4, 12 - rosterSize)
                : Math.min(2, 15 - rosterSize);

            const suitable = freeAgents
                .filter(p => FreeAgencyEngine.isTierMatch(p, team.tier))
                .sort((a, b) => b.rating - a.rating)
                .slice(0, numTargets);

            suitable.forEach(player => {
                const marketValue = TF.getMarketValue(player, team.tier);
                if (marketValue > capSpace) return;

                // Offer varies ±10% around market value
                const offerSalary = Math.round(marketValue * (0.9 + Math.random() * 0.2));

                offers.push({
                    teamId: team.id,
                    playerId: player.id,
                    salary: offerSalary,
                    years: TF.determineContractLength(player.age, player.rating),
                    tier: team.tier,
                    teamRating: team.rating,
                    teamSuccess: team.wins / (team.wins + team.losses || 1)
                });
            });
        });

        return offers;
    }

    // ─────────────────────────────────────────────────────────────
    // FREE AGENT DECISION LOGIC
    // ─────────────────────────────────────────────────────────────

    /**
     * Score a single offer from a free agent's perspective.
     * Factors: salary relative to cap (heaviest weight), team success,
     * team rating, tier prestige, loyalty to previous team, and randomness.
     *
     * @param {Object} offer - { salary, tier, teamSuccess, teamRating, teamId }
     * @param {Object} player - The free agent evaluating
     * @param {Object} deps - { SalaryCapEngine }
     * @returns {number} Composite score
     */
    static scoreOffer(offer, player, deps) {
        const { SalaryCapEngine: SCE } = deps;
        let score = 0;

        // Salary as percentage of tier cap (heaviest factor)
        const offerCap = SCE.getSalaryCap(offer.tier || 2);
        const salaryPct = offer.salary / offerCap;
        score += salaryPct * 240;

        // Team success (win percentage)
        const successScore = (offer.teamSuccess || 0) * 100;
        score += successScore * 0.25;

        // Team overall rating
        score += (offer.teamRating || 0) * 0.1;

        // Tier prestige bonus
        const tierBonus = offer.tier === 1 ? 5 : offer.tier === 2 ? 3 : 1;
        score += tierBonus;

        // Loyalty — prefer returning to previous team
        if (player.previousTeamId && offer.teamId === player.previousTeamId) {
            score += 5;
        }

        // Randomness to prevent deterministic outcomes
        score += Math.random() * 5;

        return score;
    }

    /**
     * Process all free agent decisions: score every offer, pick the best.
     * Returns structured results for the UI to display.
     *
     * @param {Object} params
     * @param {Array}  params.freeAgents - Free agents in the pool
     * @param {Array}  params.userOffers - User's submitted offers
     * @param {Array}  params.aiOffers - AI-generated offers (same shape)
     * @param {number} params.userTeamId - User's team ID
     * @param {Object} deps - { SalaryCapEngine }
     * @returns {Array} results: [{ player, winningOffer, userOffered, userWon, numOffers }]
     */
    static processDecisions(params, deps) {
        const { freeAgents, userOffers, aiOffers, userTeamId } = params;
        const allOffers = [...userOffers, ...aiOffers];
        const results = [];

        // Group offers by player
        const offersByPlayer = {};
        allOffers.forEach(offer => {
            if (!offersByPlayer[offer.playerId]) {
                offersByPlayer[offer.playerId] = [];
            }
            offersByPlayer[offer.playerId].push(offer);
        });

        // Each player with offers decides
        Object.keys(offersByPlayer).forEach(playerId => {
            const player = freeAgents.find(p => p.id == playerId);
            if (!player) return;

            const offers = offersByPlayer[playerId];

            // Score and rank
            const scoredOffers = offers.map(offer => ({
                ...offer,
                score: FreeAgencyEngine.scoreOffer(offer, player, deps)
            }));
            scoredOffers.sort((a, b) => b.score - a.score);

            const winner = scoredOffers[0];
            const userOffered = !!userOffers.find(o => o.playerId == playerId);
            const userWon = winner.teamId === userTeamId;

            results.push({
                player,
                winningOffer: winner,
                userOffered,
                userWon,
                numOffers: offers.length
            });
        });

        return results;
    }

    // ─────────────────────────────────────────────────────────────
    // EXECUTE SIGNINGS
    // ─────────────────────────────────────────────────────────────

    /**
     * Execute the signings from processDecisions results.
     * Moves players from freeAgentPool to their new team's roster.
     *
     * @param {Object} params
     * @param {Array}  params.results - Output from processDecisions
     * @param {Array}  params.freeAgentPool - Mutable FA pool
     * @param {Function} params.getTeamById - Lookup function
     * @returns {Array} Successfully signed entries
     */
    static executeSignings(params) {
        const { results, freeAgentPool, getTeamById } = params;
        const signed = [];

        results.forEach(result => {
            const player = result.player;
            const offer = result.winningOffer;
            const team = getTeamById(offer.teamId);

            if (!team) return;

            // Remove from free agency pool
            const faIndex = freeAgentPool.findIndex(p => p.id === player.id);
            if (faIndex !== -1) {
                freeAgentPool.splice(faIndex, 1);
            }

            // Update player contract
            player.salary = offer.salary;
            player.contractYears = offer.years;
            player.originalContractLength = offer.years;

            // Add to team roster
            team.roster.push(player);
            signed.push(result);
        });

        return signed;
    }

    // ─────────────────────────────────────────────────────────────
    // AI COLLEGE GRADUATE SIGNINGS
    // ─────────────────────────────────────────────────────────────

    /**
     * AI teams sign remaining college graduates.
     * @param {Array} graduates - Remaining unsigned graduates
     * @param {Array} aiTeams - AI teams
     * @param {Object} deps - { TeamFactory, getEffectiveCap, calculateTeamSalary }
     * @returns {number} Total signed
     */
    static aiSignCollegeGraduates(graduates, aiTeams, deps) {
        const { TeamFactory: TF, getEffectiveCap, calculateTeamSalary } = deps;
        let totalSigned = 0;

        const shuffled = [...aiTeams].sort(() => Math.random() - 0.5);

        shuffled.forEach(team => {
            const cap = getEffectiveCap(team);
            const currentSalary = calculateTeamSalary(team);
            const rosterSize = team.roster ? team.roster.length : 0;

            if (rosterSize >= 15) return;

            const maxToSign = Math.min(2, 15 - rosterSize);
            let signed = 0;

            for (let i = graduates.length - 1; i >= 0; i--) {
                if (signed >= maxToSign) break;
                const grad = graduates[i];

                const tierMatch =
                    (team.tier === 2 && grad.rating >= 60) ||
                    (team.tier === 3 && grad.rating >= 48);
                if (!tierMatch) continue;

                const gradSalary = TF.generateSalary(grad.rating, team.tier);
                if (currentSalary + gradSalary > cap) continue;

                grad.salary = gradSalary;
                grad.tier = team.tier;
                team.roster.push(grad);
                graduates.splice(i, 1);
                signed++;
                totalSigned++;
            }
        });

        return totalSigned;
    }
}
