// ═══════════════════════════════════════════════════════════════════
// DivisionManager — Geographic divisions, assignment, balancing
// ═══════════════════════════════════════════════════════════════════
//
// Pure data + logic: no DOM, no gameState.
// Owns CITY_TO_DIVISIONS mapping, neighbor graphs, and balancer algorithms.
//

export const CITY_TO_DIVISIONS = {
    // Tier 1 NBA teams (exact matches)
    'Boston': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Brooklyn': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'New York': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Philadelphia': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Toronto': { t1: 'Atlantic', t2: 'Northeast', t3: 'Twin Cities MBL' },
    'Chicago': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Cleveland': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Detroit': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Indiana': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'Milwaukee': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Atlanta': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Charlotte': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Miami': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Orlando': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Washington': { t1: 'Southeast', t2: 'Southeast', t3: 'Greater Philadelphia MBL' },
    'Denver': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Minnesota': { t1: 'Northwest', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Oklahoma City': { t1: 'Northwest', t2: 'Great Plains', t3: 'Gulf Coast MBL' },
    'Portland': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Utah': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Golden State': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'LA': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Phoenix': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Sacramento': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Dallas': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Houston': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'Memphis': { t1: 'Southwest', t2: 'South', t3: 'Tennessee Valley MBL' },
    'New Orleans': { t1: 'Southwest', t2: 'South', t3: 'Gulf Coast MBL' },
    'San Antonio': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    
    // Tier 2 RBL cities
    'Seattle': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Tacoma': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Spokane': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Salem': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Eugene': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Vancouver': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Victoria': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Boise': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'San Diego': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Anaheim': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Riverside': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Ontario': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Tijuana': { t1: 'Pacific', t2: 'California', t3: 'Border Cities MBL' },
    'Oakland': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'San Jose': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'Fresno': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Las Vegas': { t1: 'Pacific', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Reno': { t1: 'Pacific', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Albuquerque': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Las Cruces': { t1: 'Southwest', t2: 'Southwest', t3: 'Border Cities MBL' },
    'Tucson': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Hermosillo': { t1: 'Pacific', t2: 'Southwest', t3: 'Border Cities MBL' },
    'Ciudad Juárez': { t1: 'Southwest', t2: 'Southwest', t3: 'Border Cities MBL' },
    'Colorado Springs': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Omaha': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Lincoln': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Wichita': { t1: 'Southwest', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Kansas City': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Des Moines': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Sioux Falls': { t1: 'Northwest', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Tulsa': { t1: 'Southwest', t2: 'Great Plains', t3: 'Gulf Coast MBL' },
    'St. Louis': { t1: 'Central', t2: 'Great Plains', t3: 'Ohio Valley MBL' },
    'Pittsburgh': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Philadelphia MBL' },
    'Columbus': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Cincinnati': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Grand Rapids': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Madison': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Fort Wayne': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'Toledo': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Buffalo': { t1: 'Atlantic', t2: 'Great Lakes', t3: 'Upstate New York MBL' },
    'Louisville': { t1: 'Central', t2: 'South', t3: 'Ohio Valley MBL' },
    'Nashville': { t1: 'Southwest', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Birmingham': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Greenville': { t1: 'Southeast', t2: 'South', t3: 'North Carolina Triangle MBL' },
    'Little Rock': { t1: 'Southwest', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Chattanooga': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Knoxville': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Mobile': { t1: 'Southeast', t2: 'South', t3: 'Gulf Coast MBL' },
    'Columbia': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Raleigh': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Richmond': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Norfolk': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Greensboro': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Charleston': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Savannah': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Montreal': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Quebec': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Ottawa': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Hartford': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Providence': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Albany': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Rochester': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Worcester': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Austin': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Corpus Christi': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'Lubbock': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Amarillo': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Waco': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Laredo': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Monterrey': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Saltillo': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Calgary': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Twin Cities MBL' },
    'Edmonton': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Twin Cities MBL' },
    'Saskatoon': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Twin Cities MBL' },
    'Regina': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Twin Cities MBL' },
    'Winnipeg': { t1: 'Central', t2: 'Prairie/Mountain Canada', t3: 'Twin Cities MBL' },
    'Lethbridge': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Mountain West MBL' },
    'Missoula': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Mountain West MBL' },
    'Mexico City': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'Guadalajara': { t1: 'Pacific', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'Puebla': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'León': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'Querétaro': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'Aguascalientes': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    'Toluca': { t1: 'Southwest', t2: 'Central Mexico', t3: 'Border Cities MBL' },
    
    // Tier 3 MBL cities
    'Glendale': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Pasadena': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Long Beach': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Torrance': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Irvine': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Santa Clarita': { t1: 'Pacific', t2: 'California', t3: 'Greater Los Angeles MBL' },
    'Fremont': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'Hayward': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'Daly City': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'San Mateo': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'Concord': { t1: 'Pacific', t2: 'California', t3: 'Bay Area MBL' },
    'San Bernardino': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Moreno Valley': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Fontana': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Corona': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Rancho Cucamonga': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Redlands': { t1: 'Pacific', t2: 'California', t3: 'Inland Empire MBL' },
    'Bakersfield': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Modesto': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Stockton': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Visalia': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Merced': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Turlock': { t1: 'Pacific', t2: 'California', t3: 'Central Valley MBL' },
    'Aurora': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Naperville': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Joliet': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Rockford': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Elgin': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Peoria': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Chicago MBL' },
    'Sugar Land': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'The Woodlands': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'Pearland': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'League City': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'Beaumont': { t1: 'Southwest', t2: 'Texas', t3: 'Greater Houston MBL' },
    'Arlington': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Plano': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Irving': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Garland': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Frisco': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Denton': { t1: 'Southwest', t2: 'Texas', t3: 'Dallas-Fort Worth MBL' },
    'Mesa': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Chandler': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Scottsdale': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Gilbert': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Flagstaff': { t1: 'Pacific', t2: 'Southwest', t3: 'Phoenix Metro MBL' },
    'Marietta': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Roswell': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Macon': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Athens': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Warner Robins': { t1: 'Southeast', t2: 'Southeast', t3: 'Atlanta Metro MBL' },
    'Warren': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Ann Arbor': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Lansing': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Dearborn': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Rochester Hills': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'Flint': { t1: 'Central', t2: 'Great Lakes', t3: 'Greater Detroit MBL' },
    'St. Paul': { t1: 'Central', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Duluth': { t1: 'Northwest', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'St. Cloud': { t1: 'Central', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Mankato': { t1: 'Central', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Bloomington': { t1: 'Central', t2: 'Great Plains', t3: 'Twin Cities MBL' },
    'Bellevue': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Kent': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Everett': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Bellingham': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Yakima': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Kennewick': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Greater Seattle MBL' },
    'Fort Lauderdale': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Pembroke Pines': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Boca Raton': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'West Palm Beach': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Fort Myers': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Port St. Lucie': { t1: 'Southeast', t2: 'Southeast', t3: 'South Florida MBL' },
    'Lowell': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Springfield': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Bridgeport': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'New Haven': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Amherst': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Burlington': { t1: 'Atlantic', t2: 'Northeast', t3: 'New England MBL' },
    'Reading': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Allentown': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Bethlehem': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Trenton': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Wilmington': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Lancaster': { t1: 'Atlantic', t2: 'Northeast', t3: 'Greater Philadelphia MBL' },
    'Wenatchee': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Bend': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Medford': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Idaho Falls': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Pocatello': { t1: 'Northwest', t2: 'Pacific Northwest', t3: 'Pacific NW Small Cities MBL' },
    'Binghamton': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Utica': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Ithaca': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Elmira': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Glens Falls': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Plattsburgh': { t1: 'Atlantic', t2: 'Northeast', t3: 'Upstate New York MBL' },
    'Durham': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Fayetteville': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Wilmington': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Asheville': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'High Point': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Winston-Salem': { t1: 'Southeast', t2: 'Southeast', t3: 'North Carolina Triangle MBL' },
    'Akron': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Dayton': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Canton': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Youngstown': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Huntington': { t1: 'Central', t2: 'Great Lakes', t3: 'Ohio Valley MBL' },
    'Muncie': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'South Bend': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'Champaign': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'Ames': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Iowa City': { t1: 'Central', t2: 'Great Plains', t3: 'Midwest College Towns MBL' },
    'Kalamazoo': { t1: 'Central', t2: 'Great Lakes', t3: 'Midwest College Towns MBL' },
    'Provo': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Ogden': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Fort Collins': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Boulder': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Billings': { t1: 'Northwest', t2: 'Prairie/Mountain Canada', t3: 'Mountain West MBL' },
    'Casper': { t1: 'Northwest', t2: 'Southwest', t3: 'Mountain West MBL' },
    'Murfreesboro': { t1: 'Southwest', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Huntsville': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Tuscaloosa': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Auburn': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Montgomery': { t1: 'Southeast', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Jackson': { t1: 'Southwest', t2: 'South', t3: 'Tennessee Valley MBL' },
    'Baton Rouge': { t1: 'Southwest', t2: 'South', t3: 'Gulf Coast MBL' },
    'Shreveport': { t1: 'Southwest', t2: 'South', t3: 'Gulf Coast MBL' },
    'Lafayette': { t1: 'Southwest', t2: 'South', t3: 'Gulf Coast MBL' },
    'Lake Charles': { t1: 'Southwest', t2: 'South', t3: 'Gulf Coast MBL' },
    'Pensacola': { t1: 'Southeast', t2: 'Southeast', t3: 'Gulf Coast MBL' },
    'McAllen': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Brownsville': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Yuma': { t1: 'Pacific', t2: 'Southwest', t3: 'Border Cities MBL' },
    'Nuevo Laredo': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Reynosa': { t1: 'Southwest', t2: 'Texas', t3: 'Border Cities MBL' },
    'Mexicali': { t1: 'Pacific', t2: 'California', t3: 'Border Cities MBL' }
};

// Assign team to correct division based on location

export class DivisionManager {

    // ─────────────────────────────────────────────────────────────
    // GEOGRAPHIC NEIGHBOR MAPS
    // ─────────────────────────────────────────────────────────────

    static T1_NEIGHBORS = {
        'Atlantic':   ['Central', 'Southeast'],
        'Central':    ['Atlantic', 'Southeast', 'Northwest', 'Southwest'],
        'Southeast':  ['Atlantic', 'Central', 'Southwest'],
        'Northwest':  ['Central', 'Pacific', 'Southwest'],
        'Pacific':    ['Northwest', 'Southwest'],
        'Southwest':  ['Central', 'Southeast', 'Northwest', 'Pacific']
    };

    static T2_NEIGHBORS = {
        'Pacific Northwest':        ['California', 'Prairie/Mountain Canada'],
        'California':               ['Pacific Northwest', 'Southwest'],
        'Southwest':                ['California', 'Great Plains', 'Texas', 'Central Mexico'],
        'Great Plains':             ['Southwest', 'Great Lakes', 'South', 'Prairie/Mountain Canada'],
        'Great Lakes':              ['Great Plains', 'Northeast', 'South'],
        'South':                    ['Great Lakes', 'Southeast', 'Great Plains', 'Texas'],
        'Southeast':                ['South', 'Northeast'],
        'Northeast':                ['Southeast', 'Great Lakes'],
        'Texas':                    ['Southwest', 'South', 'Central Mexico'],
        'Prairie/Mountain Canada':  ['Pacific Northwest', 'Great Plains'],
        'Central Mexico':           ['Texas', 'Southwest']
    };

    static T3_NEIGHBORS = {
        'Greater Los Angeles MBL':      ['Inland Empire MBL', 'Bay Area MBL'],
        'Bay Area MBL':                 ['Greater Los Angeles MBL', 'Central Valley MBL'],
        'Inland Empire MBL':            ['Greater Los Angeles MBL', 'Central Valley MBL'],
        'Central Valley MBL':           ['Bay Area MBL', 'Inland Empire MBL'],
        'Greater Seattle MBL':          ['Pacific NW Small Cities MBL'],
        'Pacific NW Small Cities MBL':  ['Greater Seattle MBL', 'Mountain West MBL'],
        'Phoenix Metro MBL':            ['Mountain West MBL', 'Border Cities MBL'],
        'Mountain West MBL':            ['Phoenix Metro MBL', 'Pacific NW Small Cities MBL', 'Border Cities MBL', 'Twin Cities MBL'],
        'Border Cities MBL':            ['Phoenix Metro MBL', 'Mountain West MBL', 'Dallas-Fort Worth MBL', 'Greater Houston MBL'],
        'Dallas-Fort Worth MBL':        ['Border Cities MBL', 'Greater Houston MBL', 'Gulf Coast MBL'],
        'Greater Houston MBL':          ['Dallas-Fort Worth MBL', 'Border Cities MBL', 'Gulf Coast MBL'],
        'Greater Chicago MBL':          ['Greater Detroit MBL', 'Midwest College Towns MBL', 'Twin Cities MBL'],
        'Greater Detroit MBL':          ['Greater Chicago MBL', 'Ohio Valley MBL', 'Midwest College Towns MBL'],
        'Twin Cities MBL':              ['Greater Chicago MBL', 'Midwest College Towns MBL', 'Mountain West MBL'],
        'Midwest College Towns MBL':    ['Greater Chicago MBL', 'Greater Detroit MBL', 'Twin Cities MBL', 'Ohio Valley MBL'],
        'Ohio Valley MBL':              ['Greater Detroit MBL', 'Midwest College Towns MBL', 'Tennessee Valley MBL', 'Greater Philadelphia MBL'],
        'New England MBL':              ['Greater Philadelphia MBL', 'Upstate New York MBL'],
        'Greater Philadelphia MBL':     ['New England MBL', 'Upstate New York MBL', 'Ohio Valley MBL', 'North Carolina Triangle MBL'],
        'Upstate New York MBL':         ['New England MBL', 'Greater Philadelphia MBL'],
        'Atlanta Metro MBL':            ['North Carolina Triangle MBL', 'Tennessee Valley MBL'],
        'North Carolina Triangle MBL':  ['Atlanta Metro MBL', 'Greater Philadelphia MBL', 'South Florida MBL'],
        'South Florida MBL':            ['North Carolina Triangle MBL', 'Gulf Coast MBL'],
        'Tennessee Valley MBL':         ['Atlanta Metro MBL', 'Ohio Valley MBL', 'Gulf Coast MBL'],
        'Gulf Coast MBL':               ['Tennessee Valley MBL', 'South Florida MBL', 'Dallas-Fort Worth MBL', 'Greater Houston MBL']
    };

    static T2_NATURAL = {
        'Pacific Northwest': 8, 'California': 8, 'Southwest': 8,
        'Great Plains': 8, 'Great Lakes': 8, 'South': 8,
        'Southeast': 7, 'Northeast': 9, 'Texas': 8,
        'Prairie/Mountain Canada': 7, 'Central Mexico': 7
    };

    // ─────────────────────────────────────────────────────────────
    // DIVISION ASSIGNMENT
    // ─────────────────────────────────────────────────────────────

    /**
     * Assign a team to its natural division based on city name
     * @param {string} teamName
     * @param {number} tier
     * @returns {string}
     */
    static assignDivision(teamName, tier) {
        for (const [city, divisions] of Object.entries(CITY_TO_DIVISIONS)) {
            if (teamName.includes(city)) {
                if (tier === 1) return divisions.t1;
                if (tier === 2) return divisions.t2;
                if (tier === 3) return divisions.t3;
            }
        }
        // Fallback defaults
        if (tier === 1) return 'Atlantic';
        if (tier === 2) return 'Pacific Northwest';
        return 'Greater Los Angeles MBL';
    }

    // ─────────────────────────────────────────────────────────────
    // DIVISION BALANCERS
    // ─────────────────────────────────────────────────────────────

    /**
     * Generic geo-aware balancer
     * @param {Array} teams - Mutable array of team objects with .division
     * @param {Object} config - { target|naturalSizes, flex, neighbors, divisions }
     */
    static _balance(teams, config) {
        const { neighbors, flex = 0, maxIterations = 40 } = config;
        const divisions = config.divisions || Object.keys(neighbors);

        // Support both fixed target and per-division natural sizes
        const getMax = config.naturalSizes
            ? (div) => (config.naturalSizes[div] || 6) + flex
            : (_div) => (config.target || 5);

        const countOf = (div) => teams.filter(t => t.division === div).length;

        let safety = maxIterations;
        while (safety-- > 0) {
            const over = divisions.find(d => countOf(d) > getMax(d));
            if (!over) break;

            const candidates = teams.filter(t => t.division === over);
            let bestTeam = null, bestTarget = null, bestScore = -Infinity;

            for (const team of candidates) {
                const naturalDiv = DivisionManager.assignDivision(team.name,
                    config.tier || 1);

                for (const target of divisions) {
                    if (target === over) continue;
                    if (countOf(target) >= getMax(target)) continue;

                    let score = 0;
                    if (target === naturalDiv) score = 100;
                    else if (neighbors[over] && neighbors[over].includes(target)) score = 10;

                    if (score > bestScore) {
                        bestScore = score;
                        bestTeam = team;
                        bestTarget = target;
                    }
                }
            }

            if (!bestTeam) break;
            console.log(`  T${config.tier || '?'} move: ${bestTeam.name} ${over} → ${bestTarget} (score ${bestScore})`);
            bestTeam.division = bestTarget;
        }
    }

    /**
     * Balance Tier 1: strict 5 per division
     * @param {Array} teams - gameState.tier1Teams (mutated in-place)
     */
    static balanceTier1(teams) {
        DivisionManager._balance(teams, {
            tier: 1,
            target: 5,
            neighbors: DivisionManager.T1_NEIGHBORS,
            divisions: ['Atlantic', 'Central', 'Southeast', 'Northwest', 'Pacific', 'Southwest'],
            maxIterations: 20
        });
    }

    /**
     * Balance Tier 2: soft caps with flex
     * @param {Array} teams - gameState.tier2Teams (mutated in-place)
     */
    static balanceTier2(teams) {
        DivisionManager._balance(teams, {
            tier: 2,
            naturalSizes: DivisionManager.T2_NATURAL,
            flex: 2,
            neighbors: DivisionManager.T2_NEIGHBORS,
            maxIterations: 30
        });
    }

    /**
     * Balance Tier 3: 6 natural, ±2 flex
     * @param {Array} teams - gameState.tier3Teams (mutated in-place)
     */
    static balanceTier3(teams) {
        const t3Natural = {};
        for (const div of Object.keys(DivisionManager.T3_NEIGHBORS)) {
            t3Natural[div] = 6;
        }

        DivisionManager._balance(teams, {
            tier: 3,
            naturalSizes: t3Natural,
            flex: 2,
            neighbors: DivisionManager.T3_NEIGHBORS,
            maxIterations: 40
        });
    }
}
