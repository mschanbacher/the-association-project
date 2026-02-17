// ═══════════════════════════════════════════════════════════════════
// FinanceEngine — Team finances, revenue, metro populations, market size
// ═══════════════════════════════════════════════════════════════════

export const METRO_POPULATIONS = {
    // === T1 Cities (NBA markets) ===
    'New York': 20.1, 'Brooklyn': 20.1, 'LA': 13.2, 'Los Angeles': 13.2,
    'Chicago': 9.5, 'Dallas': 7.6, 'Houston': 7.1, 'Toronto': 6.2,
    'Philadelphia': 6.2, 'Atlanta': 6.1, 'Miami': 6.1, 'Phoenix': 4.9,
    'Boston': 4.9, 'San Antonio': 2.6, 'Orlando': 2.7, 'Portland': 2.5,
    'Sacramento': 2.4, 'Charlotte': 2.7, 'Indianapolis': 2.1, 'Indiana': 2.1,
    'Milwaukee': 1.6, 'Oklahoma City': 1.4, 'Memphis': 1.3, 'New Orleans': 1.3,
    'Cleveland': 2.1, 'Denver': 2.9, 'Detroit': 4.4, 'Minneapolis': 3.7,
    'Minnesota': 3.7, 'Golden State': 4.7, 'Utah': 1.2, 'Washington': 6.3,
    
    // === T2 Cities ===
    'Seattle': 4.0, 'Tampa': 3.2, 'St. Louis': 2.8, 'Baltimore': 2.8,
    'Las Vegas': 2.3, 'Austin': 2.3, 'Nashville': 2.0, 'Jacksonville': 1.6,
    'Columbus': 2.1, 'Cincinnati': 2.3, 'Kansas City': 2.2, 'Pittsburgh': 2.4,
    'Raleigh': 1.4, 'Richmond': 1.3, 'Louisville': 1.3, 'Buffalo': 1.2,
    'Rochester': 1.1, 'Hartford': 1.2, 'Omaha': 0.95, 'Tucson': 1.0,
    'Tulsa': 1.0, 'Albuquerque': 0.92, 'Fresno': 1.0, 'Grand Rapids': 1.1,
    'Greenville': 0.93, 'Knoxville': 0.9, 'Boise': 0.8, 'Des Moines': 0.7,
    'Little Rock': 0.75, 'Madison': 0.68, 'Spokane': 0.6, 'Eugene': 0.38,
    'Birmingham': 1.1, 'Norfolk': 1.8, 'Greensboro': 0.77, 'Charleston': 0.83,
    'Savannah': 0.4, 'Columbia': 0.84, 'Chattanooga': 0.57, 'Mobile': 0.43,
    'Corpus Christi': 0.49, 'Lubbock': 0.33, 'Amarillo': 0.27, 'Waco': 0.28,
    'Laredo': 0.28, 'Fort Wayne': 0.44, 'Toledo': 0.64, 'Wichita': 0.65,
    'Lincoln': 0.34, 'Sioux Falls': 0.28, 'Reno': 0.49, 'Colorado Springs': 0.76,
    'Las Cruces': 0.22, 'San Diego': 3.3, 'Anaheim': 13.2, 'Riverside': 4.6,
    'Ontario': 4.6, 'Oakland': 4.7, 'San Jose': 2.0, 'Tacoma': 4.0,
    'Olympia': 0.29, 'Bellingham': 0.23, 'Vancouver': 2.6, 'Victoria': 0.4,
    'Albany': 0.89, 'Providence': 1.6, 'Worcester': 0.95, 'Portland Pirates': 0.55,
    'Missoula': 0.12, 'Lethbridge': 0.12, 'Saskatoon': 0.33, 'Regina': 0.26,
    'Winnipeg': 0.83, 'Calgary': 1.5, 'Edmonton': 1.4, 'Montreal': 4.3,
    'Quebec City': 0.83, 'Ottawa': 1.4,
    
    // === Mexico T2 ===
    'Mexico City': 21.8, 'Guadalajara': 5.3, 'Monterrey': 5.3,
    'Puebla': 3.2, 'León': 1.9, 'Querétaro': 1.3, 'Aguascalientes': 1.1,
    'Toluca': 2.4, 'Tijuana': 2.2, 'Hermosillo': 0.98,
    'Ciudad Juárez': 1.5, 'Saltillo': 0.92, 'Mexicali': 1.0,
    'Reynosa': 0.7, 'San Luis Potosí': 1.2, 'Mérida': 1.3,
    'Chihuahua': 0.95, 'Cancún': 0.89, 'Veracruz': 0.81,
    'Oaxaca': 0.61, 'Mazatlán': 0.51, 'Durango': 0.65,
    
    // === T3 — Major metros (suburbs inherit parent metro) ===
    // Greater LA
    'Glendale': 13.2, 'Pasadena': 13.2, 'Long Beach': 13.2,
    'Torrance': 13.2, 'Irvine': 13.2, 'Santa Clarita': 13.2,
    // Bay Area
    'Fremont': 4.7, 'Hayward': 4.7, 'Daly City': 4.7,
    'San Mateo': 4.7, 'Concord': 4.7,
    // Inland Empire
    'San Bernardino': 4.6, 'Moreno Valley': 4.6, 'Fontana': 4.6,
    'Corona': 4.6, 'Rancho Cucamonga': 4.6, 'Redlands': 4.6,
    // Central Valley
    'Bakersfield': 0.91, 'Modesto': 0.55, 'Stockton': 0.78,
    'Visalia': 0.47, 'Merced': 0.28, 'Turlock': 0.55,
    // Chicago metro
    'Naperville': 9.5, 'Joliet': 9.5, 'Elgin': 9.5,
    'Waukegan': 9.5, 'Schaumburg': 9.5, 'Cicero': 9.5,
    // NYC metro
    'Yonkers': 20.1, 'Newark': 20.1, 'Jersey City': 20.1,
    'Stamford': 20.1, 'Hempstead': 20.1, 'Paterson': 20.1,
    // DFW
    'Fort Worth': 7.6, 'Arlington': 7.6, 'Plano': 7.6,
    'Irving': 7.6, 'Frisco': 7.6, 'McKinney': 7.6,
    // Houston metro
    'Sugar Land': 7.1, 'Pearland': 7.1, 'League City': 7.1,
    'The Woodlands': 7.1, 'Baytown': 7.1, 'Conroe': 7.1,
    // Philly metro
    'Camden': 6.2, 'Trenton': 6.2, 'Wilmington': 6.2,
    'Chester': 6.2, 'Reading': 6.2, 'Norristown': 6.2,
    // Atlanta metro
    'Marietta': 6.1, 'Sandy Springs': 6.1, 'Roswell': 6.1,
    'Alpharetta': 6.1, 'Decatur': 6.1, 'Lawrenceville': 6.1,
    // Miami/SoFla
    'Fort Lauderdale': 6.1, 'West Palm Beach': 6.1, 'Boca Raton': 6.1,
    'Pembroke Pines': 6.1, 'Hialeah': 6.1, 'Homestead': 6.1,
    // DC metro
    'Bethesda': 6.3, 'Silver Spring': 6.3, 'Arlington VA': 6.3,
    'Alexandria': 6.3, 'Frederick': 6.3, 'Rockville': 6.3,
    // Phoenix metro
    'Mesa': 4.9, 'Scottsdale': 4.9, 'Chandler': 4.9,
    'Tempe': 4.9, 'Gilbert': 4.9, 'Surprise': 4.9,
    // Boston metro
    'Cambridge': 4.9, 'Quincy': 4.9, 'Brockton': 4.9,
    'Fall River': 4.9, 'Lowell': 4.9, 'Lynn': 4.9,
    // Detroit metro
    'Warren': 4.4, 'Sterling Heights': 4.4, 'Ann Arbor': 4.4,
    'Dearborn': 4.4, 'Livonia': 4.4, 'Rochester Hills': 4.4,
    // Minneapolis
    'St. Paul': 3.7, 'Bloomington': 3.7, 'Brooklyn Park': 3.7,
    'Plymouth': 3.7, 'Maple Grove': 3.7, 'Woodbury': 3.7,
    // Denver metro
    'Aurora': 2.9, 'Lakewood': 2.9, 'Centennial': 2.9,
    'Thornton': 2.9, 'Arvada': 2.9, 'Boulder': 2.9,
    // San Antonio
    'New Braunfels': 2.6, 'San Marcos': 2.6, 'Seguin': 2.6,
    'Schertz': 2.6, 'Universal City': 2.6, 'Cibolo': 2.6,
    // Orlando
    'Kissimmee': 2.7, 'Sanford': 2.7, 'Lake Mary': 2.7,
    'Clermont': 2.7, 'Ocoee': 2.7, 'Apopka': 2.7,
    // Portland metro
    'Beaverton': 2.5, 'Hillsboro': 2.5, 'Gresham': 2.5,
    'Bend': 0.2, 'Salem': 0.43, 'Medford': 0.22,
    // Charlotte metro
    'Concord NC': 2.7, 'Gastonia': 2.7, 'Rock Hill': 2.7,
    'Huntersville': 2.7, 'Mooresville': 2.7, 'Kannapolis': 2.7,
    // Cleveland metro
    'Akron': 2.1, 'Canton': 2.1, 'Elyria': 2.1,
    'Lakewood OH': 2.1, 'Mentor': 2.1, 'Youngstown': 0.54,
    // Milwaukee
    'Racine': 1.6, 'Waukesha': 1.6, 'Kenosha': 1.6,
    'Oshkosh': 0.17, 'Appleton': 0.25, 'Green Bay': 0.32,
    // Memphis
    'Southaven': 1.3, 'Olive Branch': 1.3, 'Bartlett': 1.3,
    'Germantown': 1.3, 'Collierville': 1.3, 'Jackson TN': 0.18,
    // Oklahoma City
    'Norman': 1.4, 'Edmond': 1.4, 'Moore': 1.4,
    'Stillwater': 0.08, 'Lawton': 0.13, 'Enid': 0.06,
    // New Orleans
    'Baton Rouge': 0.87, 'Lafayette': 0.49, 'Shreveport': 0.44,
    'Lake Charles': 0.22, 'Houma': 0.21, 'Kenner': 1.3,
    // Jacksonville
    'Daytona Beach': 0.69, 'Gainesville': 0.34, 'Ocala': 0.39,
    'Palm Bay': 0.62, 'Tallahassee': 0.39, 'Pensacola': 0.51,
    // Sacramento metro
    'Elk Grove': 2.4, 'Roseville': 2.4, 'Folsom': 2.4,
    'Davis': 2.4, 'Woodland': 2.4, 'Vacaville': 2.4,
    // Salt Lake City / Utah
    'Provo': 0.65, 'Ogden': 0.7, 'Sandy UT': 1.2,
    'St. George': 0.19, 'Logan': 0.15, 'Layton': 1.2,
    // Indianapolis
    'Carmel': 2.1, 'Fishers': 2.1, 'Greenwood': 2.1,
    'Terre Haute': 0.17, 'Muncie': 0.12, 'Anderson': 0.13,
    // Various smaller T3 cities
    'Spokane Valley': 0.6, 'Wenatchee': 0.12, 'Yakima': 0.25,
    'Tri-Cities': 0.30, 'Kennewick': 0.30, 'Mankato': 0.10,
    'Rochester MN': 0.23, 'Duluth': 0.29, 'St. Cloud': 0.20,
    'Eau Claire': 0.17, 'La Crosse': 0.14, 'Rapid City': 0.15,
    'Grand Forks': 0.10, 'Fargo': 0.26, 'Bismarck': 0.13,
    'Billings': 0.18, 'Great Falls': 0.08, 'Helena': 0.08,
    'Macon': 0.24, 'Warner Robins': 0.24, 'Athens': 0.22,
    'Augusta': 0.62, 'Valdosta': 0.15, 'Albany GA': 0.15,
    'Winston-Salem': 0.68, 'Durham': 1.4, 'Fayetteville NC': 0.39,
    'Wilmington NC': 0.30, 'High Point': 0.77, 'Asheville': 0.47,
    'Tuscaloosa': 0.26, 'Huntsville': 0.50, 'Montgomery': 0.39,
    'Dothan': 0.15, 'Florence AL': 0.15, 'Gadsden': 0.10,
    'Bowling Green': 0.18, 'Owensboro': 0.12, 'Lexington': 0.52,
    'Covington': 2.3, 'Frankfort': 0.07, 'Paducah': 0.10,
    'Springfield MO': 0.47, 'Columbia MO': 0.21, 'Joplin': 0.18,
    'Jefferson City': 0.15, 'Cape Girardeau': 0.10, 'Sedalia': 0.04,
    'Iowa City': 0.18, 'Cedar Rapids': 0.28, 'Davenport': 0.38,
    'Waterloo': 0.17, 'Dubuque': 0.10, 'Council Bluffs': 0.95,
    'Topeka': 0.23, 'Lawrence': 0.12, 'Manhattan KS': 0.08,
    'Salina': 0.05, 'Hutchinson': 0.04, 'Garden City': 0.04,
    'Springfield IL': 0.21, 'Rockford': 0.34, 'Peoria': 0.40,
    'Champaign': 0.24, 'Decatur IL': 0.11, 'Bloomington IL': 0.19,
    'Kalamazoo': 0.34, 'Lansing': 0.48, 'Saginaw': 0.19,
    'Flint': 0.41, 'Muskegon': 0.17, 'Battle Creek': 0.13,
    'Scranton': 0.56, 'Allentown': 0.86, 'Harrisburg': 0.59,
    'Erie': 0.27, 'State College': 0.16, 'York': 0.46,
    'Bridgeport': 0.95, 'New Haven': 0.86, 'Waterbury': 0.59,
    'Danbury': 0.95, 'Norwalk': 20.1, 'New London': 0.27,
    'Huntington': 0.36, 'Morgantown': 0.14, 'Parkersburg': 0.09,
    'Wheeling': 0.14, 'Charleston WV': 0.26, 'Beckley': 0.08,
    'Burlington VT': 0.23, 'Manchester NH': 0.42, 'Lewiston': 0.11,
    'Nashua': 0.42, 'Concord NH': 0.15, 'Bangor': 0.15,
    'Kent': 2.1, 'Evansville': 0.32, 'South Bend': 0.32,
    'Bloomington IN': 0.08, 'Lafayette IN': 0.22, 'Elkhart': 0.21,
    // Canadian T3
    'Red Deer': 0.11, 'Medicine Hat': 0.08, 'Grande Prairie': 0.09,
    'Fort McMurray': 0.08, 'Airdrie': 1.5, 'Brooks': 0.01,
    'Brandon': 0.05, 'Steinbach': 0.02, 'Thompson': 0.01,
    'Portage la Prairie': 0.01, 'Selkirk': 0.01, 'Dauphin': 0.01,
    'Prince Albert': 0.04, 'Moose Jaw': 0.03, 'Swift Current': 0.02,
    'North Battleford': 0.01, 'Yorkton': 0.02, 'Estevan': 0.01,
    'Kitchener': 0.58, 'London ON': 0.54, 'Hamilton': 0.79,
    'Oshawa': 1.0, 'St. Catharines': 0.41, 'Barrie': 0.21,
    'Trois-Rivières': 0.16, 'Sherbrooke': 0.23, 'Gatineau': 1.4,
    'Drummondville': 0.08, 'Saint-Hyacinthe': 0.06, 'Granby': 0.05,
    'Moncton': 0.17, 'Saint John': 0.13, 'Fredericton': 0.11,
    'Halifax': 0.46, 'Sydney NS': 0.10, 'Charlottetown': 0.08,
    'Sudbury': 0.17, 'Thunder Bay': 0.12, 'Sault Ste. Marie': 0.07,
    'North Bay': 0.07, 'Timmins': 0.04, 'Kenora': 0.02,
    // Mexico T3
    'Tampico': 0.93, 'Ciudad Victoria': 0.37, 'Matamoros': 0.54,
    'Nuevo Laredo': 0.43, 'Monclova': 0.32, 'Piedras Negras': 0.18,
    'Celaya': 0.50, 'Irapuato': 0.58, 'Salamanca': 0.27,
    'San Miguel de Allende': 0.17, 'Guanajuato': 0.20, 'Silao': 0.19,
    'Morelia': 0.87, 'Uruapan': 0.36, 'Zamora': 0.20,
    'Lázaro Cárdenas': 0.18, 'Pátzcuaro': 0.09, 'Apatzingán': 0.13,
    'Pachuca': 0.60, 'Tulancingo': 0.17, 'Tula': 0.12,
    'Ixmiquilpan': 0.10, 'Actopan': 0.06, 'Huejutla': 0.06,
    'Cuernavaca': 1.0, 'Cuautla': 0.43, 'Jiutepec': 1.0,
    'Tlaxcala': 0.10, 'Xalapa': 0.60, 'Coatzacoalcos': 0.35,
    'Córdoba': 0.22, 'Orizaba': 0.41, 'Poza Rica': 0.51,
    'San Cristóbal': 0.22, 'Tuxtla Gutiérrez': 0.64,
    'Tapachula': 0.35, 'Comitán': 0.15, 'Palenque': 0.12, 'Ocosingo': 0.10,
    'Campeche': 0.29, 'Villahermosa': 0.76, 'Playa del Carmen': 0.35,
    'Chetumal': 0.18, 'Tulum': 0.05, 'Felipe Carrillo Puerto': 0.03
};

