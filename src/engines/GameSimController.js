// ═══════════════════════════════════════════════════════════════════════════════
// GameSimController.js — Game simulation, watch game, season end, playoffs
// ═══════════════════════════════════════════════════════════════════════════════

import { UIRenderer } from './UIRenderer.js';

export class GameSimController {
    constructor(ctx) {
        this.ctx = ctx;
        // Watch game state
        this._watchGame = null;
        this._watchTimer = null;
        this._watchSpeed = 1;
        this._watchPaused = false;
        this._watchHomeName = '';
        this._watchAwayName = '';
        this._watchHomeTeam = null;
        this._watchAwayTeam = null;
        this._watchDate = null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Watch Next Game (live play-by-play)
    // ═══════════════════════════════════════════════════════════════════

    watchNextGame() {
        const { gameState, helpers, engines } = this.ctx;
        if (!gameState || !gameState.currentDate) return;

        const currentDate = gameState.currentDate;
        const { CalendarEngine, GamePipeline } = engines;
        const gmMode = helpers.getGmMode();

        // All-Star break check
        const seasonDates = gameState.seasonDates;
        const allStarStart = CalendarEngine.toDateString(seasonDates.allStarStart);
        if (!gameState._allStarCompleted && currentDate <= allStarStart) {
            const nextUD = CalendarEngine.getNextUserGameDate(currentDate, gameState);
            if (nextUD && nextUD > allStarStart) {
                let sd = CalendarEngine.addDays(currentDate, 1);
                while (sd < allStarStart) {
                    gmMode._simulateAllGamesOnDate(sd, true);
                    sd = CalendarEngine.addDays(sd, 1);
                }
                gameState.currentDate = allStarStart;
                gmMode.saveGameState();
                gmMode.updateUI();
                helpers.runAllStarWeekend();
                const allStarEnd = CalendarEngine.toDateString(seasonDates.allStarEnd);
                gameState.currentDate = CalendarEngine.addDays(allStarEnd, 1);
                gmMode.saveGameState();
                gmMode.updateUI();
                return;
            }
        }

        const nextUserDate = CalendarEngine.getNextUserGameDate(currentDate, gameState);
        if (!nextUserDate) { alert('No upcoming games found.'); return; }

        // Sim all games on current date and intervening days
        gmMode._simulateAllGamesOnDate(currentDate, true);
        let simDate = CalendarEngine.addDays(currentDate, 1);
        while (simDate < nextUserDate) {
            gmMode._simulateAllGamesOnDate(simDate, true);
            simDate = CalendarEngine.addDays(simDate, 1);
        }
        gameState.currentDate = nextUserDate;

        // Sim non-user games on this date
        const todaysGames = CalendarEngine.getGamesForDate(nextUserDate, gameState);
        const userTeamId = gameState.userTeamId;
        const tierSchedules = [
            { schedule: todaysGames.tier1, teams: gameState.tier1Teams },
            { schedule: todaysGames.tier2, teams: gameState.tier2Teams },
            { schedule: todaysGames.tier3, teams: gameState.tier3Teams }
        ];

        let userGame = null, homeTeam = null, awayTeam = null;

        for (const { schedule, teams } of tierSchedules) {
            if (!schedule) continue;
            for (const game of schedule) {
                if (game.played) continue;
                const home = teams.find(t => t.id === game.homeTeamId);
                const away = teams.find(t => t.id === game.awayTeamId);
                if (!home || !away) continue;

                if (game.homeTeamId === userTeamId || game.awayTeamId === userTeamId) {
                    userGame = game;
                    homeTeam = home;
                    awayTeam = away;
                } else {
                    helpers.applyFatigueAutoRest(home, false);
                    helpers.applyFatigueAutoRest(away, false);
                    const result = helpers.getSimulationController().simulateFullGame(home, away);
                    game.played = true;
                    game.homeScore = result.homeScore;
                    game.awayScore = result.awayScore;
                    game.winnerId = result.winner.id;
                    helpers.processFatigueAfterGame(home, away, false);
                    helpers.updateInjuries(home);
                    helpers.updateInjuries(away);
                    const userGamesPlayed = helpers.getUserTeam() ? (helpers.getUserTeam().wins + helpers.getUserTeam().losses) : 0;
                    const injuries = helpers.checkForInjuries(home, away, userGamesPlayed, false);
                    injuries.forEach(({team, player, injury}) => {
                        const aiDecision = injury.canPlayThrough && Math.random() < 0.3 ? 'playThrough' : 'rest';
                        helpers.applyInjury(player, injury, aiDecision);
                    });
                }
            }
        }

        if (!userGame || !homeTeam || !awayTeam) { alert('Could not find user game.'); return; }

        this._watchDate = nextUserDate;
        this._watchHomeTeam = homeTeam;
        this._watchAwayTeam = awayTeam;
        this._watchHomeName = homeTeam.name;
        this._watchAwayName = awayTeam.name;

        helpers.applyFatigueAutoRest(homeTeam, false);
        helpers.applyFatigueAutoRest(awayTeam, false);

        this._watchGame = GamePipeline.create(homeTeam, awayTeam, {
            isPlayoffs: false,
            tier: gameState.currentTier
        });

        document.getElementById('watchGameContent').innerHTML = UIRenderer.watchGameLayout({
            homeName: this._watchHomeName, awayName: this._watchAwayName
        });
        document.getElementById('watchGameModal').classList.remove('hidden');

        this._watchPaused = false;
        this._watchSpeed = 1;
        this.watchGameSetSpeed(1);
        this._startWatchTimer();
    }

    _startWatchTimer() {
        if (this._watchTimer) clearInterval(this._watchTimer);
        if (!this._watchGame || this._watchGame.isComplete) return;

        const delays = { 1: 800, 3: 250, 10: 60, 999: 1 };
        const delay = delays[this._watchSpeed] || 800;

        this._watchTimer = setInterval(() => {
            if (this._watchPaused || !this._watchGame) return;

            if (this._watchSpeed === 999) {
                for (let i = 0; i < 20 && !this._watchGame.isComplete; i++) {
                    const events = this._watchGame.step();
                    const keyEvents = events.filter(e =>
                        ['made_shot', 'and_one', 'run', 'quarter_end', 'overtime', 'game_end', 'foul_shooting'].includes(e.type)
                    );
                    this._renderWatchEvents(keyEvents);
                }
            } else {
                const events = this._watchGame.step();
                this._renderWatchEvents(events);
            }

            this._updateWatchScoreboard();

            if (this._watchGame.isComplete) {
                clearInterval(this._watchTimer);
                this._watchTimer = null;
                this._onWatchGameEnd();
            }
        }, delay);
    }

    _renderWatchEvents(events) {
        const container = document.getElementById('wg-plays');
        if (!container) return;
        for (const event of events) {
            const html = UIRenderer.watchGamePlayEntry(event);
            if (html) {
                const div = document.createElement('div');
                div.innerHTML = html;
                container.prepend(div.firstElementChild || div);
            }
        }
        while (container.children.length > 200) {
            container.removeChild(container.lastChild);
        }
    }

    _updateWatchScoreboard() {
        if (!this._watchGame) return;
        const state = this._watchGame.getState();

        const homeEl = document.getElementById('wg-home-score');
        const awayEl = document.getElementById('wg-away-score');
        if (homeEl) homeEl.textContent = state.homeScore;
        if (awayEl) awayEl.textContent = state.awayScore;

        const clockEl = document.getElementById('wg-clock');
        if (clockEl) clockEl.textContent = state.clock.display;

        const qEl = document.getElementById('wg-quarter-scores');
        if (qEl && state.quarterScores) {
            const qs = state.quarterScores;
            let qText = '';
            for (let i = 0; i < qs.home.length; i++) {
                const label = i < 4 ? `Q${i+1}` : `OT${i-3}`;
                qText += `${label}: ${qs.away[i]}-${qs.home[i]}  `;
            }
            qEl.textContent = qText.trim();
        }

        const mEl = document.getElementById('wg-momentum');
        if (mEl) {
            const normalized = state.momentum / 10;
            if (normalized >= 0) {
                mEl.style.left = '50%';
                mEl.style.width = `${normalized * 50}%`;
                mEl.style.background = '#4ecdc4';
            } else {
                const width = Math.abs(normalized) * 50;
                mEl.style.left = `${50 - width}%`;
                mEl.style.width = `${width}%`;
                mEl.style.background = '#ff6b6b';
            }
        }

        const leadersEl = document.getElementById('wg-leaders');
        if (leadersEl && (this._watchSpeed <= 3 || Math.random() < 0.1)) {
            const result = this._watchGame.getResult();
            leadersEl.innerHTML = UIRenderer.watchGameLeaders(
                result.homePlayerStats, result.awayPlayerStats,
                this._watchHomeName, this._watchAwayName
            );
        }
    }

    _onWatchGameEnd() {
        const { helpers } = this.ctx;
        const result = this._watchGame.getResult();
        const userTeam = helpers.getUserTeam();
        const userWon = result.winner.id === userTeam.id;

        const finalEl = document.getElementById('wg-final-text');
        if (finalEl) {
            finalEl.innerHTML = `<span style="color: ${userWon ? '#4ecdc4' : '#ff6b6b'};">${userWon ? '🎉 VICTORY' : '😤 DEFEAT'}</span> — FINAL${result.isOvertime ? ' (OT)' : ''}: ${result.awayScore} - ${result.homeScore}`;
        }
        document.getElementById('wg-gameover').style.display = 'block';
    }

    watchGameSetSpeed(speed) {
        this._watchSpeed = speed;
        ['1', '3', '10', 'max'].forEach(s => {
            const btn = document.getElementById(`wg-speed-${s}`);
            if (btn) btn.style.background = 'rgba(255,255,255,0.1)';
        });
        const key = speed === 999 ? 'max' : String(speed);
        const activeBtn = document.getElementById(`wg-speed-${key}`);
        if (activeBtn) activeBtn.style.background = 'rgba(102,126,234,0.6)';

        if (!this._watchPaused && this._watchGame && !this._watchGame.isComplete) {
            this._startWatchTimer();
        }
    }

    watchGameTogglePause() {
        this._watchPaused = !this._watchPaused;
        const btn = document.getElementById('wg-pause');
        if (btn) {
            btn.textContent = this._watchPaused ? '▶ Play' : '⏸ Pause';
            btn.style.background = this._watchPaused ? 'rgba(78,205,196,0.3)' : 'rgba(255,255,255,0.1)';
        }
        if (!this._watchPaused && this._watchGame && !this._watchGame.isComplete) {
            this._startWatchTimer();
        }
    }

    watchGameSkip() {
        if (!this._watchGame) return;
        if (this._watchTimer) clearInterval(this._watchTimer);
        const result = this._watchGame.finish();
        this._renderWatchEvents(result.events.slice(-20));
        this._updateWatchScoreboard();
        this._onWatchGameEnd();
    }

    watchGameClose() {
        const { gameState, helpers, engines } = this.ctx;
        if (this._watchTimer) clearInterval(this._watchTimer);
        this._watchTimer = null;
        if (!this._watchGame) return;

        const result = this._watchGame.getResult();
        const simCtrl = helpers.getSimulationController();
        const gmMode = helpers.getGmMode();
        const userTeamId = gameState.userTeamId;

        // Update team records
        if (result.homeWon) {
            this._watchHomeTeam.wins++; this._watchAwayTeam.losses++;
            if (this._watchHomeTeam.coach) this._watchHomeTeam.coach.seasonWins++;
            if (this._watchAwayTeam.coach) this._watchAwayTeam.coach.seasonLosses++;
        } else {
            this._watchAwayTeam.wins++; this._watchHomeTeam.losses++;
            if (this._watchAwayTeam.coach) this._watchAwayTeam.coach.seasonWins++;
            if (this._watchHomeTeam.coach) this._watchHomeTeam.coach.seasonLosses++;
        }

        this._watchHomeTeam.pointDiff += result.pointDiff;
        this._watchAwayTeam.pointDiff -= result.pointDiff;

        simCtrl.applyChemistryChanges(this._watchHomeTeam, result.homeWon);
        simCtrl.applyChemistryChanges(this._watchAwayTeam, !result.homeWon);
        simCtrl.accumulatePlayerStats(this._watchHomeTeam, result.homePlayerStats);
        simCtrl.accumulatePlayerStats(this._watchAwayTeam, result.awayPlayerStats);

        // Mark game played in schedule
        const todaysGames = engines.CalendarEngine.getGamesForDate(this._watchDate, gameState);
        const allSchedule = [...(todaysGames.tier1 || []), ...(todaysGames.tier2 || []), ...(todaysGames.tier3 || [])];
        const schedGame = allSchedule.find(g =>
            g.homeTeamId === this._watchHomeTeam.id && g.awayTeamId === this._watchAwayTeam.id && !g.played
        );
        if (schedGame) {
            schedGame.played = true;
            schedGame.homeScore = result.homeScore;
            schedGame.awayScore = result.awayScore;
            schedGame.winnerId = result.winner.id;
            schedGame.boxScore = {
                home: {
                    teamId: this._watchHomeTeam.id, teamName: this._watchHomeTeam.name,
                    city: this._watchHomeTeam.city || '', score: result.homeScore,
                    players: result.homePlayerStats.filter(p => p.minutesPlayed > 0)
                        .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                        .map(p => ({ name: p.playerName, pos: p.position, min: p.minutesPlayed, pts: p.points, reb: p.rebounds, ast: p.assists, stl: p.steals, blk: p.blocks, to: p.turnovers, pf: p.fouls, fgm: p.fieldGoalsMade, fga: p.fieldGoalsAttempted, tpm: p.threePointersMade, tpa: p.threePointersAttempted, ftm: p.freeThrowsMade, fta: p.freeThrowsAttempted, starter: p.gamesStarted > 0 }))
                },
                away: {
                    teamId: this._watchAwayTeam.id, teamName: this._watchAwayTeam.name,
                    city: this._watchAwayTeam.city || '', score: result.awayScore,
                    players: result.awayPlayerStats.filter(p => p.minutesPlayed > 0)
                        .sort((a, b) => b.minutesPlayed - a.minutesPlayed)
                        .map(p => ({ name: p.playerName, pos: p.position, min: p.minutesPlayed, pts: p.points, reb: p.rebounds, ast: p.assists, stl: p.steals, blk: p.blocks, to: p.turnovers, pf: p.fouls, fgm: p.fieldGoalsMade, fga: p.fieldGoalsAttempted, tpm: p.threePointersMade, tpa: p.threePointersAttempted, ftm: p.freeThrowsMade, fta: p.freeThrowsAttempted, starter: p.gamesStarted > 0 }))
                },
                quarterScores: result.quarterScores,
                events: result.events.filter(e => ['made_shot', 'run', 'quarter_end'].includes(e.type)).slice(-30)
            };
        }

        // Fatigue and injuries
        helpers.processFatigueAfterGame(this._watchHomeTeam, this._watchAwayTeam, false);
        helpers.updateInjuries(this._watchHomeTeam);
        helpers.updateInjuries(this._watchAwayTeam);
        const userGamesPlayed = helpers.getUserTeam() ? (helpers.getUserTeam().wins + helpers.getUserTeam().losses) : 0;
        const injuries = helpers.checkForInjuries(this._watchHomeTeam, this._watchAwayTeam, userGamesPlayed, false);
        const userTeamInjuries = injuries.filter(inj => inj.team.id === userTeamId);
        const aiTeamInjuries = injuries.filter(inj => inj.team.id !== userTeamId);
        aiTeamInjuries.forEach(({team, player, injury}) => {
            const aiDecision = injury.canPlayThrough && Math.random() < 0.3 ? 'playThrough' : 'rest';
            helpers.applyInjury(player, injury, aiDecision);
        });

        gameState.currentDate = engines.CalendarEngine.addDays(this._watchDate, 1);

        document.getElementById('watchGameModal').classList.add('hidden');
        this._watchGame = null;

        gmMode._showPostGameIfUserPlayed(this._watchDate);
        gmMode.saveGameState();
        gmMode.updateUI();

        if (userTeamInjuries.length > 0) {
            gameState.pendingInjuries = userTeamInjuries;
            gmMode.saveGameState();
            helpers.showNextInjuryModal();
        }

        if (gameState.isSeasonComplete()) {
            gmMode.showSeasonEnd();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Season End
    // ═══════════════════════════════════════════════════════════════════

    showSeasonEnd() {
        const { gameState, helpers, engines } = this.ctx;

        // Mark offseason phase
        gameState.offseasonPhase = 'season_ended';

        document.getElementById('simNextBtn').disabled = true;
        document.getElementById('simDayBtn').disabled = true;
        document.getElementById('simWeekBtn').disabled = true;
        document.getElementById('finishBtn').disabled = true;

        const userTeam = helpers.getUserTeam();
        if (!userTeam) {
            console.error('🚨 showSeasonEnd: userTeam not found anywhere!');
            alert('Error: Could not find your team. Please report this bug.');
            return;
        }

        if (userTeam.tier !== gameState.currentTier) {
            console.warn('⚠️ showSeasonEnd: currentTier was', gameState.currentTier, 'but user team is in tier', userTeam.tier, '— correcting.');
            gameState.currentTier = userTeam.tier;
        }

        const teams = helpers.getCurrentTeams();
        const allTeams = [...gameState.tier1Teams, ...gameState.tier2Teams, ...gameState.tier3Teams];
        const sortedTeams = helpers.sortTeamsWithTiebreakers(teams, allTeams, {
            useDivisionDominance: gameState.currentTier === 3
        });

        const rankIdx = sortedTeams.findIndex(t => t.id === gameState.userTeamId);
        const rank = rankIdx === -1 ? teams.length : rankIdx + 1;
        const totalTeams = teams.length;

        const seasonLabel = `${gameState.currentSeason}-${(gameState.currentSeason + 1) % 100}`;
        const alreadyRecorded = gameState.seasonHistory.some(h => h.season === seasonLabel && h.tier === gameState.currentTier);
        if (!alreadyRecorded) {
            gameState.seasonHistory.push({
                season: seasonLabel, tier: gameState.currentTier,
                wins: userTeam.wins, losses: userTeam.losses, rank, pointDiff: userTeam.pointDiff
            });
        }

        let status, statusColor, nextAction;

        if (gameState.currentTier === 1) {
            if (rank === totalTeams) { status = '⚠️ AUTO-RELEGATED TO TIER 2'; statusColor = '#ea4335'; nextAction = 'relegate'; }
            else if (rank >= totalTeams - 2 && rank <= totalTeams - 1) { status = '⚠️ RELEGATION PLAYOFF'; statusColor = '#ffa500'; nextAction = 'relegation-playoff'; }
            else {
                // Check if user is in the top 8 of their conference (championship playoff eligible)
                const t1Sorted = helpers.sortTeamsByStandings(gameState.tier1Teams, gameState.tier1Schedule);
                const eastTeams = t1Sorted.filter(t =>
                    t.division === 'Atlantic' || t.division === 'Central' || t.division === 'Southeast'
                );
                const westTeams = t1Sorted.filter(t =>
                    t.division === 'Northwest' || t.division === 'Pacific' || t.division === 'Southwest'
                );
                const inEastPlayoffs = eastTeams.slice(0, 8).some(t => t.id === userTeam.id);
                const inWestPlayoffs = westTeams.slice(0, 8).some(t => t.id === userTeam.id);
                if (inEastPlayoffs || inWestPlayoffs) {
                    const conf = inEastPlayoffs ? 'Eastern' : 'Western';
                    const confTeams = inEastPlayoffs ? eastTeams.slice(0, 8) : westTeams.slice(0, 8);
                    const seed = confTeams.findIndex(t => t.id === userTeam.id) + 1;
                    status = `🏆 #${seed} SEED — ${conf} Conference Playoffs!`;
                    statusColor = '#ffd700'; nextAction = 'championship';
                } else {
                    status = '✅ Safe in Tier 1'; statusColor = '#34a853'; nextAction = 'stay';
                }
            }
        } else if (gameState.currentTier === 2) {
            // Check if user is in top 4 of their division (division playoff eligible)
            const divTeams = teams.filter(t => t.division === userTeam.division);
            const divSorted = helpers.sortTeamsByStandings(divTeams, gameState.schedule);
            const divRank = divSorted.findIndex(t => t.id === userTeam.id) + 1;

            if (rank === totalTeams) { status = '⚠️ AUTO-RELEGATED TO TIER 3'; statusColor = '#ea4335'; nextAction = 'relegate'; }
            else if (rank >= totalTeams - 2 && rank <= totalTeams - 1) { status = '⚠️ RELEGATION PLAYOFF'; statusColor = '#ffa500'; nextAction = 'relegation-playoff'; }
            else if (divRank <= 4) {
                status = `🏆 #${divRank} SEED — ${userTeam.division} Division Playoffs!`;
                statusColor = '#ffd700'; nextAction = 't2-championship';
            }
            else { status = 'Season Over — Staying in Tier 2'; statusColor = '#667eea'; nextAction = 'stay'; }
        } else {
            const divisionTeams = teams.filter(t => t.division === userTeam.division);
            const divisionSorted = helpers.sortTeamsByStandings(divisionTeams, gameState.schedule);
            const divisionRank = divisionSorted.findIndex(t => t.id === userTeam.id) + 1;

            if (divisionRank >= 1 && divisionRank <= 4) {
                status = divisionRank === 1 ? '🏆 #1 SEED - Division Playoffs!' : `⚡ #${divisionRank} SEED - Division Playoffs!`;
                statusColor = '#ffa500'; nextAction = 'division-playoff';
            } else { status = 'Staying in Tier 3'; statusColor = '#667eea'; nextAction = 'stay'; }
        }

        const tier1Sorted = helpers.sortTeamsByStandings(gameState.tier1Teams, gameState.tier1Schedule);
        const tier2Sorted = helpers.sortTeamsByStandings(gameState.tier2Teams, gameState.tier2Schedule);
        const tier3Sorted = helpers.sortTeamsByStandings(gameState.tier3Teams, gameState.tier3Schedule);

        const t1TopTeam = tier1Sorted[0];
        const t1Relegated = [tier1Sorted[tier1Sorted.length - 1], tier1Sorted[tier1Sorted.length - 2], tier1Sorted[tier1Sorted.length - 3], tier1Sorted[tier1Sorted.length - 4]];
        const t2Champion = tier2Sorted[0];
        const t2Promoted = [tier2Sorted[0], tier2Sorted[1], tier2Sorted[2], tier2Sorted[3]];
        const t3Champion = tier3Sorted[0];
        const t3Promoted = [tier3Sorted[0], tier3Sorted[1], tier3Sorted[2], tier3Sorted[3]];

        const tier1Awards = engines.StatEngine.calculateAwards(gameState.tier1Teams, Math.floor(82 * 0.5), 1);
        const tier2Awards = engines.StatEngine.calculateAwards(gameState.tier2Teams, Math.floor(60 * 0.5), 2);
        const tier3Awards = engines.StatEngine.calculateAwards(gameState.tier3Teams, Math.floor(40 * 0.5), 3);

        gameState._seasonEndData = {
            season: gameState.currentSeason,
            seasonLabel: `${gameState.currentSeason}-${String((gameState.currentSeason + 1) % 100).padStart(2, '0')}`,
            userTeamId: gameState.userTeamId, userTier: gameState.currentTier,
            standings: {
                tier1: tier1Sorted.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name, city: t.city, wins: t.wins, losses: t.losses, pointDiff: t.pointDiff, rating: Math.round(t.rating) })),
                tier2: tier2Sorted.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name, city: t.city, wins: t.wins, losses: t.losses, pointDiff: t.pointDiff, rating: Math.round(t.rating) })),
                tier3: tier3Sorted.map((t, i) => ({ rank: i + 1, id: t.id, name: t.name, city: t.city, wins: t.wins, losses: t.losses, pointDiff: t.pointDiff, rating: Math.round(t.rating) }))
            },
            awards: {
                tier1: engines.StorageEngine._compactAwards(tier1Awards),
                tier2: engines.StorageEngine._compactAwards(tier2Awards),
                tier3: engines.StorageEngine._compactAwards(tier3Awards)
            }
        };

        const tier1AwardsHTML = engines.StatEngine.generateAwardsHTML(tier1Awards, 'Tier 1 — Premier League');
        const tier2AwardsHTML = engines.StatEngine.generateAwardsHTML(tier2Awards, 'Tier 2 — Regional League');
        const tier3AwardsHTML = engines.StatEngine.generateAwardsHTML(tier3Awards, 'Tier 3 — Metro League');

        document.getElementById('seasonEndContent').innerHTML = UIRenderer.seasonEndModal({
            userTeam, rank, tier: gameState.currentTier, status, statusColor, nextAction,
            seasonLabel: `${gameState.currentSeason}-${(gameState.currentSeason + 1) % 100}`,
            awardsHTML: tier1AwardsHTML + tier2AwardsHTML + tier3AwardsHTML,
            t1TopTeam, t2Champion, t3Champion,
            t2Promoted, t1Relegated, t3Promoted, tier2Sorted,
            getRankSuffix: helpers.getRankSuffix
        });

        document.getElementById('seasonEndModal').classList.remove('hidden');
    }

    closeSeasonEnd() {
        document.getElementById('seasonEndModal').classList.add('hidden');
        // Keep sim buttons disabled - season is over
        document.getElementById('simNextBtn').disabled = true;
        document.getElementById('simDayBtn').disabled = true;
        document.getElementById('simWeekBtn').disabled = true;
        // Re-enable finish button so user can reopen season end modal
        document.getElementById('finishBtn').disabled = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // Promotion/Relegation Playoffs (startPlayoffs flow)
    // ═══════════════════════════════════════════════════════════════════

    startPlayoffs(type) {
        const { gameState, helpers } = this.ctx;
        console.log('🎮 startPlayoffs called with type:', type);
        document.getElementById('seasonEndModal').classList.add('hidden');

        const teams = helpers.getCurrentTeams();
        const sortedTeams = helpers.sortTeamsByStandings(teams, gameState.schedule);

        let playoffTeams, isPromotion, isDivisionPlayoff = false;

        if (type === 'division-playoff') {
            const userTeam = teams.find(t => t.id === gameState.userTeamId);
            const divisionTeams = teams.filter(t => t.division === userTeam.division);
            const divisionSorted = helpers.sortTeamsByStandings(divisionTeams, gameState.schedule);
            playoffTeams = divisionSorted.slice(0, 4);
            isPromotion = false;
            isDivisionPlayoff = true;
        } else if (type === 'promotion-playoff') {
            playoffTeams = sortedTeams.slice(1, 4);
            isPromotion = true;
        } else {
            playoffTeams = sortedTeams.slice(-3);
            isPromotion = false;
        }

        const results = this.simulatePlayoffBracket(playoffTeams, isPromotion, isDivisionPlayoff);
        this.showPlayoffResults(results, isPromotion, isDivisionPlayoff);
    }

    simulatePlayoffBracket(teams, isPromotion, isDivisionPlayoff = false) {
        if (teams.length === 4) {
            const [seed1, seed2, seed3, seed4] = teams;
            const semi1Winner = this.simulatePlayoffGameSimple(seed1, seed4);
            const semi1Loser = semi1Winner.id === seed1.id ? seed4 : seed1;
            const semi2Winner = this.simulatePlayoffGameSimple(seed2, seed3);
            const semi2Loser = semi2Winner.id === seed2.id ? seed3 : seed2;
            const finalWinner = this.simulatePlayoffGameSimple(semi1Winner, semi2Winner);
            const finalLoser = finalWinner.id === semi1Winner.id ? semi2Winner : semi1Winner;
            return {
                semi1: { team1: seed1, team2: seed4, winner: semi1Winner, loser: semi1Loser },
                semi2: { team1: seed2, team2: seed3, winner: semi2Winner, loser: semi2Loser },
                final: { team1: semi1Winner, team2: semi2Winner, winner: finalWinner, loser: finalLoser },
                seed1, seed2, seed3, seed4, isFourTeam: true, isDivisionPlayoff
            };
        } else {
            const [seed1, seed2, seed3] = teams;
            const playInWinner = this.simulatePlayoffGameSimple(seed2, seed3);
            const playInLoser = playInWinner.id === seed2.id ? seed3 : seed2;
            const finalWinner = this.simulatePlayoffGameSimple(seed1, playInWinner);
            const finalLoser = finalWinner.id === seed1.id ? playInWinner : seed1;
            return {
                playIn: { team1: seed2, team2: seed3, winner: playInWinner, loser: playInLoser },
                final: { team1: seed1, team2: playInWinner, winner: finalWinner, loser: finalLoser },
                seed1, seed2, seed3, isFourTeam: false, isDivisionPlayoff: false
            };
        }
    }

    simulatePlayoffGameSimple(team1, team2) {
        const score1 = Math.round(team1.rating + (Math.random() - 0.5) * 20);
        const score2 = Math.round(team2.rating + (Math.random() - 0.5) * 20);
        return score1 > score2 ? team1 : team2;
    }

    showPlayoffResults(results, isPromotion, isDivisionPlayoff = false) {
        const { gameState, helpers } = this.ctx;
        const userTeam = helpers.getCurrentTeams().find(t => t.id === gameState.userTeamId);

        let userInvolved = false;
        if (results.isFourTeam) {
            userInvolved = [results.seed1, results.seed2, results.seed3, results.seed4].some(s => s.id === userTeam.id);
        } else {
            userInvolved = [results.seed1, results.seed2, results.seed3].some(s => s.id === userTeam.id);
        }

        let userResult;
        if (results.isFourTeam) {
            if (results.semi1.loser.id === userTeam.id || results.semi2.loser.id === userTeam.id) {
                userResult = isDivisionPlayoff ? 'eliminated-division' : 'eliminated-promotion';
            } else if (results.final.loser.id === userTeam.id) {
                userResult = isDivisionPlayoff ? 'runner-up-division' : (isPromotion ? 'promoted' : 'relegated');
            } else if (results.final.winner.id === userTeam.id) {
                userResult = isDivisionPlayoff ? 'division-champion' : (isPromotion ? 'promoted' : 'survived');
            }
        } else {
            if (results.playIn.loser.id === userTeam.id) {
                userResult = isPromotion ? 'eliminated-promotion' : 'relegated';
            } else if (results.final.loser.id === userTeam.id) {
                userResult = isPromotion ? 'promoted' : 'relegated';
            } else if (results.final.winner.id === userTeam.id) {
                userResult = isPromotion ? 'promoted' : 'survived';
            }
        }

        const resultMessages = {
            'promoted': { text: '🎉 PROMOTED TO TIER 1!', color: '#34a853' },
            'survived': { text: '✅ SURVIVED - STAYING IN TIER 1', color: '#34a853' },
            'relegated': { text: '⚠️ RELEGATED TO TIER 2', color: '#ea4335' },
            'eliminated-promotion': { text: 'Eliminated - Staying in Tier 2', color: '#667eea' },
            'division-champion': { text: '🏆 DIVISION CHAMPION!', color: '#ffa500' },
            'runner-up-division': { text: '🥈 Division Runner-Up', color: '#c0c0c0' },
            'eliminated-division': { text: 'Eliminated from Division Playoffs', color: '#667eea' }
        };

        const msg = resultMessages[userResult];
        document.getElementById('playoffContent').innerHTML = UIRenderer.playoffResults({
            results, isPromotion, isDivisionPlayoff, msg, userResult, userInvolved
        });
        document.getElementById('playoffModal').classList.remove('hidden');
    }

    viewPromRelPlayoffResults() {
        const { results, isPromotion, isDivisionPlayoff } = window.currentPromRelResults;
        const playoffTitle = isDivisionPlayoff ? '🏀 Division Playoffs' :
                             (isPromotion ? '⬆️ Promotion Playoffs' : '⬇️ Relegation Playoffs');
        document.getElementById('playoffContent').innerHTML = UIRenderer.promRelPlayoffResults({
            results, isPromotion, isDivisionPlayoff, playoffTitle
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // Tier 1 Championship Playoffs (4-round NBA-style)
    // ═══════════════════════════════════════════════════════════════════

    runTier1ChampionshipPlayoffs() {
        const { gameState, helpers } = this.ctx;
        console.log('🏆 Starting Tier 1 Championship Playoffs...');

        const tier1Sorted = helpers.sortTeamsByStandings(gameState.tier1Teams, gameState.tier1Schedule);

        const eastTeams = tier1Sorted.filter(t =>
            t.division === 'Atlantic' || t.division === 'Central' || t.division === 'Southeast'
        );
        const westTeams = tier1Sorted.filter(t =>
            t.division === 'Northwest' || t.division === 'Pacific' || t.division === 'Southwest'
        );

        const eastPlayoffTeams = eastTeams.slice(0, 8);
        const westPlayoffTeams = westTeams.slice(0, 8);

        console.log('East playoff teams:', eastPlayoffTeams.map(t => t.name));
        console.log('West playoff teams:', westPlayoffTeams.map(t => t.name));

        const userTeam = helpers.getUserTeam();
        const userInPlayoffs = [...eastPlayoffTeams, ...westPlayoffTeams].some(t => t.id === userTeam.id);

        if (!userInPlayoffs) {
            console.log('User team did not make championship playoffs');
            document.getElementById('championshipPlayoffContent').innerHTML = UIRenderer.championshipPlayoffMissed();
            document.getElementById('championshipPlayoffModal').classList.remove('hidden');
            gameState.championshipPlayoffData = {
                eastTeams: eastPlayoffTeams, westTeams: westPlayoffTeams,
                currentRound: 1, roundResults: [], userInvolved: false
            };
            return;
        }

        gameState.championshipPlayoffData = {
            eastTeams: eastPlayoffTeams, westTeams: westPlayoffTeams,
            currentRound: 1, roundResults: [], userInvolved: true
        };
        this.simulateChampionshipRound(1);
    }

    simAllChampionshipRounds() {
        const { gameState, helpers } = this.ctx;
        console.log('⏩ Simulating all championship rounds...');
        for (let round = 1; round <= 4; round++) {
            gameState.championshipPlayoffData.currentRound = round;
            this.simulateChampionshipRound(round, true);
        }
        const finalRound = gameState.championshipPlayoffData.roundResults[3];
        const champion = finalRound[0].result.winner;
        helpers.applyChampionshipBonus(champion);
        document.getElementById('championshipPlayoffContent').innerHTML =
            UIRenderer.championshipCompleteQuick({ championName: champion.name });
    }

    skipChampionshipPlayoffs() {
        const { gameState, helpers } = this.ctx;
        document.getElementById('championshipPlayoffModal').classList.add('hidden');
        // Update T1 champion from interactive results if available
        const playoffData = gameState.championshipPlayoffData;
        if (playoffData && playoffData.roundResults && playoffData.roundResults[3]) {
            const finalRound = playoffData.roundResults[3];
            if (finalRound[0] && gameState.postseasonResults && gameState.postseasonResults.t1) {
                gameState.postseasonResults.t1.champion = finalRound[0].result.winner;
            }
        }
        console.log('⬆️⬇️ Routing through continueAfterPostseason for proper history/promo-releg...');
        const offseasonCtrl = helpers.getOffseasonController ? helpers.getOffseasonController() : null;
        if (offseasonCtrl) {
            offseasonCtrl.continueAfterPostseason();
        } else {
            helpers.executePromotionRelegationFromResults();
            helpers.proceedToDraftOrDevelopment();
        }
    }

    simulateChampionshipRound(roundNumber, silent = false) {
        const { gameState, helpers } = this.ctx;
        const playoffData = gameState.championshipPlayoffData;
        let series = [];
        let roundName = '';
        let bestOf = 5;

        if (roundNumber === 1) {
            roundName = 'First Round';
            bestOf = 5;
            const eastR1 = [
                { higher: playoffData.eastTeams[0], lower: playoffData.eastTeams[7], conf: 'East' },
                { higher: playoffData.eastTeams[1], lower: playoffData.eastTeams[6], conf: 'East' },
                { higher: playoffData.eastTeams[2], lower: playoffData.eastTeams[5], conf: 'East' },
                { higher: playoffData.eastTeams[3], lower: playoffData.eastTeams[4], conf: 'East' }
            ];
            const westR1 = [
                { higher: playoffData.westTeams[0], lower: playoffData.westTeams[7], conf: 'West' },
                { higher: playoffData.westTeams[1], lower: playoffData.westTeams[6], conf: 'West' },
                { higher: playoffData.westTeams[2], lower: playoffData.westTeams[5], conf: 'West' },
                { higher: playoffData.westTeams[3], lower: playoffData.westTeams[4], conf: 'West' }
            ];
            series = [...eastR1, ...westR1];
        } else if (roundNumber === 2) {
            roundName = 'Conference Semifinals';
            bestOf = 5;
            const prevRound = playoffData.roundResults[0];
            const eastWinners = prevRound.filter(s => s.conf === 'East').map(s => s.result.winner);
            const westWinners = prevRound.filter(s => s.conf === 'West').map(s => s.result.winner);
            eastWinners.sort((a, b) => playoffData.eastTeams.findIndex(t => t.id === a.id) - playoffData.eastTeams.findIndex(t => t.id === b.id));
            westWinners.sort((a, b) => playoffData.westTeams.findIndex(t => t.id === a.id) - playoffData.westTeams.findIndex(t => t.id === b.id));
            series = [
                { higher: eastWinners[0], lower: eastWinners[3], conf: 'East' },
                { higher: eastWinners[1], lower: eastWinners[2], conf: 'East' },
                { higher: westWinners[0], lower: westWinners[3], conf: 'West' },
                { higher: westWinners[1], lower: westWinners[2], conf: 'West' }
            ];
        } else if (roundNumber === 3) {
            roundName = 'Conference Finals';
            bestOf = 5;
            const prevRound = playoffData.roundResults[1];
            const eastWinners = prevRound.filter(s => s.conf === 'East').map(s => s.result.winner);
            const westWinners = prevRound.filter(s => s.conf === 'West').map(s => s.result.winner);
            eastWinners.sort((a, b) => playoffData.eastTeams.findIndex(t => t.id === a.id) - playoffData.eastTeams.findIndex(t => t.id === b.id));
            westWinners.sort((a, b) => playoffData.westTeams.findIndex(t => t.id === a.id) - playoffData.westTeams.findIndex(t => t.id === b.id));
            series = [
                { higher: eastWinners[0], lower: eastWinners[1], conf: 'East' },
                { higher: westWinners[0], lower: westWinners[1], conf: 'West' }
            ];
        } else if (roundNumber === 4) {
            roundName = 'NBA Finals';
            bestOf = 7;
            const prevRound = playoffData.roundResults[2];
            const eastChamp = prevRound.find(s => s.conf === 'East').result.winner;
            const westChamp = prevRound.find(s => s.conf === 'West').result.winner;
            const eastSeed = playoffData.eastTeams.findIndex(t => t.id === eastChamp.id);
            const westSeed = playoffData.westTeams.findIndex(t => t.id === westChamp.id);
            const higher = eastSeed < westSeed ? eastChamp : westChamp;
            const lower = eastSeed < westSeed ? westChamp : eastChamp;
            series = [{ higher, lower, conf: 'Finals' }];
        }

        const roundResults = series.map(matchup => {
            const result = helpers.simulatePlayoffSeries(matchup.higher, matchup.lower, bestOf);
            return { conf: matchup.conf, result };
        });

        playoffData.roundResults.push(roundResults);
        playoffData.currentRound = roundNumber;

        if (!silent) {
            this.showChampionshipRoundResults(roundNumber, roundName, roundResults);
        }
    }

    showChampionshipRoundResults(roundNumber, roundName, roundResults) {
        const { helpers } = this.ctx;
        console.log(`📺 Showing championship round ${roundNumber}: ${roundName}`);

        const userTeam = helpers.getUserTeam();
        const eastSeries = roundResults.filter(s => s.conf === 'East');
        const westSeries = roundResults.filter(s => s.conf === 'West');
        const finalsSeries = roundResults.filter(s => s.conf === 'Finals');

        if (finalsSeries.length > 0) {
            helpers.applyChampionshipBonus(finalsSeries[0].result.winner);
        }

        const html = UIRenderer.championshipRoundPage({
            roundName, roundNumber, eastSeries, westSeries, finalsSeries,
            formatSeriesResult: (sr, ut, isF) => this.formatSeriesResult(sr, ut, isF),
            userTeam
        });
        document.getElementById('championshipPlayoffContent').innerHTML = html;
        document.getElementById('championshipPlayoffModal').classList.remove('hidden');
    }

    formatSeriesResult(seriesResult, userTeam, isFinals = false) {
        const isUserInvolved = seriesResult.higherSeed.id === userTeam.id || seriesResult.lowerSeed.id === userTeam.id;
        return UIRenderer.seriesResultCard({ seriesResult, isUserInvolved, isFinals });
    }

    continueAfterChampionshipRound() {
        const { gameState, helpers } = this.ctx;
        const playoffData = gameState.championshipPlayoffData;
        document.getElementById('championshipPlayoffModal').classList.add('hidden');

        if (playoffData.currentRound < 4) {
            this.simulateChampionshipRound(playoffData.currentRound + 1);
        } else {
            console.log('🏆 Championship playoffs complete!');
            // Update T1 champion in postseasonResults from the interactive results
            const finalRound = playoffData.roundResults[3];
            if (finalRound && finalRound[0]) {
                gameState.postseasonResults.t1.champion = finalRound[0].result.winner;
            }
            // Route through the standard postseason continuation (handles history snapshot, promo/releg, tier changes)
            const offseasonCtrl = helpers.getOffseasonController
                ? helpers.getOffseasonController()
                : null;
            if (offseasonCtrl) {
                offseasonCtrl.continueAfterPostseason();
            } else {
                // Fallback: direct execution
                helpers.executePromotionRelegationFromResults();
                helpers.proceedToDraftOrDevelopment();
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // Tier 2 Division Playoffs + National Tournament
    // ═══════════════════════════════════════════════════════════════════

    runTier2DivisionPlayoffs() {
        const { gameState, helpers } = this.ctx;
        console.log('🏆 Starting Tier 2 Division Playoffs...');

        const userTeam = helpers.getUserTeam();
        const postseason = gameState.postseasonResults;
        const t2Bracket = postseason.t2;

        // Find user's division bracket
        const userDivBracket = t2Bracket.divisionBrackets.find(db =>
            db.teams.some(t => t.id === userTeam.id)
        );

        if (!userDivBracket) {
            console.warn('User team not found in any division bracket');
            this._showT2PostseasonSummary();
            return;
        }

        // Store T2 playoff state
        gameState.t2PlayoffData = {
            userDivBracket,
            userDivision: userDivBracket.division,
            stage: 'division-semis', // division-semis → division-final → national
            userTeamId: userTeam.id,
            interactiveResults: {
                divSemi1: null,
                divSemi2: null,
                divFinal: null,
                // National tournament results will be re-simulated interactively
                nationalRounds: []
            }
        };

        // Show division semifinals
        this._showT2DivisionSemis();
    }

    _showT2DivisionSemis() {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const db = pd.userDivBracket;

        // Simulate the two semifinals using the full engine
        const semi1 = helpers.simulatePlayoffSeries(db.seed1, db.seed4, 3);
        const semi2 = helpers.simulatePlayoffSeries(db.seed2, db.seed3, 3);
        pd.interactiveResults.divSemi1 = semi1;
        pd.interactiveResults.divSemi2 = semi2;

        const userTeam = helpers.getUserTeam();
        const html = UIRenderer.t2DivisionSemisPage({
            division: db.division,
            semi1, semi2, userTeam,
            formatSeriesResult: (sr, ut) => UIRenderer.seriesResultCard({ seriesResult: sr, isUserInvolved: sr.higherSeed.id === ut.id || sr.lowerSeed.id === ut.id, isFinals: false })
        });

        document.getElementById('championshipPlayoffContent').innerHTML = html;
        document.getElementById('championshipPlayoffModal').classList.remove('hidden');
    }

    continueT2AfterDivisionSemis() {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const semi1 = pd.interactiveResults.divSemi1;
        const semi2 = pd.interactiveResults.divSemi2;

        // Check if user was eliminated
        const userTeam = helpers.getUserTeam();
        const userEliminated = (semi1.loser.id === userTeam.id || semi2.loser.id === userTeam.id);

        if (userEliminated) {
            // Show elimination + remaining T2 playoff summary
            this._showT2EliminationAndSummary('division semifinals');
            return;
        }

        // Simulate division final
        pd.stage = 'division-final';
        const divFinal = helpers.simulatePlayoffSeries(semi1.winner, semi2.winner, 3);
        pd.interactiveResults.divFinal = divFinal;

        const html = UIRenderer.t2DivisionFinalPage({
            division: pd.userDivision,
            divFinal, userTeam,
            formatSeriesResult: (sr, ut) => UIRenderer.seriesResultCard({ seriesResult: sr, isUserInvolved: sr.higherSeed.id === ut.id || sr.lowerSeed.id === ut.id, isFinals: true })
        });

        document.getElementById('championshipPlayoffContent').innerHTML = html;
    }

    continueT2AfterDivisionFinal() {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const userTeam = helpers.getUserTeam();
        const divFinal = pd.interactiveResults.divFinal;

        // User is either division champion or runner-up
        const isChampion = divFinal.winner.id === userTeam.id;

        // Check if user qualifies for national tournament
        // Champions always qualify. Runner-ups qualify if they're in top 5 runners-up by record.
        const postseason = gameState.postseasonResults;
        const t2Bracket = postseason.t2;

        // Get all runners-up sorted by record
        const allRunnersUp = t2Bracket.divisionBrackets
            .filter(db => db.runnerUp)
            .map(db => db.runnerUp)
            .sort((a, b) => (b.wins !== a.wins) ? b.wins - a.wins : b.pointDiff - a.pointDiff);
        const qualifyingRunnersUp = allRunnersUp.slice(0, 5);
        const userQualifiesAsRunnerUp = qualifyingRunnersUp.some(t => t.id === userTeam.id);

        if (!isChampion && !userQualifiesAsRunnerUp) {
            this._showT2EliminationAndSummary('division final (did not qualify for National Tournament)');
            return;
        }

        // User qualifies for national tournament — show the field and start rounds
        pd.stage = 'national';
        this._showT2NationalRound(1);
    }

    _showT2NationalRound(roundNumber) {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const postseason = gameState.postseasonResults;
        const nat = postseason.t2.nationalBracket;
        const userTeam = helpers.getUserTeam();

        // The national bracket was already simulated by PlayoffEngine in the background.
        // For the interactive flow, we re-simulate each round using the full game engine.
        // We use the same seedings but generate fresh series results.

        const sortByRecord = (a, b) => (b.wins !== a.wins) ? b.wins - a.wins : b.pointDiff - a.pointDiff;

        let seriesMatchups = [];
        let roundName = '';
        let bestOf = 5;

        if (roundNumber === 1) {
            roundName = 'National Tournament — Round of 16';
            const teams16 = nat.teams;
            for (let i = 0; i < 8; i++) {
                seriesMatchups.push({ higher: teams16[i], lower: teams16[15 - i] });
            }
        } else if (roundNumber === 2) {
            roundName = 'National Tournament — Quarterfinals';
            const prevWinners = pd.interactiveResults.nationalRounds[0].map(s => s.result.winner);
            prevWinners.sort(sortByRecord);
            for (let i = 0; i < 4; i++) {
                seriesMatchups.push({ higher: prevWinners[i], lower: prevWinners[7 - i] });
            }
        } else if (roundNumber === 3) {
            roundName = 'National Tournament — Semifinals';
            const prevWinners = pd.interactiveResults.nationalRounds[1].map(s => s.result.winner);
            prevWinners.sort(sortByRecord);
            seriesMatchups.push({ higher: prevWinners[0], lower: prevWinners[3] });
            seriesMatchups.push({ higher: prevWinners[1], lower: prevWinners[2] });
        } else if (roundNumber === 4) {
            roundName = '🏆 NARBL Championship';
            bestOf = 5;
            const prevResults = pd.interactiveResults.nationalRounds[2];
            seriesMatchups.push({ higher: prevResults[0].result.winner, lower: prevResults[1].result.winner });
        }

        // Simulate all series for this round
        const roundResults = seriesMatchups.map(m => ({
            result: helpers.simulatePlayoffSeries(m.higher, m.lower, bestOf)
        }));
        pd.interactiveResults.nationalRounds.push(roundResults);

        // Check if user was eliminated this round
        const userEliminated = roundResults.some(s =>
            s.result.loser.id === userTeam.id
        );

        // For the finals, also handle 3rd place + championship bonus
        if (roundNumber === 4) {
            const champion = roundResults[0].result.winner;
            helpers.applyChampionshipBonus(champion);
            // Update the postseason T2 champion from interactive results
            postseason.t2.champion = champion;
            postseason.t2.runnerUp = roundResults[0].result.loser;
        }

        const html = UIRenderer.t2NationalRoundPage({
            roundName, roundNumber, roundResults, userTeam,
            isChampionshipRound: roundNumber === 4,
            champion: roundNumber === 4 ? roundResults[0].result.winner : null,
            formatSeriesResult: (sr, ut, isF) => UIRenderer.seriesResultCard({ seriesResult: sr, isUserInvolved: sr.higherSeed.id === ut.id || sr.lowerSeed.id === ut.id, isFinals: isF })
        });

        document.getElementById('championshipPlayoffContent').innerHTML = html;
    }

    continueT2AfterNationalRound() {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const currentRound = pd.interactiveResults.nationalRounds.length;
        const userTeam = helpers.getUserTeam();

        // Check if user was eliminated in the last round
        const lastRound = pd.interactiveResults.nationalRounds[currentRound - 1];
        const userEliminated = lastRound.some(s => s.result.loser.id === userTeam.id);

        if (userEliminated && currentRound < 4) {
            this._showT2EliminationAndSummary(`National Tournament Round ${currentRound}`);
            return;
        }

        if (currentRound >= 4) {
            // Championship is done — continue to postseason wrap-up
            this._finishT2Playoffs();
            return;
        }

        // Advance to next national round
        this._showT2NationalRound(currentRound + 1);
    }

    simAllT2Rounds() {
        const { gameState, helpers } = this.ctx;
        const pd = gameState.t2PlayoffData;
        const postseason = gameState.postseasonResults;

        // The background simulation already has all results — just use those
        document.getElementById('championshipPlayoffContent').innerHTML =
            UIRenderer.t2PlayoffCompleteQuick({ champion: postseason.t2.champion });
    }

    _showT2EliminationAndSummary(eliminatedIn) {
        const { gameState, helpers } = this.ctx;
        const postseason = gameState.postseasonResults;
        const userTeam = helpers.getUserTeam();

        const html = UIRenderer.t2EliminationPage({
            userTeam,
            eliminatedIn,
            champion: postseason.t2.champion
        });

        document.getElementById('championshipPlayoffContent').innerHTML = html;
    }

    _finishT2Playoffs() {
        const { gameState, helpers } = this.ctx;
        document.getElementById('championshipPlayoffModal').classList.add('hidden');

        const offseasonCtrl = helpers.getOffseasonController ? helpers.getOffseasonController() : null;
        if (offseasonCtrl) {
            offseasonCtrl.continueAfterPostseason();
        } else {
            helpers.executePromotionRelegationFromResults();
            helpers.proceedToDraftOrDevelopment();
        }
    }

    skipT2Playoffs() {
        this._finishT2Playoffs();
    }

    // ═══════════════════════════════════════════════════════════════════
    // Simulate Other Tiers to Completion
    // ═══════════════════════════════════════════════════════════════════

    simulateOtherTiersToCompletion() {
        const { gameState, helpers } = this.ctx;

        if (gameState.currentTier !== 1) {
            console.log('Simulating Tier 1 to completion...');
            gameState.tier1Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const tier1Schedule = helpers.generateSchedule(gameState.tier1Teams, 82);
            tier1Schedule.forEach(game => {
                const h = gameState.tier1Teams.find(t => t.id === game.homeTeamId);
                const a = gameState.tier1Teams.find(t => t.id === game.awayTeamId);
                if (h && a) helpers.simulateGame(h, a);
            });
        }
        if (gameState.currentTier !== 2) {
            console.log('Simulating Tier 2 to completion...');
            gameState.tier2Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const tier2Schedule = helpers.generateSchedule(gameState.tier2Teams, 60);
            tier2Schedule.forEach(game => {
                const h = gameState.tier2Teams.find(t => t.id === game.homeTeamId);
                const a = gameState.tier2Teams.find(t => t.id === game.awayTeamId);
                if (h && a) helpers.simulateGame(h, a);
            });
        }
        if (gameState.currentTier !== 3) {
            console.log('Simulating Tier 3 to completion...');
            gameState.tier3Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const tier3Schedule = helpers.generateSchedule(gameState.tier3Teams, 40);
            tier3Schedule.forEach(game => {
                const h = gameState.tier3Teams.find(t => t.id === game.homeTeamId);
                const a = gameState.tier3Teams.find(t => t.id === game.awayTeamId);
                if (h && a) helpers.simulateGame(h, a);
            });
        }
        console.log('✅ All other tiers simulated to completion');
    }

    simulateOtherTier() {
        const { gameState, helpers } = this.ctx;

        if (gameState.currentTier !== 1) {
            gameState.tier1Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const s = helpers.generateSchedule(gameState.tier1Teams, 82);
            s.forEach(g => { const h = gameState.tier1Teams.find(t => t.id === g.homeTeamId); const a = gameState.tier1Teams.find(t => t.id === g.awayTeamId); helpers.simulateGame(h, a); });
        }
        if (gameState.currentTier !== 2) {
            gameState.tier2Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const s = helpers.generateSchedule(gameState.tier2Teams, 60);
            s.forEach(g => { const h = gameState.tier2Teams.find(t => t.id === g.homeTeamId); const a = gameState.tier2Teams.find(t => t.id === g.awayTeamId); helpers.simulateGame(h, a); });
        }
        if (gameState.currentTier !== 3) {
            gameState.tier3Teams.forEach(t => { t.wins = 0; t.losses = 0; t.pointDiff = 0; });
            const s = helpers.generateSchedule(gameState.tier3Teams, 40);
            s.forEach(g => { const h = gameState.tier3Teams.find(t => t.id === g.homeTeamId); const a = gameState.tier3Teams.find(t => t.id === g.awayTeamId); helpers.simulateGame(h, a); });
        }
    }
}
