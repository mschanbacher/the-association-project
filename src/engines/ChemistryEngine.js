// ═══════════════════════════════════════════════════════════════════
// ChemistryEngine — Team chemistry, morale, and roster stability
// ═══════════════════════════════════════════════════════════════════
//
// Pure logic: no DOM, no gameState, no UI. Operates on team/player
// objects passed as arguments.
//
// Chemistry is a per-player value (0-100, baseline 75) that averages
// into a team-level score. It affects game simulation via
// StatEngine._getChemistryModifier and getChemistryBonus.
//
// Chemistry changes from:
//   - Wins (+2 per player)
//   - 5-game losing streaks (-3 per player)
//   - 10 games of roster stability (+5 per player)
//   - Trading away a player (-5 or -10 if star)
//   - Dropping a player (-3)
//   - Championship (+10 per player)
//   - New signings reset to 75 (neutral)
//

export class ChemistryEngine {

    // ─────────────────────────────────────────────────────────────
    // CONSTANTS
    // ─────────────────────────────────────────────────────────────

    static BASELINE = 75;
    static MIN = 0;
    static MAX = 100;

    static WIN_BONUS = 2;
    static LOSING_STREAK_THRESHOLD = 5;
    static LOSING_STREAK_PENALTY = 3;
    static STABILITY_THRESHOLD = 10;
    static STABILITY_BONUS = 5;
    static CHAMPIONSHIP_BONUS = 10;

    static TRADE_PENALTY_STAR = 10;     // player.rating >= 80
    static TRADE_PENALTY_NORMAL = 5;
    static DROP_PENALTY = 3;

    static STAR_RATING_THRESHOLD = 80;

    // ─────────────────────────────────────────────────────────────
    // TEAM-LEVEL CALCULATIONS
    // ─────────────────────────────────────────────────────────────

    /**
     * Calculate team chemistry (average of all player chemistry scores)
     * @param {Object} team - Team object with roster array
     * @returns {number} Integer 0-100
     */
    static calculate(team) {
        if (!team.roster || team.roster.length === 0) {
            return ChemistryEngine.BASELINE;
        }

        const total = team.roster.reduce((sum, player) => {
            return sum + (player.chemistry || ChemistryEngine.BASELINE);
        }, 0);

        return Math.round(total / team.roster.length);
    }

    /**
     * Get chemistry bonus/penalty for team rating
     * Formula: (chemistry - 75) / 25 * 5 = ±5 at extremes
     * 100 chemistry = +5, 75 = 0, 50 = -5
     * Doubles in playoffs.
     * @param {Object} team
     * @param {boolean} isPlayoffs
     * @returns {number}
     */
    static getBonus(team, isPlayoffs = false) {
        const teamChemistry = ChemistryEngine.calculate(team);
        let bonus = ((teamChemistry - ChemistryEngine.BASELINE) / 25) * 5;

        if (isPlayoffs) {
            bonus *= 2;
        }

        return bonus;
    }

