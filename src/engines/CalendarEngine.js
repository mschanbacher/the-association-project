// ═══════════════════════════════════════════════════════════════════
// CalendarEngine — Season schedule, calendar dates, event tracking
// ═══════════════════════════════════════════════════════════════════

export class CalendarEngine {
    
    /**
     * Get season calendar dates for a given start year
     * All tiers end on the same date, staggered starts
     */
    static getSeasonDates(startYear) {
        // Find the third Tuesday of October for T1 start
        const t1Start = CalendarEngine.getNthDayOfWeek(startYear, 9, 2, 3); // Oct, Tue, 3rd
        // First Tuesday of November for T2
        const t2Start = CalendarEngine.getNthDayOfWeek(startYear, 10, 2, 1); // Nov, Tue, 1st
        // First Tuesday of December for T3
        const t3Start = CalendarEngine.getNthDayOfWeek(startYear, 11, 2, 1); // Dec, Tue, 1st
        
        // All tiers end on April 12 of start year + 1
        const seasonEnd = new Date(startYear + 1, 3, 12); // Apr 12
        
        // All-Star break: Feb 13-18
        const allStarStart = new Date(startYear + 1, 1, 13); // Feb 13
        const allStarEnd = new Date(startYear + 1, 1, 18);   // Feb 18
        
        // Universal trade deadline: March 5
        const tradeDeadline = new Date(startYear + 1, 2, 5); // Mar 5
        
        return {
            t1Start,
            t2Start,
            t3Start,
            seasonEnd,
            allStarStart,
            allStarEnd,
            tradeDeadline,
            // Postseason dates
            playoffsStart: new Date(startYear + 1, 3, 16),     // Apr 16
            seasonOfficialEnd: new Date(startYear + 1, 5, 1),  // Jun 1
            draftLottery: new Date(startYear + 1, 5, 8),       // Jun 8
            draftDay: new Date(startYear + 1, 5, 15),          // Jun 15
            collegeFA: new Date(startYear + 1, 5, 22),         // Jun 22
            freeAgencyStart: new Date(startYear + 1, 6, 1),    // Jul 1
            freeAgencyEnd: new Date(startYear + 1, 6, 15),     // Jul 15
            rosterCompliance: new Date(startYear + 1, 6, 16),  // Jul 16
            playerDevelopment: new Date(startYear + 1, 7, 1),  // Aug 1
            ownerDecisions: new Date(startYear + 1, 7, 10),    // Aug 10
            trainingCamp: new Date(startYear + 1, 7, 16),      // Aug 16
        };
    }
    
    /**
     * Get the Nth occurrence of a day-of-week in a month
     * @param {number} year 
     * @param {number} month - 0-indexed (0=Jan, 9=Oct, etc.)
     * @param {number} dayOfWeek - 0=Sun, 1=Mon, 2=Tue, etc.
     * @param {number} nth - 1st, 2nd, 3rd, etc.
     */
    static getNthDayOfWeek(year, month, dayOfWeek, nth) {
        const firstOfMonth = new Date(year, month, 1);
        let dayOffset = dayOfWeek - firstOfMonth.getDay();
        if (dayOffset < 0) dayOffset += 7;
        const day = 1 + dayOffset + (nth - 1) * 7;
        return new Date(year, month, day);
    }
    
