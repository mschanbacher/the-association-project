/**
 * GLOSSARY.js - In-game encyclopedia and help system
 * 
 * This file contains all glossary entries for The Association Project.
 * Entries are organized by category and can be displayed in-game via
 * the Help/Glossary screen.
 */

export const GLOSSARY = {
  // ═══════════════════════════════════════════════════════════════════
  // PLAYER STATS
  // ═══════════════════════════════════════════════════════════════════
  stats: {
    _category: "Player Statistics",
    _description: "Statistics tracked for each player during games and across the season.",
    
    PTS: {
      name: "Points",
      short: "PTS",
      description: "Total points scored. Includes 2-point field goals, 3-point field goals, and free throws.",
      formula: "(2PT × 2) + (3PT × 3) + FT",
      example: "A player who makes 5 two-pointers, 3 three-pointers, and 4 free throws has 23 PTS."
    },
    
    REB: {
      name: "Rebounds",
      short: "REB",
      description: "Total rebounds, combining offensive and defensive rebounds. A rebound is credited when a player recovers the ball after a missed shot.",
      related: ["OREB", "DREB"]
    },
    
    OREB: {
      name: "Offensive Rebounds",
      short: "OREB",
      description: "Rebounds of missed shots by the player's own team. Offensive rebounds give the team another scoring opportunity."
    },
    
    DREB: {
      name: "Defensive Rebounds",
      short: "DREB", 
      description: "Rebounds of missed shots by the opposing team. Defensive rebounds end the opponent's possession."
    },
    
    AST: {
      name: "Assists",
      short: "AST",
      description: "Passes that directly lead to a made basket by a teammate. The passer gets credit for the assist."
    },
    
    STL: {
      name: "Steals",
      short: "STL",
      description: "Turnovers forced by taking the ball from an opponent. Includes intercepted passes and stripping the ball from a dribbler."
    },
    
    BLK: {
      name: "Blocks",
      short: "BLK",
      description: "Shots rejected by a defender. The defender must make contact with the ball, not the shooter's hand."
    },
    
    TO: {
      name: "Turnovers",
      short: "TO",
      description: "Possessions lost to the opponent without a shot attempt. Includes bad passes, offensive fouls, and stepping out of bounds."
    },
    
    FGM: {
      name: "Field Goals Made",
      short: "FGM",
      description: "Total made shots from the field (both 2-pointers and 3-pointers). Does not include free throws."
    },
    
    FGA: {
      name: "Field Goals Attempted",
      short: "FGA",
      description: "Total shot attempts from the field. Used with FGM to calculate field goal percentage."
    },
    
    "FG%": {
      name: "Field Goal Percentage",
      short: "FG%",
      description: "Percentage of field goal attempts that are made.",
      formula: "FGM / FGA × 100",
      example: "8 makes on 16 attempts = 50% FG%"
    },
    
    "3PM": {
      name: "Three-Pointers Made",
      short: "3PM",
      description: "Made shots from beyond the three-point arc."
    },
    
    "3PA": {
      name: "Three-Pointers Attempted",
      short: "3PA",
      description: "Shot attempts from beyond the three-point arc."
    },
    
    "3P%": {
      name: "Three-Point Percentage",
      short: "3P%",
      description: "Percentage of three-point attempts that are made.",
      formula: "3PM / 3PA × 100",
      benchmark: "League average is typically 35-37%"
    },
    
    FTM: {
      name: "Free Throws Made",
      short: "FTM",
      description: "Made shots from the free throw line, awarded after certain fouls."
    },
    
    FTA: {
      name: "Free Throws Attempted",
      short: "FTA",
      description: "Free throw attempts. Players typically shoot 1, 2, or 3 free throws depending on the foul situation."
    },
    
    "FT%": {
      name: "Free Throw Percentage",
      short: "FT%",
      description: "Percentage of free throw attempts that are made.",
      formula: "FTM / FTA × 100",
      benchmark: "League average is typically 75-78%"
    },
    
    MIN: {
      name: "Minutes Played",
      short: "MIN",
      description: "Total time on the court. A regulation game has 48 minutes, divided among typically 8-10 players."
    },
    
    "+/-": {
      name: "Plus/Minus",
      short: "+/-",
      description: "Point differential while the player is on the court. Positive means the team outscored opponents; negative means they were outscored.",
      example: "A +12 means the team scored 12 more points than the opponent while this player was playing.",
      note: "Plus/minus can be misleading for individual games but is useful over larger samples."
    },
    
    GmSc: {
      name: "Game Score",
      short: "GmSc",
      description: "A single-number summary of a player's game performance, developed by John Hollinger.",
      formula: "PTS + 0.4×FGM - 0.7×FGA - 0.4×(FTA-FTM) + 0.7×OREB + 0.3×DREB + STL + 0.7×AST + 0.7×BLK - 0.4×PF - TO",
      benchmark: "10 is average, 20 is good, 30 is excellent, 40+ is historic"
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // ADVANCED METRICS
  // ═══════════════════════════════════════════════════════════════════
  advanced: {
    _category: "Advanced Metrics",
    _description: "Calculated statistics that provide deeper insight into player and team performance.",
    
    OVR: {
      name: "Overall Rating",
      short: "OVR",
      description: "A composite rating from 0-99 representing a player's overall ability. Combines offensive and defensive skills weighted by position.",
      tiers: {
        "90+": "Superstar / MVP candidate",
        "80-89": "All-Star caliber",
        "70-79": "Quality starter",
        "60-69": "Rotation player",
        "50-59": "End of bench / developmental",
        "<50": "Below replacement level"
      }
    },
    
    OFF: {
      name: "Offensive Rating",
      short: "OFF",
      description: "A player's offensive ability rating. Higher-rated offensive players score more efficiently and create better opportunities.",
      note: "Weighted more heavily for guards and wings."
    },
    
    DEF: {
      name: "Defensive Rating", 
      short: "DEF",
      description: "A player's defensive ability rating. Higher-rated defenders force more turnovers and contest shots more effectively.",
      note: "Weighted more heavily for bigs and defensive specialists."
    },
    
    POT: {
      name: "Potential",
      short: "POT",
      description: "The maximum overall rating a player can reach through development. Young players may have high potential but lower current ratings."
    },
    
    USG: {
      name: "Usage Rate",
      short: "USG%",
      description: "Percentage of team possessions a player uses while on the court. High usage players handle the ball and take shots more frequently.",
      formula: "Based on FGA, FTA, and turnovers relative to team totals",
      benchmark: "League average is ~20%. Stars often have 28-32% usage."
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // WIN PROBABILITY
  // ═══════════════════════════════════════════════════════════════════
  winProbability: {
    _category: "Win Probability",
    _description: "The likelihood of winning based on current game state.",
    
    overview: {
      name: "Win Probability",
      short: "WP",
      description: "The estimated chance of winning the game given the current score and time remaining. Updated after every possession.",
      interpretation: {
        ">90%": "Virtually certain victory",
        "70-90%": "Strong favorite",
        "55-70%": "Slight advantage", 
        "45-55%": "Toss-up",
        "30-45%": "Underdog",
        "<30%": "Major comeback needed"
      }
    },
    
    preGameProb: {
      name: "Pre-Game Probability",
      short: "Pre-Game WP",
      description: "Win probability before the game starts, based on team ratings. Home teams get a ~3 point advantage (~55-58% when evenly matched)."
    },
    
    chart: {
      name: "Win Probability Chart",
      description: "Visual representation of how win probability changed throughout the game. The line moves toward whichever team is favored.",
      reading: {
        "Line at bottom": "Home team favored",
        "Line at top": "Away team favored",
        "Line at middle": "Game is even",
        "Green color": "You are favored",
        "Red color": "Opponent is favored"
      }
    },
    
    scoringRuns: {
      name: "Scoring Runs",
      description: "Periods where one team scores consecutive points without the opponent scoring. Shown as annotations on the win probability chart.",
      example: "A '10-0 run' means one team scored 10 straight points."
    },
    
    howCalculated: {
      name: "How It's Calculated",
      description: "Win probability uses a logistic model based on NBA play-by-play data. Key factors:",
      factors: [
        "Current score margin (most important late in games)",
        "Time remaining (leads are safer with less time left)",
        "Pre-game team strength (fades as game progresses)"
      ],
      note: "A 3-point lead means little at tip-off (~3% swing) but can be decisive with 10 seconds left (~45% swing)."
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // TEAM MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════
  team: {
    _category: "Team Management",
    _description: "Concepts related to managing your team's roster and finances.",
    
    salaryCap: {
      name: "Salary Cap",
      description: "The maximum amount a team can spend on player salaries. Varies by tier.",
      tiers: {
        "Tier 1": "$140M cap (NBA level)",
        "Tier 2": "$15M cap (G-League level)",
        "Tier 3": "$2M cap (Amateur level)"
      },
      note: "Teams over the cap have limited options for signing new players."
    },
    
    luxuryTax: {
      name: "Luxury Tax",
      short: "Tax",
      description: "A penalty paid by teams that exceed the salary cap. The tax increases progressively the further over the cap you go."
    },
    
    chemistry: {
      name: "Team Chemistry",
      description: "How well players work together. Good chemistry provides small bonuses to performance, while poor chemistry can hurt the team.",
      factors: [
        "Winning games improves chemistry",
        "Losing streaks hurt chemistry",
        "Playoff intensity affects chemistry more"
      ]
    },
    
    fatigue: {
      name: "Player Fatigue",
      description: "Players who play heavy minutes accumulate fatigue, reducing their effectiveness. Rest days and reduced minutes help recovery."
    },
    
    rotation: {
      name: "Rotation",
      description: "The group of 8-10 players who receive regular playing time. The coach determines rotation based on skill, matchups, and fatigue."
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // LEAGUE STRUCTURE
  // ═══════════════════════════════════════════════════════════════════
  league: {
    _category: "League Structure", 
    _description: "How the league is organized across tiers and divisions.",
    
    tiers: {
      name: "Tier System",
      description: "The league has three competitive tiers with promotion and relegation between them.",
      structure: {
        "Tier 1": "30 teams - Premier professional league (NBA equivalent)",
        "Tier 2": "80 teams - Developmental league (G-League equivalent)", 
        "Tier 3": "150 teams - Amateur/college level"
      }
    },
    
    promotion: {
      name: "Promotion",
      description: "Moving up to a higher tier. Typically the playoff champion and top regular season teams from lower tiers earn promotion."
    },
    
    relegation: {
      name: "Relegation",
      description: "Moving down to a lower tier. The worst-performing teams in a tier may be relegated to make room for promoted teams."
    },
    
    divisions: {
      name: "Divisions",
      description: "Teams are grouped into divisions for scheduling and playoff seeding. Division winners earn advantages in the postseason."
    },
    
    playoffs: {
      name: "Playoffs",
      description: "Postseason tournament to determine the champion. Format varies by tier:",
      formats: {
        "Tier 1": "16 teams, best-of-7 series",
        "Tier 2": "Division playoffs then national tournament",
        "Tier 3": "Regional qualifiers then national bracket"
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  // GAME CONCEPTS
  // ═══════════════════════════════════════════════════════════════════
  game: {
    _category: "Game Concepts",
    _description: "Core basketball and simulation concepts.",
    
    possession: {
      name: "Possession",
      description: "A team's opportunity to score, ending when they score, miss and the opponent rebounds, turn it over, or commit a violation."
    },
    
    pace: {
      name: "Pace",
      description: "How fast a team plays, measured in possessions per game. High-pace teams push the tempo and score more (and allow more) points.",
      benchmark: "Average NBA pace is ~100 possessions per game."
    },
    
    homeCourt: {
      name: "Home Court Advantage",
      description: "Teams playing at home have a statistical advantage, typically worth 2-3 points. This is reflected in pre-game win probability."
    },
    
    simulation: {
      name: "Game Simulation",
      description: "Games are simulated possession-by-possession, with outcomes determined by player ratings, coaching, matchups, and randomness."
    },
    
    boxScore: {
      name: "Box Score",
      description: "A statistical summary of a game showing each player's performance. Includes points, rebounds, assists, and other stats."
    }
  }
};

/**
 * Helper function to get a glossary entry by key
 */
export function getGlossaryEntry(category, key) {
  const cat = GLOSSARY[category];
  if (!cat) return null;
  return cat[key] || null;
}

/**
 * Search glossary entries by term
 */
export function searchGlossary(term) {
  const results = [];
  const searchTerm = term.toLowerCase();
  
  for (const [catKey, category] of Object.entries(GLOSSARY)) {
    for (const [entryKey, entry] of Object.entries(category)) {
      if (entryKey.startsWith('_')) continue; // Skip metadata
      
      const name = entry.name?.toLowerCase() || '';
      const short = entry.short?.toLowerCase() || '';
      const desc = entry.description?.toLowerCase() || '';
      
      if (name.includes(searchTerm) || short.includes(searchTerm) || desc.includes(searchTerm)) {
        results.push({
          category: catKey,
          categoryName: category._category,
          key: entryKey,
          ...entry
        });
      }
    }
  }
  
  return results;
}

/**
 * Get all entries in a category
 */
export function getCategoryEntries(categoryKey) {
  const category = GLOSSARY[categoryKey];
  if (!category) return [];
  
  return Object.entries(category)
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, entry]) => ({ key, ...entry }));
}

/**
 * Get all categories
 */
export function getCategories() {
  return Object.entries(GLOSSARY).map(([key, cat]) => ({
    key,
    name: cat._category,
    description: cat._description
  }));
}
