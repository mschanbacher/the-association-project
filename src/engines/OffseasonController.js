// ═══════════════════════════════════════════════════════════════════════════════
// OffseasonController.js — Offseason flow orchestration
// Manages the complete offseason pipeline:
//   Season End → Postseason → Promotion/Relegation → Draft → College Grad FA →
//   Player Development → Contract Decisions → Free Agency → Roster Compliance →
//   Owner Mode → Season Setup
// ═══════════════════════════════════════════════════════════════════════════════

import { UIRenderer } from './UIRenderer.js';

/**
 * OffseasonController orchestrates the entire offseason flow.
 * 
 * It receives a `ctx` context object from index.html containing all needed
 * dependencies (gameState, engines, helper functions, DOM accessors).
 * This avoids tight coupling while keeping the logic centralized.
 */
export class OffseasonController {
    // Offseason phases in order — each maps to a calendar date
    static PHASES = {
        NONE: 'none',                       // Regular season
        SEASON_ENDED: 'season_ended',       // Season end modal shown
        POSTSEASON: 'postseason',           // Championship playoffs
        PROMO_REL: 'promo_rel',             // Promotion/relegation
        DRAFT: 'draft',                     // T1 Draft
        COLLEGE_FA: 'college_fa',           // College grad FA (T2/T3)
        DEVELOPMENT: 'development',         // Player development
        FREE_AGENCY: 'free_agency',         // Free agency period
        ROSTER_COMPLIANCE: 'roster_compliance', // Roster compliance check
        OWNER_MODE: 'owner_mode',           // Financial decisions
        SETUP_COMPLETE: 'setup_complete',   // New season ready
    };

    /**
     * @param {Object} ctx - Context with all dependencies
     */
    constructor(ctx) {
        this.ctx = ctx;
        this.playerDevelopmentInProgress = false;
        this.contractDecisionsState = {
            expiringPlayers: [],
            developmentLog: [],
            decisions: {}
        };
        this.coachMarketPool = [];
    }

    // ═══════════════════════════════════════════════════════════════════
    // Offseason Phase Management
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Set the current offseason phase and advance the calendar date.
     * This is the KEY function that prevents getting stuck — every
     * offseason step sets its phase, so we can always resume.
     */
    setPhase(phase) {
        const { gameState, engines } = this.ctx;
        const P = OffseasonController.PHASES;
        gameState.offseasonPhase = phase;

        // Advance calendar date to match the phase
        const seasonDates = engines.CalendarEngine.getSeasonDates(gameState.seasonStartYear || gameState.currentSeason);
        const phaseToDate = {
            [P.SEASON_ENDED]:       seasonDates.seasonEnd,
            [P.POSTSEASON]:         seasonDates.playoffsStart,
            [P.PROMO_REL]:          seasonDates.seasonOfficialEnd,
            [P.DRAFT]:              seasonDates.draftDay,
            [P.COLLEGE_FA]:         seasonDates.collegeFA,
            [P.DEVELOPMENT]:        seasonDates.playerDevelopment,
            [P.FREE_AGENCY]:        seasonDates.freeAgencyStart,
            [P.ROSTER_COMPLIANCE]:  seasonDates.rosterCompliance,
            [P.OWNER_MODE]:         seasonDates.ownerDecisions,
            [P.SETUP_COMPLETE]:     seasonDates.trainingCamp,
        };

        const date = phaseToDate[phase];
        if (date) {
            gameState.currentDate = engines.CalendarEngine.toDateString(date);
        }

        console.log(`📅 Offseason phase: ${phase}${date ? ' (date: ' + gameState.currentDate + ')' : ''}`);
    }

    /**
     * Resume the offseason from the current phase.
     * Called when user closes a modal or returns from roster management
     * during the offseason. Picks up where we left off.
     */
    resumeOffseason() {
        const { gameState } = this.ctx;
        const phase = gameState.offseasonPhase;
        const P = OffseasonController.PHASES;

        console.log(`🔄 Resuming offseason from phase: ${phase}`);

        switch (phase) {
            case P.SEASON_ENDED:
                // Re-show season end modal
                this.ctx.helpers.getGameSimController().showSeasonEnd();
                break;
            case P.POSTSEASON:
                // Postseason already ran; continue to promo/rel
                this.continueAfterPostseason();
                break;
            case P.PROMO_REL:
                // Promo/rel already executed; skip to draft/development
                this.proceedToDraftOrDevelopment();
                break;
            case P.DRAFT:
                // Draft is interactive and one-time; if resuming, skip to college FA or development
                if (this.ctx.gameState.currentTier === 1) {
                    this.setPhase(P.COLLEGE_FA);
                    this.ctx.helpers.startCollegeGraduateFA();
                } else {
                    this.proceedToPlayerDevelopment();
                }
                break;
            case P.COLLEGE_FA:
                // College FA is one-time; if resuming, skip to development
                this.proceedToPlayerDevelopment();
                break;
            case P.DEVELOPMENT:
                // Development is a one-time operation; if we're resuming,
                // it already ran. Skip to free agency.
                this.startFreeAgencyPeriod();
                break;
            case P.FREE_AGENCY:
                this.startFreeAgencyPeriod();
                break;
            case P.ROSTER_COMPLIANCE:
                this.checkRosterComplianceAndContinue();
                break;
            case P.OWNER_MODE:
                this.showOffseasonManagement();
                break;
            case P.SETUP_COMPLETE:
                this.continueToSeasonSetup();
                break;
            default:
                console.warn('⚠️ Unknown offseason phase:', phase, '— showing season end');
                this.ctx.helpers.getGameSimController().showSeasonEnd();
                break;
        }
    }

