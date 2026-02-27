// ═══════════════════════════════════════════════════════════════════
// GMMode — GM Mode game loop, simulation controls, and event routing
// ═══════════════════════════════════════════════════════════════════
// Extracted in Phase 3B. Manages:
//   • Game simulation controls (next game, day, week, finish season)
//   • Observer pattern for game/playoff events
//   • Button binding for simulation UI
//   • Calendar-driven simulation with All-Star break detection
//   • Injury/fatigue/trade proposal checks between games
//
// Dependencies passed via constructor deps object:
//   updateUI, updateStandings, updateNextGames, showSeasonEnd,
//   openRosterManagement, openTradeScreen, saveGameState,
//   checkForAiTradeProposals, checkForInjuries, updateInjuries,
//   processFatigueAfterGame, formatCurrency, getUserTeam,
//   runAllStarWeekend, simulateOtherTiersProportionally,
//   eventBus, GameEvents, CalendarEngine, GameEngine
// ═══════════════════════════════════════════════════════════════════

export class GMMode {
    constructor(gameState, simulationController, deps = {}) {
        this.gameState = gameState;
        this.sim = simulationController;
        this.deps = deps;
        this.setupObservers();
        this.bindEventHandlers();
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    /**
     * Setup observers to listen for simulation events
     */
    setupObservers() {
        this.sim.addObserver((event, data) => {
            switch(event) {
                case 'gameComplete':
                    this.onGameComplete(data);
                    break;
                case 'playoffGameComplete':
                    this.onPlayoffGameComplete(data);
                    break;
                case 'playoffSeriesComplete':
                    this.onPlayoffSeriesComplete(data);
                    break;
            }
        });
    }
    
    /**
     * Bind UI event handlers
     */
    bindEventHandlers() {
        // Main simulation controls
        const simNextBtn = document.getElementById('simNextBtn');
        if (simNextBtn) simNextBtn.onclick = () => this.simulateNextGame();
        
        const simDayBtn = document.getElementById('simDayBtn');
        if (simDayBtn) simDayBtn.onclick = () => this.simulateDay();
        
        const simWeekBtn = document.getElementById('simWeekBtn');
        if (simWeekBtn) simWeekBtn.onclick = () => this.simulateWeek();
        
        const finishBtn = document.getElementById('finishBtn');
        if (finishBtn) finishBtn.onclick = () => this.finishSeason();
        
        // Team management
        const rosterBtn = document.getElementById('rosterBtn');
        if (rosterBtn) rosterBtn.onclick = () => this.deps.openRosterManagement();
        
        const tradeBtn = document.getElementById('tradeBtn');
        if (tradeBtn) tradeBtn.onclick = () => this.deps.openTradeScreen();
        
        // Save/Load
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) saveBtn.onclick = () => this.saveGame();
        
        const loadBtn = document.getElementById('loadBtn');
        if (loadBtn) loadBtn.onclick = () => this.loadGame();
        
        console.log('✅ GMMode event handlers bound');
    }
    
    // ============================================
    // SIMULATION CONTROLS
    // ============================================
    