    // ─────────────────────────────────────────────────────────────
    // GAME EVENTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Apply chemistry changes after a game
     * @param {Object} team
     * @param {boolean} won - Whether the team won
     */
    static updateAfterGame(team, won) {
        if (!team.roster) return;

        // Increment games with team for all players
        team.roster.forEach(player => {
            if (!player.gamesWithTeam) player.gamesWithTeam = 0;
            player.gamesWithTeam++;
        });

        // Check for losing streak (5 consecutive losses)
        if (!won) {
            if (!team.currentLosingStreak) team.currentLosingStreak = 0;
            team.currentLosingStreak++;

            if (team.currentLosingStreak === ChemistryEngine.LOSING_STREAK_THRESHOLD) {
                team.roster.forEach(player => {
                    player.chemistry = Math.max(
                        ChemistryEngine.MIN,
                        (player.chemistry || ChemistryEngine.BASELINE) - ChemistryEngine.LOSING_STREAK_PENALTY
                    );
                });
                console.log(`💔 ${team.name}: ${ChemistryEngine.LOSING_STREAK_THRESHOLD}-game losing streak! Chemistry dropped by ${ChemistryEngine.LOSING_STREAK_PENALTY}.`);
            }
        } else {
            // Win: +2 chemistry to all players
            team.roster.forEach(player => {
                player.chemistry = Math.min(
                    ChemistryEngine.MAX,
                    (player.chemistry || ChemistryEngine.BASELINE) + ChemistryEngine.WIN_BONUS
                );
            });
            team.currentLosingStreak = 0;
        }

        // Check for stability bonus (10 consecutive games with no roster changes)
        if (!team.gamesSinceRosterChange) team.gamesSinceRosterChange = 0;
        team.gamesSinceRosterChange++;

        if (team.gamesSinceRosterChange === ChemistryEngine.STABILITY_THRESHOLD) {
            team.roster.forEach(player => {
                player.chemistry = Math.min(
                    ChemistryEngine.MAX,
                    (player.chemistry || ChemistryEngine.BASELINE) + ChemistryEngine.STABILITY_BONUS
                );
            });
            console.log(`🤝 ${team.name}: ${ChemistryEngine.STABILITY_THRESHOLD} games of roster stability! Chemistry +${ChemistryEngine.STABILITY_BONUS}.`);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ROSTER EVENTS
    // ─────────────────────────────────────────────────────────────

    /**
     * Apply chemistry penalty for trading away a player
     * @param {Object} team
     * @param {Object} tradedPlayer
     */
    static applyTradePenalty(team, tradedPlayer) {
        if (!team.roster) return;

        const isStar = tradedPlayer.rating >= ChemistryEngine.STAR_RATING_THRESHOLD;
        const penalty = isStar ? ChemistryEngine.TRADE_PENALTY_STAR : ChemistryEngine.TRADE_PENALTY_NORMAL;

        team.roster.forEach(player => {
            player.chemistry = Math.max(ChemistryEngine.MIN, (player.chemistry || ChemistryEngine.BASELINE) - penalty);
            player.gamesWithTeam = 0; // Reset tenure
        });

        // Reset stability counter
        team.gamesSinceRosterChange = 0;

        const newChemistry = ChemistryEngine.calculate(team);
        const approxOld = newChemistry + penalty;

        if (approxOld - newChemistry >= 10) {
            console.log(`📉 ${team.name}: Traded away ${tradedPlayer.name}. Chemistry dropped from ~${approxOld} to ${newChemistry}.`);
        }
    }

    /**
     * Apply chemistry penalty for dropping a player
     * @param {Object} team
     * @param {Object} droppedPlayer
     */
    static applyDropPenalty(team, droppedPlayer) {
        if (!team.roster) return;

        team.roster.forEach(player => {
            player.chemistry = Math.max(
                ChemistryEngine.MIN,
                (player.chemistry || ChemistryEngine.BASELINE) - ChemistryEngine.DROP_PENALTY
            );
        });

        team.gamesSinceRosterChange = 0;

        const newChemistry = ChemistryEngine.calculate(team);
        console.log(`📉 ${team.name}: Dropped ${droppedPlayer.name}. Chemistry now ${newChemistry}.`);
    }

    /**
     * Initialize chemistry for new player (signing or trade acquisition)
     * @param {Object} player
     */
    static initializePlayer(player) {
        player.chemistry = ChemistryEngine.BASELINE;
        player.gamesWithTeam = 0;
    }

    /**
     * Apply championship bonus (carries to next season)
     * @param {Object} team
     */
    static applyChampionshipBonus(team) {
        if (!team.roster) return;

        team.roster.forEach(player => {
            player.chemistry = Math.min(
                ChemistryEngine.MAX,
                (player.chemistry || ChemistryEngine.BASELINE) + ChemistryEngine.CHAMPIONSHIP_BONUS
            );
        });

        console.log(`🏆 ${team.name}: Championship bonus! Chemistry +${ChemistryEngine.CHAMPIONSHIP_BONUS} for all players.`);
    }

    // ─────────────────────────────────────────────────────────────
    // DISPLAY HELPERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Get chemistry color for display
     * @param {number} chemistry - 0-100
     * @returns {string} CSS color
     */
    static getColor(chemistry) {
        if (chemistry >= 75) return '#34a853'; // Green
        if (chemistry >= 50) return '#fbbc04'; // Yellow
        return '#ea4335'; // Red
    }

    /**
     * Get chemistry description
     * @param {number} chemistry - 0-100
     * @returns {string}
     */
    static getDescription(chemistry) {
        if (chemistry >= 90) return 'Excellent';
        if (chemistry >= 75) return 'Good';
        if (chemistry >= 60) return 'Average';
        if (chemistry >= 40) return 'Poor';
        return 'Terrible';
    }
}
