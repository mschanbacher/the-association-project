/**
 * CoachManagementController.js
 * Handles coach hiring, firing, poaching, and the coaching market UI.
 * 
 * Extracted from index.html — all HTML generation delegated to UIRenderer,
 * all coach logic delegated to CoachEngine.
 */
export class CoachManagementController {
    constructor({ gameState, engines, helpers }) {
        this.gameState = gameState;
        this.CoachEngine = engines.CoachEngine;
        this.SalaryCapEngine = engines.SalaryCapEngine;
        this.UIRenderer = engines.UIRenderer;
        this.getUserTeam = helpers.getUserTeam;
        this.formatCurrency = helpers.formatCurrency;
        this.saveGameState = helpers.saveGameState;
        this.getDashboardController = helpers.getDashboardController;
        this.eventBus = helpers.eventBus;
        this.GameEvents = helpers.GameEvents;

        // State: free agent coach pool (generated lazily per session)
        this.marketPool = [];
    }

    /** Open the coach management modal */
    open() {
        const userTeam = this.getUserTeam();
        if (!userTeam) return;
        const coach = userTeam.coach;
        const synergy = this.CoachEngine.calculateSynergy(coach, userTeam.roster);

        let coachSection = '';
        if (coach) {
            coachSection = this._buildCurrentCoachHTML(coach, synergy);
        } else {
            coachSection = this.UIRenderer.noCoachWarning();
        }

        document.getElementById('coachModalContent').innerHTML = this.UIRenderer.coachManagementPage({
            coachSection, hasCoach: !!coach
        });
        document.getElementById('coachModal').classList.remove('hidden');
    }

    /** Close the coach management modal */
    close() {
        document.getElementById('coachModal').classList.add('hidden');
    }

    /** Show the coaching market (free agents + poachable) */
    showMarket() {
        const userTeam = this.getUserTeam();
        if (!userTeam) return;

        // Generate pool if not already done
        if (this.marketPool.length === 0) {
            this.marketPool = this.CoachEngine.generateCoachPool(10, userTeam.tier);
        }

        // Collect poachable coaches from other teams in same tier
        const tierTeams = this.gameState.getTeamsByTier(userTeam.tier);
        const poachable = tierTeams
            .filter(t => t.id !== userTeam.id && t.coach)
            .map(t => ({ ...t.coach, _fromTeam: t.name, _fromTeamId: t.id }))
            .sort((a, b) => b.overall - a.overall)
            .slice(0, 8);

        document.getElementById('coachMarketContainer').innerHTML = this.UIRenderer.coachMarketContainer({
            freeAgentCount: this.marketPool.length,
            poachableCount: poachable.length,
            freeAgentListHTML: this._buildCoachListHTML(this.marketPool, userTeam, false),
            poachListHTML: this._buildCoachListHTML(poachable, userTeam, true)
        });
    }

    /** Switch between free agent and poach tabs */
    showTab(tab) {
        const faList = document.getElementById('freeAgentCoachList');
        const poachList = document.getElementById('poachCoachList');
        const faTab = document.getElementById('freeAgentCoachTab');
        const poachTab = document.getElementById('poachCoachTab');

        if (tab === 'freeAgent') {
            faList.style.display = 'block';
            poachList.style.display = 'none';
            faTab.style.background = 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)';
            poachTab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        } else {
            faList.style.display = 'none';
            poachList.style.display = 'block';
            poachTab.style.background = 'linear-gradient(135deg, #34a853 0%, #2e7d32 100%)';
            faTab.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }

    /** Hire a coach (from free agent pool or poached from another team) */
    hire(coachId, isPoach) {
        const userTeam = this.getUserTeam();
        if (!userTeam) return;

        let newCoach = null;

        if (isPoach) {
            const tierTeams = this.gameState.getTeamsByTier(userTeam.tier);
            const sourceTeam = tierTeams.find(t => t.coach && t.coach.id === coachId);
            if (!sourceTeam) { alert('Coach no longer available.'); return; }

            const buyout = this.CoachEngine.calculateBuyoutCost(sourceTeam.coach);
            if (!confirm(`Poach ${sourceTeam.coach.name} from ${sourceTeam.name}?\n\nBuyout cost: ${this.SalaryCapEngine.formatCurrency(buyout)}\nSalary: ${this.SalaryCapEngine.formatCurrency(sourceTeam.coach.salary)}/yr\n\nThis will remove their coach and may affect their performance.`)) return;

            newCoach = sourceTeam.coach;
            // Give the source team a replacement coach (lower quality)
            sourceTeam.coach = this.CoachEngine.generateCoach(sourceTeam.tier);
            sourceTeam.coach.overall = Math.max(35, sourceTeam.coach.overall - 10);
            sourceTeam.coach.teamId = sourceTeam.id;
            sourceTeam.coach.archetype = 'Interim ' + sourceTeam.coach.archetype;
            console.log(`🔄 ${sourceTeam.name} assigned interim coach: ${sourceTeam.coach.name}`);
        } else {
            newCoach = this.marketPool.find(c => c.id === coachId);
            if (!newCoach) { alert('Coach no longer available.'); return; }

            if (!confirm(`Hire ${newCoach.name}?\n\nOverall: ${newCoach.overall}\nSalary: ${this.SalaryCapEngine.formatCurrency(newCoach.salary)}/yr × ${newCoach.contractYears} years\nStyle: ${newCoach.archetype}`)) return;

            // Remove from pool
            this.marketPool = this.marketPool.filter(c => c.id !== coachId);
        }

        // If team already has a coach, release them
        if (userTeam.coach) {
            console.log(`🚪 Released coach: ${userTeam.coach.name}`);
            userTeam.coach.teamId = null;
        }

        // Assign new coach
        newCoach.teamId = userTeam.id;
        newCoach.tier = userTeam.tier;
        userTeam.coach = newCoach;

        console.log(`✅ Hired coach: ${newCoach.name} (${newCoach.overall} OVR) for ${userTeam.name}`);

        this.eventBus.emit(this.GameEvents.TEAM_COACH_HIRED, {
            teamId: userTeam.id,
            teamName: userTeam.name,
            coachName: newCoach.name,
            coachOverall: newCoach.overall,
            archetype: newCoach.archetype,
            isPoach: isPoach
        });

        this.saveGameState();
        this.getDashboardController().refresh();
        this.open(); // Refresh the modal
    }

    /** Fire the current coach */
    fire() {
        const userTeam = this.getUserTeam();
        if (!userTeam || !userTeam.coach) return;

        const coach = userTeam.coach;
        const severance = Math.round(coach.salary * Math.max(1, coach.contractYears) * 0.5);

        if (!confirm(`Fire ${coach.name}?\n\nSeverance cost: ${this.SalaryCapEngine.formatCurrency(severance)}\nRemaining contract: ${coach.contractYears} year(s)\n\nYour team will operate without a head coach until you hire a replacement, which will negatively affect performance.`)) return;

        console.log(`🚪 Fired coach: ${coach.name}`);

        this.eventBus.emit(this.GameEvents.TEAM_COACH_FIRED, {
            teamId: userTeam.id,
            teamName: userTeam.name,
            coachName: coach.name,
            coachOverall: coach.overall,
            severance: severance
        });

        coach.teamId = null;
        userTeam.coach = null;

        this.saveGameState();
        this.getDashboardController().refresh();
        this.open(); // Refresh the modal
    }

    // === Private helpers ===

    _buildCurrentCoachHTML(coach, synergy) {
        let traitBars = '';
        for (const [key, def] of Object.entries(this.CoachEngine.TRAITS)) {
            const val = coach.traits[key] || 50;
            const color = this.CoachEngine.getTraitColor(val);
            const label = this.CoachEngine.getTraitLabel(key, val);
            traitBars += this.UIRenderer.coachTraitBar({ def, val, color, label });
        }

        return this.UIRenderer.currentCoachDisplay({
            coach: { ...coach, overallColor: this.CoachEngine.getOverallColor(coach.overall) },
            synergy, traitBars, formatCurrency: this.formatCurrency
        });
    }

    _buildCoachListHTML(coaches, userTeam, isPoach) {
        if (coaches.length === 0) return '<div style="text-align: center; padding: 20px; opacity: 0.6;">No coaches available</div>';

        let html = '<div style="max-height: 500px; overflow-y: auto;">';
        for (const coach of coaches) {
            const synergy = this.CoachEngine.calculateSynergy(coach, userTeam.roster);
            const buyout = isPoach ? this.CoachEngine.calculateBuyoutCost(coach) : 0;
            const topTraits = Object.entries(coach.traits)
                .sort(([,a],[,b]) => b - a)
                .slice(0, 3)
                .map(([key, val]) => `${this.CoachEngine.TRAITS[key].icon} ${this.CoachEngine.TRAITS[key].name}: ${val}`)
                .join(' · ');

            html += this.UIRenderer.coachMarketCard({ coach, synergy, topTraits, isPoach, buyout, formatCurrency: this.formatCurrency, CoachEngine: this.CoachEngine });
        }
        html += '</div>';
        return html;
    }
}