    /**
     * Simulate the user team's next game — advances calendar to that date
     * and simulates ALL games on that date across all tiers
     */
    simulateNextGame() {
        const currentDate = this.gameState.currentDate;
        if (!currentDate) {
            console.error('No current date set!');
            return;
        }
        
        // Check if All-Star break would be crossed
        const seasonDates = this.gameState.seasonDates;
        const allStarStart = this.deps.CalendarEngine.toDateString(seasonDates.allStarStart);
        if (!this.gameState._allStarCompleted && currentDate <= allStarStart) {
            const nextUserDate = this.deps.CalendarEngine.getNextUserGameDate(currentDate, this.gameState);
            if (nextUserDate && nextUserDate > allStarStart) {
                // Catch up to All-Star break first
                let simDate = this.deps.CalendarEngine.addDays(currentDate, 1);
                while (simDate < allStarStart) {
                    this._simulateAllGamesOnDate(simDate, true);
                    simDate = this.deps.CalendarEngine.addDays(simDate, 1);
                }
                this.gameState.currentDate = allStarStart;
                this.deps.saveGameState();
                this.deps.updateUI();
                this.deps.runAllStarWeekend();
                // Advance past break
                const allStarEnd = this.deps.CalendarEngine.toDateString(seasonDates.allStarEnd);
                this.gameState.currentDate = this.deps.CalendarEngine.addDays(allStarEnd, 1);
                this.deps.saveGameState();
                this.deps.updateUI();
                return;
            }
        }
        
        // Find the next date the user team plays
        const nextUserDate = this.deps.CalendarEngine.getNextUserGameDate(currentDate, this.gameState);
        
        if (!nextUserDate) {
            // No more user games — season might be complete
            if (this.gameState.isSeasonComplete()) {
                this.deps.showSeasonEnd();
            } else {
                const nextAnyDate = this.deps.CalendarEngine.getNextGameDate(currentDate, this.gameState);
                if (nextAnyDate) {
                    this.gameState.currentDate = nextAnyDate;
                    this._simulateAllGamesOnDate(nextAnyDate);
                } else {
                    this.deps.showSeasonEnd();
                }
            }
            return;
        }
        
        // Simulate all dates between current and user's next game date
        let simDate = this.deps.CalendarEngine.addDays(currentDate, 1);
        while (simDate < nextUserDate) {
            this._simulateAllGamesOnDate(simDate, true);
            simDate = this.deps.CalendarEngine.addDays(simDate, 1);
        }
        
        // Now simulate the user's game date
        this.gameState.currentDate = nextUserDate;
        this._simulateAllGamesOnDate(nextUserDate, false);
        
        // Show post-game summary for user's game
        this._showPostGameIfUserPlayed(nextUserDate);
        
        this.deps.saveGameState();
        this.deps.updateUI();
        
        if (this.gameState.isSeasonComplete()) {
            this.deps.showSeasonEnd();
        }
    }
    
    /**
     * Simulate all games on the current date, then advance to next day
     */
    simulateDay() {
        const currentDate = this.gameState.currentDate;
        if (!currentDate) return;
        
        this.deps.eventBus.emit(this.deps.GameEvents.SEASON_DAY_SIMULATED, {
            date: currentDate,
            season: this.gameState.season
        });
        
        // Check for All-Star Weekend trigger
        const seasonDates = this.gameState.seasonDates;
        const allStarStart = this.deps.CalendarEngine.toDateString(seasonDates.allStarStart);
        if (currentDate === allStarStart && !this.gameState._allStarCompleted) {
            // Trigger All-Star Weekend event
            this.deps.runAllStarWeekend();
            // Advance past the break
            const allStarEnd = this.deps.CalendarEngine.toDateString(seasonDates.allStarEnd);
            this.gameState.currentDate = this.deps.CalendarEngine.addDays(allStarEnd, 1);
            this.deps.saveGameState();
            this.deps.updateUI();
            return;
        }
        
        // Get games for today
        const todaysGames = this.deps.CalendarEngine.getGamesForDate(currentDate, this.gameState);
        const unplayedToday = todaysGames.tier1.filter(g => !g.played).length +
                             todaysGames.tier2.filter(g => !g.played).length +
                             todaysGames.tier3.filter(g => !g.played).length;
        
        if (unplayedToday > 0) {
            // Simulate today's games
            this._simulateAllGamesOnDate(currentDate, false);
            this._showPostGameIfUserPlayed(currentDate);
            this.deps.saveGameState();
            this.deps.updateUI();
        } else {
            // No games today — check for calendar event or just show off day
            const calEvent = this.deps.CalendarEngine.getCalendarEvent(currentDate, seasonDates);
            
            // Advance to next day
            const nextDate = this.deps.CalendarEngine.addDays(currentDate, 1);
            const seasonEnd = this.deps.CalendarEngine.toDateString(seasonDates.seasonEnd);
            
            if (nextDate > seasonEnd && this.gameState.isSeasonComplete()) {
                this.deps.showSeasonEnd();
                return;
            }
            
            this.gameState.currentDate = nextDate;
            this.deps.saveGameState();
            this.deps.updateUI();
            
            // Show appropriate message
            if (calEvent) {
                this._showDayMessage(calEvent, currentDate);
            } else {
                this._showDayMessage('📭 No games today', currentDate);
            }
        }
        
        if (this.gameState.isSeasonComplete()) {
            this.deps.showSeasonEnd();
        }
    }
    