// Extract city name from team name (e.g., "Boston Celtics" → "Boston")
// Handles multi-word cities like "New York", "Oklahoma City", "San Antonio", etc.
export function getMetroPopulation(teamName) {
    if (!teamName) return null;
    
    // Try progressively shorter prefixes (longest match wins)
    // "Oklahoma City Thunder" → try "Oklahoma City Thunder", "Oklahoma City", "Oklahoma"
    const words = teamName.split(' ');
    for (let len = words.length - 1; len >= 1; len--) {
        const candidate = words.slice(0, len).join(' ');
        if (METRO_POPULATIONS[candidate] !== undefined) {
            return METRO_POPULATIONS[candidate];
        }
    }
    return null; // No match found
}

// Convert metro population (in millions) to a market size multiplier
// Uses logarithmic scale so NYC (20M) isn't 200x bigger than a 100K city
// Range: ~0.55 (tiny town) to ~1.60 (NYC/Mexico City)
// Median NBA market (~2M) maps to ~1.0
export function populationToMarketSize(popMillions) {
    if (!popMillions || popMillions <= 0) return 0.85 + Math.random() * 0.30; // fallback: old random
    
    // Log scale: ln(pop) normalized so that ~2M metro = 1.0×
    // ln(2.0) ≈ 0.693
    const logPop = Math.log(popMillions);
    const logMedian = Math.log(2.0);
    
    // Scale: each doubling of population adds ~0.15 to multiplier
    const rawMultiplier = 1.0 + (logPop - logMedian) * 0.22;
    
    // Clamp to reasonable range
    return Math.max(0.55, Math.min(1.60, rawMultiplier));
}

