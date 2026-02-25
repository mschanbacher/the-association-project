// ═══════════════════════════════════════════════════════════════════
// OwnerEngine — Pure logic for owner mode financial operations
// ═══════════════════════════════════════════════════════════════════
// Extracted in Phase 3D. Handles:
//   • Sponsor offer generation and processing
//   • AI financial autopilot defaults
//   • Arena effects on revenue
//   • Marketing effects on fanbase/commercial revenue
//
// Dependencies:
//   • FinanceEngine (accessed via window — TIER_BASELINES, FANBASE_BASELINES, getTotalRevenue)
//   • formatCurrency (passed as dep for logging only)
// ═══════════════════════════════════════════════════════════════════

export class OwnerEngine {

    // Sponsor names by tier
    static SPONSOR_NAMES = {
        1: ['NovaTech Industries', 'Meridian Health Systems', 'Atlas Financial Group', 'Vertex Energy Corp', 'Pinnacle Automotive', 'Horizon Airlines', 'Sterling Insurance', 'Apex Electronics', 'Titan Telecommunications', 'Summit Beverages'],
        2: ['Regional Credit Union', 'Valley Medical Center', 'Hometown Motors', 'Metro Brewing Co', 'Lakeside Realty', 'Crossroads Fitness', 'Pacific Coast Dental', 'Heartland Foods', 'Rivertown Bank', 'Ironside Construction'],
        3: ['Main Street Deli', 'Corner Barbershop', "Tony's Auto Body", 'Sunrise Bakery', 'Local Gym & Fitness', 'Neighborhood Hardware', 'City Pizza', 'Family Dental Care', "Dave's Tire Shop", 'Lakewood Plumbing']
    };

    // ─── SPONSOR OFFER GENERATION ───
    static generateSponsorOffers(team) {
        const tier = team.tier;
        const baselines = FinanceEngine.TIER_BASELINES[tier];
        const baseCommercial = baselines.commercial;
        const winPct = (team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0));
        const fanMultiplier = team.finances.fanbase / (FinanceEngine.FANBASE_BASELINES[tier] * team.finances.marketSize);

        const names = OwnerEngine.SPONSOR_NAMES[tier] || OwnerEngine.SPONSOR_NAMES[3];
        const numOffers = 2 + Math.floor(Math.random() * 3); // 2-4 offers
        const offers = [];

        // Existing sponsor names to avoid duplicates
        const existingNames = (team.finances.sponsorships || []).map(s => s.name);
        const availableNames = names.filter(n => !existingNames.includes(n));

        for (let i = 0; i < numOffers && availableNames.length > 0; i++) {
            const nameIdx = Math.floor(Math.random() * availableNames.length);
            const name = availableNames.splice(nameIdx, 1)[0];

            // Base value scaled to tier commercial baseline
            const valuePct = 0.15 + Math.random() * 0.20;
            let annualValue = Math.round(baseCommercial * valuePct);

            // Winning teams and big fanbases attract better deals
            annualValue = Math.round(annualValue * (0.8 + winPct * 0.4) * Math.max(0.7, Math.min(1.5, fanMultiplier)));

            // Contract length: 1-4 years
            const years = 1 + Math.floor(Math.random() * 4);

            // Some sponsors have conditions
            let condition = null;
            let conditionLabel = '';
            if (Math.random() < 0.35) {
                const conditions = [
                    { type: 'playoff', label: 'Requires playoff appearance', penalty: 0.5 },
                    { type: 'noRelegate', label: 'Voided if relegated', penalty: 0 },
                    { type: 'winPct', label: 'Bonus +20% if winning record', bonus: 0.2 }
                ];
                const cond = conditions[Math.floor(Math.random() * conditions.length)];
                condition = cond.type;
                conditionLabel = cond.label;
            }

            // Longer deals get slight discount, short deals pay premium
            const yearMultiplier = years === 1 ? 1.15 : years === 2 ? 1.05 : years === 3 ? 1.0 : 0.92;
            annualValue = Math.round(annualValue * yearMultiplier);

            offers.push({
                name: name,
                annualValue: annualValue,
                years: years,
                condition: condition,
                conditionLabel: conditionLabel
            });
        }