    /**
     * Simulate a full week (7 calendar days)
     */
    simulateWeek() {
        const startDate = this.gameState.currentDate;
        if (!startDate) return;
        
        // Check if All-Star break falls within this week
        const seasonDates = this.gameState.seasonDates;
        const allStarStart = this.deps.CalendarEngine.toDateString(seasonDates.allStarStart);
        const endDate = this.deps.CalendarEngine.addDays(startDate, 7);
        
        if (!this.gameState._allStarCompleted && startDate <= allStarStart && endDate > allStarStart) {
            // Simulate up to All-Star break, then trigger it
            let simDate = startDate;
            while (simDate < allStarStart) {
                const games = this.deps.CalendarEngine.getGamesForDate(simDate, this.gameState);
                const unplayed = games.tier1.filter(g => !g.played).length +
                               games.tier2.filter(g => !g.played).length +
                               games.tier3.filter(g => !g.played).length;
                if (unplayed > 0) this._simulateAllGamesOnDate(simDate, true);
                simDate = this.deps.CalendarEngine.addDays(simDate, 1);
            }
            this.gameState.currentDate = allStarStart;
            this.deps.saveGameState();
            this.deps.updateUI();
            this.deps.runAllStarWeekend();
            // Advance past break
            const allStarEnd = this.deps.CalendarEngine.toDateString(seasonDates.allStarEnd);
            this.gameState.currentDate = this.deps.CalendarEngine.addDays(allStarEnd, 1);
            this.deps.saveGameState();
            this.deps.updateUI();
            return;
        }
        
        let simDate = startDate;
        
        while (simDate < endDate) {
            if (this.gameState.isSeasonComplete()) {
                this.deps.showSeasonEnd();
                break;
            }
            
            const games = this.deps.CalendarEngine.getGamesForDate(simDate, this.gameState);
            const unplayed = games.tier1.filter(g => !g.played).length +
                           games.tier2.filter(g => !g.played).length +
                           games.tier3.filter(g => !g.played).length;
            
            if (unplayed > 0) {
                this._simulateAllGamesOnDate(simDate, true); // silent for batch
            }
            
            simDate = this.deps.CalendarEngine.addDays(simDate, 1);
        }
        
        this.gameState.currentDate = endDate;
        this.deps.saveGameState();
        this.deps.updateUI();
        
        if (this.gameState.isSeasonComplete()) {
            this.deps.showSeasonEnd();
        }
    }
    
    /**
     * Show a brief day message (off day, calendar event, etc.)
     */
    _showDayMessage(message, dateStr) {
        const displayDate = this.deps.CalendarEngine.formatDateDisplay(dateStr);
        // Use a simple alert-style notification (can be upgraded to a toast later)
        const container = document.getElementById('nextGamesContainer');
        if (container) {
            const msgHtml = `
                <div style="text-align: center; padding: 20px; background: rgba(255,255,255,0.05); 
                            border-radius: 8px; margin-bottom: 10px; border: 1px solid rgba(255,255,255,0.15);">
                    <div style="font-size: 1.3em; margin-bottom: 5px;">${message}</div>
                    <div style="opacity: 0.7; font-size: 0.9em;">${displayDate}</div>
                </div>
            `;
            container.innerHTML = msgHtml + container.innerHTML;
        }
    }
    