export const FinanceEngine = {
    
    // ─── BASELINE REVENUE BY TIER (for a "native" team) ───
    // These are calibrated so that at the default 75% spending ratio,
    // a native team's spending limit roughly equals the old hard cap:
    //   T2: ~$16M revenue × 75% = ~$12M limit (was $12M cap)
    //   T3: ~$2M revenue × 75% = ~$1.5M limit (was $1.5M cap)
    TIER_BASELINES: {
        1: { league: 60000000, matchday: 30000000, commercial: 25000000, legacy: 3000000 },
        2: { league: 5500000,  matchday: 6000000,  commercial: 3500000,  legacy: 1000000 },
        3: { league: 400000,   matchday: 850000,   commercial: 500000,   legacy: 250000 }
    },
    
    // ─── DECAY RATES PER SEASON (% lost toward new tier baseline) ───
    // After relegation, each revenue stream decays at different speeds
    DECAY_RATES: {
        league: 1.0,      // Instant — switches to new tier's TV deal immediately
        matchday: 0.28,   // ~28% decay per season toward new baseline
        commercial: 0.38, // ~38% decay per season (sponsors renegotiate faster)
        legacy: 0.06      // ~6% decay per season (brand equity is durable)
    },
    
    // ─── GROWTH RATES PER SEASON (% gained toward new tier baseline) ───
    // After promotion, revenue streams grow toward the new tier
    GROWTH_RATES: {
        league: 1.0,      // Instant — new TV deal kicks in immediately
        matchday: 0.30,   // ~30% growth per season
        commercial: 0.35, // ~35% growth per season
        legacy: 0.15      // ~15% growth (brand building is slower than decay)
    },
    
    // ─── SPENDING LIMITS ───
    SPENDING_RATIO_DEFAULT: 0.75,  // Default: spend 75% of revenue
    SPENDING_RATIO_MIN: 0.60,      // Minimum: 60% (penny-pinching)
    SPENDING_RATIO_MAX: 0.90,      // Maximum: 90% (risky, near financial instability)
    
    // ─── TIER 1 HARD CAP (unchanged — American parity model) ───
    T1_HARD_CAP: 100000000,
    T1_SALARY_FLOOR: 80000000,
    
    // ─── FANBASE PARAMETERS ───
    FANBASE_BASELINES: {
        1: 1200000,   // T1 native: ~1.2M fans
        2: 150000,    // T2 native: ~150K fans
        3: 15000      // T3 native: ~15K fans
    },
    // Fanbase grows/shrinks based on winning, tier, and time
    // Inertia is high — fans don't vanish overnight
    FANBASE_GROWTH_RATE: 0.08,    // Max 8% growth per winning season
    FANBASE_DECLINE_RATE: 0.05,   // Max 5% decline per losing season
    FANBASE_TIER_DECAY: 0.12,     // 12% decline per season if below "natural" tier
    FANBASE_TIER_GROWTH: 0.15,    // 15% growth per season toward higher tier baseline
    
    // ═══════════════════════════════════════════════════════════════
    // INITIALIZE FINANCES for a team
    // ═══════════════════════════════════════════════════════════════
    // Called at game start for every team. Adds financial profile
    // with some randomized diversity.
    initializeTeamFinances(team, options = {}) {
        const tier = team.tier;
        const baselines = this.TIER_BASELINES[tier];
        
        // Randomize revenue within ±15% of baseline for diversity
        // (kept tighter to avoid spending limits falling below roster costs)
        const variance = () => 0.85 + Math.random() * 0.30; // 0.85 to 1.15
        
        // Market size based on metro population (or override from options)
        // Uses real city population data for realistic economic stratification
        let marketSize;
        if (options.marketSize) {
            marketSize = options.marketSize;
        } else {
            const pop = getMetroPopulation(team.name);
            marketSize = populationToMarketSize(pop);
            // Add small random variance (±5%) so two teams in same city differ slightly
            marketSize *= (0.95 + Math.random() * 0.10);
            marketSize = Math.round(marketSize * 100) / 100; // clean up
        }
        // Store the metro population for reference
        const metroPop = getMetroPopulation(team.name);
        
        team.finances = {
            // Current revenue streams
            revenue: {
                league: Math.round(baselines.league * variance()),
                matchday: Math.round(baselines.matchday * marketSize * variance()),
                commercial: Math.round(baselines.commercial * marketSize * variance()),
                legacy: Math.round(baselines.legacy * variance())
            },
            
            // Permanent team financial identity
            marketSize: marketSize,
            metroPopulation: metroPop || null, // in millions
            
            // Spending configuration
            spendingRatio: this.SPENDING_RATIO_DEFAULT, // How much of revenue to spend on payroll
            
            // Fanbase tracking
            fanbase: Math.round(this.FANBASE_BASELINES[tier] * marketSize * (0.85 + Math.random() * 0.30)),
            
            // Legacy tracking — built over franchise lifetime
            // These accumulate through gameplay and drive legacy revenue
            legacyProfile: {
                seasonsInT1: tier === 1 ? Math.floor(3 + Math.random() * 8) : 0,
                seasonsInT2: tier === 2 ? Math.floor(3 + Math.random() * 8) : (tier === 1 ? Math.floor(Math.random() * 3) : 0),
                seasonsInT3: tier === 3 ? Math.floor(3 + Math.random() * 8) : 0,
                championships: tier === 1 ? (Math.random() < 0.15 ? 1 + Math.floor(Math.random() * 3) : 0) : 0,
                playoffAppearances: tier === 1 ? Math.floor(2 + Math.random() * 5) : (tier === 2 ? Math.floor(Math.random() * 3) : 0),
                iconicPlayers: 0, // Count of 95+ rated players who played here
                consecutiveSeasons: Math.floor(2 + Math.random() * 6) // Consecutive seasons in current tier
            },
            
            // Transition tracking (replaces parachute/promotion system)
            previousTier: null,       // Tier before last move (null = always been in current tier)
            seasonsInCurrentTier: Math.floor(2 + Math.random() * 6),
            
            // Financial health indicator
            financialStability: 'stable', // 'stable', 'caution', 'danger'
            
            // History for trends display
            revenueHistory: [], // Array of {season, totalRevenue, spendingLimit}
            
            // ═══════════ OWNER MODE (Phase 2) ═══════════
            ownerMode: false, // Whether player actively manages finances
            
            // Arena / Venue
            arena: {
                capacity: tier === 1 ? 18000 + Math.floor(Math.random() * 4000) :
                          tier === 2 ? 5000 + Math.floor(Math.random() * 4000) :
                          1500 + Math.floor(Math.random() * 2000),
                condition: 70 + Math.floor(Math.random() * 25), // 70-95%
                upgradeCost: 0,       // Pending upgrade cost (amortized)
                upgradeYearsLeft: 0   // Years remaining on upgrade payments
            },
            
            // Ticket pricing: multiplier on base price (1.0 = normal)
            ticketPriceMultiplier: 1.0,
            
            // Marketing investment per season
            marketingBudget: 0,
            
            // Active sponsorship deals
            sponsorships: [], // Array of {name, annualValue, yearsRemaining, condition}
            
            // Pending sponsor offers (generated each offseason)
            pendingSponsorOffers: []
        };
        
        // Calculate initial legacy revenue from profile
        this.recalculateLegacyRevenue(team);
        
        // POST-INIT SAFEGUARD: If team already has a roster, ensure 
        // spending limit covers it. This handles the case where roster
        // was generated using getSalaryCap(tier) flat values before
        // finances were initialized with variance/marketSize.
        if (tier !== 1 && team.roster && team.roster.length > 0) {
            const currentSalary = team.roster.reduce((sum, p) => sum + (p.salary || 0), 0);
            const spendingLimit = this.getSpendingLimit(team);
            if (currentSalary > spendingLimit) {
                const neededRevenue = (currentSalary * 1.08) / team.finances.spendingRatio;
                const currentRevenue = this.getTotalRevenue(team);
                if (neededRevenue > currentRevenue) {
                    const scaleFactor = neededRevenue / currentRevenue;
                    team.finances.revenue.matchday = Math.round(team.finances.revenue.matchday * scaleFactor);
                    team.finances.revenue.commercial = Math.round(team.finances.revenue.commercial * scaleFactor);
                }
            }
        }
        
        return team.finances;
    },
    
    // ═══════════════════════════════════════════════════════════════
    // RECALCULATE LEGACY REVENUE from franchise history
    // ═══════════════════════════════════════════════════════════════
    recalculateLegacyRevenue(team) {
        if (!team.finances) return;
        const lp = team.finances.legacyProfile;
        const tier = team.tier;
        const baseLegacy = this.TIER_BASELINES[tier].legacy;
        
        // Championships add significant permanent revenue
        // Each championship adds ~$1.5M at T1 scale, with diminishing returns for age
        const champBonus = lp.championships * 1500000;
        
        // Years in T1 build brand recognition (~$200K per season at T1 scale)
        const t1Bonus = lp.seasonsInT1 * 200000;
        
        // Iconic players leave lasting brand association (~$300K each)
        const iconicBonus = lp.iconicPlayers * 300000;
        
        // Playoff appearances build reputation (~$100K each)
        const playoffBonus = lp.playoffAppearances * 100000;
        
        // Total legacy revenue (scaled to current tier economics)
        // A team in T2 doesn't earn T1-level legacy money, but it's still
        // significantly above baseline if they have history
        const tierScale = { 1: 1.0, 2: 0.35, 3: 0.08 };
        const scale = tierScale[tier] || 0.08;
        
        const rawLegacy = baseLegacy + (champBonus + t1Bonus + iconicBonus + playoffBonus) * scale;
        
        // Fanbase also contributes to legacy revenue
        const fanbaseMultiplier = team.finances.fanbase / this.FANBASE_BASELINES[tier];
        
        team.finances.revenue.legacy = Math.round(rawLegacy * Math.max(0.5, Math.min(2.0, fanbaseMultiplier)));
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GET TOTAL REVENUE for a team
    // ═══════════════════════════════════════════════════════════════
    getTotalRevenue(team) {
        if (!team.finances) return this.getTierBaselineRevenue(team.tier);
        const r = team.finances.revenue;
        return r.league + r.matchday + r.commercial + r.legacy;
    },
    
    getTierBaselineRevenue(tier) {
        const b = this.TIER_BASELINES[tier] || this.TIER_BASELINES[3];
        return b.league + b.matchday + b.commercial + b.legacy;
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GET SPENDING LIMIT — the key number for roster building
    // ═══════════════════════════════════════════════════════════════
    // For T1: returns the hard cap ($100M) — revenue doesn't matter
    // For T2/T3: returns revenue × spendingRatio
    getSpendingLimit(team) {
        if (team.tier === 1) {
            // T1: Hard cap, but deduct non-player costs
            let limit = this.T1_HARD_CAP;
            if (team.finances) {
                // Arena upgrade payments reduce available cap space
                if (team.finances.arena && team.finances.arena.upgradeYearsLeft > 0) {
                    limit -= (team.finances.arena.upgradeCost || 0);
                }
                // Marketing reduces available cap space
                limit -= (team.finances.marketingBudget || 0);
            }
            return Math.max(Math.round(this.T1_HARD_CAP * 0.70), limit); // Never below 70% of cap
        }
        const revenue = this.getTotalRevenue(team);
        const ratio = (team.finances && team.finances.spendingRatio) || this.SPENDING_RATIO_DEFAULT;
        let limit = Math.round(revenue * ratio);
        
        // Deduct non-player operational costs
        if (team.finances) {
            // Arena upgrade payments
            if (team.finances.arena && team.finances.arena.upgradeYearsLeft > 0) {
                limit -= (team.finances.arena.upgradeCost || 0);
            }
            // Marketing budget
            limit -= (team.finances.marketingBudget || 0);
        }
        
        // Floor: never below 50% of base revenue-based limit
        return Math.max(Math.round(revenue * ratio * 0.50), limit);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GET SALARY FLOOR — minimum spending requirement
    // ═══════════════════════════════════════════════════════════════
    getSalaryFloor(team) {
        if (team.tier === 1) {
            return this.T1_SALARY_FLOOR;
        }
        // T2/T3: floor is 50% of spending limit (ensures teams actually compete)
        return Math.round(this.getSpendingLimit(team) * 0.50);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // APPLY RELEGATION — transition finances when team drops a tier
    // ═══════════════════════════════════════════════════════════════
    // Replaces the old parachute payment system with gradual revenue decay.
    // League revenue changes instantly. Other streams retain their values
    // and will decay naturally each offseason via advanceFinances().
    applyRelegation(team, fromTier, toTier) {
        if (!team.finances) this.initializeTeamFinances(team);
        
        const newBaseline = this.TIER_BASELINES[toTier];
        
        // League revenue drops immediately to new tier
        team.finances.revenue.league = newBaseline.league;
        
        // Matchday, commercial, and legacy RETAIN their current values
        // They will decay naturally in advanceFinances() each offseason
        // This IS the "parachute" — you keep your revenue streams but they erode
        
        // Track the transition
        team.finances.previousTier = fromTier;
        team.finances.seasonsInCurrentTier = 0;
        
        // Fanbase takes an initial hit from relegation disappointment
        // but doesn't collapse — fans are loyal
        team.finances.fanbase = Math.round(team.finances.fanbase * 0.88); // 12% initial hit
        
        // ═══════════════════════════════════════════════════════════════
        // RELEGATION RELEASE CLAUSES
        // ═══════════════════════════════════════════════════════════════
        // Some star players have relegation release clauses — they can
        // walk immediately if the team drops down. These are rare (~5-10%
        // of T1 players rated 80+) and represent players who negotiated
        // protection against playing in a lower tier.
        //
        // Released players go to the free agent pool and are available
        // for any team to sign during the upcoming free agency.
        const releasedPlayers = [];
        if (team.roster && team.roster.length > 0) {
            const toRelease = team.roster.filter(p => p.relegationRelease);
            toRelease.forEach(player => {
                const idx = team.roster.findIndex(p => p.id === player.id);
                if (idx !== -1) {
                    team.roster.splice(idx, 1);
                    // Mark them for FA pool (salary adjusted to their natural tier market)
                    player.previousTeamId = team.id;
                    player.contractYears = window.determineContractLength(player.age, player.rating);
                    player.originalContractLength = player.contractYears;
                    player.salary = window.generateSalary(player.rating, fromTier); // They command their old tier's rates
                    player.relegationRelease = false; // Clause is spent
                    releasedPlayers.push(player);
                    console.log(`🚪 ${player.name} (${player.rating} OVR) activated relegation release clause — leaving ${team.name}`);
                }
            });
            
            // Add released players to free agent pool
            if (releasedPlayers.length > 0 && window.gameState.freeAgents) {
                window.gameState.freeAgents.push(...releasedPlayers);
            }
            
            // Store for transition briefing display
            team._relegationReleased = releasedPlayers;
        }
        
        // ═══════════════════════════════════════════════════════════════
        // RELEGATION SALARY RESTRUCTURING
        // ═══════════════════════════════════════════════════════════════
        // In real football, contracts typically include relegation clauses
        // that automatically reduce wages when a club drops down. This is
        // standard practice — players accept lower wages as part of the
        // deal because the club's revenue has fundamentally changed.
        //
        // Without this, relegated teams face an impossible situation:
        // T1 salaries ($80-100M) vs T2 spending limits ($30-40M).
        // Even keeping 7 players on T1 deals would exceed the limit.
        //
        // The restructuring applies a graduated reduction:
        // - Star players (highest paid) take the biggest cuts
        // - Bench players on minimum deals keep most of their salary
        // - The total roster salary targets ~85% of the new spending limit
        //   giving the team room to operate but still over-spending vs
        //   native T2 teams — which is the competitive advantage of relegation
        if (team.roster && team.roster.length > 0) {
            // IMPORTANT: team.tier is still the OLD tier at this point in the flow.
            // We must calculate the spending limit for the NEW tier manually.
            const r = team.finances.revenue;
            const newTierRevenue = r.league + r.matchday + r.commercial + r.legacy;
            const ratio = team.finances.spendingRatio || this.SPENDING_RATIO_DEFAULT;
            // For T1→T2: use revenue-based limit (T2 doesn't have a hard cap)
            // For T2→T3: also revenue-based
            const spendingLimit = Math.round(newTierRevenue * ratio);
            
            const currentSalary = team.roster.reduce((sum, p) => sum + (p.salary || 0), 0);
            
            console.log(`📉 ${team.name}: Pre-restructuring salary check`);
            console.log(`   Current salary: ${window.formatCurrency(currentSalary)}`);
            console.log(`   New tier spending limit: ${window.formatCurrency(spendingLimit)}`);
            
            if (currentSalary > spendingLimit) {
                // Target: 85% of spending limit, giving some cap space
                const targetSalary = spendingLimit * 0.85;
                const reductionNeeded = currentSalary - targetSalary;
                
                // Sort roster by salary (highest first) — stars take the biggest cuts
                const sorted = [...team.roster].sort((a, b) => (b.salary || 0) - (a.salary || 0));
                
                // Calculate per-player reduction proportional to their salary
                // Higher-paid players absorb proportionally more of the reduction
                const totalSalaryForReduction = sorted.reduce((sum, p) => sum + (p.salary || 0), 0);
                
                sorted.forEach(player => {
                    const playerShare = (player.salary || 0) / totalSalaryForReduction;
                    const playerReduction = reductionNeeded * playerShare;
                    
                    // New salary is old salary minus their share of the reduction
                    // But never below the minimum for their rating in the new tier
                    const minSalary = window.generateSalary(Math.max(player.rating - 10, 50), toTier);
                    const newSalary = Math.max(minSalary, Math.round((player.salary || 0) - playerReduction));
                    
                    // Store old salary for reference
                    player.preRelegationSalary = player.salary;
                    player.salary = newSalary;
                });
                
                const newTotal = team.roster.reduce((sum, p) => sum + (p.salary || 0), 0);
                console.log(`   Restructured: ${window.formatCurrency(currentSalary)} → ${window.formatCurrency(newTotal)}`);
                console.log(`   Cap Space: ${window.formatCurrency(spendingLimit - newTotal)}`);
            }
        }
        
        console.log(`📉 ${team.name} relegated T${fromTier}→T${toTier}`);
        console.log(`   Revenue: ${window.formatCurrency(this.getTotalRevenue(team))} | Spending Limit: ${window.formatCurrency(this.getSpendingLimit(team))}`);
        console.log(`   Fanbase: ${team.finances.fanbase.toLocaleString()}`);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // APPLY PROMOTION — transition finances when team moves up
    // ═══════════════════════════════════════════════════════════════
    applyPromotion(team, fromTier, toTier) {
        if (!team.finances) this.initializeTeamFinances(team);
        
        const newBaseline = this.TIER_BASELINES[toTier];
        
        // League revenue jumps immediately to new tier (new TV deal!)
        team.finances.revenue.league = newBaseline.league;
        
        // Matchday and commercial get an immediate 20% bump from excitement
        // but won't reach full tier baseline until they grow naturally
        team.finances.revenue.matchday = Math.round(team.finances.revenue.matchday * 1.20);
        team.finances.revenue.commercial = Math.round(team.finances.revenue.commercial * 1.20);
        
        // Track the transition
        team.finances.previousTier = fromTier;
        team.finances.seasonsInCurrentTier = 0;
        
        // Fanbase gets a boost from promotion excitement
        team.finances.fanbase = Math.round(team.finances.fanbase * 1.15); // 15% boost
        
        // Update legacy profile
        if (toTier === 1) {
            team.finances.legacyProfile.seasonsInT1 = (team.finances.legacyProfile.seasonsInT1 || 0);
        }
        
        console.log(`📈 ${team.name} promoted T${fromTier}→T${toTier}`);
        console.log(`   Revenue: ${window.formatCurrency(this.getTotalRevenue(team))} | Spending Limit: ${window.formatCurrency(this.getSpendingLimit(team))}`);
        console.log(`   Fanbase: ${team.finances.fanbase.toLocaleString()}`);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ADVANCE FINANCES — called each offseason
    // ═══════════════════════════════════════════════════════════════
    // Handles revenue decay/growth toward tier baselines, fanbase
    // changes based on performance, and legacy accumulation.
    advanceFinances(team, seasonRecord) {
        if (!team.finances) this.initializeTeamFinances(team);
        
        const tier = team.tier;
        const baseline = this.TIER_BASELINES[tier];
        const r = team.finances.revenue;
        const wins = seasonRecord ? seasonRecord.wins : (team.wins || 0);
        const losses = seasonRecord ? seasonRecord.losses : (team.losses || 0);
        const totalGames = wins + losses || 1;
        const winPct = wins / totalGames;
        
        // ─── LEAGUE REVENUE: Always at tier baseline ───
        r.league = baseline.league;
        
        // ─── MATCHDAY REVENUE: Decay or grow toward baseline ───
        if (r.matchday > baseline.matchday * 1.05) {
            // Above baseline (relegated team) — decay toward baseline
            const excess = r.matchday - baseline.matchday;
            const decayAmount = excess * this.DECAY_RATES.matchday;
            // Winning slows the decay, losing accelerates it
            const perfMod = winPct > 0.55 ? 0.6 : winPct < 0.40 ? 1.4 : 1.0;
            r.matchday = Math.round(Math.max(baseline.matchday, r.matchday - decayAmount * perfMod));
        } else if (r.matchday < baseline.matchday * 0.95) {
            // Below baseline (promoted team or underperformer) — grow toward baseline
            const deficit = baseline.matchday - r.matchday;
            const growthAmount = deficit * this.GROWTH_RATES.matchday;
            const perfMod = winPct > 0.55 ? 1.4 : winPct < 0.40 ? 0.6 : 1.0;
            r.matchday = Math.round(Math.min(baseline.matchday * 1.3, r.matchday + growthAmount * perfMod));
        } else {
            // Near baseline — small performance-based fluctuations
            const perfAdj = (winPct - 0.5) * baseline.matchday * 0.10;
            r.matchday = Math.round(Math.max(baseline.matchday * 0.80, r.matchday + perfAdj));
        }
        
        // ─── COMMERCIAL REVENUE: Decay or grow toward baseline ───
        if (r.commercial > baseline.commercial * 1.05) {
            const excess = r.commercial - baseline.commercial;
            const decayAmount = excess * this.DECAY_RATES.commercial;
            const perfMod = winPct > 0.55 ? 0.6 : winPct < 0.40 ? 1.4 : 1.0;
            r.commercial = Math.round(Math.max(baseline.commercial, r.commercial - decayAmount * perfMod));
        } else if (r.commercial < baseline.commercial * 0.95) {
            const deficit = baseline.commercial - r.commercial;
            const growthAmount = deficit * this.GROWTH_RATES.commercial;
            const perfMod = winPct > 0.55 ? 1.4 : winPct < 0.40 ? 0.6 : 1.0;
            r.commercial = Math.round(Math.min(baseline.commercial * 1.3, r.commercial + growthAmount * perfMod));
        } else {
            const perfAdj = (winPct - 0.5) * baseline.commercial * 0.08;
            r.commercial = Math.round(Math.max(baseline.commercial * 0.80, r.commercial + perfAdj));
        }
        
        // ─── LEGACY REVENUE: Very slow decay, builds with success ───
        // Legacy never drops below the tier baseline legacy amount
        if (r.legacy > baseline.legacy * 1.1) {
            const excess = r.legacy - baseline.legacy;
            r.legacy = Math.round(Math.max(baseline.legacy, r.legacy - excess * this.DECAY_RATES.legacy));
        }
        
        // ─── FANBASE EVOLUTION ───
        const fanBaseline = this.FANBASE_BASELINES[tier] * team.finances.marketSize;
        
        // Performance-based growth/decline
        if (winPct > 0.55) {
            // Winning team — fans grow
            const growthRate = Math.min(this.FANBASE_GROWTH_RATE, (winPct - 0.5) * 0.20);
            team.finances.fanbase = Math.round(team.finances.fanbase * (1 + growthRate));
        } else if (winPct < 0.40) {
            // Losing team — fans decline slowly
            const declineRate = Math.min(this.FANBASE_DECLINE_RATE, (0.5 - winPct) * 0.12);
            team.finances.fanbase = Math.round(team.finances.fanbase * (1 - declineRate));
        }
        
        // Tier-based gravity: fanbase drifts toward tier baseline over time
        if (team.finances.fanbase > fanBaseline * 1.5) {
            // Way above baseline for this tier — slow drift down
            team.finances.fanbase = Math.round(team.finances.fanbase * (1 - this.FANBASE_TIER_DECAY * 0.3));
        } else if (team.finances.fanbase < fanBaseline * 0.6) {
            // Way below baseline — slow drift up (natural floor)
            team.finances.fanbase = Math.round(team.finances.fanbase * (1 + this.FANBASE_TIER_GROWTH * 0.3));
        }
        
        // Fanbase floor: never below 20% of tier baseline
        team.finances.fanbase = Math.max(Math.round(fanBaseline * 0.20), team.finances.fanbase);
        
        // ─── LEGACY PROFILE UPDATES ───
        const lp = team.finances.legacyProfile;
        if (tier === 1) lp.seasonsInT1 = (lp.seasonsInT1 || 0) + 1;
        else if (tier === 2) lp.seasonsInT2 = (lp.seasonsInT2 || 0) + 1;
        else lp.seasonsInT3 = (lp.seasonsInT3 || 0) + 1;
        lp.consecutiveSeasons = (lp.consecutiveSeasons || 0) + 1;
        
        // Track iconic players (95+ OVR on roster)
        if (team.roster) {
            const iconicCount = team.roster.filter(p => p.rating >= 95).length;
            lp.iconicPlayers = (lp.iconicPlayers || 0) + iconicCount;
        }
        
        // Recalculate legacy revenue from updated profile
        this.recalculateLegacyRevenue(team);
        
        // ─── SEASON TRACKING ───
        team.finances.seasonsInCurrentTier = (team.finances.seasonsInCurrentTier || 0) + 1;
        
        // ─── FINANCIAL STABILITY CHECK ───
        const spendingLimit = this.getSpendingLimit(team);
        const currentSalary = window.calculateTeamSalary(team);
        const usagePct = currentSalary / spendingLimit;
        
        if (usagePct > 0.95) {
            team.finances.financialStability = 'danger';
        } else if (usagePct > 0.85 || team.finances.spendingRatio >= 0.85) {
            team.finances.financialStability = 'caution';
        } else {
            team.finances.financialStability = 'stable';
        }
        
        // ─── REVENUE HISTORY ───
        if (!team.finances.revenueHistory) team.finances.revenueHistory = [];
        team.finances.revenueHistory.push({
            season: team.finances.seasonsInCurrentTier,
            totalRevenue: this.getTotalRevenue(team),
            spendingLimit: spendingLimit,
            tier: tier,
            winPct: winPct,
            fanbase: team.finances.fanbase
        });
        // Keep last 10 seasons
        if (team.finances.revenueHistory.length > 10) {
            team.finances.revenueHistory = team.finances.revenueHistory.slice(-10);
        }
        
        console.log(`💰 ${team.name} (T${tier}): Revenue ${window.formatCurrency(this.getTotalRevenue(team))} | Limit ${window.formatCurrency(spendingLimit)} | Fans ${team.finances.fanbase.toLocaleString()} | ${team.finances.financialStability}`);
    },
    
    // ═══════════════════════════════════════════════════════════════
    // ENSURE FINANCES EXIST — backward compatibility for old saves
    // ═══════════════════════════════════════════════════════════════
    ensureFinances(team) {
        if (!team.finances) {
            this.initializeTeamFinances(team);
            
            // If team has old parachute data, convert to revenue model
            if (team.parachuteRemaining && team.parachuteRemaining > 0) {
                // Team was relegated under old system — give them elevated revenue
                const fromTier = team.parachuteFromTier || (team.tier === 2 ? 1 : 2);
                const fromBaseline = this.TIER_BASELINES[fromTier];
                const yearsAgo = (team.parachuteAmounts ? team.parachuteAmounts.length : 2) - team.parachuteRemaining;
                
                // Set elevated revenue based on how long ago relegation happened
                const decayFactor = Math.pow(0.70, yearsAgo); // ~30% loss per year already elapsed
                team.finances.revenue.matchday = Math.round(fromBaseline.matchday * decayFactor);
                team.finances.revenue.commercial = Math.round(fromBaseline.commercial * decayFactor);
                team.finances.previousTier = fromTier;
                
                console.log(`🔄 Migrated ${team.name} from parachute system to revenue model`);
                
                // Clean up old data
                delete team.parachuteAmounts;
                delete team.parachuteRemaining;
                delete team.parachuteFromTier;
            }
            
            // If team had promotion bonus, convert
            if (team.promotionBonus && team.promotionBonus > 0) {
                const fromTier = team.tier === 1 ? 2 : 3;
                team.finances.previousTier = fromTier;
                team.finances.seasonsInCurrentTier = 0;
                
                // Boost matchday/commercial to reflect recent promotion
                team.finances.revenue.matchday = Math.round(team.finances.revenue.matchday * 1.15);
                team.finances.revenue.commercial = Math.round(team.finances.revenue.commercial * 1.15);
                
                console.log(`🔄 Migrated ${team.name} from promotion bonus to revenue model`);
                delete team.promotionBonus;
            }
            
            // SAFEGUARD: If team's current roster salary exceeds the new spending limit,
            // scale up revenue so they're not immediately non-compliant.
            // This handles old saves where rosters were built for the flat cap.
            if (team.tier !== 1 && team.roster && team.roster.length > 0) {
                const currentSalary = team.roster.reduce((sum, p) => sum + (p.salary || 0), 0);
                const spendingLimit = this.getSpendingLimit(team);
                if (currentSalary > spendingLimit) {
                    // Need to increase revenue so spending limit covers current salary
                    // Add 10% headroom so they're not right at the edge
                    const neededRevenue = (currentSalary * 1.10) / team.finances.spendingRatio;
                    const currentRevenue = this.getTotalRevenue(team);
                    if (neededRevenue > currentRevenue) {
                        const scaleFactor = neededRevenue / currentRevenue;
                        team.finances.revenue.matchday = Math.round(team.finances.revenue.matchday * scaleFactor);
                        team.finances.revenue.commercial = Math.round(team.finances.revenue.commercial * scaleFactor);
                        console.log(`💰 ${team.name}: Scaled revenue up ${scaleFactor.toFixed(2)}x to cover existing roster salary (${window.formatCurrency(currentSalary)} salary vs ${window.formatCurrency(spendingLimit)} old limit)`);
                    }
                }
            }
        }
        return team.finances;
    },
    
    // ═══════════════════════════════════════════════════════════════
    // GET FINANCIAL SUMMARY — for UI display
    // ═══════════════════════════════════════════════════════════════
    getFinancialSummary(team) {
        this.ensureFinances(team);
        const r = team.finances.revenue;
        const totalRevenue = this.getTotalRevenue(team);
        const spendingLimit = this.getSpendingLimit(team);
        const salaryFloor = this.getSalaryFloor(team);
        const currentSalary = window.calculateTeamSalary(team);
        const capSpace = Math.max(0, spendingLimit - currentSalary);
        
        return {
            revenue: { ...r },
            totalRevenue,
            spendingLimit,
            salaryFloor,
            currentSalary,
            capSpace,
            spendingRatio: team.finances.spendingRatio,
            fanbase: team.finances.fanbase,
            marketSize: team.finances.marketSize,
            metroPopulation: team.finances.metroPopulation || null,
            stability: team.finances.financialStability,
            legacyProfile: { ...team.finances.legacyProfile },
            isHardCap: team.tier === 1,
            usagePct: currentSalary / spendingLimit,
            revenueHistory: team.finances.revenueHistory || []
        };
    }
};
