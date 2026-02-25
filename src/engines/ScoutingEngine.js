// ═══════════════════════════════════════════════════════════════════
// ScoutingEngine — Pure scouting evaluation logic
// ═══════════════════════════════════════════════════════════════════
// Extracted in Phase 3C. Handles:
//   • System fit calculation (player vs coach traits)
//   • Role clarity evaluation (positional need assessment)
//   • Chemistry projection (team culture fit)
//   • Combined team fit grading
//
// No dependencies — all inputs passed as parameters.
// ═══════════════════════════════════════════════════════════════════

export class ScoutingEngine {

    // ─── SYSTEM FIT ───
    // How well does a player's attributes match the coach's system?
    static calculateSystemFit(player, coach) {
        if (!coach || !player.attributes) return { score: 50, grade: 'C', details: [] };
        
        let fitScore = 50; // Start at neutral
        const details = [];
        
        // Pace fit: fast players thrive in uptempo, slow players in methodical
        const paceCoach = coach.traits ? coach.traits.pace : 50;
        if (paceCoach >= 65) {
            // Uptempo system values speed
            const speedFit = (player.attributes.speed - 50) * 0.4;
            const enduranceFit = (player.attributes.endurance - 50) * 0.2;
            fitScore += speedFit + enduranceFit;
            if (player.attributes.speed >= 65) details.push('⚡ Speed fits uptempo system');
            else if (player.attributes.speed <= 40) details.push('🐢 Too slow for uptempo pace');
        } else if (paceCoach <= 35) {
            // Slow system values strength and IQ
            const strengthFit = (player.attributes.strength - 50) * 0.3;
            const iqFit = (player.attributes.basketballIQ - 50) * 0.3;
            fitScore += strengthFit + iqFit;
            if (player.attributes.strength >= 60) details.push('💪 Physical style fits half-court game');
            if (player.attributes.basketballIQ >= 65) details.push('🧠 High IQ suits methodical play');
        }
        
        // Ball movement fit
        const bmCoach = coach.traits ? coach.traits.ballMovement : 50;
        if (bmCoach >= 65) {
            // Motion offense values IQ and collaboration
            const iqFit = (player.attributes.basketballIQ - 50) * 0.3;
            const collabFit = (player.attributes.collaboration - 50) * 0.25;
            fitScore += iqFit + collabFit;
            if (player.attributes.collaboration >= 60) details.push('🤝 Unselfish player fits motion offense');
            if (player.attributes.basketballIQ >= 65) details.push('🧠 Smart passer for ball movement');
        } else if (bmCoach <= 35) {
            // ISO system values clutch
            const clutchFit = (player.attributes.clutch - 50) * 0.35;
            fitScore += clutchFit;
            if (player.attributes.clutch >= 65) details.push('❄️ Clutch scorer suits isolation system');
        }
        
        // 3PT tendency fit
        const tptCoach = coach.traits ? coach.traits.threePointTendency : 50;
        if (tptCoach >= 65) {
            // Analytics style — speed and IQ matter more
            const iqBonus = (player.attributes.basketballIQ - 50) * 0.2;
            fitScore += iqBonus;
            if (player.attributes.speed >= 55 && player.attributes.basketballIQ >= 55) {
                details.push('🎯 Profile fits modern 3PT offense');
            }
        }
        
        // Defensive intensity fit
        const defCoach = coach.traits ? coach.traits.defensiveIntensity : 50;
        if (defCoach >= 65) {
            const endFit = (player.attributes.endurance - 50) * 0.25;
            const speedFit = (player.attributes.speed - 50) * 0.2;
            fitScore += endFit + speedFit;
            if (player.attributes.endurance >= 60 && player.attributes.speed >= 55) {
                details.push('🛡️ Stamina and quickness suit aggressive D');
            }
        }
        
        // Coachability amplifies fit (good or bad)
        const coachability = player.attributes.coachability || 50;
        if (coachability >= 65) {
            fitScore = 50 + (fitScore - 50) * 1.2; // Amplify positive fit
            details.push('📋 Highly coachable — adapts to any system');
        } else if (coachability <= 35) {
            fitScore = 50 + (fitScore - 50) * 0.7; // Dampen fit
            details.push('📋 Low coachability — slow to learn system');
        }
        
        // Clamp 0-100
        fitScore = Math.max(0, Math.min(100, Math.round(fitScore)));
        
        // Letter grade
        let grade;
        if (fitScore >= 85) grade = 'A+';
        else if (fitScore >= 78) grade = 'A';
        else if (fitScore >= 72) grade = 'A-';
        else if (fitScore >= 66) grade = 'B+';
        else if (fitScore >= 60) grade = 'B';
        else if (fitScore >= 54) grade = 'B-';
        else if (fitScore >= 48) grade = 'C+';
        else if (fitScore >= 42) grade = 'C';
        else if (fitScore >= 36) grade = 'C-';
        else if (fitScore >= 28) grade = 'D';
        else grade = 'F';
        
        return { score: fitScore, grade, details: details.slice(0, 3) };
    }

