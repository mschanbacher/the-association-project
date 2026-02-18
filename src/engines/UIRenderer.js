// ═══════════════════════════════════════════════════════════════════
// UIRenderer — Pure rendering functions for The Association Project
// ═══════════════════════════════════════════════════════════════════
//
// Every function in this module:
//   ✅ Takes data as parameters
//   ✅ Returns an HTML string
//   ❌ Never reads gameState
//   ❌ Never modifies DOM directly
//   ❌ Never calls game logic
//
// This separation allows:
//   - Complete UI redesign without touching simulation
//   - Unit testing of rendering logic
//   - Future migration to a framework (React, etc.)
//

export class UIRenderer {

    // ═══════════════════════════════════════════════════════════════
    // SHARED HELPERS
    // ═══════════════════════════════════════════════════════════════

    static rankSuffix(n) {
        if (!n) return '';
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    static pct(wins, losses) {
        const total = wins + losses;
        return total > 0 ? (wins / total * 100).toFixed(1) : '0.0';
    }

    static winColor(wins, losses) {
        const p = wins / Math.max(1, wins + losses);
        return p >= 0.6 ? '#4ecdc4' : p <= 0.4 ? '#ff6b6b' : '';
    }

    static formatCurrency(amount) {
        if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
        if (amount >= 1000) return '$' + (amount / 1000).toFixed(0) + 'K';
        return '$' + amount;
    }

    static tierLabel(tier) {
        return tier === 1 ? 'Tier 1 — NAPL' : tier === 2 ? 'Tier 2 — NARBL' : 'Tier 3 — MBL';
    }

    static tierTeamCount(tier) {
        return tier === 1 ? 30 : tier === 2 ? 86 : 144;
    }

    // ═══════════════════════════════════════════════════════════════
    // SEASON END MODAL
    // ═══════════════════════════════════════════════════════════════

    /**
     * Render the season end summary for the user's team
     * @param {Object} params
     * @param {Object} params.userTeam - User's team object
     * @param {number} params.rank - User's final standing
     * @param {number} params.tier - Current tier
     * @param {string} params.status - Status text (e.g., "PROMOTED TO TIER 1")
     * @param {string} params.statusColor - CSS color for status
     * @param {string} params.nextAction - Action key for continue button
     * @param {Object} params.tierStandings - { tier1: [...], tier2: [...], tier3: [...] }
     * @param {Object} params.awards - { tier1: awardsObj, tier2: awardsObj, tier3: awardsObj }
     * @param {string} params.awardsHTML - Pre-rendered awards HTML (from StatEngine)
     * @param {string} params.seasonLabel - e.g., "2025-26"
     */
    static seasonEndModal({ userTeam, rank, tier, status, statusColor, nextAction, 
                            tierStandings, awardsHTML, seasonLabel }) {
        const totalTeams = UIRenderer.tierTeamCount(tier);
        const tierName = UIRenderer.tierLabel(tier);
        const winPct = UIRenderer.pct(userTeam.wins, userTeam.losses);
        const winCol = UIRenderer.winColor(userTeam.wins, userTeam.losses);

        return `
            <div style="text-align: center; padding: 15px;">
                <h2 style="margin-bottom: 5px;">🏁 Season ${seasonLabel} Complete!</h2>
                <p style="opacity: 0.7; margin-bottom: 20px;">${tierName}</p>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 15px;">${userTeam.city} ${userTeam.name}</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; text-align: center;">
                        <div>
                            <div style="font-size: 2em; font-weight: bold; ${winCol ? 'color:' + winCol + ';' : ''}">${userTeam.wins}-${userTeam.losses}</div>
                            <div style="opacity: 0.7; font-size: 0.85em;">Record</div>
                        </div>
                        <div>
                            <div style="font-size: 2em; font-weight: bold;">${UIRenderer.rankSuffix(rank)}</div>
                            <div style="opacity: 0.7; font-size: 0.85em;">of ${totalTeams}</div>
                        </div>
                        <div>
                            <div style="font-size: 2em; font-weight: bold;">${winPct}%</div>
                            <div style="opacity: 0.7; font-size: 0.85em;">Win %</div>
                        </div>
                        <div>
                            <div style="font-size: 2em; font-weight: bold; ${userTeam.pointDiff > 0 ? 'color:#4ecdc4;' : userTeam.pointDiff < 0 ? 'color:#ff6b6b;' : ''}">${userTeam.pointDiff > 0 ? '+' : ''}${userTeam.pointDiff}</div>
                            <div style="opacity: 0.7; font-size: 0.85em;">Point Diff</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1);">
                        <span style="font-size: 1.2em; font-weight: bold; color: ${statusColor};">${status}</span>
                    </div>
                </div>

                ${awardsHTML}

                ${UIRenderer._leagueSummarySection(tierStandings)}

                <div style="margin-top: 25px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <button onclick="advanceToNextSeason('${nextAction}')" class="success" style="font-size: 1.2em; padding: 15px 40px;">
                        Continue to Playoffs & Off-Season →
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render the league summary (top teams by tier) for season end
     */
    static _leagueSummarySection(tierStandings) {
        if (!tierStandings) return '';

        const renderTierTop = (teams, label, count) => {
            if (!teams || teams.length === 0) return '';
            const top = teams.slice(0, count);
            return `
                <div style="margin-bottom: 15px;">
                    <h4 style="margin-bottom: 8px; opacity: 0.8;">${label}</h4>
                    <div style="font-size: 0.88em;">
                        ${top.map((t, i) => `
                            <div style="display: flex; justify-content: space-between; padding: 3px 8px; ${i % 2 === 0 ? 'background: rgba(255,255,255,0.03);' : ''} border-radius: 4px;">
                                <span>${i + 1}. ${t.city} ${t.name}</span>
                                <span style="opacity: 0.8;">${t.wins}-${t.losses}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        };

        return `
            <div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 15px; margin-top: 15px;">
                <h3 style="margin-bottom: 10px; text-align: center;">League Summary</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
                    ${renderTierTop(tierStandings.tier1, '🥇 Tier 1 — NAPL (Top 5)', 5)}
                    ${renderTierTop(tierStandings.tier2, '🥈 Tier 2 — NARBL (Top 5)', 5)}
                    ${renderTierTop(tierStandings.tier3, '🥉 Tier 3 — MBL (Top 5)', 5)}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // FINANCIAL TRANSITION BRIEFING
    // ═══════════════════════════════════════════════════════════════

    static financialTransitionBriefing({ team, action, financials }) {
        const isPromoted = action === 'promoted';
        const icon = isPromoted ? '⬆️' : '⬇️';
        const color = isPromoted ? '#4ecdc4' : '#ff6b6b';
        const title = isPromoted ? 'PROMOTION' : 'RELEGATION';
        const fromTier = isPromoted ? team.tier + 1 : team.tier - 1;
        const toTier = team.tier;

        return `
            <div style="text-align: center; padding: 15px;">
                <div style="font-size: 3em; margin-bottom: 10px;">${icon}</div>
                <h2 style="color: ${color}; margin-bottom: 5px;">${title}</h2>
                <h3 style="margin-bottom: 20px;">${team.city} ${team.name}</h3>
                <p style="margin-bottom: 20px; opacity: 0.8;">
                    Moving from ${UIRenderer.tierLabel(fromTier)} to ${UIRenderer.tierLabel(toTier)}
                </p>
                
                ${financials ? `
                    <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left;">
                        <h4 style="margin-bottom: 15px; text-align: center;">💰 Financial Impact</h4>
                        ${financials}
                    </div>
                ` : ''}
                
                <button onclick="proceedToDraftOrDevelopment()" class="success" style="font-size: 1.2em; padding: 15px 40px;">
                    Continue →
                </button>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // DEVELOPMENT SUMMARY
    // ═══════════════════════════════════════════════════════════════

    static developmentSummary({ developmentLog, retirements, userTeamRetirements, notableRetirements }) {
        let html = '<div style="text-align: center; padding: 15px;">';
        html += '<h2 style="margin-bottom: 20px;">🌟 Player Development</h2>';

        // User team development changes
        if (developmentLog && developmentLog.length > 0) {
            html += '<div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 15px; margin-bottom: 15px; text-align: left;">';
            html += '<h3 style="margin-bottom: 10px;">Your Team Changes</h3>';
            for (const entry of developmentLog) {
                const arrow = entry.change > 0 ? '⬆️' : entry.change < 0 ? '⬇️' : '➡️';
                const changeColor = entry.change > 0 ? '#4ecdc4' : entry.change < 0 ? '#ff6b6b' : '#888';
                html += `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; ${developmentLog.indexOf(entry) % 2 === 0 ? 'background: rgba(255,255,255,0.03);' : ''} border-radius: 4px;">
                        <span>${arrow} ${entry.name} (${entry.position})</span>
                        <span style="color: ${changeColor}; font-weight: bold;">${entry.oldRating} → ${entry.newRating} (${entry.change > 0 ? '+' : ''}${entry.change})</span>
                    </div>
                `;
            }
            html += '</div>';
        }

        // User team retirements
        if (userTeamRetirements && userTeamRetirements.length > 0) {
            html += '<div style="background: rgba(234,67,53,0.1); border-radius: 10px; padding: 15px; margin-bottom: 15px; text-align: left; border: 1px solid rgba(234,67,53,0.2);">';
            html += '<h3 style="margin-bottom: 10px;">🎓 Retirements (Your Team)</h3>';
            for (const r of userTeamRetirements) {
                html += `
                    <div style="padding: 6px 8px;">
                        <strong>${r.name}</strong> (${r.position}, Age ${r.age}) — Peak: ${r.peakRating} OVR
                    </div>
                `;
            }
            html += '</div>';
        }

        // Notable league retirements
        if (notableRetirements && notableRetirements.length > 0) {
            html += '<div style="background: rgba(255,255,255,0.03); border-radius: 10px; padding: 15px; margin-bottom: 15px; text-align: left;">';
            html += '<h3 style="margin-bottom: 10px;">🎓 Notable League Retirements</h3>';
            for (const r of notableRetirements) {
                html += `
                    <div style="padding: 4px 8px; font-size: 0.9em; opacity: 0.8;">
                        ${r.name} (${r.team || ''}, Peak: ${r.peakRating} OVR, Age ${r.age})
                    </div>
                `;
            }
            html += '</div>';
        }

        html += '</div>';
        return html;
    }

    // ═══════════════════════════════════════════════════════════════
    // INJURY MODAL
    // ═══════════════════════════════════════════════════════════════

    static injuryModal({ player, team, injury }) {
        const severityColors = {
            'Minor': '#f9d56e',
            'Moderate': '#f39c12',
            'Severe': '#ea4335',
            'Season-Ending': '#c0392b'
        };
        const color = severityColors[injury.severity] || '#f39c12';

        return `
            <div style="text-align: center; padding: 15px;">
                <div style="font-size: 3em; margin-bottom: 10px;">🚑</div>
                <h2 style="margin-bottom: 5px;">Injury Report</h2>
                <p style="opacity: 0.7; margin-bottom: 20px;">${team.name}</p>
                
                <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
                    <h3 style="margin-bottom: 5px;">${player.name}</h3>
                    <p style="opacity: 0.7; margin-bottom: 10px;">${player.position} · ${player.rating} OVR</p>
                    
                    <div style="color: ${color}; font-size: 1.3em; font-weight: bold; margin-bottom: 5px;">
                        ${injury.name}
                    </div>
                    <div style="font-size: 0.9em; opacity: 0.8;">
                        Severity: <span style="color: ${color}; font-weight: bold;">${injury.severity}</span>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div id="restOption" onclick="selectInjuryOption('rest')" style="background: rgba(52,168,83,0.2); padding: 20px; border-radius: 8px; cursor: pointer; border: 3px solid transparent; transition: all 0.2s;">
                        <div style="font-size: 1.5em; margin-bottom: 8px;">🛏️</div>
                        <div style="font-weight: bold; margin-bottom: 5px;">Rest</div>
                        <div style="font-size: 0.85em; opacity: 0.8;">Out ${injury.gamesRemaining} game${injury.gamesRemaining !== 1 ? 's' : ''}</div>
                    </div>
                    ${injury.canPlayThrough ? `
                        <div id="playThroughOption" onclick="selectInjuryOption('playThrough')" style="background: rgba(255,152,0,0.2); padding: 20px; border-radius: 8px; cursor: pointer; border: 3px solid transparent; transition: all 0.2s;">
                            <div style="font-size: 1.5em; margin-bottom: 8px;">💪</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Play Through</div>
                            <div style="font-size: 0.85em; opacity: 0.8;">Day-to-day, ${injury.gamesRemainingIfPlaying} games</div>
                        </div>
                    ` : `
                        <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 8px; opacity: 0.4;">
                            <div style="font-size: 1.5em; margin-bottom: 8px;">🚫</div>
                            <div style="font-weight: bold; margin-bottom: 5px;">Cannot Play</div>
                            <div style="font-size: 0.85em;">Injury too severe</div>
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // ROSTER COMPLIANCE
    // ═══════════════════════════════════════════════════════════════

    static rosterComplianceModal({ isOverCap, isUnderMinimum, isOverMaximum, totalSalary, salaryCap, rosterSize, tier }) {
        const issues = [];
        if (isOverCap) issues.push(`Over ${tier === 1 ? 'salary cap' : 'spending limit'} by ${UIRenderer.formatCurrency(totalSalary - salaryCap)}`);
        if (isUnderMinimum) issues.push(`Need at least 12 players (have ${rosterSize})`);
        if (isOverMaximum) issues.push(`Maximum 15 players (have ${rosterSize})`);

        return `
            <div style="text-align: center; padding: 15px;">
                <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
                <h2 style="margin-bottom: 15px;">Roster Issues</h2>
                
                <div style="background: rgba(234,67,53,0.1); border-radius: 10px; padding: 15px; margin-bottom: 20px; border: 1px solid rgba(234,67,53,0.2);">
                    ${issues.map(i => `<div style="padding: 5px 0; color: #ff6b6b;">${i}</div>`).join('')}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; font-size: 0.9em;">
                    <div>
                        <div style="opacity: 0.7;">Roster</div>
                        <div style="font-weight: bold;">${rosterSize} players</div>
                    </div>
                    <div>
                        <div style="opacity: 0.7;">Salary</div>
                        <div style="font-weight: bold;">${UIRenderer.formatCurrency(totalSalary)}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.7;">${tier === 1 ? 'Cap' : 'Limit'}</div>
                        <div style="font-weight: bold;">${UIRenderer.formatCurrency(salaryCap)}</div>
                    </div>
                </div>
                
                <button onclick="openRosterManagementFromCompliance()" class="success" style="font-size: 1.1em; padding: 12px 30px;">
                    Open Roster Management
                </button>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // AI TRADE PROPOSAL
    // ═══════════════════════════════════════════════════════════════

    static aiTradeProposal({ proposal, userTeam, aiTeam, userSalaryBefore, userSalaryAfter, aiSalaryBefore, aiSalaryAfter }) {
        const renderPlayerRow = (player, isReceiving) => {
            const arrow = isReceiving ? '←' : '→';
            const color = isReceiving ? '#4ecdc4' : '#ff6b6b';
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: 6px; margin-bottom: 6px;">
                    <div>
                        <span style="color: ${color}; margin-right: 8px;">${arrow}</span>
                        <strong>${player.name}</strong>
                        <span style="opacity: 0.7; margin-left: 8px;">${player.position} · ${player.rating} OVR · Age ${player.age}</span>
                    </div>
                    <span style="opacity: 0.8;">${UIRenderer.formatCurrency(player.salary)}</span>
                </div>
            `;
        };

        return `
            <div style="text-align: center; padding: 15px;">
                <h2 style="margin-bottom: 5px;">📞 Trade Proposal</h2>
                <p style="opacity: 0.7; margin-bottom: 20px;">${aiTeam.name} wants to make a deal</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; text-align: left; margin-bottom: 20px;">
                    <div>
                        <h4 style="margin-bottom: 10px; color: #ff6b6b;">You Send</h4>
                        ${proposal.userGives.map(p => renderPlayerRow(p, false)).join('')}
                    </div>
                    <div>
                        <h4 style="margin-bottom: 10px; color: #4ecdc4;">You Receive</h4>
                        ${proposal.aiGives.map(p => renderPlayerRow(p, true)).join('')}
                    </div>
                </div>
                
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button onclick="acceptAiTradeProposal()" class="success" style="padding: 12px 30px; font-size: 1.1em;">✅ Accept</button>
                    <button onclick="rejectAiTradeProposal()" class="danger" style="padding: 12px 30px; font-size: 1.1em;">❌ Decline</button>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // FRANCHISE HISTORY
    // ═══════════════════════════════════════════════════════════════

    static franchiseHistory({ history, getRankSuffix }) {
        if (!history || history.length === 0) {
            return `
                <div style="text-align: center; padding: 40px; opacity: 0.7;">
                    <div style="font-size: 3em; margin-bottom: 15px;">📋</div>
                    <p style="font-size: 1.1em;">No completed seasons yet.</p>
                    <p>Complete your first season to start building your franchise history!</p>
                </div>
            `;
        }

        const totalWins = history.reduce((sum, s) => sum + (s.userTeam ? s.userTeam.wins : 0), 0);
        const totalLosses = history.reduce((sum, s) => sum + (s.userTeam ? s.userTeam.losses : 0), 0);
        const championships = history.filter(s => {
            if (!s.champions || !s.userTeam) return false;
            const tier = s.userTeam.tier;
            const champ = tier === 1 ? s.champions.tier1 : tier === 2 ? s.champions.tier2 : s.champions.tier3;
            return champ && champ.id === s.userTeam.id;
        }).length;

        let html = `
            <div style="background: linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15)); border-radius: 12px; padding: 20px; margin-bottom: 25px; border: 1px solid rgba(102,126,234,0.2);">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 15px; text-align: center;">
                    <div>
                        <div style="font-size: 2em; font-weight: bold; color: #667eea;">${history.length}</div>
                        <div style="opacity: 0.7; font-size: 0.85em;">Seasons</div>
                    </div>
                    <div>
                        <div style="font-size: 2em; font-weight: bold; color: #4ecdc4;">${totalWins}-${totalLosses}</div>
                        <div style="opacity: 0.7; font-size: 0.85em;">All-Time Record</div>
                    </div>
                    <div>
                        <div style="font-size: 2em; font-weight: bold; color: #ffd700;">${championships}</div>
                        <div style="opacity: 0.7; font-size: 0.85em;">Championships</div>
                    </div>
                    <div>
                        <div style="font-size: 2em; font-weight: bold; color: #f9d56e;">${UIRenderer.pct(totalWins, totalLosses)}%</div>
                        <div style="opacity: 0.7; font-size: 0.85em;">Win Pct</div>
                    </div>
                </div>
            </div>
        `;

        const sorted = [...history].sort((a, b) => b.season - a.season);
        const rsFn = getRankSuffix || UIRenderer.rankSuffix;

        for (const season of sorted) {
            const ut = season.userTeam;
            if (!ut) continue;
            html += UIRenderer._franchiseSeasonCard(season, ut, rsFn);
        }

        return html;
    }

    static _franchiseSeasonCard(season, ut, rankFn) {
        const tierLabel = UIRenderer.tierLabel(ut.tier);
        const winCol = UIRenderer.winColor(ut.wins, ut.losses);

        const userChamp = season.champions && (() => {
            const champ = ut.tier === 1 ? season.champions.tier1 : ut.tier === 2 ? season.champions.tier2 : season.champions.tier3;
            return champ && champ.id === ut.id;
        })();

        let promoRelStatus = '';
        if (season.promotions) {
            const promoted = [...(season.promotions.toT1 || []), ...(season.promotions.toT2 || [])];
            if (promoted.some(t => t.id === ut.id)) promoRelStatus = '⬆️ Promoted';
        }
        if (season.relegations) {
            const relegated = [...(season.relegations.fromT1 || []), ...(season.relegations.fromT2 || [])];
            if (relegated.some(t => t.id === ut.id)) promoRelStatus = '⬇️ Relegated';
        }

        const tierAwards = season.awards ? (ut.tier === 1 ? season.awards.tier1 : ut.tier === 2 ? season.awards.tier2 : season.awards.tier3) : null;
        let userAwards = [];
        if (tierAwards) {
            ['mvp', 'dpoy', 'roy', 'sixthMan', 'mostImproved'].forEach(award => {
                if (tierAwards[award] && tierAwards[award].teamId === ut.id) {
                    const labels = { mvp: 'MVP', dpoy: 'DPOY', roy: 'ROY', sixthMan: '6MOY', mostImproved: 'MIP' };
                    userAwards.push(`${labels[award]}: ${tierAwards[award].name}`);
                }
            });
        }

        const champLine = season.champions ? [
            season.champions.tier1 ? `T1: ${season.champions.tier1.name}` : null,
            season.champions.tier2 ? `T2: ${season.champions.tier2.name}` : null,
            season.champions.tier3 ? `T3: ${season.champions.tier3.name}` : null
        ].filter(Boolean).join(' · ') : '';

        return `
            <div style="background: rgba(255,255,255,0.04); border-radius: 10px; padding: 18px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.08); ${userChamp ? 'border-color: rgba(255,215,0,0.4); background: rgba(255,215,0,0.05);' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <div>
                        <span style="font-size: 1.3em; font-weight: bold;">${season.seasonLabel}</span>
                        <span style="opacity: 0.6; margin-left: 10px; font-size: 0.9em;">${tierLabel}</span>
                        ${userChamp ? '<span style="color: #ffd700; margin-left: 10px;">🏆 CHAMPION</span>' : ''}
                        ${promoRelStatus ? `<span style="margin-left: 10px; font-size: 0.9em;">${promoRelStatus}</span>` : ''}
                    </div>
                    <div style="font-size: 1.2em; font-weight: bold; ${winCol ? 'color:' + winCol + ';' : ''}">${ut.wins}-${ut.losses}</div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.88em; opacity: 0.85;">
                    <div>📊 Finished ${rankFn(ut.rank)} of ${UIRenderer.tierTeamCount(ut.tier)}</div>
                    <div>👨‍💼 Coach: ${ut.coachName}</div>
                    ${ut.topPlayer ? `<div>⭐ Best: ${ut.topPlayer.name} (${ut.topPlayer.rating} OVR, ${ut.topPlayer.position})</div>` : ''}
                </div>
                
                ${userAwards.length > 0 ? `<div style="margin-top: 8px; font-size: 0.88em;">🏅 ${userAwards.join(' · ')}</div>` : ''}
                ${tierAwards && tierAwards.mvp ? `<div style="margin-top: 8px; font-size: 0.85em; opacity: 0.7;">League MVP: ${tierAwards.mvp.name} (${tierAwards.mvp.team}) — ${tierAwards.mvp.ppg.toFixed(1)} PPG, ${tierAwards.mvp.rpg.toFixed(1)} RPG, ${tierAwards.mvp.apg.toFixed(1)} APG</div>` : ''}
                ${champLine ? `<div style="margin-top: 6px; font-size: 0.82em; opacity: 0.6;">🏆 ${champLine}</div>` : ''}
            </div>
        `;
    }
}