    /**
     * Core: Simulate ALL games on a specific date across all tiers
     * @param {string} dateStr - YYYY-MM-DD
     * @param {boolean} silent - If true, skip injury modals (for batch sims)
     */
    _simulateAllGamesOnDate(dateStr, silent = false) {
        const todaysGames = this.deps.CalendarEngine.getGamesForDate(dateStr, this.gameState);
        const userTeam = this.deps.getUserTeam();
        const userTeamId = userTeam ? userTeam.id : null;
        let userTeamPlayedToday = false;
        
        // Helper to sim a list of games for a tier
        const simTierGames = (games, teams, isSilent) => {
            for (const game of games) {
                if (game.played) continue;
                
                const homeTeam = teams.find(t => t.id === game.homeTeamId);
                const awayTeam = teams.find(t => t.id === game.awayTeamId);
                
                if (!homeTeam || !awayTeam) {
                    console.warn(`Teams not found for game on ${dateStr}:`, game);
                    game.played = true;
                    continue;
                }
                
                // Check if this is a user team game
                const isUserGame = (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId);
                if (isUserGame) userTeamPlayedToday = true;
                
                // Apply fatigue auto-rest
                this.deps.applyFatigueAutoRest(homeTeam, false);
                this.deps.applyFatigueAutoRest(awayTeam, false);
                
                // Simulate
                const gameResult = this.sim.simulateFullGame(homeTeam, awayTeam);
                game.played = true;
                game.homeScore = gameResult.homeScore;
                game.awayScore = gameResult.awayScore;
                game.winnerId = gameResult.winner.id;
                
                // Store detailed box score for user team games only (storage efficient)
                if (isUserGame && gameResult.homePlayerStats && gameResult.awayPlayerStats) {
                    game.boxScore = {
                        home: {
                            teamId: homeTeam.id,
                            teamName: homeTeam.name,
                            city: homeTeam.city || '',
                            score: gameResult.homeScore,
                            players: gameResult.homePlayerStats
                                .filter(p => p.minutesPlayed > 0)
                                .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                                .map(p => ({
                                    name: p.playerName, pos: p.position, 
                                    min: p.minutesPlayed, pts: p.points, 
                                    reb: p.rebounds, ast: p.assists, 
                                    stl: p.steals, blk: p.blocks,
                                    to: p.turnovers, pf: p.fouls,
                                    fgm: p.fieldGoalsMade, fga: p.fieldGoalsAttempted,
                                    tpm: p.threePointersMade, tpa: p.threePointersAttempted,
                                    ftm: p.freeThrowsMade, fta: p.freeThrowsAttempted,
                                    starter: p.gamesStarted > 0
                                }))
                        },
                        away: {
                            teamId: awayTeam.id,
                            teamName: awayTeam.name,
                            city: awayTeam.city || '',
                            score: gameResult.awayScore,
                            players: gameResult.awayPlayerStats
                                .filter(p => p.minutesPlayed > 0)
                                .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                                .map(p => ({
                                    name: p.playerName, pos: p.position, 
                                    min: p.minutesPlayed, pts: p.points, 
                                    reb: p.rebounds, ast: p.assists, 
                                    stl: p.steals, blk: p.blocks,
                                    to: p.turnovers, pf: p.fouls,
                                    fgm: p.fieldGoalsMade, fga: p.fieldGoalsAttempted,
                                    tpm: p.threePointersMade, tpa: p.threePointersAttempted,
                                    ftm: p.freeThrowsMade, fta: p.freeThrowsAttempted,
                                    starter: p.gamesStarted > 0
                                }))
                        }
                    };
                }
                
                // Emit game completed event
                this.deps.eventBus.emit(this.deps.GameEvents.SEASON_GAME_COMPLETED, {
                    date: dateStr,
                    homeTeamId: homeTeam.id,
                    awayTeamId: awayTeam.id,
                    homeScore: gameResult.homeScore,
                    awayScore: gameResult.awayScore,
                    isUserGame: isUserGame,
                    homeWins: homeTeam.wins,
                    homeLosses: homeTeam.losses,
                    awayWins: awayTeam.wins,
                    awayLosses: awayTeam.losses
                });
                
                // Process fatigue
                this.deps.processFatigueAfterGame(homeTeam, awayTeam, false);
                
                // Update injuries
                this.deps.updateInjuries(homeTeam);
                this.deps.updateInjuries(awayTeam);
                
                // Check injuries
                if (!isSilent && isUserGame) {
                    const userGamesPlayed = userTeam ? (userTeam.wins + userTeam.losses) : 0;
                    const injuries = this.deps.checkForInjuries(homeTeam, awayTeam, userGamesPlayed, false);
                    
                    const userTeamInjuries = injuries.filter(inj => inj.team.id === userTeamId);
                    const aiTeamInjuries = injuries.filter(inj => inj.team.id !== userTeamId);
                    
                    aiTeamInjuries.forEach(({team, player, injury}) => {
                        const aiDecision = injury.canPlayThrough && Math.random() < 0.3 ? 'playThrough' : 'rest';
                        this.deps.applyInjury(player, injury, aiDecision);
                    });
                    
                    if (userTeamInjuries.length > 0) {
                        this.gameState.pendingInjuries = userTeamInjuries;
                        this.deps.saveGameState();
                        this.deps.updateUI();
                        this.deps.showNextInjuryModal();
                        return; // Pause for injury decision
                    }
                } else {
                    // Silent mode or AI game — auto-handle injuries
                    const userGamesPlayed = userTeam ? (userTeam.wins + userTeam.losses) : 0;
                    const injuries = this.deps.checkForInjuries(homeTeam, awayTeam, userGamesPlayed, false);
                    injuries.forEach(({team, player, injury}) => {
                        const aiDecision = injury.canPlayThrough && Math.random() < 0.3 ? 'playThrough' : 'rest';
                        this.deps.applyInjury(player, injury, aiDecision);
                    });
                }
            }
        };
        
        // Simulate each tier's games for today
        simTierGames(todaysGames.tier1, this.gameState.tier1Teams, silent || !todaysGames.tier1.some(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId));
        simTierGames(todaysGames.tier2, this.gameState.tier2Teams, silent || !todaysGames.tier2.some(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId));
        simTierGames(todaysGames.tier3, this.gameState.tier3Teams, silent || !todaysGames.tier3.some(g => g.homeTeamId === userTeamId || g.awayTeamId === userTeamId));
        
        // Check for AI trade proposals (once per day the user team plays)
        if (userTeamPlayedToday && !silent) {
            this.deps.checkForAiTradeProposals();
        }
    }
    