    /**
     * Check if we're currently in the offseason flow
     */
    isInOffseason() {
        const { gameState } = this.ctx;
        const phase = gameState.offseasonPhase;
        return phase && phase !== OffseasonController.PHASES.NONE;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Step 1: Season End → Postseason
    // ═══════════════════════════════════════════════════════════════════

    advanceToNextSeason(action) {
        const { gameState, eventBus, GameEvents, engines, helpers } = this.ctx;
        const P = OffseasonController.PHASES;

        console.log('🎬 advanceToNextSeason called with action:', action);
        this.setPhase(P.POSTSEASON);

        eventBus.emit(GameEvents.SEASON_ENDED, {
            season: gameState.season,
            userTeamId: gameState.userTeamId,
            userPlayoffResult: action
        });

        document.getElementById('seasonEndModal').classList.add('hidden');
        document.getElementById('playoffModal').classList.add('hidden');

        gameState.userPlayoffResult = action;

        console.log('🏆 Running full postseason via PlayoffEngine...');
        const postseasonResults = engines.PlayoffEngine.simulateFullPostseason(gameState);
        gameState.postseasonResults = postseasonResults;

        const html = engines.PlayoffEngine.generatePostseasonHTML(postseasonResults, gameState.userTeamId);
        document.getElementById('championshipPlayoffContent').innerHTML = UIRenderer.postseasonContinue({ resultsHTML: html });
        document.getElementById('championshipPlayoffModal').classList.remove('hidden');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Step 2: Continue After Postseason → Promotion/Relegation
    // ═══════════════════════════════════════════════════════════════════

    continueAfterPostseason() {
        const { gameState, eventBus, GameEvents, engines, helpers } = this.ctx;
        const P = OffseasonController.PHASES;

        document.getElementById('championshipPlayoffModal').classList.add('hidden');
        this.setPhase(P.PROMO_REL);

        // ═══ CAPTURE SEASON HISTORY SNAPSHOT ═══
        const postseason = gameState.postseasonResults;
        if (gameState._seasonEndData && postseason) {
            const snapshot = gameState._seasonEndData;

            snapshot.champions = {
                tier1: postseason.t1 && postseason.t1.champion ? { id: postseason.t1.champion.id, name: postseason.t1.champion.name, city: postseason.t1.champion.city } : null,
                tier2: postseason.t2 && postseason.t2.champion ? { id: postseason.t2.champion.id, name: postseason.t2.champion.name, city: postseason.t2.champion.city } : null,
                tier3: postseason.t3 && postseason.t3.champion ? { id: postseason.t3.champion.id, name: postseason.t3.champion.name, city: postseason.t3.champion.city } : null
            };

            snapshot.promotions = {
                toT1: (postseason.promoted && postseason.promoted.toT1 || []).map(t => ({ id: t.id, name: t.name })),
                toT2: (postseason.promoted && postseason.promoted.toT2 || []).map(t => ({ id: t.id, name: t.name }))
            };
            snapshot.relegations = {
                fromT1: (postseason.relegated && postseason.relegated.fromT1 || []).map(t => ({ id: t.id, name: t.name })),
                fromT2: (postseason.relegated && postseason.relegated.fromT2 || []).map(t => ({ id: t.id, name: t.name }))
            };

            const userTeamSnap = helpers.getUserTeam();
            if (userTeamSnap) {
                const userTier = gameState.currentTier;
                const tierStandings = userTier === 1 ? snapshot.standings.tier1 : userTier === 2 ? snapshot.standings.tier2 : snapshot.standings.tier3;
                const userStanding = tierStandings.find(t => t.id === userTeamSnap.id);
                snapshot.userTeam = {
                    id: userTeamSnap.id, name: userTeamSnap.name, city: userTeamSnap.city,
                    tier: userTier, wins: userTeamSnap.wins, losses: userTeamSnap.losses,
                    rank: userStanding ? userStanding.rank : null,
                    coachName: userTeamSnap.coach ? userTeamSnap.coach.name : 'None',
                    rosterSize: userTeamSnap.roster ? userTeamSnap.roster.length : 0,
                    topPlayer: userTeamSnap.roster && userTeamSnap.roster.length > 0
                        ? (() => { const best = [...userTeamSnap.roster].sort((a, b) => b.rating - a.rating)[0]; return { name: best.name, rating: best.rating, position: best.position }; })()
                        : null
                };
            }

            if (!gameState._fullSeasonHistory) gameState._fullSeasonHistory = [];
            if (!gameState._fullSeasonHistory.some(h => h.season === snapshot.season)) {
                gameState._fullSeasonHistory.push(snapshot);
                console.log(`📜 Season ${snapshot.seasonLabel} snapshot captured (${JSON.stringify(snapshot).length} bytes)`);
            }

            engines.StorageEngine.saveSeasonSnapshot(snapshot.season, snapshot);
            delete gameState._seasonEndData;
        }

        // Execute promotion/relegation
        const userTeamBefore = helpers.getUserTeam();
        const tierBefore = userTeamBefore ? userTeamBefore.tier : gameState.currentTier;

        console.log('⬆️⬇️ Executing promotion/relegation from postseason results...');
        this.executePromotionRelegationFromResults(gameState.postseasonResults);

        const userTeam = helpers.getUserTeam();
        const tierAfter = userTeam ? userTeam.tier : gameState.currentTier;
        const tierChanged = tierBefore !== tierAfter;

        if (tierChanged && userTeam) {
            const action = tierAfter > tierBefore ? 'relegated' : 'promoted';
            eventBus.emit(tierAfter < tierBefore ? GameEvents.TEAM_PROMOTED : GameEvents.TEAM_RELEGATED, {
                teamId: userTeam.id, teamName: userTeam.name,
                fromTier: tierBefore, toTier: tierAfter
            });
            this.showFinancialTransitionBriefing(userTeam, action);
            return;
        }

        eventBus.emit(GameEvents.PROMO_REL_COMPLETED, { season: gameState.season, tierChanged: false });
        console.log('Proceeding to draft/development...');
        this.proceedToDraftOrDevelopment();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Promotion / Relegation
    // ═══════════════════════════════════════════════════════════════════

    executePromotionRelegationFromResults(results) {
        const { gameState, helpers } = this.ctx;

        if (gameState.tier1Teams.length !== 30 || gameState.tier2Teams.length !== 86 || gameState.tier3Teams.length !== 144) {
            console.error('🚨 CANNOT EXECUTE PROMOTION/RELEGATION - Tier counts already wrong!');
            console.error('T1:', gameState.tier1Teams.length, 'T2:', gameState.tier2Teams.length, 'T3:', gameState.tier3Teams.length);
            alert('Critical Error: Tier counts are corrupted. Cannot advance season.');
            return;
        }

        const t1RelegatedTeams = results.relegated.fromT1;
        const t2PromotedToT1 = results.promoted.toT1;
        const t2RelegatedToT3 = results.relegated.fromT2;
        const t3PromotedToT2 = results.promoted.toT2;

        console.log('=== PROMOTION/RELEGATION (PlayoffEngine) ===');
        console.log('T1→T2 Relegated:', t1RelegatedTeams.map(t => t.name));
        console.log('T2→T1 Promoted:', t2PromotedToT1.map(t => t.name));
        console.log('T2→T3 Relegated:', t2RelegatedToT3.map(t => t.name));
        console.log('T3→T2 Promoted:', t3PromotedToT2.map(t => t.name));

        const t1RelegatedIds = t1RelegatedTeams.map(t => t.id);
        const t2PromotedToT1Ids = t2PromotedToT1.map(t => t.id);
        const t2RelegatedToT3Ids = t2RelegatedToT3.map(t => t.id);
        const t3PromotedToT2Ids = t3PromotedToT2.map(t => t.id);

        gameState.tier1Teams = gameState.tier1Teams.filter(t => !t1RelegatedIds.includes(t.id));
        gameState.tier2Teams = gameState.tier2Teams.filter(t =>
            !t2PromotedToT1Ids.includes(t.id) && !t2RelegatedToT3Ids.includes(t.id)
        );
        gameState.tier3Teams = gameState.tier3Teams.filter(t => !t3PromotedToT2Ids.includes(t.id));

        t1RelegatedTeams.forEach(team => {
            helpers.applyParachutePayment(team, 1, 2);
            team.tier = 2;
            team.division = helpers.assignDivision(team.name, 2);
            gameState.tier2Teams.push(team);
        });

        t2PromotedToT1.forEach(team => {
            helpers.applyPromotionBonus(team, 2, 1);
            team.tier = 1;
            team.division = helpers.assignDivision(team.name, 1);
            gameState.tier1Teams.push(team);
        });

        gameState.promotedToT1 = t2PromotedToT1.map(t => t.id);

        t2RelegatedToT3.forEach(team => {
            helpers.applyParachutePayment(team, 2, 3);
            team.tier = 3;
            team.division = helpers.assignDivision(team.name, 3);
            gameState.tier3Teams.push(team);
        });

        t3PromotedToT2.forEach(team => {
            helpers.applyPromotionBonus(team, 3, 2);
            team.tier = 2;
            team.division = helpers.assignDivision(team.name, 2);
            gameState.tier2Teams.push(team);
        });

        helpers.balanceTier1Divisions();
        helpers.balanceTier2Divisions();
        helpers.balanceTier3Divisions();

        console.log('T1 after:', gameState.tier1Teams.length, '(should be 30)');
        console.log('T2 after:', gameState.tier2Teams.length, '(should be 86)');
        console.log('T3 after:', gameState.tier3Teams.length, '(should be 144)');

        // Update user's tier
        const userInT1 = gameState.tier1Teams.find(t => t.id === gameState.userTeamId);
        const userInT2 = gameState.tier2Teams.find(t => t.id === gameState.userTeamId);
        if (userInT1) gameState.currentTier = 1;
        else if (userInT2) gameState.currentTier = 2;
        else gameState.currentTier = 3;

        console.log('✅ User now in Tier', gameState.currentTier);
    }

    showFinancialTransitionBriefing(team, action) {
        const { gameState, engines, helpers } = this.ctx;

        engines.FinanceEngine.ensureFinances(team);
        const f = team.finances;
        const isRelegation = (action === 'relegate' || action === 'relegated');
        const isPromotion = (action === 'promote' || action === 'promoted');
        const previousTier = f.previousTier || (isRelegation ? team.tier - 1 : team.tier + 1);
        const currentTier = team.tier;

        const summary = engines.FinanceEngine.getFinancialSummary(team);
        const roster = team.roster || [];
        const totalSalary = Math.round(helpers.calculateTeamSalary(team));
        const spendingLimit = summary.spendingLimit;
        const capSpace = spendingLimit - totalSalary;

        const expiring = roster.filter(p => p.contractYears <= 1);
        const locked = roster.filter(p => p.contractYears > 1);
        const lockedSalary = locked.reduce((sum, p) => sum + (p.salary || 0), 0);
        const expiringSalary = expiring.reduce((sum, p) => sum + (p.salary || 0), 0);
        const releasedPlayers = team._relegationReleased || [];
        const rosterBySalary = [...roster].sort((a, b) => (b.salary || 0) - (a.salary || 0));

        const oldTierBaseline = engines.FinanceEngine.TIER_BASELINES[previousTier];
        const newTierBaseline = engines.FinanceEngine.TIER_BASELINES[currentTier];
        const newTotalBaseline = newTierBaseline.league + newTierBaseline.matchday + newTierBaseline.commercial + newTierBaseline.legacy;

        document.getElementById('financialTransitionContent').innerHTML = UIRenderer.financialTransitionBriefing({
            team, isRelegation, isPromotion, previousTier, currentTier,
            summary, totalSalary, spendingLimit, capSpace,
            locked, expiring, lockedSalary, expiringSalary,
            releasedPlayers, rosterBySalary, oldTierBaseline, newTotalBaseline,
            formatCurrency: helpers.formatCurrency, getRatingColor: helpers.getRatingColor,
            spendingRatio: f.spendingRatio, currentSeason: gameState.currentSeason
        });

        document.getElementById('financialTransitionModal').classList.remove('hidden');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Step 3: Draft / College Grad FA
    // ═══════════════════════════════════════════════════════════════════

    proceedToDraftOrDevelopment() {
        const { gameState, eventBus, GameEvents, helpers } = this.ctx;
        const P = OffseasonController.PHASES;

        eventBus.emit(GameEvents.OFFSEASON_STARTED, { season: gameState.season });

        if (gameState.currentTier === 1) {
            console.log('🎓 Step 3: User is in Tier 1, running draft...');
            this.setPhase(P.DRAFT);
            helpers.runDraft();
        } else {
            console.log('⏭️ Step 3: User is in Tier ' + gameState.currentTier + ', skipping draft...');
            this.setPhase(P.COLLEGE_FA);
            helpers.startCollegeGraduateFA();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Step 4: Player Development
    // ═══════════════════════════════════════════════════════════════════

    proceedToPlayerDevelopment() {
        const { gameState, eventBus, GameEvents } = this.ctx;
        const P = OffseasonController.PHASES;

        if (this.playerDevelopmentInProgress) {
            console.warn('⚠️ Player development already in progress, skipping duplicate call');
            return;
        }
        this.setPhase(P.DEVELOPMENT);
        eventBus.emit(GameEvents.DEVELOPMENT_STARTED, { season: gameState.season });

        this.playerDevelopmentInProgress = true;
        console.log('🌟 Step 4: Applying player development...');

        const developmentResult = this.applyPlayerDevelopment();

        const hasDevChanges = developmentResult && developmentResult.developmentLog.length > 0;
        const hasRetirements = (gameState._userTeamRetirements && gameState._userTeamRetirements.length > 0) ||
                               (gameState._seasonRetirements && gameState._seasonRetirements.filter(r => r.peakRating >= 80).length > 0);

        if (hasDevChanges || hasRetirements) {
            this.showDevelopmentSummaryOnly(developmentResult ? developmentResult.developmentLog : []);
        } else {
            console.log('No significant development changes or retirements, proceeding to free agency...');
            this.startFreeAgencyPeriod();
        }
    }

    applyPlayerDevelopment() {
        const { gameState, helpers } = this.ctx;

        console.log('🌟 Applying player development...');

        const allTeams = [...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams];
        helpers.advanceFinancialTransitions(allTeams);

        const userTeam = helpers.getUserTeam();
        let userTeamLog = [];
        let userExpiredContracts = [];

        let totalExpired = 0, totalResigned = 0, totalReleased = 0;
        let allRetirements = [];
        let userTeamRetirements = [];

        const processTier = (teams, gamesPerSeason) => {
            teams.forEach(team => {
                const result = helpers.developTeamPlayers(team, gamesPerSeason);
                if (result && team.id === userTeam.id) {
                    userTeamLog = result.developmentLog || [];
                    userExpiredContracts = result.expiredContracts || [];
                    userTeamRetirements = result.retirements || [];
                }
                if (result && result.retirements) allRetirements.push(...result.retirements);
                if (result && result.expiredContracts && team.id !== userTeam.id) {
                    totalExpired += result.expiredContracts.length;
                    const counts = helpers.handleAITeamFreeAgency(team, result.expiredContracts);
                    totalResigned += counts.resigned;
                    totalReleased += counts.released;
                }
            });
        };

        processTier(gameState.tier1Teams, 82);
        processTier(gameState.tier2Teams, 60);
        processTier(gameState.tier3Teams, 40);

        // Log retirement summary
        const notableRetirements = allRetirements.filter(r => r.peakRating >= 80);
        console.log('═══════════════════════════════════════════════════════');
        console.log(`👴 Retirement Summary: ${allRetirements.length} players retired`);
        if (userTeamRetirements.length > 0) {
            console.log(`   🏠 Your team: ${userTeamRetirements.map(r => `${r.name} (${r.age}yo, peak ${r.peakRating})`).join(', ')}`);
        }
        if (notableRetirements.length > 0) {
            console.log(`   ⭐ Notable retirements:`);
            notableRetirements.sort((a, b) => b.peakRating - a.peakRating).forEach(r => {
                console.log(`      ${r.name} (${r.position}) — Peak ${r.peakRating} OVR, ${r.careerLength}yr career, last with ${r.teamName}`);
            });
        }

        gameState._seasonRetirements = allRetirements;
        gameState._userTeamRetirements = userTeamRetirements;

        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 AI Free Agency Summary:`);
        console.log(`  Total Expired Contracts: ${totalExpired}`);
        console.log(`  Re-signed: ${totalResigned}`);
        console.log(`  Released to FA: ${totalReleased}`);
        console.log(`  User Expired: ${userExpiredContracts.length}`);
        console.log(`  Total FA Pool: ${gameState.freeAgents.length} players`);
        console.log('═══════════════════════════════════════════════════════');

        if (userTeamLog.length > 0) {
            console.log(`📊 ${userTeam.name} Player Development:`);
            userTeamLog.forEach(log => {
                const arrow = log.change > 0 ? '⬆️' : '⬇️';
                console.log(`  ${arrow} ${log.name} (${log.age}yo): ${log.oldRating} → ${log.newRating} (${log.change > 0 ? '+' : ''}${log.change})`);
            });
        }

        // Auto-release expired contracts to FA pool with loyalty bonus
        if (userExpiredContracts.length > 0) {
            console.log(`📝 ${userTeam.name} Expired Contracts (${userExpiredContracts.length}):`);
            userExpiredContracts.forEach(player => {
                console.log(`  🔓 ${player.name} (${player.rating} OVR) - Released to free agency with loyalty bonus`);

                const index = userTeam.roster.findIndex(p => p.id === player.id);
                if (index !== -1) userTeam.roster.splice(index, 1);

                player.previousTeamId = userTeam.id;
                player.contractYears = helpers.determineContractLength(player.age, player.rating);
                player.originalContractLength = player.contractYears;
                player.contractExpired = false;
                gameState.freeAgents.push(player);
            });
        }

        // Retire old free agents
        if (gameState.freeAgents && gameState.freeAgents.length > 0) {
            const faBefore = gameState.freeAgents.length;
            gameState.freeAgents = gameState.freeAgents.filter(player => {
                player.age = (player.age || 25) + 1;
                const retireChance = helpers.getRetirementProbability(player.age, player.rating, player.tier || 3);
                if (retireChance > 0 && Math.random() < retireChance) {
                    if (player.rating >= 75 || (player._peakRating && player._peakRating >= 80)) {
                        if (!gameState.retirementHistory) gameState.retirementHistory = [];
                        gameState.retirementHistory.push({
                            name: player.name, position: player.position, age: player.age,
                            peakRating: player._peakRating || player.rating, finalRating: player.rating,
                            careerLength: player.age - (player.isCollegeGrad ? 21 : 19),
                            lastTeam: 'Free Agent', lastTier: player.tier || 0,
                            season: gameState.currentSeason,
                            notable: (player._peakRating || player.rating) >= 88,
                            legendary: (player._peakRating || player.rating) >= 93
                        });
                    }
                    return false;
                }
                return true;
            });
            const faRetired = faBefore - gameState.freeAgents.length;
            if (faRetired > 0) console.log(`👴 ${faRetired} free agents retired`);
        }

        // Heal injuries and reset fatigue
        console.log('🏥 Healing off-season injuries...');
        [...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams].forEach(team => {
            helpers.healAllInjuries(team);
        });

        console.log('😴 Resetting player fatigue for new season...');
        helpers.resetAllFatigue([...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams]);

        return { developmentLog: userTeamLog, expiredContracts: userExpiredContracts };
    }

    // ═══════════════════════════════════════════════════════════════════
    // Development Summary Display
    // ═══════════════════════════════════════════════════════════════════

    showDevelopmentAndFreeAgency(developmentLog, expiredContracts) {
        const { gameState, helpers } = this.ctx;
        const improvements = developmentLog.filter(log => log.change > 0);
        const declines = developmentLog.filter(log => log.change < 0);
        const userTeam = helpers.getUserTeam();

        let expiredContractsHTML = '';
        if (expiredContracts && expiredContracts.length > 0) {
            const cardsHTML = expiredContracts.map(player => {
                const remainingCap = helpers.getEffectiveCap(userTeam) - helpers.calculateTeamSalary(userTeam);
                const canAfford = player.salary <= remainingCap;
                return UIRenderer.expiredContractCard({ player, canAfford, ratingColor: helpers.getRatingColor(player.rating) });
            }).join('');
            expiredContractsHTML = UIRenderer.expiredContractsSection({ count: expiredContracts.length, cardsHTML });
        }

        let improvementsHTML = '';
        if (improvements.length > 0) {
            improvementsHTML = `<div style="margin-bottom: 30px;"><h2 style="color: #34a853; margin-bottom: 15px;">⬆️ Player Improvements (${improvements.length})</h2>${improvements.map((log, i) => UIRenderer.ratingChangeRow(log, i)).join('')}</div>`;
        }
        let declinesHTML = '';
        if (declines.length > 0) {
            declinesHTML = `<div><h2 style="color: #ea4335; margin-bottom: 15px;">⬇️ Player Declines (${declines.length})</h2>${declines.map((log, i) => UIRenderer.ratingChangeRow(log, i)).join('')}</div>`;
        }

        const hasContent = improvements.length > 0 || declines.length > 0 || (expiredContracts && expiredContracts.length > 0);

        document.getElementById('developmentSummary').innerHTML = UIRenderer.developmentAndFreeAgencyPage({
            expiredContractsHTML, improvementsHTML, declinesHTML, hasContent
        });
        document.getElementById('developmentModal').classList.remove('hidden');

        if (!gameState.pendingExpiredDecisions) {
            gameState.pendingExpiredDecisions = expiredContracts ? expiredContracts.map(p => p.id) : [];
        }
    }

    showDevelopmentSummaryOnly(developmentLog) {
        const { gameState } = this.ctx;
        const improvements = developmentLog.filter(log => log.change > 0);
        const declines = developmentLog.filter(log => log.change < 0);
        const userRetirements = gameState._userTeamRetirements || [];
        const allRetirements = gameState._seasonRetirements || [];
        const notableRetirements = allRetirements
            .filter(r => r.peakRating >= 80)
            .sort((a, b) => b.peakRating - a.peakRating)
            .slice(0, 10);

        const html = UIRenderer.developmentSummaryFull({
            improvements, declines, userRetirements, notableRetirements,
            allRetirementsCount: allRetirements.length
        });

        document.getElementById('developmentSummary').innerHTML = html;
        document.getElementById('developmentModal').classList.remove('hidden');
    }

    closeDevelopmentSummary() {
        document.getElementById('developmentModal').classList.add('hidden');
        this.startFreeAgencyPeriod();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Expired Contract Decisions (old flow — kept for compatibility)
    // ═══════════════════════════════════════════════════════════════════

    resignExpiredPlayer(playerId) {
        const { gameState, helpers } = this.ctx;
        const userTeam = helpers.getUserTeam();
        const player = userTeam.roster.find(p => p.id === playerId);
        if (!player) { console.error('Player not found:', playerId); return; }

        player.contractYears = helpers.determineContractLength(player.age, player.rating);
        player.originalContractLength = player.contractYears;
        player.contractExpired = false;

        const oldSalary = player.salary;
        player.salary = helpers.generateSalary(player.rating, userTeam.tier);
        player.tier = userTeam.tier;
        delete player.preRelegationSalary;

        const salaryChange = player.salary - oldSalary;
        const changeLabel = salaryChange < 0 ? `↓ ${helpers.formatCurrency(Math.abs(salaryChange))}` : salaryChange > 0 ? `↑ ${helpers.formatCurrency(salaryChange)}` : 'unchanged';
        console.log(`✅ Re-signed ${player.name} for ${player.contractYears} year(s) at ${helpers.formatCurrency(player.salary)} (${changeLabel})`);

        this._removeExpiredDecision(playerId);

        const element = document.getElementById(`expired_${playerId}`);
        if (element) {
            element.style.opacity = '0.5';
            element.innerHTML = UIRenderer.expiredContractDecisionResult({
                playerName: player.name, decision: 'resign',
                contractYears: player.contractYears, salary: player.salary, formatCurrency: helpers.formatCurrency
            });
        }

        this._checkAllExpiredDecisionsMade();
    }

    releaseExpiredPlayer(playerId) {
        const { gameState, helpers } = this.ctx;
        const userTeam = helpers.getUserTeam();
        const player = userTeam.roster.find(p => p.id === playerId);
        if (!player) { console.error('Player not found:', playerId); return; }

        const index = userTeam.roster.findIndex(p => p.id === playerId);
        if (index !== -1) userTeam.roster.splice(index, 1);

        player.previousTeamId = userTeam.id;
        player.contractYears = helpers.determineContractLength(player.age, player.rating);
        player.originalContractLength = player.contractYears;
        player.contractExpired = false;
        gameState.freeAgents.push(player);

        console.log(`❌ Released ${player.name} to free agency`);

        this._removeExpiredDecision(playerId);

        const element = document.getElementById(`expired_${playerId}`);
        if (element) {
            element.style.opacity = '0.5';
            element.innerHTML = UIRenderer.expiredContractDecisionResult({
                playerName: player.name, decision: 'release',
                contractYears: 0, salary: 0, formatCurrency: helpers.formatCurrency
            });
        }

        this._checkAllExpiredDecisionsMade();
    }

    _removeExpiredDecision(playerId) {
        const { gameState } = this.ctx;
        if (gameState.pendingExpiredDecisions) {
            const index = gameState.pendingExpiredDecisions.indexOf(playerId);
            if (index !== -1) gameState.pendingExpiredDecisions.splice(index, 1);
        }
    }

    _checkAllExpiredDecisionsMade() {
        const { gameState } = this.ctx;
        if (gameState.pendingExpiredDecisions && gameState.pendingExpiredDecisions.length === 0) {
            console.log('✅ All expired contract decisions made!');
            const statusDiv = document.getElementById('expiredContractsStatus');
            if (statusDiv) {
                statusDiv.innerHTML = '<strong style="color: #34a853;">✅ All decisions made! Close this window to continue.</strong>';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Contract Decisions Modal (new flow)
    // ═══════════════════════════════════════════════════════════════════

    showContractDecisionsModal(expiredContracts, developmentLog) {
        const { helpers } = this.ctx;
        const state = this.contractDecisionsState;
        state.expiringPlayers = expiredContracts;
        state.developmentLog = developmentLog || [];
        state.decisions = {};

        const userTeam = helpers.getUserTeam();
        const currentSalary = helpers.calculateTeamSalary(userTeam);
        const cap = helpers.getEffectiveCap(userTeam);
        const expiredSalary = expiredContracts.reduce((sum, p) => sum + p.salary, 0);
        const remainingCap = cap - (currentSalary - expiredSalary);

        document.getElementById('contractDecisionsSummary').innerHTML = UIRenderer.contractDecisionsSummary({
            expiredCount: expiredContracts.length,
            availableCap: remainingCap,
            rosterCount: { value: userTeam.roster.length - expiredContracts.length, label: 'Current Roster' },
            formatCurrency: helpers.formatCurrency, capColor: '#34a853'
        });

        const playersHtml = expiredContracts.map(player => {
            const canAfford = player.salary <= remainingCap;
            const newContract = helpers.determineContractLength(player.age, player.rating);
            return UIRenderer.contractDecisionCard({
                player, canAfford, newContractYears: newContract, ratingColor: helpers.getRatingColor(player.rating)
            });
        }).join('');
        document.getElementById('expiringContractsList').innerHTML = playersHtml;

        document.getElementById('contractDecisionsConfirmBtn').onclick = () => this.confirmContractDecisions();
        this.updateContractDecisionsButton();
        document.getElementById('contractDecisionsModal').classList.remove('hidden');
    }

    makeContractDecision(playerId, decision) {
        const state = this.contractDecisionsState;
        state.decisions[playerId] = decision;

        const resignBtn = document.getElementById(`resign_${playerId}`);
        const releaseBtn = document.getElementById(`release_${playerId}`);
        const card = document.getElementById(`contract_${playerId}`);
        const status = document.getElementById(`decision_status_${playerId}`);

        if (decision === 'resign') {
            card.style.border = '2px solid #34a853';
            resignBtn.style.background = 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)';
            releaseBtn.style.background = '';
            status.textContent = '✅ Re-signing';
            status.style.color = '#34a853';
        } else {
            card.style.border = '2px solid #ea4335';
            releaseBtn.style.background = 'linear-gradient(135deg, #ea4335 0%, #c62828 100%)';
            resignBtn.style.background = '';
            status.textContent = '❌ Releasing';
            status.style.color = '#ea4335';
        }

        this.updateAvailableCapDisplay();
        this.updateContractDecisionsButton();
    }

    updateAvailableCapDisplay() {
        const { helpers } = this.ctx;
        const state = this.contractDecisionsState;
        const userTeam = helpers.getUserTeam();
        const currentSalary = helpers.calculateTeamSalary(userTeam);
        const cap = helpers.getEffectiveCap(userTeam);
        const expiredContracts = state.expiringPlayers;

        const expiredSalary = expiredContracts.reduce((sum, p) => sum + p.salary, 0);
        const resignedSalary = expiredContracts
            .filter(p => state.decisions[p.id] === 'resign')
            .reduce((sum, p) => sum + p.salary, 0);

        const availableCap = cap - (currentSalary - expiredSalary + resignedSalary);
        const remainingRoster = userTeam.roster.length - expiredContracts.length +
            Object.values(state.decisions).filter(d => d === 'resign').length;

        document.getElementById('contractDecisionsSummary').innerHTML = UIRenderer.contractDecisionsSummary({
            expiredCount: expiredContracts.length,
            availableCap,
            rosterCount: { value: remainingRoster, label: 'Remaining Roster' },
            formatCurrency: helpers.formatCurrency,
            capColor: availableCap < 0 ? '#ea4335' : '#34a853'
        });
    }

    updateContractDecisionsButton() {
        const state = this.contractDecisionsState;
        const totalPlayers = state.expiringPlayers.length;
        const decidedPlayers = Object.keys(state.decisions).length;
        const btn = document.getElementById('contractDecisionsConfirmBtn');
        if (btn) {
            btn.disabled = decidedPlayers < totalPlayers;
            btn.textContent = decidedPlayers < totalPlayers
                ? `Decide on all players (${decidedPlayers}/${totalPlayers})`
                : '✅ Confirm All Decisions';
        }
    }

    confirmContractDecisions() {
        const { gameState, helpers } = this.ctx;
        const state = this.contractDecisionsState;
        const userTeam = helpers.getUserTeam();

        state.expiringPlayers.forEach(player => {
            const decision = state.decisions[player.id];
            if (decision === 'resign') {
                player.contractYears = helpers.determineContractLength(player.age, player.rating);
                player.originalContractLength = player.contractYears;
                delete player.contractExpired;
                console.log(`✅ Re-signed ${player.name} to ${player.contractYears} year contract (${helpers.formatCurrency(player.salary)}/yr)`);
            } else if (decision === 'release') {
                const index = userTeam.roster.findIndex(p => p.id === player.id);
                if (index !== -1) userTeam.roster.splice(index, 1);

                player.contractYears = helpers.determineContractLength(player.age, player.rating);
                player.originalContractLength = player.contractYears;
                delete player.contractExpired;
                gameState.freeAgents.push(player);
                console.log(`❌ Released ${player.name} to free agency (${player.rating} OVR, ${helpers.formatCurrency(player.salary)}/yr)`);
            }
        });

        document.getElementById('contractDecisionsModal').classList.add('hidden');

        if (state.developmentLog.length > 0) {
            this.showDevelopmentSummaryOnly(state.developmentLog);
        } else {
            this.runAISigningAndContinue();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Free Agency Period
    // ═══════════════════════════════════════════════════════════════════

    startFreeAgencyPeriod() {
        const { gameState, eventBus, GameEvents, helpers } = this.ctx;
        const P = OffseasonController.PHASES;

        this.setPhase(P.FREE_AGENCY);
        console.log('🤝 Free Agency Period Starting...');
        eventBus.emit(GameEvents.FREE_AGENCY_STARTED, {
            season: gameState.season,
            freeAgentCount: gameState.freeAgents ? gameState.freeAgents.length : 0
        });
        console.log('  Free agents available:', gameState.freeAgents.length);

        helpers.clearMarketValueCache(gameState.freeAgents);

        if (!gameState.freeAgents || gameState.freeAgents.length === 0) {
            console.log('  No free agents available, skipping to roster check');
            this.runAISigningAndContinue();
            return;
        }

        // Fix undefined previousTeamId
        let undefinedCount = 0, validCount = 0;
        gameState.freeAgents.forEach(player => {
            if (player.previousTeamId === undefined) {
                player.previousTeamId = null;
                undefinedCount++;
            } else {
                validCount++;
            }
        });
        console.log(`📊 FA Pool previousTeamId check: ${validCount} with valid IDs, ${undefinedCount} were undefined (set to null)`);

        gameState.userFreeAgencyOffers = [];
        helpers.showFreeAgencyModal();
    }

    runAISigningAndContinue() {
        const { gameState, engines, helpers } = this.ctx;

        try {
            console.log('🤖 Running AI free agent signing...');
            const userTeam = helpers.getUserTeam();
            const allTeams = [...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams];
            const aiTeams = allTeams.filter(t => t.id !== userTeam.id);

            const totalSigned = engines.FreeAgencyEngine.aiSigningPhase(
                { aiTeams, freeAgentPool: gameState.freeAgents },
                { TeamFactory: engines.TeamFactory, getEffectiveCap: helpers.getEffectiveCap, calculateTeamSalary: helpers.calculateTeamSalary }
            );

            console.log(`✅ AI signing phase complete: ${totalSigned} total signings across all teams`);
            console.log(`📋 Free agent pool remaining: ${gameState.freeAgents.length} players`);

            this.checkRosterComplianceAndContinue();
        } catch (err) {
            console.error('❌ Error in runAISigningAndContinue:', err);
            alert('Error during AI signing phase: ' + err.message + '\n\nCheck console for details.');
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Roster Compliance Check
    // ═══════════════════════════════════════════════════════════════════

    checkRosterComplianceAndContinue() {
        const { gameState, helpers } = this.ctx;
        const P = OffseasonController.PHASES;
        this.setPhase(P.ROSTER_COMPLIANCE);
        try {
        const userTeam = helpers.getUserTeam();
        if (!userTeam) { this.showOffseasonManagement(); return; }

        helpers.ensureRosterExists(userTeam);

        const totalSalary = helpers.calculateTeamSalary(userTeam);
        const salaryCap = helpers.getEffectiveCap(userTeam);
        const rosterSize = userTeam.roster.length;
        const isOverCap = totalSalary > salaryCap;
        const isUnderMinimum = rosterSize < 12;
        const isOverMaximum = rosterSize > 15;

        if (isOverCap || isUnderMinimum || isOverMaximum) {
            console.log(`⚠️ Roster compliance issue: overCap=${isOverCap}, underMin=${isUnderMinimum}, overMax=${isOverMaximum}`);

            // Auto-fix by releasing lowest-rated players if over max
            if (isOverMaximum) {
                console.log(`🔧 Auto-fixing: Releasing ${rosterSize - 15} lowest-rated players`);
                const sorted = [...userTeam.roster].sort((a, b) => a.rating - b.rating);
                while (userTeam.roster.length > 15) {
                    const released = sorted.shift();
                    const idx = userTeam.roster.findIndex(p => p.id === released.id);
                    if (idx !== -1) {
                        userTeam.roster.splice(idx, 1);
                        gameState.freeAgents.push(released);
                        console.log(`  Released ${released.name} (${released.rating} OVR)`);
                    }
                }
            }

            // If still non-compliant, show modal
            const stillOverCap = helpers.calculateTeamSalary(userTeam) > helpers.getEffectiveCap(userTeam);
            const stillUnderMin = userTeam.roster.length < 12;
            if (stillOverCap || stillUnderMin) {
                this.showRosterComplianceModal(stillOverCap, stillUnderMin, false,
                    helpers.calculateTeamSalary(userTeam), helpers.getEffectiveCap(userTeam), userTeam.roster.length);
                return;
            }
        }

        // Compliant — show owner mode or continue
        this.showOffseasonManagement();
        } catch (err) {
            console.error('❌ Error in checkRosterComplianceAndContinue:', err);
            alert('Error during roster compliance check: ' + err.message + '\n\nCheck console for details.');
        }
    }

    showRosterComplianceModal(isOverCap, isUnderMinimum, isOverMaximum, totalSalary, salaryCap, rosterSize) {
        const { helpers } = this.ctx;
        document.getElementById('complianceModalContent').innerHTML = UIRenderer.rosterComplianceModal({
            isOverCap, isUnderMinimum, isOverMaximum, totalSalary, salaryCap, rosterSize, formatCurrency: helpers.formatCurrency
        });
        document.getElementById('complianceModal').classList.remove('hidden');
    }

    // ═══════════════════════════════════════════════════════════════════
    // Owner Mode / Offseason Management
    // ═══════════════════════════════════════════════════════════════════

    showOffseasonManagement() {
        const P = OffseasonController.PHASES;
        this.setPhase(P.OWNER_MODE);
        try {
        const { helpers, engines } = this.ctx;
        const userTeam = helpers.getUserTeam();
        engines.FinanceEngine.ensureFinances(userTeam);

        helpers.generateSponsorOffers(userTeam);

        if (!userTeam.finances.ownerMode) {
            helpers.applyAIFinancialDefaults(userTeam);
            this.continueToSeasonSetup();
            return;
        }

        helpers.showOwnerModeModal(userTeam);
        } catch (err) {
            console.error('❌ Error in showOffseasonManagement:', err);
            alert('Error during offseason management: ' + err.message + '\n\nCheck console for details.');
        }
    }

    confirmOffseasonDecisions() {
        const { gameState, helpers, engines } = this.ctx;
        const team = helpers.getUserTeam();
        if (!team || !team.finances) return;

        console.log('═══════════════════════════════════════════════════════');
        console.log('📋 Offseason Financial Decisions Confirmed:');
        console.log(`   Sponsors: ${team.finances.sponsorships.length} active deals`);
        console.log(`   Arena: ${team.finances.arena.capacity} seats, ${team.finances.arena.condition}% condition`);
        console.log(`   Tickets: ${Math.round(team.finances.ticketPriceMultiplier * 100)}% of base`);
        console.log(`   Marketing: ${helpers.formatCurrency(team.finances.marketingBudget)}/season`);
        if (team.tier !== 1) {
            console.log(`   Spending Ratio: ${Math.round(team.finances.spendingRatio * 100)}%`);
        }
        console.log(`   Spending Limit: ${helpers.formatCurrency(engines.FinanceEngine.getSpendingLimit(team))}`);
        console.log('═══════════════════════════════════════════════════════');

        document.getElementById('financeDashboardModal').classList.add('hidden');

        helpers.saveGameState();
        this.continueToSeasonSetup();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Step 5: Continue to Season Setup (final step)
    // ═══════════════════════════════════════════════════════════════════

    continueToSeasonSetup() {
        const { gameState, eventBus, GameEvents, engines, helpers } = this.ctx;
        const P = OffseasonController.PHASES;

        console.log('🏁 Step 5: Final season setup...');
        this.setPhase(P.SETUP_COMPLETE);
        eventBus.emit(GameEvents.OFFSEASON_COMPLETED, { season: gameState.season });

        this.playerDevelopmentInProgress = false;
        gameState.currentGame = 0;
        gameState.viewingTier = null;

        // Increment season
        gameState.currentSeason++;
        gameState.seasonStartYear = gameState.currentSeason;
        gameState.seasonDates = null;
        gameState._allStarCompleted = false;
        gameState._allStarResults = null;
        console.log(`📅 Season incremented to: ${gameState.currentSeason}`);

        // Calendar dates
        const seasonDates = engines.CalendarEngine.getSeasonDates(gameState.seasonStartYear);
        gameState.currentDate = engines.CalendarEngine.toDateString(seasonDates.t1Start);

        // Advance coaches
        console.log('🎓 Advancing coaches...');
        [...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams].forEach(team => {
            if (team.coach) {
                const status = engines.CoachEngine.advanceCoachSeason(team.coach);
                if (status === 'retired') {
                    console.log(`🎓 ${team.coach.name} retired from ${team.name}`);
                    team.coach = engines.CoachEngine.generateCoach(team.tier);
                    team.coach.teamId = team.id;
                } else if (team.coach.contractYears <= 0) {
                    if (team.id !== gameState.userTeamId) {
                        if (Math.random() < 0.6) {
                            team.coach.contractYears = engines.CoachEngine._generateContractLength(team.coach.overall, team.coach.age);
                        } else {
                            team.coach = engines.CoachEngine.generateCoach(team.tier);
                            team.coach.teamId = team.id;
                        }
                    }
                }
            }
        });
        this.coachMarketPool = [];

        // Reset teams for new season
        const resetTier = (teams, ratingMin, ratingMax) => {
            teams.forEach(team => {
                team.wins = 0;
                team.losses = 0;
                team.pointDiff = 0;
                team.rating = Math.max(ratingMin, Math.min(ratingMax, team.rating + (Math.random() - 0.5) * 5));
                if (team.roster) {
                    team.roster.forEach(player => {
                        player.gamesPlayed = 0;
                        engines.StatEngine.archiveSeasonStats(player);
                        engines.StatEngine.initializeSeasonStats(player);
                    });
                }
            });
        };

        resetTier(gameState.tier1Teams, 70, 100);
        resetTier(gameState.tier2Teams, 65, 95);
        resetTier(gameState.tier3Teams, 55, 85);

        // Generate schedules
        const calSeasonDates = engines.CalendarEngine.getSeasonDates(gameState.seasonStartYear);
        const t1Start = engines.CalendarEngine.toDateString(calSeasonDates.t1Start);
        const t2Start = engines.CalendarEngine.toDateString(calSeasonDates.t2Start);
        const t3Start = engines.CalendarEngine.toDateString(calSeasonDates.t3Start);
        const seasonEnd = engines.CalendarEngine.toDateString(calSeasonDates.seasonEnd);

        console.log('📅 Generating calendar schedules for new season...');
        gameState.tier1Schedule = engines.CalendarEngine.generateCalendarSchedule(gameState.tier1Teams, 82, t1Start, seasonEnd, calSeasonDates);
        gameState.tier2Schedule = engines.CalendarEngine.generateCalendarSchedule(gameState.tier2Teams, 60, t2Start, seasonEnd, calSeasonDates);
        gameState.tier3Schedule = engines.CalendarEngine.generateCalendarSchedule(gameState.tier3Teams, 40, t3Start, seasonEnd, calSeasonDates);

        if (gameState.currentTier === 1) gameState.schedule = gameState.tier1Schedule;
        else if (gameState.currentTier === 2) gameState.schedule = gameState.tier2Schedule;
        else gameState.schedule = gameState.tier3Schedule;

        helpers.saveGameState();

        document.getElementById('simNextBtn').disabled = false;
        document.getElementById('simDayBtn').disabled = false;
        document.getElementById('simWeekBtn').disabled = false;
        document.getElementById('finishBtn').disabled = false;

        console.log('✅ Step 5 complete: New season ready!');
        console.log('Current game:', gameState.currentGame);
        console.log('Season:', gameState.currentSeason);
        console.log('User tier:', gameState.currentTier);

        eventBus.emit(GameEvents.SEASON_STARTED, {
            season: gameState.currentSeason,
            userTeamId: gameState.userTeamId,
            userTier: gameState.currentTier
        });

        // Clear offseason phase — we're back in regular season
        gameState.offseasonPhase = OffseasonController.PHASES.NONE;

        helpers.updateUI();
    }
}