    // ─── ROLE CLARITY ───
    // Would this player fill a real need on the team?
    static calculateRoleClarity(player, userTeam) {
        if (!userTeam || !userTeam.roster) return { score: 50, label: 'Unknown' };
        
        const pos = player.position;
        const samePos = userTeam.roster.filter(p => p.position === pos);
        const rosterSize = userTeam.roster.length;
        
        // Ideal: 3 players per position for a 15-man roster
        let score = 50;
        let label = 'Depth Piece';
        
        if (samePos.length === 0) {
            score = 95; label = '🔥 Critical Need';
        } else if (samePos.length === 1) {
            score = 80; label = '📢 Strong Need';
        } else if (samePos.length === 2) {
            score = 60; label = 'Solid Addition';
        } else if (samePos.length === 3) {
            score = 35; label = 'Low Priority';
        } else {
            score = 15; label = '⚠️ Position Full';
        }
        
        // Upgrade potential: if this player is better than the worst at position
        if (samePos.length > 0) {
            const worstAtPos = Math.min(...samePos.map(p => p.rating));
            if (player.rating > worstAtPos + 5) {
                score = Math.min(95, score + 15);
                label = score >= 75 ? '⬆️ Clear Upgrade' : label;
            }
        }
        
        // Age consideration: young players more valuable for rebuilding
        const avgTeamAge = userTeam.roster.reduce((s, p) => s + p.age, 0) / rosterSize;
        if (player.age <= 24 && avgTeamAge >= 28) {
            score = Math.min(95, score + 10);
        }
        
        // Roster almost full
        if (rosterSize >= 14 && score < 70) {
            score = Math.max(10, score - 10);
            if (label !== '🔥 Critical Need' && label !== '📢 Strong Need') label = 'Roster Nearly Full';
        }
        
        return { score: Math.round(score), label };
    }

    // ─── CHEMISTRY PROJECTION ───
    static calculateChemistryProjection(player, userTeam) {
        if (!userTeam || !userTeam.roster) return { score: 50, label: 'Neutral' };
        
        let score = 55;
        const details = [];
        
        // Collaboration attribute directly affects team chemistry
        const collab = (player.attributes && player.attributes.collaboration) || 50;
        score += (collab - 50) * 0.4;
        if (collab >= 65) details.push('🤝 Great teammate');
        else if (collab <= 35) details.push('⚠️ Potential locker room risk');
        
        // Work ethic impacts team culture
        const workEthic = (player.attributes && player.attributes.workEthic) || 50;
        if (workEthic >= 65) { score += 5; details.push('🔨 Hard worker'); }
        
        // Age gap: big age gaps can cause friction
        const avgAge = userTeam.roster.reduce((s, p) => s + p.age, 0) / userTeam.roster.length;
        const ageDiff = Math.abs(player.age - avgAge);
        if (ageDiff <= 3) { score += 5; }
        else if (ageDiff >= 8) { score -= 8; details.push('👴 Big age gap with core'); }
        
        score = Math.max(0, Math.min(100, Math.round(score)));
        
        let label;
        if (score >= 75) label = '🟢 Great Fit';
        else if (score >= 60) label = '🟡 Good Fit';
        else if (score >= 45) label = '🟠 Neutral';
        else label = '🔴 Risky Fit';
        
        return { score, label, details };
    }

    // ─── COMBINED TEAM FIT GRADE ───
    static calculateTeamFit(player, userTeam, coach) {
        const systemFit = ScoutingEngine.calculateSystemFit(player, coach);
        const roleFit = ScoutingEngine.calculateRoleClarity(player, userTeam);
        const chemFit = ScoutingEngine.calculateChemistryProjection(player, userTeam);
        
        // Weighted average: system 40%, role 35%, chemistry 25%
        const combined = Math.round(systemFit.score * 0.40 + roleFit.score * 0.35 + chemFit.score * 0.25);
        
        let grade;
        if (combined >= 82) grade = 'A';
        else if (combined >= 70) grade = 'B';
        else if (combined >= 55) grade = 'C';
        else if (combined >= 40) grade = 'D';
        else grade = 'F';
        
        return { combined, grade, systemFit, roleFit, chemFit };
    }

    // ─── GRADE COLOR ───
    static gradeColor(grade) {
        if (grade.startsWith('A')) return '#34a853';
        if (grade.startsWith('B')) return '#8ab4f8';
        if (grade.startsWith('C')) return '#fbbc04';
        if (grade.startsWith('D')) return '#f28b82';
        return '#ea4335';
    }
}