    /**
     * Show post-game summary popup if the user's team played on this date
     */
    _showPostGameIfUserPlayed(dateStr) {
        const userTeam = this.deps.getUserTeam();
        if (!userTeam) return;
        
        const todaysGames = this.deps.CalendarEngine.getGamesForDate(dateStr, this.gameState);
        const allGames = [...(todaysGames.tier1 || []), ...(todaysGames.tier2 || []), ...(todaysGames.tier3 || [])];
        
        const userGame = allGames.find(g => 
            g.played && (g.homeTeamId === userTeam.id || g.awayTeamId === userTeam.id) && g.boxScore
        );
        
        if (!userGame) return;
        
        const isHome = userGame.homeTeamId === userTeam.id;
        const userWon = userGame.winnerId === userTeam.id;
        const userBox = isHome ? userGame.boxScore.home : userGame.boxScore.away;
        const oppBox = isHome ? userGame.boxScore.away : userGame.boxScore.home;
        
        // Find top performer on user team
        const topPlayer = userBox.players.length > 0 
            ? userBox.players.reduce((best, p) => p.pts > best.pts ? p : best, userBox.players[0])
            : null;
        
        const html = UIRenderer.postGameSummary({
            userTeam: userBox,
            opponent: oppBox,
            isHome,
            userWon,
            topPlayer,
            date: dateStr,
            userRecord: { wins: userTeam.wins, losses: userTeam.losses }
        });
        
        document.getElementById('postGameContent').innerHTML = html;
        document.getElementById('postGameModal').classList.remove('hidden');
    }
    
    /**
     * Finish the rest of the season
     */
    finishSeason() {
        // If we're in the offseason, resume from current phase instead of simulating
        if (this.gameState.offseasonPhase && this.gameState.offseasonPhase !== 'none') {
            console.log('📅 Finish Season clicked during offseason — resuming offseason flow');
            this.deps.resumeOffseason();
            return;
        }
        
        // If All-Star hasn't happened yet, run it silently
        if (!this.gameState._allStarCompleted) {
            const seasonDates = this.gameState.seasonDates;
            const allStarStart = this.deps.CalendarEngine.toDateString(seasonDates.allStarStart);
            if (this.gameState.currentDate <= allStarStart) {
                console.log('⭐ Running All-Star selection silently for Finish Season...');
                const tierConfigs = [
                    { teams: this.gameState.tier1Teams, tier: 1, label: 'Tier 1', minPct: 0.4 },
                    { teams: this.gameState.tier2Teams, tier: 2, label: 'Tier 2', minPct: 0.35 },
                    { teams: this.gameState.tier3Teams, tier: 3, label: 'Tier 3', minPct: 0.3 }
                ];
                const results = [];
                for (const config of tierConfigs) {
                    const gamesPerTeam = config.tier === 1 ? 82 : config.tier === 2 ? 60 : 40;
                    const minGames = Math.floor(gamesPerTeam * config.minPct);
                    const confMap = this.deps.buildConferenceMap(config.teams, config.tier);
                    const selections = StatEngine.selectAllStars(config.teams, minGames, confMap);
                    const gameResult = StatEngine.simulateAllStarGame(selections.east, selections.west, config.label);
                    results.push({ ...config, selections, gameResult });
                }
                this.gameState._allStarCompleted = true;
                this.gameState._allStarResults = results;
            }
        }
        this.finishSeasonBatch();
    }
    