        team.finances.pendingSponsorOffers = offers;
        console.log(`📋 Generated ${offers.length} sponsor offers for ${team.name}`);
    }

    // ─── AI FINANCIAL DEFAULTS ───
    // Applied when Owner Mode is off — reasonable autopilot decisions
    static applyAIFinancialDefaults(team) {
        const f = team.finances;

        // Auto-accept the best unconditional sponsorship if under 3 active deals
        if (f.sponsorships.length < 3 && f.pendingSponsorOffers.length > 0) {
            const ranked = [...f.pendingSponsorOffers].sort((a, b) => {
                const aScore = a.annualValue * a.years * (a.condition ? 0.7 : 1.0);
                const bScore = b.annualValue * b.years * (b.condition ? 0.7 : 1.0);
                return bScore - aScore;
            });
            const best = ranked[0];
            if (best) {
                f.sponsorships.push({
                    name: best.name,
                    annualValue: best.annualValue,
                    yearsRemaining: best.years,
                    condition: best.condition,
                    conditionLabel: best.conditionLabel || ''
                });
                f.pendingSponsorOffers = f.pendingSponsorOffers.filter(o => o.name !== best.name);
            }
        }

        // Auto marketing: spend ~2-4% of revenue on marketing
        f.marketingBudget = Math.round(FinanceEngine.getTotalRevenue(team) * (0.02 + Math.random() * 0.02));

        // Auto ticket pricing: slight variance around 1.0
        f.ticketPriceMultiplier = 0.95 + Math.random() * 0.15; // 0.95 to 1.10

        // Auto arena management: renovate if condition is low, expand rarely
        if (f.arena && f.arena.upgradeYearsLeft <= 0) {
            if (f.arena.condition < 50 && Math.random() < 0.6) {
                const cost = Math.round(f.arena.capacity * (team.tier === 1 ? 500 : team.tier === 2 ? 200 : 80));
                f.arena.condition = Math.min(100, f.arena.condition + 25);
                f.arena.upgradeCost = Math.round(cost / 2);
                f.arena.upgradeYearsLeft = 2;
            } else if (Math.random() < 0.05) {
                const addSeats = Math.round(f.arena.capacity * 0.15);
                const cost = Math.round(f.arena.capacity * (team.tier === 1 ? 1500 : team.tier === 2 ? 800 : 300));
                f.arena.capacity += addSeats;
                f.arena.upgradeCost = Math.round(cost / 3);
                f.arena.upgradeYearsLeft = 3;
            }
        }
    }

    // ─── PROCESS SPONSORSHIPS (called during advanceFinances) ───
    static processSponsorships(team) {
        if (!team.finances || !team.finances.sponsorships) return;

        let totalSponsorRevenue = 0;
        const expiredSponsors = [];

        team.finances.sponsorships.forEach(sponsor => {
            let active = true;
            const winPct = (team.wins || 0) / Math.max(1, (team.wins || 0) + (team.losses || 0));

            if (sponsor.condition === 'noRelegate' && team.finances.previousTier && team.finances.previousTier < team.tier) {
                active = false;
                console.log(`❌ ${team.name}: Sponsor ${sponsor.name} voided due to relegation clause`);
            }

            if (active) {
                let value = sponsor.annualValue;
                if (sponsor.condition === 'winPct' && winPct > 0.5) {
                    value = Math.round(value * 1.2);
                }
                if (sponsor.condition === 'playoff') {
                    if (winPct < 0.5) {
                        value = Math.round(value * 0.5);
                    }
                }
                totalSponsorRevenue += value;
            }

            sponsor.yearsRemaining--;
            if (sponsor.yearsRemaining <= 0 || !active) {
                expiredSponsors.push(sponsor.name);
            }
        });

        team.finances.sponsorships = team.finances.sponsorships.filter(s => !expiredSponsors.includes(s.name));

        if (totalSponsorRevenue > 0) {
            team.finances.revenue.commercial += Math.round(totalSponsorRevenue * 0.5);
        }
    }

    // ─── PROCESS ARENA EFFECTS ───
    static processArenaEffects(team) {
        if (!team.finances || !team.finances.arena) return;

        const arena = team.finances.arena;
        const tier = team.tier;
        const baselines = FinanceEngine.TIER_BASELINES[tier];

        const baseCapacity = tier === 1 ? 20000 : tier === 2 ? 7000 : 2500;
        const capacityMultiplier = Math.max(0.6, Math.min(1.5, arena.capacity / baseCapacity));
        const conditionMultiplier = 0.7 + (arena.condition / 100) * 0.3;

        const ticketMult = team.finances.ticketPriceMultiplier || 1.0;
        const attendanceEffect = 1.0 - (ticketMult - 1.0) * 0.6;
        const ticketRevenueEffect = ticketMult * Math.max(0.5, attendanceEffect);

        const adjustedMatchday = Math.round(baselines.matchday * capacityMultiplier * conditionMultiplier * ticketRevenueEffect * team.finances.marketSize);

        if (team.finances.revenue.matchday <= baselines.matchday * 1.1) {
            team.finances.revenue.matchday = Math.max(team.finances.revenue.matchday, adjustedMatchday);
        }

        arena.condition = Math.max(30, arena.condition - (2 + Math.floor(Math.random() * 3)));

        if (arena.upgradeYearsLeft > 0) {
            arena.upgradeYearsLeft--;
            if (arena.upgradeYearsLeft <= 0) {
                arena.upgradeCost = 0;
                console.log(`🏟️ ${team.name}: Arena upgrade payments complete!`);
            }
        }
    }

    // ─── PROCESS MARKETING EFFECTS ───
    static processMarketingEffects(team, deps = {}) {
        if (!team.finances) return;

        const budget = team.finances.marketingBudget || 0;
        if (budget <= 0) return;

        const revenue = FinanceEngine.getTotalRevenue(team);
        const spendPct = budget / revenue;

        const effectivePct = Math.min(spendPct, 0.05) + Math.max(0, spendPct - 0.05) * 0.3;
        const fanbaseGrowth = effectivePct * 1.2;

        team.finances.fanbase = Math.round(team.finances.fanbase * (1 + fanbaseGrowth));
        team.finances.revenue.commercial = Math.round(team.finances.revenue.commercial * (1 + effectivePct * 0.3));

        const fc = deps.formatCurrency || (v => `$${v.toLocaleString()}`);
        console.log(`📢 ${team.name}: Marketing spend ${fc(budget)} → +${(fanbaseGrowth * 100).toFixed(1)}% fanbase`);
    }
}
