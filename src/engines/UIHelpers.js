// ═══════════════════════════════════════════════════════════════════
// UIHelpers — Shared UI formatting and display utility functions
// ═══════════════════════════════════════════════════════════════════
// Extracted in Phase 3E. Handles:
//   • Rating color mapping
//   • Ordinal suffix generation
//   • Position breakdown HTML generation
//   • Grade color mapping (delegated to ScoutingEngine)
//
// No dependencies — all inputs passed as parameters.
// ═══════════════════════════════════════════════════════════════════

export class UIHelpers {

    // ─── RATING COLOR ───
    // Returns a color code based on player rating tier
    static getRatingColor(rating) {
        if (rating >= 85) return '#ffd700';
        if (rating >= 75) return '#34a853';
        if (rating >= 65) return '#667eea';
        if (rating >= 55) return '#999';
        return '#666';
    }

    // ─── ORDINAL SUFFIX ───
    // Returns ordinal suffix for a number (st, nd, rd, th)
    static getRankSuffix(n) {
        if (n === 1) return 'st';
        if (n === 2) return 'nd';
        if (n === 3) return 'rd';
        return 'th';
    }

    // ─── POSITION BREAKDOWN HTML ───
    // Generates an HTML widget showing roster position distribution
    static generatePositionBreakdownHTML(roster, title = "Position Breakdown") {
        if (!roster || roster.length === 0) {
            return `
                <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                    <div style="font-weight: bold; margin-bottom: 8px;">${title}:</div>
                    <div style="text-align: center; opacity: 0.6;">No players on roster</div>
                </div>
            `;
        }

        // Count by position
        const positionCounts = { 'PG': 0, 'SG': 0, 'SF': 0, 'PF': 0, 'C': 0 };
        roster.forEach(p => {
            if (p.position && positionCounts.hasOwnProperty(p.position)) {
                positionCounts[p.position]++;
            }
        });

        const idealCount = 3;

        return `
            <div style="margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.05); border-radius: 6px;">
                <div style="font-weight: bold; margin-bottom: 8px;">${title}:</div>
                <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; text-align: center; font-size: 0.9em;">
                    ${['PG', 'SG', 'SF', 'PF', 'C'].map(pos => {
                        const count = positionCounts[pos];
                        let color = '#667eea';
                        if (count === 0) color = '#ea4335';
                        else if (count === 1) color = '#ffa500';
                        else if (count >= idealCount) color = '#34a853';

                        return `
                            <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 4px; border: 2px solid ${color};">
                                <div style="font-weight: bold;">${pos}</div>
                                <div style="font-size: 1.2em; color: ${color};">${count}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div style="margin-top: 10px; font-size: 0.85em; opacity: 0.7; text-align: center;">
                    <span style="color: #34a853;">●</span> Balanced
                    <span style="margin: 0 8px;">|</span>
                    <span style="color: #ffa500;">●</span> Thin
                    <span style="margin: 0 8px;">|</span>
                    <span style="color: #ea4335;">●</span> Missing
                </div>
            </div>
        `;
    }
}