    /**
     * Finish season in batches to prevent freezing
     */
    finishSeasonBatch() {
        const batchSize = 50;
        let gamesSimulated = 0;
        
        console.log('🎯 GMMode.finishSeasonBatch() - calendar-aware batch sim');
        
        // Early exit if already complete
        if (this.gameState.isSeasonComplete()) {
            console.log('✅ Season already complete — showing end screen');
            this.deps.saveGameState();
            this.deps.updateUI();
            this.deps.showSeasonEnd();
            return;
        }
        
        let safetyCounter = 0;
        const maxDays = 250;
        
        while (!this.gameState.isSeasonComplete() && safetyCounter < maxDays) {
            safetyCounter++;
            const currentDate = this.gameState.currentDate;
            
            const todaysGames = this.deps.CalendarEngine.getGamesForDate(currentDate, this.gameState);
            const unplayed = todaysGames.tier1.filter(g => !g.played).length +
                           todaysGames.tier2.filter(g => !g.played).length +
                           todaysGames.tier3.filter(g => !g.played).length;
            
            if (unplayed > 0) {
                this._simulateAllGamesOnDate(currentDate, true);
                gamesSimulated += unplayed;
            }
            
            // Advance to next day
            this.gameState.currentDate = this.deps.CalendarEngine.addDays(currentDate, 1);
            
            // Break for UI update every batch
            if (gamesSimulated >= batchSize) {
                this.deps.saveGameState();
                this.deps.updateUI();
                
                if (this.gameState.isSeasonComplete()) {
                    this.deps.showSeasonEnd();
                } else {
                    setTimeout(() => this.finishSeasonBatch(), 10);
                }
                return;
            }
        }
        
        // If we exhausted the date range but games remain, sim them directly
        // This catches orphaned games whose dates were skipped
        if (!this.gameState.isSeasonComplete()) {
            console.log('🔧 Cleaning up orphaned unplayed games...');
            const tierConfigs = [
                { schedule: this.gameState._tier1Schedule, teams: this.gameState.tier1Teams, tier: 1 },
                { schedule: this.gameState._tier2Schedule, teams: this.gameState.tier2Teams, tier: 2 },
                { schedule: this.gameState._tier3Schedule, teams: this.gameState.tier3Teams, tier: 3 }
            ];
            for (const { schedule, teams, tier } of tierConfigs) {
                if (!schedule || !teams) continue;
                const unplayed = schedule.filter(g => !g.played);
                if (unplayed.length > 0) {
                    console.log(`  Tier ${tier}: ${unplayed.length} orphaned games`);
                }
                for (const game of unplayed) {
                    const home = teams.find(t => t.id === game.homeTeamId);
                    const away = teams.find(t => t.id === game.awayTeamId);
                    if (!home || !away) { game.played = true; continue; }
                    
                    const result = this.sim.simulateFullGame(home, away);
                    game.played = true;
                    game.homeScore = result.homeScore;
                    game.awayScore = result.awayScore;
                    game.winnerId = result.winner.id;
                    this.deps.processFatigueAfterGame(home, away, false);
                    this.deps.updateInjuries(home);
                    this.deps.updateInjuries(away);
                    const userGamesPlayed = this.deps.getUserTeam() ? (this.deps.getUserTeam().wins + this.deps.getUserTeam().losses) : 0;
                    const injuries = this.deps.checkForInjuries(home, away, userGamesPlayed, false);
                    injuries.forEach(({team, player, injury}) => {
                        const aiDecision = injury.canPlayThrough && Math.random() < 0.3 ? 'playThrough' : 'rest';
                        this.deps.applyInjury(player, injury, aiDecision);
                    });
                }
            }
        }
        
        // Final save and season end
        this.deps.saveGameState();
        this.deps.updateUI();
        
        console.log(`finishSeasonBatch done: ${gamesSimulated} games, seasonComplete=${this.gameState.isSeasonComplete()}, safety=${safetyCounter}`);
        
        if (this.gameState.isSeasonComplete()) {
            this.deps.showSeasonEnd();
        }
    }
    
    /**
     * Simulate games in other tiers proportionally
     * NOTE: With calendar system, this is handled by _simulateAllGamesOnDate()
     * Kept as no-op for backward compatibility
     */
    simulateOtherTiersProportionally() {
        // No-op: calendar system simulates all tiers on each date automatically
    }
    
