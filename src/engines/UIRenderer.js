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
        if (!n && n !== 0) return '';
        const v = n % 100;
        if (v >= 11 && v <= 13) return n + 'th';
        const last = n % 10;
        if (last === 1) return n + 'st';
        if (last === 2) return n + 'nd';
        if (last === 3) return n + 'rd';
        return n + 'th';
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
        const rsFn = UIRenderer.rankSuffix;

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


    // ═══════════════════════════════════════════════════════════════
    // DEVELOPMENT & OFFSEASON
    // ═══════════════════════════════════════════════════════════════

    /**
     * Player rating change row (shared by multiple screens)
     */
    static ratingChangeRow(log, index) {
        const isImprovement = log.change > 0;
        const color = isImprovement ? '#34a853' : '#ea4335';
        const bgColor = isImprovement ? 'rgba(52,168,83,0.1)' : 'rgba(234,67,53,0.1)';
        return `
            <div style="background: ${bgColor}; padding: 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid ${color};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${log.name}</strong>
                        <span style="opacity: 0.8; margin-left: 10px;">${log.position || ''} · ${log.age} years old</span>
                    </div>
                    <div>
                        <span style="color: #999;">${log.oldRating}</span>
                        <span style="margin: 0 10px;">→</span>
                        <span style="color: ${color}; font-weight: bold;">${log.newRating}</span>
                        <span style="color: ${color}; margin-left: 10px;">(${isImprovement ? '+' : ''}${log.change})</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Retirement row for notable retirements table
     */
    static retirementTableRow(r) {
        const peakColor = r.peakRating >= 90 ? '#fbbc04' : r.peakRating >= 85 ? '#34a853' : '#8ab4f8';
        const hofBadge = r.peakRating >= 93 ? ' 🏅' : r.peakRating >= 88 && r.careerLength >= 12 ? ' ⭐' : '';
        return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
                <td style="padding: 8px 6px;"><strong>${r.name}</strong>${hofBadge}</td>
                <td style="padding: 8px 6px; text-align: center;">${r.position}</td>
                <td style="padding: 8px 6px; text-align: center;">${r.age}</td>
                <td style="padding: 8px 6px; text-align: center; color: ${peakColor}; font-weight: bold;">${r.peakRating}</td>
                <td style="padding: 8px 6px; text-align: center;">${r.careerLength}yr</td>
                <td style="padding: 8px 6px; opacity: 0.8;">T${r.tier} ${r.teamName}</td>
            </tr>
        `;
    }

    /**
     * Development summary with improvements, declines, retirements
     */
    static developmentSummaryFull({ improvements, declines, userRetirements, notableRetirements, allRetirementsCount }) {
        let html = '';

        if (userRetirements && userRetirements.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #fbbc04; margin-bottom: 15px;">👴 Retirements from Your Team (${userRetirements.length})</h3>
                    ${userRetirements.map(r => `
                        <div style="background: rgba(251,188,4,0.1); padding: 12px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid #fbbc04;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${r.name}</strong>
                                    <span style="opacity: 0.8; margin-left: 8px;">${r.position} · Age ${r.age}</span>
                                    ${r.college ? `<span style="opacity: 0.6; margin-left: 8px;">🎓 ${r.college}</span>` : ''}
                                </div>
                                <div style="text-align: right;">
                                    <span style="color: #fbbc04;">Final ${r.rating} OVR</span>
                                    <span style="opacity: 0.6; margin-left: 8px;">· Peak ${r.peakRating} · ${r.careerLength}yr career</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        if (improvements && improvements.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #34a853; margin-bottom: 15px;">⬆️ Improvements (${improvements.length})</h3>
                    ${improvements.map((log, i) => UIRenderer.ratingChangeRow(log, i)).join('')}
                </div>
            `;
        }

        if (declines && declines.length > 0) {
            html += `
                <div style="margin-bottom: 30px;">
                    <h3 style="color: #ea4335; margin-bottom: 15px;">⬇️ Declines (${declines.length})</h3>
                    ${declines.map((log, i) => UIRenderer.ratingChangeRow(log, i)).join('')}
                </div>
            `;
        }

        if (notableRetirements && notableRetirements.length > 0) {
            html += `
                <div style="margin-bottom: 20px;">
                    <h3 style="color: #9aa0a6; margin-bottom: 15px;">🏆 Notable League Retirements (${allRetirementsCount || notableRetirements.length} total)</h3>
                    <div style="background: rgba(255,255,255,0.04); border-radius: 8px; padding: 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="opacity: 0.6; font-size: 0.85em;">
                                    <th style="padding: 6px; text-align: left;">Player</th>
                                    <th style="padding: 6px; text-align: center;">Pos</th>
                                    <th style="padding: 6px; text-align: center;">Age</th>
                                    <th style="padding: 6px; text-align: center;">Peak</th>
                                    <th style="padding: 6px; text-align: center;">Career</th>
                                    <th style="padding: 6px; text-align: left;">Last Team</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${notableRetirements.map(r => UIRenderer.retirementTableRow(r)).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div style="text-align: center; margin-top: 8px; font-size: 0.85em; opacity: 0.5;">
                        🏅 = Legendary career · ⭐ = Hall of Fame candidate
                    </div>
                </div>
            `;
        }

        if ((!improvements || improvements.length === 0) && (!declines || declines.length === 0) &&
            (!userRetirements || userRetirements.length === 0) && (!notableRetirements || notableRetirements.length === 0)) {
            html = '<p style="text-align: center; opacity: 0.7; padding: 40px;">No significant changes this season.</p>';
        }

        return html;
    }

    /**
     * Expired contract player card with re-sign/release buttons
     */
    static expiredContractCard({ player, canAfford, ratingColor }) {
        return `
            <div id="expired_${player.id}" style="background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 8px; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <div>
                            <strong>${player.name}</strong>
                            <span style="opacity: 0.8; margin-left: 10px;">${player.position}</span>
                            <span style="opacity: 0.8; margin-left: 10px;">${player.age} years old</span>
                        </div>
                        <div style="margin-top: 4px;">
                            <span style="color: ${ratingColor}; font-weight: bold;">⭐ ${player.rating}</span>
                            <span style="opacity: 0.7; margin-left: 15px;">💰 ${UIRenderer.formatCurrency(player.salary)}/yr</span>
                            ${!canAfford ? '<span style="color: #ea4335; margin-left: 10px;">⚠️ Can\'t afford</span>' : ''}
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="resignExpiredPlayer(${player.id})" ${!canAfford ? 'disabled' : ''} class="success" style="padding: 8px 16px; font-size: 0.9em; ${!canAfford ? 'opacity: 0.5; cursor: not-allowed;' : ''}">✅ Re-sign</button>
                        <button onclick="releaseExpiredPlayer(${player.id})" class="danger" style="padding: 8px 16px; font-size: 0.9em;">❌ Release</button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Contract decision card (for contract decisions modal)
     */
    static contractDecisionCard({ player, canAfford, newContractYears, ratingColor }) {
        return `
            <div id="contract_${player.id}" style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 12px; border-radius: 8px; border: 2px solid transparent; transition: all 0.2s;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <div style="margin-bottom: 8px;">
                            <strong style="font-size: 1.1em;">${player.name}</strong>
                            <span style="opacity: 0.8; margin-left: 10px;">${player.position}</span>
                            <span style="opacity: 0.8; margin-left: 10px;">Age ${player.age}</span>
                        </div>
                        <div>
                            <span style="color: ${ratingColor}; font-weight: bold;">⭐ ${player.rating}</span>
                            <span style="opacity: 0.7; margin-left: 15px;">💰 ${UIRenderer.formatCurrency(player.salary)}/yr</span>
                            <span style="color: #fbbc04; margin-left: 15px;">📝 New: ${newContractYears} year${newContractYears > 1 ? 's' : ''}</span>
                            ${!canAfford ? '<span style="color: #ea4335; margin-left: 10px;">⚠️ Can\'t afford</span>' : ''}
                        </div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <button id="resign_${player.id}" onclick="makeContractDecision(${player.id}, 'resign')" ${!canAfford ? 'disabled' : ''} style="padding: 10px; border-radius: 6px; background: rgba(52,168,83,0.2); border: 2px solid transparent; cursor: pointer; ${!canAfford ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
                        <strong style="color: #34a853;">✅ Re-sign (${newContractYears}yr)</strong>
                    </button>
                    <button id="release_${player.id}" onclick="makeContractDecision(${player.id}, 'release')" style="padding: 10px; border-radius: 6px; background: rgba(234,67,53,0.2); border: 2px solid transparent; cursor: pointer;">
                        <strong style="color: #ea4335;">❌ Release to FA</strong>
                    </button>
                </div>
                <div id="decision_status_${player.id}" style="margin-top: 10px; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; text-align: center; opacity: 0; transition: opacity 0.2s;"></div>
            </div>
        `;
    }

    /**
     * Lottery results
     */
    static lotteryResults({ lotteryResults, userTeamId }) {
        let html = `
            <div style="text-align: center; margin-bottom: 30px;">
                <p style="font-size: 1.1em; opacity: 0.9;">14 teams competed for the top 4 picks...</p>
            </div>
        `;

        html += '<div style="background: rgba(255,215,0,0.1); padding: 20px; border-radius: 8px; margin-bottom: 20px;">';
        html += '<h2 style="text-align: center; margin-bottom: 20px; color: #ffd700;">🎰 Lottery Winners (Picks 1-4)</h2>';

        const top4 = lotteryResults.slice(0, 4);
        top4.forEach(result => {
            const isUser = result.team.id === userTeamId;
            const bgColor = isUser ? 'rgba(251,188,4,0.3)' : 'rgba(255,255,255,0.05)';
            const jumpIndicator = result.jumped ? `<span style="color: #34a853; margin-left: 10px;">⬆️ Jumped from #${result.originalPosition}!</span>` : '';
            const promotedBadge = result.isPromoted ? '<span style="color: #fbbc04; margin-left: 10px;">👑 Promoted</span>' : '';
            html += `
                <div style="background: ${bgColor}; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 5px solid ${isUser ? '#fbbc04' : '#ffd700'};">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="font-size: 2em; font-weight: bold; color: #ffd700; min-width: 50px;">#${result.pick}</div>
                            <div>
                                <div style="font-size: 1.3em; font-weight: bold;">${result.team.name}</div>
                                <div style="font-size: 0.9em; opacity: 0.8; margin-top: 5px;">${result.team.wins}-${result.team.losses} record ${promotedBadge} ${jumpIndicator}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        html += '<div style="margin-top: 20px;"><h3 style="text-align: center; margin-bottom: 15px;">Remaining Lottery Picks (5-14)</h3><div style="display: grid; gap: 6px;">';
        lotteryResults.slice(4).forEach(result => {
            const isUser = result.team.id === userTeamId;
            const bgColor = isUser ? 'rgba(251,188,4,0.2)' : 'rgba(255,255,255,0.03)';
            html += `
                <div style="background: ${bgColor}; padding: 8px 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; opacity: 0.7;">Pick ${result.pick}</span>
                        <span>${result.team.name}</span>
                    </div>
                    <span style="opacity: 0.6; font-size: 0.9em;">${result.team.wins}-${result.team.losses}</span>
                </div>
            `;
        });
        html += '</div></div>';

        const userResult = lotteryResults.find(r => r.team.id === userTeamId);
        if (userResult) {
            const message = userResult.pick <= 4 ? `🎉 You won the #${userResult.pick} pick!` : `You have the #${userResult.pick} pick.`;
            html += `<div style="margin-top: 25px; padding: 20px; background: rgba(251,188,4,0.2); border-radius: 8px; text-align: center;"><p style="font-size: 1.3em; font-weight: bold;">${message}</p></div>`;
        }

        return html;
    }

    /**
     * Draft round results
     */
    static draftRoundResults({ roundResults, roundTitle, userTeamId, getRatingColor }) {
        let html = `<h2 style="text-align: center; margin-bottom: 20px;">${roundTitle}</h2>`;

        if (!roundResults || roundResults.length === 0) {
            html += '<p style="text-align: center; opacity: 0.7; padding: 40px;">No picks in this round.</p>';
            return html;
        }

        html += '<div style="display: grid; gap: 8px;">';
        roundResults.forEach(result => {
            const isUserPick = result.teamId === userTeamId;
            const bgColor = isUserPick ? 'rgba(251,188,4,0.2)' : 'rgba(255,255,255,0.05)';
            const borderColor = isUserPick ? '#fbbc04' : result.isCompensatory ? '#34a853' : 'transparent';
            const wasTraded = result.originalTeamId && result.originalTeamId !== result.teamId;
            const tradedIndicator = wasTraded ? `<span style="color: #667eea; margin-left: 8px; font-size: 0.85em;">(via ${result.originalTeamName})</span>` : '';
            const ratingColor = getRatingColor ? getRatingColor(result.player.rating) : '#fff';
            html += `
                <div style="background: ${bgColor}; padding: 12px; border-radius: 6px; border-left: 4px solid ${borderColor}; display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 1.2em; font-weight: bold; opacity: 0.6; min-width: 40px;">#${result.pick}</div>
                        <div>
                            <div style="font-weight: bold;">${result.player.name}</div>
                            <div style="font-size: 0.9em; opacity: 0.8; margin-top: 3px;">${result.player.position} | Age ${result.player.age}</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: ${ratingColor}; font-weight: bold; font-size: 1.1em;">⭐ ${result.player.rating}</div>
                        <div style="font-size: 0.85em; opacity: 0.7; margin-top: 3px;">${result.teamName} ${tradedIndicator}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    /**
     * User's draft picks summary
     */
    static userDraftPicks({ picks, teamName, getRatingColor }) {
        let html = `<h2 style="text-align: center; margin-bottom: 20px;">Your Picks: ${teamName}</h2>`;
        if (!picks || picks.length === 0) {
            html += '<p style="text-align: center; opacity: 0.7; padding: 40px;">You had no picks in this draft.</p>';
            return html;
        }
        html += '<div style="display: grid; gap: 10px;">';
        picks.forEach(result => {
            const roundLabel = result.round === 'Comp' ? 'Comp' : `Rd ${result.round}`;
            const ratingColor = getRatingColor ? getRatingColor(result.player.rating) : '#fff';
            html += `
                <div style="background: rgba(251,188,4,0.15); padding: 15px; border-radius: 8px; border-left: 5px solid #fbbc04;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 15px;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #fbbc04;">${roundLabel} #${result.pick}</div>
                            <div>
                                <div style="font-weight: bold; font-size: 1.1em;">${result.player.name}</div>
                                <div style="font-size: 0.9em; opacity: 0.8;">${result.player.position} | Age ${result.player.age}</div>
                            </div>
                        </div>
                        <div style="color: ${ratingColor}; font-weight: bold; font-size: 1.3em;">⭐ ${result.player.rating}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        return html;
    }

    // ═══════════════════════════════════════════════════════════════
    // STANDINGS
    // ═══════════════════════════════════════════════════════════════

    static standingsTable({ teams, userTeamId, title, showTier, getRatingColor }) {
        if (!teams || teams.length === 0) return '<p style="opacity: 0.7;">No teams.</p>';

        let html = '';
        if (title) html += `<h3 style="margin-bottom: 10px;">${title}</h3>`;
        html += '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">';
        html += `<thead><tr style="opacity: 0.6; border-bottom: 2px solid rgba(255,255,255,0.1);">
            <th style="padding: 8px; text-align: left;">#</th>
            <th style="padding: 8px; text-align: left;">Team</th>
            <th style="padding: 8px; text-align: center;">W</th>
            <th style="padding: 8px; text-align: center;">L</th>
            <th style="padding: 8px; text-align: center;">PCT</th>
            <th style="padding: 8px; text-align: center;">DIFF</th>
            ${showTier ? '<th style="padding: 8px; text-align: center;">RTG</th>' : ''}
        </tr></thead><tbody>`;

        teams.forEach((team, i) => {
            const isUser = team.id === userTeamId;
            const bg = isUser ? 'background: rgba(102,126,234,0.2);' : (i % 2 === 0 ? 'background: rgba(255,255,255,0.02);' : '');
            const winPct = ((team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0))).toFixed(3);
            const diff = (team.pointDiff || 0);
            const diffColor = diff > 0 ? '#4ecdc4' : diff < 0 ? '#ff6b6b' : '';
            html += `
                <tr style="${bg}">
                    <td style="padding: 6px 8px;">${i + 1}</td>
                    <td style="padding: 6px 8px; ${isUser ? 'font-weight: bold; color: #667eea;' : ''}">${team.city || ''} ${team.name}</td>
                    <td style="padding: 6px 8px; text-align: center;">${team.wins || 0}</td>
                    <td style="padding: 6px 8px; text-align: center;">${team.losses || 0}</td>
                    <td style="padding: 6px 8px; text-align: center;">${winPct}</td>
                    <td style="padding: 6px 8px; text-align: center; ${diffColor ? 'color:' + diffColor + ';' : ''}">${diff > 0 ? '+' : ''}${diff}</td>
                    ${showTier ? `<td style="padding: 6px 8px; text-align: center;">${Math.round(team.rating || 0)}</td>` : ''}
                </tr>
            `;
        });
        html += '</tbody></table></div>';
        return html;
    }

    // ═══════════════════════════════════════════════════════════════
    // FREE AGENCY
    // ═══════════════════════════════════════════════════════════════

    static freeAgentCard({ player, capSpace, ratingColor, canAfford }) {
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${player.name}</strong>
                    <span style="opacity: 0.8; margin-left: 10px;">${player.position} · Age ${player.age}</span>
                    <span style="color: ${ratingColor}; margin-left: 10px; font-weight: bold;">⭐ ${player.rating}</span>
                    <span style="opacity: 0.7; margin-left: 10px;">💰 ${UIRenderer.formatCurrency(player.salary)}/yr</span>
                </div>
                <button onclick="signFreeAgent(${player.id})" ${!canAfford ? 'disabled' : ''} class="success" style="padding: 6px 16px; ${!canAfford ? 'opacity: 0.4; cursor: not-allowed;' : ''}">Sign</button>
            </div>
        `;
    }

    /**
     * Free agency results summary
     */
    static freeAgencyResults({ signings, userTeamSignings, notableSignings }) {
        let html = '';

        if (userTeamSignings && userTeamSignings.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += '<h3 style="color: #34a853; margin-bottom: 10px;">✅ Your Signings</h3>';
            userTeamSignings.forEach(s => {
                html += `<div style="background: rgba(52,168,83,0.1); padding: 10px; margin-bottom: 6px; border-radius: 6px;">
                    <strong>${s.playerName}</strong> <span style="opacity: 0.8;">${s.position} · ${s.rating} OVR · ${UIRenderer.formatCurrency(s.salary)}/yr</span>
                </div>`;
            });
            html += '</div>';
        }

        if (notableSignings && notableSignings.length > 0) {
            html += '<div style="margin-bottom: 20px;">';
            html += `<h3 style="opacity: 0.8; margin-bottom: 10px;">📋 Notable League Signings (${signings ? signings.length : 0} total)</h3>`;
            notableSignings.slice(0, 15).forEach(s => {
                html += `<div style="background: rgba(255,255,255,0.03); padding: 8px; margin-bottom: 4px; border-radius: 4px; font-size: 0.9em;">
                    <strong>${s.playerName}</strong> → ${s.teamName} <span style="opacity: 0.7;">(${s.position}, ${s.rating} OVR)</span>
                </div>`;
            });
            html += '</div>';
        }

        if ((!userTeamSignings || userTeamSignings.length === 0) && (!notableSignings || notableSignings.length === 0)) {
            html = '<p style="text-align: center; opacity: 0.7; padding: 20px;">No significant signings this period.</p>';
        }

        return html;
    }

    // ═══════════════════════════════════════════════════════════════
    // TRADE SCREEN
    // ═══════════════════════════════════════════════════════════════

    static tradePlayerRow({ player, side, ratingColor }) {
        const action = side === 'user' ? 'addToTradeFromUser' : 'addToTradeFromAI';
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 8px 10px; margin-bottom: 6px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="${action}(${player.id})">
                <div>
                    <strong>${player.name}</strong>
                    <span style="opacity: 0.8; margin-left: 8px;">${player.position}</span>
                </div>
                <div>
                    <span style="color: ${ratingColor}; font-weight: bold;">${player.rating}</span>
                    <span style="opacity: 0.7; margin-left: 10px;">${UIRenderer.formatCurrency(player.salary)}</span>
                    <span style="opacity: 0.5; margin-left: 8px;">Age ${player.age}</span>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // ALL-STAR MODAL
    // ═══════════════════════════════════════════════════════════════

    static allStarPlayerRow(p) {
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: rgba(255,255,255,0.03); border-radius: 4px; margin-bottom: 4px;">
                <div>
                    <strong>${p.player.name}</strong>
                    <span style="opacity: 0.7; margin-left: 8px;">${p.player.position} · ${p.team.name}</span>
                </div>
                <div style="opacity: 0.8; font-size: 0.9em;">
                    ${p.avgs ? `${p.avgs.pointsPerGame} PPG · ${p.avgs.reboundsPerGame} RPG · ${p.avgs.assistsPerGame} APG` : ''}
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // SCOUTING
    // ═══════════════════════════════════════════════════════════════

    static scoutPlayerCard({ player, isWatchlisted, ratingColor }) {
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 8px; border-radius: 6px; cursor: pointer;" onclick="showPlayerScoutDetail(${player.id})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong>${player.name}</strong>
                        <span style="opacity: 0.8; margin-left: 10px;">${player.position} · Age ${player.age}</span>
                        ${isWatchlisted ? '<span style="color: #fbbc04; margin-left: 8px;">⭐</span>' : ''}
                    </div>
                    <div>
                        <span style="color: ${ratingColor}; font-weight: bold;">${player.rating} OVR</span>
                        <span style="opacity: 0.7; margin-left: 10px;">${player.team || ''}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // COACHING
    // ═══════════════════════════════════════════════════════════════

    static coachCard({ coach, isCurrent, canAfford }) {
        return `
            <div style="background: rgba(255,255,255,0.05); padding: 15px; margin-bottom: 10px; border-radius: 8px; ${isCurrent ? 'border: 2px solid #667eea;' : ''}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 1.1em;">${coach.name}</strong>
                        <span style="opacity: 0.7; margin-left: 10px;">${coach.archetype || 'Standard'}</span>
                        ${isCurrent ? '<span style="color: #667eea; margin-left: 10px;">Current Coach</span>' : ''}
                    </div>
                    <div>
                        <span style="font-weight: bold;">⭐ ${coach.rating || 'N/A'}</span>
                        <span style="opacity: 0.7; margin-left: 10px;">💰 ${UIRenderer.formatCurrency(coach.salary || 0)}/yr</span>
                    </div>
                </div>
            </div>
        `;
    }

    // ═══════════════════════════════════════════════════════════════
    // CALENDAR
    // ═══════════════════════════════════════════════════════════════

    static calendarGameRow({ game, userTeamId }) {
        const isUserGame = game.homeTeamId === userTeamId || game.awayTeamId === userTeamId;
        const bg = isUserGame ? 'background: rgba(102,126,234,0.15);' : '';
        const result = game.played ? `${game.homeScore}-${game.awayScore}` : 'Upcoming';
        return `
            <div style="padding: 6px 10px; ${bg} border-radius: 4px; display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;">
                <span>${game.awayTeamName || 'Away'} @ ${game.homeTeamName || 'Home'}</span>
                <span style="opacity: 0.8;">${result}</span>
            </div>
        `;
    }
}