    /**
     * Format a date as YYYY-MM-DD string for storage and comparison
     */
    static toDateString(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Format a date for display: "Oct 21, 2025"
     */
    static formatDateDisplay(dateStr) {
        const d = new Date(dateStr + 'T12:00:00'); // noon to avoid timezone issues
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    
    /**
     * Format a date short: "Oct 21"
     */
    static formatDateShort(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()}`;
    }
    
    /**
     * Get the day of week name
     */
    static getDayOfWeek(dateStr) {
        const d = new Date(dateStr + 'T12:00:00');
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    }
    
    /**
     * Check if a date falls within the All-Star break
     */
    static isAllStarBreak(dateStr, seasonDates) {
        const d = dateStr;
        const start = CalendarEngine.toDateString(seasonDates.allStarStart);
        const end = CalendarEngine.toDateString(seasonDates.allStarEnd);
        return d >= start && d <= end;
    }
    
    /**
     * Advance a date string by N days
     */
    static addDays(dateStr, days) {
        const d = new Date(dateStr + 'T12:00:00');
        d.setDate(d.getDate() + days);
        return CalendarEngine.toDateString(d);
    }
    
    /**
     * Get number of days between two date strings
     */
    static daysBetween(dateStr1, dateStr2) {
        const d1 = new Date(dateStr1 + 'T12:00:00');
        const d2 = new Date(dateStr2 + 'T12:00:00');
        return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    }
    
    /**
     * Generate a full calendar-aware schedule for a tier
     * @param {Array} teams - Array of team objects
     * @param {number} numGames - Games per team (82, 60, or 40)
     * @param {string} startDateStr - YYYY-MM-DD start date
     * @param {string} endDateStr - YYYY-MM-DD end date
     * @param {Object} seasonDates - Season dates object (for All-Star break)
     * @returns {Array} Schedule array with date-assigned games
     */
    static generateCalendarSchedule(teams, numGames, startDateStr, endDateStr, seasonDates) {
        console.log(`📅 Generating calendar schedule: ${teams.length} teams, ${numGames} games each, ${startDateStr} to ${endDateStr}`);
        
        // Step 1: Generate all matchups (same logic as before, but we collect them)
        const matchups = CalendarEngine._generateMatchups(teams, numGames);
        console.log(`  Generated ${matchups.length} total matchups`);
        
        // Step 2: Generate the list of available game dates
        const gameDates = CalendarEngine._generateGameDates(startDateStr, endDateStr, seasonDates);
        console.log(`  Available game dates: ${gameDates.length}`);
        
        // Step 3: Distribute matchups across dates with rest constraints
        const schedule = CalendarEngine._distributeGamesToCalendar(matchups, gameDates, teams);
        console.log(`  Scheduled ${schedule.length} games across calendar`);
        
        return schedule;
    }
    
    /**
     * Generate all matchups for a tier (unordered)
     */
    static _generateMatchups(teams, numGames) {
        const matchups = [];
        const teamGameCounts = {};
        
        teams.forEach(team => {
            teamGameCounts[team.id] = 0;
        });
        
        let attempts = 0;
        const maxAttempts = numGames * teams.length * 2;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            const allTeamsFull = teams.every(team => teamGameCounts[team.id] >= numGames);
            if (allTeamsFull) break;
            
            const availableTeams = teams.filter(t => teamGameCounts[t.id] < numGames);
            if (availableTeams.length < 2) break;
            
            const team1 = availableTeams[Math.floor(Math.random() * availableTeams.length)];
            const otherTeams = availableTeams.filter(t => t.id !== team1.id);
            if (otherTeams.length === 0) break;
            
            const team2 = otherTeams[Math.floor(Math.random() * otherTeams.length)];
            
            if (Math.random() > 0.5) {
                matchups.push({ homeTeamId: team1.id, awayTeamId: team2.id, played: false });
            } else {
                matchups.push({ homeTeamId: team2.id, awayTeamId: team1.id, played: false });
            }
            
            teamGameCounts[team1.id]++;
            teamGameCounts[team2.id]++;
        }
        
        // Shuffle matchups before distributing
        for (let i = matchups.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [matchups[i], matchups[j]] = [matchups[j], matchups[i]];
        }
        
        return matchups;
    }
    
    /**
     * Generate available game dates between start and end, excluding All-Star break
     * Weight days of week: Tue/Wed/Fri/Sat are primary, Mon/Thu/Sun are secondary
     */
    static _generateGameDates(startDateStr, endDateStr, seasonDates) {
        const dates = [];
        let current = startDateStr;
        
        while (current <= endDateStr) {
            // Skip All-Star break
            if (!CalendarEngine.isAllStarBreak(current, seasonDates)) {
                dates.push(current);
            }
            current = CalendarEngine.addDays(current, 1);
        }
        
        return dates;
    }
    
    /**
     * Distribute matchups across calendar dates
     * Ensures no team plays back-to-back-to-back (max 2 in 3 days)
     * Varies games per day based on day of week
     */
    static _distributeGamesToCalendar(matchups, gameDates, teams) {
        const schedule = [];
        const teamLastPlayed = {}; // teamId -> last date string played
        const teamPlayedRecently = {}; // teamId -> array of recent date strings
        
        teams.forEach(t => {
            teamLastPlayed[t.id] = null;
            teamPlayedRecently[t.id] = [];
        });
        
        // Calculate how many games per date we need on average
        const totalGames = matchups.length;
        const totalDates = gameDates.length;
        const avgGamesPerDate = totalGames / totalDates;
        
        // Day of week weights (0=Sun through 6=Sat)
        // Primary days: Tue(2), Wed(3), Fri(5), Sat(6) — get more games
        // Secondary days: Sun(0), Mon(1), Thu(4) — get fewer games
        const dayWeights = [0.6, 0.5, 1.0, 1.0, 0.6, 1.0, 1.0]; // Sun-Sat
        
        // Calculate target games for each date
        const totalWeight = gameDates.reduce((sum, dateStr) => {
            const d = new Date(dateStr + 'T12:00:00');
            return sum + dayWeights[d.getDay()];
        }, 0);
        
        const dateTargets = gameDates.map(dateStr => {
            const d = new Date(dateStr + 'T12:00:00');
            const weight = dayWeights[d.getDay()];
            // Target based on weight, with some variance
            let target = Math.round((weight / totalWeight) * totalGames);
            // Ensure reasonable bounds — at least 1 game on game days, cap at half the teams
            const maxGamesPerDay = Math.floor(teams.length / 2);
            target = Math.max(0, Math.min(target, maxGamesPerDay));
            return { date: dateStr, target, weight };
        });
        
        // Normalize targets to sum to totalGames
        let targetSum = dateTargets.reduce((s, d) => s + d.target, 0);
        
        // Adjust if total is off
        while (targetSum < totalGames) {
            // Add games to highest-weight days that aren't maxed
            const maxGamesPerDay = Math.floor(teams.length / 2);
            const eligible = dateTargets.filter(d => d.target < maxGamesPerDay);
            if (eligible.length === 0) break;
            // Sort by weight desc, pick the highest weight day with room
            eligible.sort((a, b) => b.weight - a.weight);
            eligible[Math.floor(Math.random() * Math.min(3, eligible.length))].target++;
            targetSum++;
        }
        while (targetSum > totalGames) {
            // Remove games from lowest-weight days
            const eligible = dateTargets.filter(d => d.target > 0);
            if (eligible.length === 0) break;
            eligible.sort((a, b) => a.weight - b.weight);
            eligible[Math.floor(Math.random() * Math.min(3, eligible.length))].target--;
            targetSum--;
        }
        
        // Now distribute matchups to dates
        let matchupIndex = 0;
        const unplaced = []; // matchups that couldn't be placed due to rest constraints
        
        for (const dateInfo of dateTargets) {
            const date = dateInfo.date;
            let gamesPlacedToday = 0;
            const teamsPlayingToday = new Set();
            
            // Try to place target number of games on this date
            const toPlace = Math.min(dateInfo.target, matchups.length - matchupIndex - unplaced.length + unplaced.length);
            
            // First try to place from unplaced queue
            const stillUnplaced = [];
            for (const game of unplaced) {
                if (gamesPlacedToday >= dateInfo.target) {
                    stillUnplaced.push(game);
                    continue;
                }
                
                const homeId = game.homeTeamId;
                const awayId = game.awayTeamId;
                
                if (teamsPlayingToday.has(homeId) || teamsPlayingToday.has(awayId)) {
                    stillUnplaced.push(game);
                    continue;
                }
                
                // Check back-to-back-to-back constraint
                if (CalendarEngine._wouldCauseB2B2B(homeId, date, teamPlayedRecently) ||
                    CalendarEngine._wouldCauseB2B2B(awayId, date, teamPlayedRecently)) {
                    stillUnplaced.push(game);
                    continue;
                }
                
                game.date = date;
                schedule.push(game);
                teamsPlayingToday.add(homeId);
                teamsPlayingToday.add(awayId);
                gamesPlacedToday++;
            }
            unplaced.length = 0;
            unplaced.push(...stillUnplaced);
            
            // Now place from main queue
            while (gamesPlacedToday < dateInfo.target && matchupIndex < matchups.length) {
                const game = matchups[matchupIndex];
                const homeId = game.homeTeamId;
                const awayId = game.awayTeamId;
                
                if (teamsPlayingToday.has(homeId) || teamsPlayingToday.has(awayId)) {
                    unplaced.push(game);
                    matchupIndex++;
                    continue;
                }
                
                if (CalendarEngine._wouldCauseB2B2B(homeId, date, teamPlayedRecently) ||
                    CalendarEngine._wouldCauseB2B2B(awayId, date, teamPlayedRecently)) {
                    unplaced.push(game);
                    matchupIndex++;
                    continue;
                }
                
                game.date = date;
                schedule.push(game);
                teamsPlayingToday.add(homeId);
                teamsPlayingToday.add(awayId);
                gamesPlacedToday++;
                matchupIndex++;
            }
            
            // Update recent play tracking for all teams that played today
            for (const teamId of teamsPlayingToday) {
                if (!teamPlayedRecently[teamId]) teamPlayedRecently[teamId] = [];
                teamPlayedRecently[teamId].push(date);
                // Keep only last 3 dates
                if (teamPlayedRecently[teamId].length > 3) {
                    teamPlayedRecently[teamId].shift();
                }
                teamLastPlayed[teamId] = date;
            }
        }
        
        // Place any remaining unplaced games on the last available dates
        // (relaxing constraints if necessary)
        if (unplaced.length > 0) {
            console.log(`  ⚠️ ${unplaced.length} games need force-placement`);
            let dateIdx = gameDates.length - 1;
            for (const game of unplaced) {
                // Find a date where neither team already plays
                let placed = false;
                for (let tries = 0; tries < gameDates.length && !placed; tries++) {
                    const tryDate = gameDates[(dateIdx - tries + gameDates.length) % gameDates.length];
                    const gamesOnDate = schedule.filter(g => g.date === tryDate);
                    const teamsOnDate = new Set();
                    gamesOnDate.forEach(g => { teamsOnDate.add(g.homeTeamId); teamsOnDate.add(g.awayTeamId); });
                    
                    if (!teamsOnDate.has(game.homeTeamId) && !teamsOnDate.has(game.awayTeamId)) {
                        game.date = tryDate;
                        schedule.push(game);
                        placed = true;
                    }
                }
                if (!placed) {
                    // Absolute fallback: just put it on the last date
                    game.date = gameDates[gameDates.length - 1];
                    schedule.push(game);
                }
                dateIdx--;
            }
        }
        
        // Sort schedule by date
        schedule.sort((a, b) => a.date.localeCompare(b.date));
        
        return schedule;
    }
    
    /**
     * Check if adding a game on `date` for `teamId` would cause 3 games in 3 consecutive days
     */
    static _wouldCauseB2B2B(teamId, dateStr, teamPlayedRecently) {
        const recent = teamPlayedRecently[teamId];
        if (!recent || recent.length < 2) return false;
        
        const yesterday = CalendarEngine.addDays(dateStr, -1);
        const dayBefore = CalendarEngine.addDays(dateStr, -2);
        
        const playedYesterday = recent.includes(yesterday);
        const playedDayBefore = recent.includes(dayBefore);
        
        // Would be 3 in a row if they played both yesterday AND day before
        return playedYesterday && playedDayBefore;
    }
    
    /**
     * Get all games scheduled for a specific date across all tier schedules
     */
    static getGamesForDate(dateStr, gameState) {
        const games = {
            tier1: [],
            tier2: [],
            tier3: [],
            total: 0
        };
        
        if (gameState.tier1Schedule) {
            games.tier1 = gameState.tier1Schedule.filter(g => g.date === dateStr);
        }
        if (gameState.tier2Schedule) {
            games.tier2 = gameState.tier2Schedule.filter(g => g.date === dateStr);
        }
        if (gameState.tier3Schedule) {
            games.tier3 = gameState.tier3Schedule.filter(g => g.date === dateStr);
        }
        
        games.total = games.tier1.length + games.tier2.length + games.tier3.length;
        return games;
    }
    
    /**
     * Get the next date that has any scheduled (unplayed) games
     */
    static getNextGameDate(currentDateStr, gameState) {
        let checkDate = CalendarEngine.addDays(currentDateStr, 1);
        const maxCheck = CalendarEngine.toDateString(new Date(
            parseInt(currentDateStr.substring(0, 4)) + 1, 7, 1 // Check up to Aug of next year
        ));
        
        while (checkDate <= maxCheck) {
            const games = CalendarEngine.getGamesForDate(checkDate, gameState);
            const unplayed = games.tier1.filter(g => !g.played).length +
                           games.tier2.filter(g => !g.played).length +
                           games.tier3.filter(g => !g.played).length;
            if (unplayed > 0) return checkDate;
            checkDate = CalendarEngine.addDays(checkDate, 1);
        }
        
        return null; // No more game dates
    }
    
    /**
     * Get the next date when the user's team has a game
     */
    static getNextUserGameDate(currentDateStr, gameState) {
        const userTeamId = gameState.userTeamId;
        const userTier = gameState.currentTier;
        
        // Get the appropriate schedule
        let userSchedule;
        if (userTier === 1) userSchedule = gameState.tier1Schedule;
        else if (userTier === 2) userSchedule = gameState.tier2Schedule;
        else userSchedule = gameState.tier3Schedule;
        
        if (!userSchedule) return null;
        
        // Find the next unplayed game for the user's team after current date
        const nextGame = userSchedule.find(g => 
            !g.played && 
            g.date > currentDateStr &&
            (g.homeTeamId === userTeamId || g.awayTeamId === userTeamId)
        );
        
        return nextGame ? nextGame.date : null;
    }
    
    /**
     * Check if all regular season games are complete
     */
    static isRegularSeasonComplete(gameState) {
        const t1Done = !gameState.tier1Schedule || gameState.tier1Schedule.every(g => g.played);
        const t2Done = !gameState.tier2Schedule || gameState.tier2Schedule.every(g => g.played);
        const t3Done = !gameState.tier3Schedule || gameState.tier3Schedule.every(g => g.played);
        return t1Done && t2Done && t3Done;
    }
    
    /**
     * Get a calendar event description for the current date (All-Star, Trade Deadline, etc.)
     */
    static getCalendarEvent(dateStr, seasonDates) {
        const tradeDeadline = CalendarEngine.toDateString(seasonDates.tradeDeadline);
        const allStarStart = CalendarEngine.toDateString(seasonDates.allStarStart);
        const allStarEnd = CalendarEngine.toDateString(seasonDates.allStarEnd);
        
        if (dateStr === tradeDeadline) return '🚨 Trade Deadline';
        if (dateStr === allStarStart) return '⭐ All-Star Weekend Begins';
        if (dateStr > allStarStart && dateStr < allStarEnd) return '⭐ All-Star Break';
        if (dateStr === allStarEnd) return '⭐ All-Star Break (Final Day)';
        
        // Check for special off-season dates
        if (seasonDates.draftLottery && dateStr === CalendarEngine.toDateString(seasonDates.draftLottery)) return '🎰 Draft Lottery';
        if (seasonDates.draftDay && dateStr === CalendarEngine.toDateString(seasonDates.draftDay)) return '📋 Draft Day';
        if (seasonDates.freeAgencyStart && dateStr === CalendarEngine.toDateString(seasonDates.freeAgencyStart)) return '✍️ Free Agency Opens';
        
        return null;
    }
}