    // ============================================
    // OBSERVER CALLBACKS
    // ============================================
    
    /**
     * Called when a game completes
     */
    onGameComplete(gameResult) {
        // Could add notifications, stats tracking, etc.
        // For now, just log
        // console.log(`Game: ${gameResult.homeTeam.name} ${gameResult.homeScore} - ${gameResult.awayScore} ${gameResult.awayTeam.name}`);
    }
    
    /**
     * Called when a playoff game completes
     */
    onPlayoffGameComplete(gameResult) {
        // console.log(`Playoff: ${gameResult.winner.name} wins`);
    }
    
    /**
     * Called when a playoff series completes
     */
    onPlayoffSeriesComplete(seriesResult) {
        console.log(`Series: ${seriesResult.winner.name} defeats ${seriesResult.loser.name} ${seriesResult.seriesScore}`);
    }
    
    // ============================================
    // UI UPDATES
    // ============================================
    
    /**
     * Update all UI elements
     */
    updateUI() {
        this.updateInfoBar();
        this.deps.updateStandings();
        this.updateControls();
        
        // The standalone this.deps.updateUI() handles date, schedule, budget, etc.
        // but we can't call it by name since this method shadows it.
        // Instead, call those updates directly:
        
        // Update date display
        const dateDisplay = document.getElementById('currentDateDisplay');
        if (dateDisplay && this.gameState.currentDate) {
            dateDisplay.textContent = this.deps.CalendarEngine.formatDateDisplay(this.gameState.currentDate);
        }
        
        // Update calendar event
        const calEventEl = document.getElementById('calendarEvent');
        if (calEventEl && this.gameState.currentDate) {
            const seasonDates = this.gameState.seasonDates || this.deps.CalendarEngine.getSeasonDates(this.gameState.seasonStartYear);
            const calEvent = this.deps.CalendarEngine.getCalendarEvent(this.gameState.currentDate, seasonDates);
            if (calEvent) {
                calEventEl.textContent = calEvent;
                calEventEl.style.display = 'block';
            } else {
                calEventEl.style.display = 'none';
            }
        }
        
        // Update budget display
        const userTeam = this.deps.getUserTeam();
        if (userTeam) {
            const budgetDisplay = document.getElementById('budgetDisplay');
            const budgetSubDisplay = document.getElementById('budgetSubDisplay');
            if (budgetDisplay) {
                if (typeof FinanceEngine !== 'undefined') FinanceEngine.ensureFinances(userTeam);
                const capSpace = typeof getRemainingCap === 'function' ? getRemainingCap(userTeam) : 0;
                const spLimit = typeof getEffectiveCap === 'function' ? getEffectiveCap(userTeam) : 0;
                budgetDisplay.textContent = this.deps.formatCurrency(capSpace);
                budgetDisplay.style.color = capSpace > 0 ? '#34a853' : '#ea4335';
                if (budgetSubDisplay) budgetSubDisplay.textContent = `of ${this.deps.formatCurrency(spLimit)} ${userTeam.tier === 1 ? 'cap' : 'limit'}`;
            }
        }
        
        // Update upcoming schedule and next games
        if (this.deps.updateNextGames) this.deps.updateNextGames();
    }
    
    /**
     * Update info bar
     */
    updateInfoBar() {
        const userTeam = this.deps.getUserTeam();
        if (!userTeam) return;
        
        const season = `${this.gameState.currentSeason}-${(this.gameState.currentSeason + 1) % 100}`;
        
        // Use correct DOM element IDs from the HTML
        const seasonEl = document.getElementById('currentSeason');
        const teamEl = document.getElementById('userTeamName');
        const recordEl = document.getElementById('userRecord');
        const currentGameEl = document.getElementById('currentGame');
        const totalGamesEl = document.getElementById('totalGames');
        const rosterStrengthEl = document.getElementById('rosterStrength');
        
        // Safely update elements (check they exist first)
        if (seasonEl) seasonEl.textContent = season;
        if (teamEl) teamEl.textContent = userTeam.name;
        if (recordEl) recordEl.textContent = `${userTeam.wins}-${userTeam.losses}`;
        if (currentGameEl) currentGameEl.textContent = userTeam.wins + userTeam.losses;
        if (totalGamesEl) totalGamesEl.textContent = this.gameState.getTotalGamesInSeason();
        
        // Calculate and display roster strength
        if (rosterStrengthEl) {
            const strength = this.deps.GameEngine.calculateTeamStrength(userTeam);
            rosterStrengthEl.textContent = Math.round(strength);
        }
    }
    
    /**
     * Update standings table
     */
    updateStandings() {
        const teams = this.gameState.getCurrentTeams();
        const sortedTeams = [...teams].sort((a, b) => {
            if (b.wins !== a.wins) return b.wins - a.wins;
            return b.pointDiff - a.pointDiff;
        });
        
        const tbody = document.getElementById('standingsBody');
        if (!tbody) return;
        
        const userTeam = this.deps.getUserTeam();
        
        tbody.innerHTML = sortedTeams.map((team, index) => {
            const isUserTeam = team.id === userTeam?.id;
            return `
                <tr style="${isUserTeam ? 'background: rgba(52, 168, 83, 0.2); font-weight: bold;' : ''}">
                    <td>${index + 1}</td>
                    <td>${team.name}</td>
                    <td>${team.division}</td>
                    <td>${team.wins}</td>
                    <td>${team.losses}</td>
                    <td>${team.pointDiff > 0 ? '+' : ''}${team.pointDiff}</td>
                </tr>
            `;
        }).join('');
    }
    
    /**
     * Update control buttons state
     */
    updateControls() {
        const seasonComplete = this.gameState.isSeasonComplete();
        const inOffseason = this.gameState.offseasonPhase && this.gameState.offseasonPhase !== 'none';
        
        const simNextBtn = document.getElementById('simNextBtn');
        const simDayBtn = document.getElementById('simDayBtn');
        const simWeekBtn = document.getElementById('simWeekBtn');
        const finishBtn = document.getElementById('finishBtn');
        
        if (simNextBtn) simNextBtn.disabled = seasonComplete;
        if (simDayBtn) simDayBtn.disabled = seasonComplete;
        if (simWeekBtn) simWeekBtn.disabled = seasonComplete;
        // Finish Season stays enabled during offseason — routes to resumeOffseason()
        if (finishBtn) {
            finishBtn.disabled = seasonComplete && !inOffseason;
            finishBtn.textContent = inOffseason ? '📋 Continue Offseason' : '⏭️ Finish Season';
        }
        const watchBtn = document.getElementById('watchNextBtn');
        if (watchBtn) watchBtn.disabled = seasonComplete;
    }
    
    /**
     * Show season end modal
     */
    showSeasonEnd() {
        if (this.deps.showSeasonEnd) {
            this.deps.showSeasonEnd();
        } else {
            console.error('showSeasonEnd function not found!');
        }
    }
    
    // ============================================
    // TEAM MANAGEMENT
    // ============================================
    
    /**
     * Open roster management screen
     */
    openRosterManagement() {
        // Calls Hub function to set proper context
        if (this.deps.openRosterManagementHub) {
            this.deps.openRosterManagementHub();
        } else if (this.deps.openRosterManagement) {
            // Fallback for backward compatibility
            this.deps.openRosterManagement();
        }
    }
    
    /**
     * Open trade screen
     */
    openTradeScreen() {
        // Calls existing function (backward compatibility)
        if (this.deps.openTradeScreen) {
            this.deps.openTradeScreen();
        }
    }
    
    /**
     * Check for AI trade proposals
     */
    checkForAiTradeProposals() {
        // Calls existing function (backward compatibility)
        if (this.deps.checkForAiTradeProposals) {
            this.deps.checkForAiTradeProposals();
        }
    }
    
    // ============================================
    // SAVE / LOAD
    // ============================================
    
    /**
     * Save game state
     */
    saveGameState() {
        StorageEngine.save(this.gameState).catch(err => {
            console.error('Save failed:', err.message);
        });
    }
    
    /**
     * Save game with UI feedback
     */
    saveGame() {
        this.deps.saveGameState();
        
        // Show notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(52, 168, 83, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 1.1em;
            z-index: 10000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        `;
        notification.textContent = '✅ Game Saved!';
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 2000);
    }
    
    /**
     * Load game
     */
    loadGame() {
        try {
            const saveData = localStorage.getItem('gbslSaveData');
            if (!saveData) {
                alert('No saved game found!');
                return;
            }
            
            // This will trigger a page reload with loaded state
            // Handled in initialization code
            location.reload();
        } catch (error) {
            console.error('Load failed:', error);
            alert('Failed to load game: ' + error.message);
        }
    }
}
