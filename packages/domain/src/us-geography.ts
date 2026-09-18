/**
 * us-geography — a real US place gazetteer for the Investor Ask interpreter.
 *
 * TH-DISCOVERY-PARITY-001B: the interpreter used to recognise geography only when a literal
 * state name or state code appeared in the question ("... Boulder Colorado"). A question that
 * named only a city or a county ("... near Fort Worth", "... Jersey City",
 * "financial advisors Palm Beach County") resolved no office filter at all and was then executed
 * as an unfiltered national roster listing presented as if it answered the local question.
 *
 * This module is source-independent US geography (city/county/metro -> state). It asserts nothing
 * about firms, registration, or SEC/IARD coverage: it only decides which principal-office filter a
 * question requested. Resolution here never widens a filter silently — every broadening is
 * reported back to the caller so it can be disclosed.
 */

import { REGION_NAMES } from './investor-home-intel';

export type UsPlaceKind = 'state' | 'city' | 'county' | 'metro';

export type UsPlaceMatch = {
  kind: UsPlaceKind;
  /** Place text as the question wrote it. */
  requested: string;
  /** Canonical gazetteer label. */
  label: string;
  /** Dominant state code for this place name. */
  state: string;
  /** Every state code that has a place of this name, dominant first. */
  candidateStates: string[];
  /** True when the same place name exists in more than one state. */
  ambiguous: boolean;
  /** County/metro/region names are not executable as a principal-office city value. */
  stateLevelOnly: boolean;
  /** Token span (inclusive start, exclusive end) inside the scanned text. */
  start: number;
  end: number;
};

export type UsGeographyOutcome =
  | 'STATE'
  | 'CITY'
  | 'CITY_BROADENED_TO_STATE'
  | 'UNRESOLVED_PLACE'
  | 'NO_LOCATION'
  /** TH-DISCOVERY-PARITY-001B-REVIEW finding 3: an explicit, deliberate request for nationwide
   * scope ("in the US", "in the United States") -- this is not a place resolution failure, so it
   * must never be reported as UNRESOLVED_PLACE. It legitimately carries no state/city filter. */
  | 'NATIONWIDE';

export type UsGeographyDecision = {
  outcome: UsGeographyOutcome;
  /** Executable principal-office state code, when one was resolved. */
  state?: string;
  /** Executable principal-office city value, when city-level execution is supported. */
  city?: string;
  /** The place the question actually asked for, verbatim where possible. */
  requested?: string;
  kind?: UsPlaceKind;
  candidateStates?: string[];
  ambiguous?: boolean;
  /** Honest, user-facing reasons this decision differs from the literal request. */
  broadenings: string[];
};

/** Cities by state, roughly population-ordered inside each state. */
const CITIES_BY_STATE: Record<string, string[]> = {
  CA: [
    'Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach',
    'Oakland', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine',
    'Chula Vista', 'Fremont', 'San Bernardino', 'Modesto', 'Fontana', 'Oxnard', 'Moreno Valley',
    'Huntington Beach', 'Santa Clarita', 'Garden Grove', 'Oceanside', 'Rancho Cucamonga',
    'Santa Rosa', 'Ontario', 'Elk Grove', 'Corona', 'Lancaster', 'Palmdale', 'Salinas', 'Hayward',
    'Pomona', 'Escondido', 'Sunnyvale', 'Torrance', 'Pasadena', 'Fullerton', 'Thousand Oaks',
    'Visalia', 'Simi Valley', 'Concord', 'Roseville', 'Victorville', 'Santa Clara', 'Vallejo',
    'Berkeley', 'El Monte', 'Downey', 'Costa Mesa', 'Inglewood', 'Carlsbad', 'Ventura', 'Fairfield',
    'West Covina', 'Murrieta', 'Antioch', 'Temecula', 'Burbank', 'Daly City', 'Santa Maria',
    'El Cajon', 'San Mateo', 'Clovis', 'Mission Viejo', 'Vacaville', 'Redding', 'Santa Monica',
    'Westminster', 'Santa Barbara', 'Chico', 'Newport Beach', 'San Leandro', 'Whittier',
    'Citrus Heights', 'Alhambra', 'Tracy', 'Livermore', 'Buena Park', 'Merced', 'Hemet', 'Napa',
    'Redwood City', 'Mountain View', 'Alameda', 'Upland', 'Folsom', 'San Ramon', 'Pleasanton',
    'Union City', 'Manteca', 'Redlands', 'Turlock', 'Milpitas', 'Palo Alto', 'Davis', 'Camarillo',
    'Rancho Cordova', 'Cupertino', 'Laguna Niguel', 'Walnut Creek', 'Encinitas', 'Beverly Hills',
    'Los Gatos', 'Menlo Park', 'San Rafael', 'Novato', 'Petaluma', 'Sausalito', 'Monterey',
    'Carmel', 'Palm Springs', 'Palm Desert', 'La Jolla', 'Marina del Rey', 'Manhattan Beach',
    'Hermosa Beach', 'Redondo Beach', 'El Segundo', 'Culver City', 'Woodland Hills', 'Sherman Oaks',
    'Studio City', 'Century City', 'Brentwood', 'Calabasas', 'Agoura Hills', 'Westlake Village',
    'Laguna Beach', 'Dana Point', 'San Clemente', 'Aliso Viejo', 'Yorba Linda', 'Brea', 'Orange',
    'Tustin', 'Chino Hills', 'Diamond Bar', 'Walnut', 'Arcadia', 'San Marino', 'Glendora',
    'Claremont', 'La Canada Flintridge', 'South Pasadena', 'Sonoma', 'Healdsburg', 'Truckee',
    'South Lake Tahoe', 'Eureka', 'San Luis Obispo', 'Paso Robles', 'Santa Cruz', 'Capitola',
    'Half Moon Bay', 'Burlingame', 'San Carlos', 'Belmont', 'Foster City', 'Emeryville', 'Piedmont',
    'Orinda', 'Lafayette', 'Danville', 'Dublin', 'Pleasant Hill', 'Martinez', 'Benicia', 'Dixon',
    'Woodland', 'Auburn', 'Grass Valley', 'Nevada City', 'Placerville', 'El Dorado Hills',
    'Granite Bay', 'Rocklin', 'Lincoln', 'Yuba City', 'Bishop', 'Mammoth Lakes', 'Indio',
    'La Quinta', 'Rancho Mirage', 'Coachella', 'Banning', 'Beaumont', 'Wildomar', 'Menifee',
    'Lake Elsinore', 'Perris', 'San Jacinto', 'Yucaipa', 'Rialto', 'Colton', 'Highland',
    'Apple Valley', 'Hesperia', 'Barstow', 'Ridgecrest', 'Lompoc', 'Goleta', 'Solvang', 'Ojai',
  ],
  TX: [
    'Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington',
    'Corpus Christi', 'Plano', 'Laredo', 'Lubbock', 'Garland', 'Irving', 'Amarillo',
    'Grand Prairie', 'Brownsville', 'McKinney', 'Frisco', 'Mesquite', 'Killeen', 'McAllen',
    'Carrollton', 'Midland', 'Waco', 'Denton', 'Abilene', 'Odessa', 'Beaumont', 'Round Rock',
    'Richardson', 'The Woodlands', 'Pearland', 'College Station', 'Wichita Falls', 'Lewisville',
    'Tyler', 'San Angelo', 'Allen', 'League City', 'Sugar Land', 'Edinburg', 'Mission',
    'Longview', 'Bryan', 'Pharr', 'Baytown', 'Missouri City', 'Temple', 'Flower Mound',
    'New Braunfels', 'Georgetown', 'Harlingen', 'Cedar Park', 'Conroe', 'Port Arthur', 'Rowlett',
    'Victoria', 'Galveston', 'Southlake', 'Katy', 'Spring', 'Cypress', 'Humble', 'Kingwood',
    'Sherman', 'Denison', 'Texarkana', 'Paris', 'Greenville', 'Waxahachie', 'Cleburne',
    'Weatherford', 'Granbury', 'Burleson', 'Mansfield', 'Keller', 'Colleyville', 'Grapevine',
    'Euless', 'Bedford', 'Hurst', 'North Richland Hills', 'Haltom City', 'Saginaw', 'Azle',
    'Benbrook', 'Crowley', 'Aledo', 'Prosper', 'Celina', 'Little Elm', 'The Colony', 'Coppell',
    'Farmers Branch', 'Addison', 'University Park', 'Highland Park', 'Duncanville', 'DeSoto',
    'Cedar Hill', 'Lancaster', 'Rockwall', 'Wylie', 'Murphy', 'Sachse', 'Forney', 'Terrell',
    'Kaufman', 'Corsicana', 'Bastrop', 'Kyle', 'Buda', 'San Marcos', 'Seguin', 'Boerne',
    'Kerrville', 'Fredericksburg', 'Schertz', 'Cibolo', 'Helotes', 'Alamo Heights', 'Del Rio',
    'Eagle Pass', 'Uvalde', 'Weslaco', 'San Benito', 'Rio Grande City', 'Alice', 'Kingsville',
    'Portland', 'Rockport', 'Port Lavaca', 'Bay City', 'Lake Jackson', 'Angleton', 'Alvin',
    'Friendswood', 'Dickinson', 'Texas City', 'La Porte', 'Deer Park', 'Pasadena', 'Channelview',
    'Katy Mills', 'Richmond', 'Rosenberg', 'Fulshear', 'Brenham', 'Huntsville', 'Lufkin',
    'Nacogdoches', 'Marshall', 'Kilgore', 'Palestine', 'Athens', 'Mineral Wells', 'Stephenville',
    'Brownwood', 'San Saba', 'Big Spring', 'Sweetwater', 'Snyder', 'Plainview', 'Levelland',
    'Pampa', 'Borger', 'Dumas', 'Canyon', 'Hereford', 'Andrews', 'Pecos', 'Fort Stockton', 'Alpine',
  ],
  FL: [
    'Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Port St. Lucie',
    'Cape Coral', 'Tallahassee', 'Fort Lauderdale', 'Pembroke Pines', 'Hollywood', 'Gainesville',
    'Miramar', 'Coral Springs', 'Palm Bay', 'West Palm Beach', 'Clearwater', 'Lakeland',
    'Pompano Beach', 'Boca Raton', 'Deltona', 'Plantation', 'Sunrise', 'Palm Coast', 'Fort Myers',
    'Davie', 'Melbourne', 'Boynton Beach', 'Miami Gardens', 'Largo', 'Homestead', 'Delray Beach',
    'Daytona Beach', 'Deerfield Beach', 'North Miami', 'Wellington', 'Jupiter', 'Ocala',
    'Port Orange', 'Coconut Creek', 'Sanford', 'Sarasota', 'Pensacola', 'Bradenton',
    'Palm Beach Gardens', 'Pinellas Park', 'Coral Gables', 'Doral', 'Bonita Springs', 'Apopka',
    'Titusville', 'North Port', 'Kissimmee', 'Winter Garden', 'Weston', 'Naples', 'Venice',
    'Vero Beach', 'Stuart', 'Key West', 'Winter Park', 'Altamonte Springs', 'Oviedo', 'Aventura',
    'Sunny Isles Beach', 'Miami Beach', 'Palm Harbor', 'Brandon', 'Riverview', 'Wesley Chapel',
    'Estero', 'Jacksonville Beach', 'Panama City', 'Destin', 'Tamarac', 'Margate', 'Lauderhill',
    'Hallandale Beach', 'Fort Pierce', 'Port Charlotte', 'Punta Gorda', 'Palm Beach', 'Ocoee',
    'Longwood', 'Maitland', 'Windermere', 'Lake Mary', 'Palmetto Bay', 'Pinecrest', 'Cutler Bay',
    'Miami Lakes', 'Sebastian', 'Leesburg', 'Clermont', 'The Villages', 'Spring Hill',
    'New Port Richey', 'Dunedin', 'Tarpon Springs', 'St. Augustine', 'Ponte Vedra Beach',
    'Fernandina Beach', 'Orange Park', 'Lake Worth', 'Royal Palm Beach', 'Greenacres', 'Parkland',
    'Coconut Grove', 'Key Biscayne', 'Fort Walton Beach', 'Niceville', 'Crestview', 'Navarre',
    'Gulf Breeze', 'Santa Rosa Beach', 'Marianna', 'Quincy', 'Live Oak', 'Lake City', 'Alachua',
    'Newberry', 'Starke', 'Palatka', 'Bunnell', 'Ormond Beach', 'New Smyrna Beach', 'DeLand',
    'Debary', 'Eustis', 'Tavares', 'Mount Dora', 'Winter Haven', 'Haines City', 'Auburndale',
    'Bartow', 'Lake Wales', 'Sebring', 'Okeechobee', 'Belle Glade', 'Pahokee', 'Jupiter Island',
    'Tequesta', 'Hobe Sound', 'Palm City', 'Jensen Beach', 'Fort Myers Beach', 'Sanibel',
    'Marco Island', 'Immokalee', 'Lehigh Acres', 'Englewood', 'Nokomis', 'Osprey', 'Lakewood Ranch',
    'Palmetto', 'Ruskin', 'Plant City', 'Temple Terrace', 'Seffner', 'Valrico', 'Lutz', 'Odessa',
    'Trinity', 'Hudson', 'Zephyrhills', 'Dade City', 'Brooksville', 'Homosassa', 'Crystal River',
    'Inverness', 'Dunnellon', 'Belleview', 'Summerfield', 'Oxford', 'Wildwood', 'Bushnell',
  ],
  NY: [
    'New York', 'New York City', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany',
    'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy',
    'Niagara Falls', 'Binghamton', 'Freeport', 'Valley Stream', 'Long Beach', 'Ithaca',
    'Poughkeepsie', 'Newburgh', 'Saratoga Springs', 'Kingston', 'Elmira', 'Jamestown', 'Rome',
    'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Garden City', 'Great Neck',
    'Manhasset', 'Port Washington', 'Roslyn', 'Syosset', 'Huntington', 'Melville', 'Hauppauge',
    'Smithtown', 'Islandia', 'Ronkonkoma', 'Patchogue', 'Riverhead', 'Southampton', 'East Hampton',
    'Bridgehampton', 'Scarsdale', 'Rye', 'Harrison', 'Purchase', 'Tarrytown', 'Armonk',
    'Mount Kisco', 'Bedford Hills', 'Katonah', 'Larchmont', 'Mamaroneck', 'Bronxville', 'Pelham',
    'Nyack', 'Suffern', 'Spring Valley', 'Monsey', 'Nanuet', 'Middletown', 'Goshen', 'Warwick',
    'Beacon', 'Fishkill', 'Rhinebeck', 'Hudson', 'Woodstock', 'Catskill', 'Oneonta', 'Cooperstown',
    'Corning', 'Geneva', 'Canandaigua', 'Auburn', 'Oswego', 'Watertown', 'Plattsburgh', 'Glens Falls',
  ],
  PA: [
    'Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Scranton', 'Bethlehem',
    'Lancaster', 'Harrisburg', 'Altoona', 'York', 'State College', 'Wilkes-Barre', 'Chester',
    'Williamsport', 'Easton', 'Lebanon', 'Hazleton', 'New Castle', 'Johnstown', 'Norristown',
    'King of Prussia', 'Wayne', 'Bryn Mawr', 'Villanova', 'Radnor', 'Conshohocken', 'Plymouth Meeting',
    'Blue Bell', 'Ambler', 'Doylestown', 'Newtown', 'Bensalem', 'Langhorne', 'West Chester',
    'Media', 'Springfield', 'Havertown', 'Ardmore', 'Narberth', 'Jenkintown', 'Abington',
    'Warrington', 'Sewickley', 'Wexford', 'Cranberry Township', 'Monroeville', 'Greensburg',
    'Washington', 'Uniontown', 'Indiana', 'Butler', 'Beaver', 'Carlisle', 'Camp Hill', 'Hershey',
    'Mechanicsburg', 'Chambersburg', 'Gettysburg', 'Pottsville', 'Stroudsburg', 'Bloomsburg',
  ],
  IL: [
    'Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield', 'Elgin', 'Peoria',
    'Champaign', 'Waukegan', 'Cicero', 'Bloomington', 'Arlington Heights', 'Evanston', 'Schaumburg',
    'Bolingbrook', 'Decatur', 'Palatine', 'Skokie', 'Des Plaines', 'Orland Park', 'Oak Lawn',
    'Berwyn', 'Mount Prospect', 'Normal', 'Wheaton', 'Hoffman Estates', 'Oak Park', 'Downers Grove',
    'Elmhurst', 'Glenview', 'DeKalb', 'Lombard', 'Buffalo Grove', 'Bartlett', 'Moline', 'Urbana',
    'Crystal Lake', 'Quincy', 'Streamwood', 'Carol Stream', 'Romeoville', 'Plainfield', 'Hanover Park',
    'Carpentersville', 'Wheeling', 'Park Ridge', 'Addison', 'Northbrook', 'Elk Grove Village',
    'Danville', 'Galesburg', 'Highland Park', 'Lake Forest', 'Libertyville', 'Deerfield', 'Winnetka',
    'Wilmette', 'Hinsdale', 'Burr Ridge', 'Oak Brook', 'Lisle', 'Warrenville', 'St. Charles',
    'Geneva', 'Batavia', 'Barrington', 'Long Grove', 'Vernon Hills', 'Gurnee', 'Rock Island',
  ],
  OH: [
    'Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton', 'Parma', 'Canton',
    'Youngstown', 'Lorain', 'Hamilton', 'Springfield', 'Kettering', 'Elyria', 'Lakewood',
    'Cuyahoga Falls', 'Middletown', 'Euclid', 'Newark', 'Mansfield', 'Mentor', 'Beavercreek',
    'Cleveland Heights', 'Strongsville', 'Dublin', 'Fairfield', 'Findlay', 'Warren', 'Lancaster',
    'Lima', 'Huber Heights', 'Westerville', 'Marion', 'Grove City', 'Reynoldsburg', 'Delaware',
    'Brunswick', 'Upper Arlington', 'Stow', 'North Olmsted', 'Gahanna', 'Westlake', 'North Royalton',
    'Massillon', 'Bowling Green', 'Shaker Heights', 'Sandusky', 'Chillicothe', 'Athens', 'Zanesville',
  ],
  GA: [
    'Atlanta', 'Augusta', 'Columbus', 'Macon', 'Savannah', 'Athens', 'Sandy Springs', 'Roswell',
    'Johns Creek', 'Albany', 'Warner Robins', 'Alpharetta', 'Marietta', 'Valdosta', 'Smyrna',
    'Dunwoody', 'Rome', 'East Point', 'Milton', 'Gainesville', 'Peachtree City', 'Newnan',
    'Douglasville', 'Kennesaw', 'LaGrange', 'Statesboro', 'Duluth', 'Stockbridge', 'Woodstock',
    'Carrollton', 'Canton', 'Griffin', 'McDonough', 'Acworth', 'Buford', 'Suwanee', 'Cumming',
    'Lawrenceville', 'Snellville', 'Decatur', 'Tucker', 'Brookhaven', 'Norcross', 'Conyers',
    'Jonesboro', 'Fayetteville', 'Tyrone', 'Brunswick', 'St. Simons Island', 'Thomasville',
  ],
  NC: [
    'Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville', 'Cary',
    'Wilmington', 'High Point', 'Concord', 'Asheville', 'Greenville', 'Gastonia', 'Apex',
    'Huntersville', 'Jacksonville', 'Chapel Hill', 'Burlington', 'Rocky Mount', 'Wake Forest',
    'Mooresville', 'Hickory', 'Indian Trail', 'Kannapolis', 'Monroe', 'Salisbury', 'Matthews',
    'Cornelius', 'Davidson', 'Waxhaw', 'Pineville', 'Mint Hill', 'Morrisville', 'Holly Springs',
    'Fuquay-Varina', 'Garner', 'Clayton', 'Knightdale', 'Goldsboro', 'New Bern', 'Southern Pines',
    'Pinehurst', 'Boone', 'Hendersonville', 'Mount Airy', 'Statesville', 'Kinston', 'Elizabeth City',
  ],
  MI: [
    'Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing', 'Flint',
    'Dearborn', 'Livonia', 'Troy', 'Westland', 'Farmington Hills', 'Kalamazoo', 'Wyoming',
    'Southfield', 'Rochester Hills', 'Taylor', 'Saint Clair Shores', 'Pontiac', 'Novi',
    'Royal Oak', 'Dearborn Heights', 'Battle Creek', 'Saginaw', 'Kentwood', 'East Lansing',
    'Roseville', 'Portage', 'Midland', 'Muskegon', 'Bloomfield Hills', 'Birmingham', 'Traverse City',
    'Holland', 'Grand Haven', 'Petoskey', 'Marquette', 'Jackson', 'Monroe', 'Port Huron',
  ],
  NJ: [
    'Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Woodbridge', 'Lakewood',
    'Toms River', 'Hamilton', 'Trenton', 'Clifton', 'Camden', 'Brick', 'Cherry Hill', 'Passaic',
    'Union City', 'Old Bridge', 'East Orange', 'Bayonne', 'North Bergen', 'Vineland', 'Piscataway',
    'New Brunswick', 'Wayne', 'Irvington', 'Parsippany', 'Howell', 'Perth Amboy', 'Hoboken',
    'Plainfield', 'West New York', 'East Brunswick', 'Bloomfield', 'West Orange', 'Bridgewater',
    'Hackensack', 'Sayreville', 'Mount Laurel', 'Kearny', 'Linden', 'Marlboro', 'Teaneck',
    'Atlantic City', 'Fair Lawn', 'Princeton', 'Montclair', 'Morristown', 'Summit', 'Westfield',
    'Ridgewood', 'Englewood', 'Fort Lee', 'Paramus', 'Red Bank', 'Freehold', 'Cranford',
    'Livingston', 'Short Hills', 'Millburn', 'Madison', 'Chatham', 'Basking Ridge', 'Somerville',
    'Flemington', 'Mahwah', 'Wyckoff', 'Saddle River', 'Voorhees', 'Haddonfield', 'Moorestown',
    'Medford', 'Sewell', 'Mount Holly', 'Burlington', 'Ocean City', 'Cape May', 'Wildwood',
    'Asbury Park', 'Long Branch', 'Eatontown', 'Manasquan', 'Point Pleasant', 'Rumson', 'Holmdel',
    'Colts Neck', 'Matawan', 'Metuchen', 'Somerset', 'Warren', 'Berkeley Heights', 'New Providence',
    'Denville', 'Randolph', 'Rockaway', 'Sparta', 'Newton', 'Roseland', 'Florham Park',
    'Whippany', 'Hanover', 'Union', 'Springfield', 'Maplewood', 'South Orange', 'Verona',
    'Caldwell', 'Nutley', 'Belleville', 'Secaucus', 'Weehawken', 'Edgewater', 'Cliffside Park',
    'Ridgefield', 'Tenafly', 'Closter', 'Hillsdale', 'Ramsey', 'Oradell', 'Emerson', 'Pompton Plains',
    'Cinnaminson', 'Marlton', 'Turnersville', 'Glassboro', 'Deptford', 'Pennsauken', 'Maple Shade',
    'Bordentown', 'Hightstown', 'Lawrenceville', 'Pennington', 'Hopewell', 'Robbinsville',
    'Monroe Township', 'Manalapan', 'Middletown', 'Neptune', 'Wall Township', 'Brielle',
    'Spring Lake', 'Sea Girt', 'Bay Head', 'Beachwood', 'Barnegat', 'Manahawkin', 'Egg Harbor',
    'Galloway', 'Northfield', 'Somers Point', 'Absecon', 'Pleasantville', 'Millville', 'Bridgeton',
  ],
  VA: [
    'Virginia Beach', 'Chesapeake', 'Arlington', 'Norfolk', 'Richmond', 'Newport News',
    'Alexandria', 'Hampton', 'Roanoke', 'Portsmouth', 'Suffolk', 'Lynchburg', 'Harrisonburg',
    'Leesburg', 'Charlottesville', 'Danville', 'Blacksburg', 'Manassas', 'Petersburg', 'Fairfax',
    'McLean', 'Vienna', 'Reston', 'Herndon', 'Tysons', 'Falls Church', 'Springfield', 'Annandale',
    'Centreville', 'Chantilly', 'Ashburn', 'Sterling', 'Woodbridge', 'Fredericksburg', 'Winchester',
    'Staunton', 'Williamsburg', 'Midlothian', 'Glen Allen', 'Henrico', 'Chester', 'Mechanicsville',
  ],
  WA: [
    'Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent', 'Everett', 'Renton',
    'Federal Way', 'Spokane Valley', 'Yakima', 'Kirkland', 'Bellingham', 'Kennewick', 'Auburn',
    'Pasco', 'Marysville', 'Redmond', 'Shoreline', 'Richland', 'Sammamish', 'Burien', 'Olympia',
    'Lacey', 'Edmonds', 'Puyallup', 'Bremerton', 'Bothell', 'Longview', 'Issaquah', 'Wenatchee',
    'Mount Vernon', 'University Place', 'Walla Walla', 'Pullman', 'SeaTac', 'Maple Valley',
    'Mercer Island', 'Bainbridge Island', 'Camas', 'Gig Harbor', 'Port Orchard', 'Mukilteo',
    'Snohomish', 'Monroe', 'Woodinville', 'Kenmore', 'Tukwila', 'Covington', 'Oak Harbor',
    'Anacortes', 'Ellensburg', 'Moses Lake', 'Aberdeen', 'Centralia', 'Port Angeles', 'Sequim',
    'Leavenworth', 'Chelan', 'Poulsbo', 'Silverdale', 'Duvall', 'Enumclaw', 'Sumner',
    'Bonney Lake', 'Spanaway', 'Steilacoom', 'DuPont', 'Fife', 'Milton', 'Edgewood', 'Orting',
    'Eatonville', 'Yelm', 'Tumwater', 'Shelton', 'Battle Ground', 'Ridgefield', 'Washougal',
    'Stevenson', 'Goldendale', 'Sunnyside', 'Grandview', 'Prosser', 'Othello', 'Quincy',
    'Ephrata', 'Soap Lake', 'Omak', 'Okanogan', 'Colville', 'Deer Park', 'Cheney', 'Liberty Lake',
    'Newport', 'Clarkston', 'Dayton', 'Waitsburg', 'College Place', 'Kelso', 'Castle Rock',
    'Woodland', 'Chehalis', 'Napavine', 'Winlock', 'Tenino', 'Rainier', 'Roy', 'McCleary',
    'Elma', 'Montesano', 'Hoquiam', 'Ocean Shores', 'Westport', 'Raymond', 'Long Beach',
    'Ilwaco', 'Naselle', 'Cathlamet', 'Lynden', 'Ferndale', 'Blaine', 'Sedro-Woolley',
    'Burlington', 'La Conner', 'Stanwood', 'Arlington', 'Granite Falls', 'Lake Stevens',
    'Mill Creek', 'Lynnwood', 'Mountlake Terrace', 'Brier', 'Woodway', 'Clyde Hill', 'Medina',
    'Newcastle', 'Normandy Park', 'Des Moines', 'Lakewood', 'Fircrest', 'Ruston', 'Carbonado',
  ],
  AZ: [
    'Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Glendale', 'Gilbert', 'Tempe',
    'Peoria', 'Surprise', 'Yuma', 'Avondale', 'Goodyear', 'Flagstaff', 'Buckeye', 'Lake Havasu City',
    'Casa Grande', 'Sierra Vista', 'Maricopa', 'Oro Valley', 'Prescott', 'Bullhead City',
    'Prescott Valley', 'Apache Junction', 'Marana', 'El Mirage', 'Kingman', 'Queen Creek',
    'Fountain Hills', 'Paradise Valley', 'Sedona', 'Payson', 'Nogales', 'Douglas', 'Show Low',
  ],
  MA: [
    'Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton', 'Quincy', 'Lynn',
    'New Bedford', 'Fall River', 'Newton', 'Lawrence', 'Somerville', 'Framingham', 'Haverhill',
    'Waltham', 'Malden', 'Brookline', 'Plymouth', 'Medford', 'Taunton', 'Chicopee', 'Weymouth',
    'Revere', 'Peabody', 'Methuen', 'Barnstable', 'Pittsfield', 'Attleboro', 'Everett',
    'Salem', 'Westfield', 'Leominster', 'Fitchburg', 'Beverly', 'Holyoke', 'Marlborough',
    'Woburn', 'Chelsea', 'Braintree', 'Natick', 'Randolph', 'Watertown', 'Franklin', 'Lexington',
    'Needham', 'Wellesley', 'Concord', 'Andover', 'Burlington', 'Danvers', 'Hingham', 'Duxbury',
    'Wakefield', 'Reading', 'Winchester', 'Belmont', 'Arlington', 'Dedham', 'Norwood', 'Canton',
  ],
  TN: [
    'Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro',
    'Franklin', 'Johnson City', 'Jackson', 'Hendersonville', 'Kingsport', 'Collierville',
    'Smyrna', 'Cleveland', 'Brentwood', 'Germantown', 'Columbia', 'Spring Hill', 'La Vergne',
    'Gallatin', 'Cookeville', 'Oak Ridge', 'Morristown', 'Bartlett', 'Lebanon', 'Maryville',
    'Mount Juliet', 'Bristol', 'Farragut', 'Shelbyville', 'Sevierville', 'Tullahoma', 'Dyersburg',
  ],
  IN: [
    'Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel', 'Fishers', 'Bloomington',
    'Hammond', 'Gary', 'Lafayette', 'Muncie', 'Noblesville', 'Terre Haute', 'Greenwood',
    'Kokomo', 'Anderson', 'Elkhart', 'Mishawaka', 'Lawrence', 'Jeffersonville', 'Columbus',
    'Portage', 'New Albany', 'Richmond', 'Valparaiso', 'Goshen', 'Michigan City', 'West Lafayette',
    'Westfield', 'Zionsville', 'Merrillville', 'Crown Point', 'Schererville', 'Munster',
  ],
  MD: [
    'Baltimore', 'Columbia', 'Germantown', 'Silver Spring', 'Waldorf', 'Frederick', 'Ellicott City',
    'Glen Burnie', 'Rockville', 'Gaithersburg', 'Bethesda', 'Dundalk', 'Bowie', 'Towson',
    'Aspen Hill', 'Wheaton', 'Bel Air', 'Potomac', 'Chevy Chase', 'Annapolis', 'Hagerstown',
    'Salisbury', 'Laurel', 'Greenbelt', 'College Park', 'Hyattsville', 'Landover', 'Clinton',
    'Owings Mills', 'Pikesville', 'Catonsville', 'Lutherville', 'Timonium', 'Cockeysville',
    'Westminster', 'Elkton', 'Cambridge', 'Easton', 'Ocean City', 'Cumberland', 'Rockville Pike',
  ],
  MO: [
    'Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence', "Lee's Summit",
    "O'Fallon", 'St. Joseph', 'St. Charles', 'Blue Springs', 'St. Peters', 'Florissant',
    'Joplin', 'Chesterfield', 'Jefferson City', 'Cape Girardeau', 'Wildwood', 'University City',
    'Ballwin', 'Raytown', 'Liberty', 'Wentzville', 'Kirkwood', 'Maryland Heights', 'Gladstone',
    'Grandview', 'Belton', 'Webster Groves', 'Sedalia', 'Ferguson', 'Clayton', 'Creve Coeur',
    'Town and Country', 'Branson', 'Rolla', 'Warrensburg', 'Nixa', 'Ozark', 'Republic',
  ],
  WI: [
    'Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton', 'Waukesha', 'Eau Claire',
    'Oshkosh', 'Janesville', 'West Allis', 'La Crosse', 'Sheboygan', 'Wauwatosa', 'Fond du Lac',
    'New Berlin', 'Wausau', 'Brookfield', 'Beloit', 'Greenfield', 'Franklin', 'Oak Creek',
    'Manitowoc', 'West Bend', 'Sun Prairie', 'Superior', 'Stevens Point', 'Neenah', 'Middleton',
    'Menomonee Falls', 'Mequon', 'Pewaukee', 'Delafield', 'Hartland', 'Lake Geneva', 'Door County',
  ],
  CO: [
    'Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Lakewood', 'Thornton', 'Arvada',
    'Westminster', 'Pueblo', 'Centennial', 'Boulder', 'Greeley', 'Longmont', 'Loveland',
    'Broomfield', 'Grand Junction', 'Castle Rock', 'Commerce City', 'Parker', 'Littleton',
    'Northglenn', 'Brighton', 'Englewood', 'Wheat Ridge', 'Fountain', 'Lafayette', 'Windsor',
    'Erie', 'Golden', 'Louisville', 'Durango', 'Montrose', 'Canon City', 'Sterling', 'Evans',
    'Federal Heights', 'Steamboat Springs', 'Aspen', 'Vail', 'Breckenridge', 'Glenwood Springs',
    'Estes Park', 'Pagosa Springs', 'Telluride', 'Crested Butte', 'Alamosa', 'Trinidad', 'Craig',
    'Rifle', 'Gunnison', 'Salida', 'Fruita', 'Delta', 'Cortez', 'Lamar', 'La Junta', 'Fort Morgan',
    'Monument', 'Woodland Park', 'Highlands Ranch', 'Superior', 'Firestone', 'Frederick',
    'Johnstown', 'Berthoud', 'Wellington', 'Timnath', 'Severance', 'Greenwood Village',
    'Cherry Hills Village', 'Lone Tree', 'Castle Pines', 'Edwards', 'Avon', 'Eagle', 'Silverthorne',
    'Dillon', 'Keystone', 'Winter Park', 'Fraser', 'Granby', 'Basalt', 'Carbondale', 'Snowmass Village',
  ],
  MN: [
    'Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park', 'Plymouth',
    'Woodbury', 'Maple Grove', 'St. Cloud', 'Eagan', 'Eden Prairie', 'Coon Rapids', 'Burnsville',
    'Blaine', 'Lakeville', 'Minnetonka', 'Apple Valley', 'Edina', 'St. Louis Park', 'Moorhead',
    'Mankato', 'Shakopee', 'Maplewood', 'Cottage Grove', 'Richfield', 'Roseville', 'Inver Grove Heights',
    'Andover', 'Savage', 'Brooklyn Center', 'Fridley', 'Wayzata', 'Chanhassen', 'Chaska', 'Hopkins',
  ],
  SC: [
    'Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill', 'Greenville',
    'Summerville', 'Goose Creek', 'Hilton Head Island', 'Florence', 'Spartanburg', 'Myrtle Beach',
    'Aiken', 'Anderson', 'Greer', 'Mauldin', 'Hanahan', 'Conway', 'Simpsonville', 'Easley',
    'North Augusta', 'Bluffton', 'Beaufort', 'Clemson', 'Fort Mill', 'Lexington', 'Irmo',
  ],
  AL: [
    'Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa', 'Hoover', 'Dothan',
    'Auburn', 'Decatur', 'Madison', 'Florence', 'Vestavia Hills', 'Phenix City', 'Prattville',
    'Gadsden', 'Alabaster', 'Opelika', 'Northport', 'Enterprise', 'Daphne', 'Homewood',
    'Bessemer', 'Athens', 'Pelham', 'Fairhope', 'Anniston', 'Mountain Brook', 'Trussville',
  ],
  LA: [
    'New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles', 'Kenner', 'Bossier City',
    'Monroe', 'Alexandria', 'Houma', 'Marrero', 'New Iberia', 'Laplace', 'Slidell', 'Central',
    'Ruston', 'Sulphur', 'Hammond', 'Bayou Cane', 'Shenandoah', 'Metairie', 'Mandeville', 'Covington',
  ],
  KY: [
    'Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington', 'Richmond', 'Georgetown',
    'Florence', 'Hopkinsville', 'Nicholasville', 'Elizabethtown', 'Frankfort', 'Henderson',
    'Jeffersontown', 'Independence', 'Paducah', 'Radcliff', 'Ashland', 'Madisonville', 'Murray',
  ],
  OR: [
    'Portland', 'Eugene', 'Salem', 'Gresham', 'Hillsboro', 'Bend', 'Beaverton', 'Medford',
    'Springfield', 'Corvallis', 'Albany', 'Tigard', 'Lake Oswego', 'Keizer', 'Grants Pass',
    'Oregon City', 'McMinnville', 'Redmond', 'Tualatin', 'West Linn', 'Woodburn', 'Newberg',
    'Forest Grove', 'Wilsonville', 'Roseburg', 'Klamath Falls', 'Ashland', 'Milwaukie', 'Sherwood',
    'Happy Valley', 'Central Point', 'Canby', 'Hermiston', 'Pendleton', 'Coos Bay', 'The Dalles',
    'Astoria', 'Newport', 'Lincoln City', 'Seaside', 'Cannon Beach', 'Hood River', 'Sisters',
  ],
  OK: [
    'Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond', 'Lawton', 'Moore', 'Midwest City',
    'Enid', 'Stillwater', 'Muskogee', 'Bartlesville', 'Owasso', 'Shawnee', 'Ponca City', 'Ardmore',
    'Duncan', 'Yukon', 'Del City', 'Bixby', 'Sand Springs', 'Altus', 'Jenks', 'Claremore', 'Tahlequah',
  ],
  CT: [
    'Bridgeport', 'New Haven', 'Stamford', 'Hartford', 'Waterbury', 'Norwalk', 'Danbury',
    'New Britain', 'West Hartford', 'Greenwich', 'Hamden', 'Meriden', 'Bristol', 'Manchester',
    'West Haven', 'Milford', 'Stratford', 'East Hartford', 'Middletown', 'Wallingford', 'Enfield',
    'Southington', 'Shelton', 'Norwich', 'Torrington', 'Trumbull', 'Glastonbury', 'Naugatuck',
    'Newington', 'Cheshire', 'Vernon', 'Windsor', 'New London', 'Branford', 'Fairfield', 'Westport',
    'Darien', 'New Canaan', 'Wilton', 'Ridgefield', 'Simsbury', 'Farmington', 'Avon', 'Madison',
  ],
  UT: [
    'Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem', 'Sandy', 'Ogden',
    'St. George', 'Layton', 'South Jordan', 'Lehi', 'Millcreek', 'Taylorsville', 'Logan',
    'Murray', 'Draper', 'Bountiful', 'Riverton', 'Herriman', 'Eagle Mountain', 'Spanish Fork',
    'Roy', 'Pleasant Grove', 'Kearns', 'Tooele', 'Cottonwood Heights', 'Springville', 'Cedar City',
    'Park City', 'Heber City', 'American Fork', 'Kaysville', 'Clearfield', 'Syracuse', 'Farmington',
  ],
  IA: [
    'Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City', 'Waterloo', 'Ames',
    'West Des Moines', 'Ankeny', 'Council Bluffs', 'Dubuque', 'Urbandale', 'Cedar Falls',
    'Marion', 'Bettendorf', 'Mason City', 'Marshalltown', 'Clinton', 'Burlington', 'Ottumwa',
  ],
  NV: [
    'Las Vegas', 'Henderson', 'North Las Vegas', 'Reno', 'Sparks', 'Carson City', 'Elko',
    'Mesquite', 'Boulder City', 'Fernley', 'Summerlin', 'Winnemucca', 'Incline Village', 'Pahrump',
  ],
  AR: [
    'Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro', 'North Little Rock',
    'Conway', 'Rogers', 'Bentonville', 'Pine Bluff', 'Hot Springs', 'Benton', 'Texarkana',
    'Sherwood', 'Jacksonville', 'Russellville', 'Bella Vista', 'Paragould', 'Cabot', 'Searcy',
  ],
  MS: [
    'Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi', 'Meridian', 'Tupelo', 'Olive Branch',
    'Greenville', 'Horn Lake', 'Pearl', 'Madison', 'Starkville', 'Clinton', 'Ridgeland', 'Oxford',
  ],
  KS: [
    'Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka', 'Lawrence', 'Shawnee',
    'Manhattan', 'Lenexa', 'Salina', 'Hutchinson', 'Leavenworth', 'Leawood', 'Dodge City',
    'Garden City', 'Junction City', 'Emporia', 'Prairie Village', 'Liberal', 'Hays', 'Pittsburg',
  ],
  NM: [
    'Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell', 'Farmington', 'Clovis',
    'Hobbs', 'Alamogordo', 'Carlsbad', 'Gallup', 'Los Alamos', 'Deming', 'Artesia', 'Taos',
  ],
  NE: [
    'Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney', 'Fremont', 'Hastings',
    'Norfolk', 'North Platte', 'Papillion', 'Columbus', 'La Vista', 'Scottsbluff', 'Beatrice',
  ],
  ID: [
    'Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello', 'Caldwell', 'Coeur d’Alene',
    'Twin Falls', 'Post Falls', 'Lewiston', 'Rexburg', 'Moscow', 'Eagle', 'Kuna', 'Ammon',
    'Hayden', 'Chubbuck', 'Mountain Home', 'Blackfoot', 'Garden City', 'Jerome', 'Burley', 'Sandpoint',
  ],
  WV: [
    'Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling', 'Martinsburg',
    'Fairmont', 'Beckley', 'Clarksburg', 'Weirton', 'Bluefield', 'Lewisburg', 'Elkins',
  ],
  HI: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu', 'Kaneohe', 'Kahului', 'Kihei', 'Lahaina', 'Kona', 'Lihue', 'Wailuku'],
  NH: [
    'Manchester', 'Nashua', 'Concord', 'Derry', 'Dover', 'Rochester', 'Salem', 'Merrimack',
    'Londonderry', 'Hudson', 'Keene', 'Bedford', 'Portsmouth', 'Goffstown', 'Laconia', 'Exeter',
    'Hampton', 'Durham', 'Hanover', 'Lebanon', 'Claremont', 'North Conway', 'Meredith',
  ],
  ME: [
    'Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn', 'Biddeford', 'Sanford',
    'Saco', 'Augusta', 'Westbrook', 'Waterville', 'Presque Isle', 'Brunswick', 'Scarborough',
    'Falmouth', 'Cape Elizabeth', 'Yarmouth', 'Freeport', 'Camden', 'Rockland', 'Bar Harbor', 'Kennebunkport',
  ],
  MT: [
    'Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte', 'Helena', 'Kalispell',
    'Havre', 'Anaconda', 'Miles City', 'Belgrade', 'Livingston', 'Whitefish', 'Big Sky', 'Bigfork',
  ],
  RI: [
    'Providence', 'Cranston', 'Warwick', 'Pawtucket', 'East Providence', 'Woonsocket', 'Newport',
    'Cumberland', 'Coventry', 'North Providence', 'South Kingstown', 'West Warwick', 'Barrington',
  ],
  DE: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna', 'Milford', 'Seaford', 'Georgetown', 'Rehoboth Beach', 'Lewes', 'Bear', 'Hockessin', 'Greenville'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown', 'Mitchell', 'Yankton', 'Pierre', 'Huron', 'Spearfish', 'Vermillion'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo', 'Williston', 'Dickinson', 'Mandan', 'Jamestown', 'Wahpeton'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan', 'Wasilla', 'Kenai', 'Kodiak', 'Bethel', 'Palmer', 'Homer', 'Soldotna'],
  DC: ['Washington', 'Washington DC', 'Georgetown'],
  VT: ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier', 'Winooski', 'St. Albans', 'Essex Junction', 'Brattleboro', 'Stowe', 'Manchester Center'],
  WY: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs', 'Sheridan', 'Green River', 'Evanston', 'Jackson', 'Cody', 'Riverton', 'Cheyenne Ridge'],
};

/**
 * Counties by state. Counties are never executed as a city value: the SEC/IARD roster records a
 * principal-office city and region, so a county request can only be honoured at state level.
 */
const COUNTIES_BY_STATE: Record<string, string[]> = {
  CA: [
    'Los Angeles', 'Orange', 'San Diego', 'Riverside', 'San Bernardino', 'Santa Clara', 'Alameda',
    'Sacramento', 'Contra Costa', 'Fresno', 'Kern', 'San Francisco', 'Ventura', 'San Mateo',
    'San Joaquin', 'Stanislaus', 'Sonoma', 'Tulare', 'Santa Barbara', 'Solano', 'Monterey',
    'Placer', 'San Luis Obispo', 'Santa Cruz', 'Merced', 'Marin', 'Butte', 'Yolo', 'El Dorado',
    'Imperial', 'Shasta', 'Madera', 'Napa', 'Kings', 'Humboldt', 'Nevada', 'Sutter', 'Mendocino',
  ],
  TX: [
    'Harris', 'Dallas', 'Tarrant', 'Bexar', 'Travis', 'Collin', 'Denton', 'Hidalgo', 'El Paso',
    'Fort Bend', 'Montgomery', 'Williamson', 'Cameron', 'Nueces', 'Brazoria', 'Bell', 'Galveston',
    'Lubbock', 'Webb', 'Jefferson', 'McLennan', 'Smith', 'Brazos', 'Hays', 'Ellis', 'Midland',
    'Ector', 'Guadalupe', 'Johnson', 'Parker', 'Comal', 'Randall', 'Potter', 'Taylor', 'Kaufman',
  ],
  FL: [
    'Miami-Dade', 'Broward', 'Palm Beach', 'Hillsborough', 'Orange', 'Pinellas', 'Duval', 'Lee',
    'Polk', 'Brevard', 'Volusia', 'Pasco', 'Seminole', 'Sarasota', 'Manatee', 'Collier', 'Marion',
    'Osceola', 'Lake', 'St. Lucie', 'Escambia', 'Leon', 'Alachua', 'St. Johns', 'Clay', 'Okaloosa',
    'Hernando', 'Bay', 'Charlotte', 'Santa Rosa', 'Martin', 'Indian River', 'Citrus', 'Highlands',
    'Sumter', 'Flagler', 'Monroe', 'Nassau', 'Putnam', 'Columbia', 'Walton',
  ],
  NJ: [
    'Bergen', 'Middlesex', 'Essex', 'Hudson', 'Monmouth', 'Ocean', 'Union', 'Camden', 'Passaic',
    'Morris', 'Burlington', 'Mercer', 'Somerset', 'Gloucester', 'Atlantic', 'Cumberland', 'Sussex',
    'Hunterdon', 'Warren', 'Cape May', 'Salem',
  ],
  WA: [
    'King', 'Pierce', 'Snohomish', 'Spokane', 'Clark', 'Thurston', 'Kitsap', 'Yakima', 'Whatcom',
    'Benton', 'Skagit', 'Cowlitz', 'Grant', 'Franklin', 'Island', 'Lewis', 'Chelan', 'Grays Harbor',
    'Clallam', 'Mason', 'Walla Walla', 'Whitman', 'Douglas', 'Okanogan', 'Stevens', 'Jefferson',
  ],
  CO: [
    'Denver', 'El Paso', 'Arapahoe', 'Jefferson', 'Adams', 'Douglas', 'Larimer', 'Boulder', 'Weld',
    'Pueblo', 'Mesa', 'Broomfield', 'Eagle', 'Garfield', 'La Plata', 'Summit', 'Routt', 'Pitkin',
    'Fremont', 'Montrose', 'Delta', 'Morgan', 'Elbert', 'Teller', 'Chaffee', 'Gunnison', 'Grand',
  ],
  NY: [
    'Kings', 'Queens', 'New York', 'Suffolk', 'Bronx', 'Nassau', 'Westchester', 'Erie', 'Monroe',
    'Richmond', 'Onondaga', 'Orange', 'Rockland', 'Albany', 'Dutchess', 'Saratoga', 'Oneida',
    'Niagara', 'Broome', 'Ulster', 'Putnam', 'Rensselaer', 'Ontario', 'Tompkins', 'Sullivan',
  ],
  PA: [
    'Philadelphia', 'Allegheny', 'Montgomery', 'Bucks', 'Delaware', 'Lancaster', 'Chester', 'York',
    'Berks', 'Lehigh', 'Westmoreland', 'Luzerne', 'Northampton', 'Dauphin', 'Cumberland', 'Erie',
    'Lackawanna', 'Washington', 'Butler', 'Monroe', 'Beaver', 'Centre', 'Franklin', 'Schuylkill',
  ],
  IL: ['Cook', 'DuPage', 'Lake', 'Will', 'Kane', 'McHenry', 'Winnebago', 'St. Clair', 'Madison', 'Champaign', 'Sangamon', 'Peoria', 'McLean', 'DeKalb', 'Kendall'],
  OH: ['Franklin', 'Cuyahoga', 'Hamilton', 'Summit', 'Montgomery', 'Lucas', 'Stark', 'Butler', 'Lorain', 'Warren', 'Delaware', 'Lake', 'Mahoning', 'Clermont', 'Greene'],
  GA: ['Fulton', 'Gwinnett', 'Cobb', 'DeKalb', 'Chatham', 'Clayton', 'Cherokee', 'Forsyth', 'Henry', 'Hall', 'Richmond', 'Muscogee', 'Bibb', 'Columbia', 'Paulding', 'Coweta'],
  NC: ['Mecklenburg', 'Wake', 'Guilford', 'Forsyth', 'Cumberland', 'Durham', 'Buncombe', 'New Hanover', 'Union', 'Gaston', 'Cabarrus', 'Johnston', 'Iredell', 'Catawba', 'Alamance'],
  MI: ['Wayne', 'Oakland', 'Macomb', 'Kent', 'Genesee', 'Washtenaw', 'Ottawa', 'Ingham', 'Kalamazoo', 'Livingston', 'Saginaw', 'Muskegon', 'Berrien'],
  VA: ['Fairfax', 'Prince William', 'Loudoun', 'Henrico', 'Chesterfield', 'Arlington', 'Spotsylvania', 'Stafford', 'Albemarle', 'Hanover', 'Frederick', 'Roanoke', 'Montgomery'],
  MA: ['Middlesex', 'Worcester', 'Suffolk', 'Essex', 'Norfolk', 'Bristol', 'Plymouth', 'Hampden', 'Barnstable', 'Hampshire', 'Berkshire', 'Franklin', 'Dukes', 'Nantucket'],
  MD: ['Montgomery', 'Prince George’s', 'Baltimore', 'Anne Arundel', 'Howard', 'Frederick', 'Harford', 'Carroll', 'Charles', 'Washington', 'St. Mary’s', 'Wicomico'],
  AZ: ['Maricopa', 'Pima', 'Pinal', 'Yavapai', 'Mohave', 'Yuma', 'Coconino', 'Navajo', 'Cochise', 'Gila', 'Santa Cruz'],
  TN: ['Shelby', 'Davidson', 'Knox', 'Hamilton', 'Rutherford', 'Williamson', 'Montgomery', 'Sumner', 'Sullivan', 'Blount', 'Washington', 'Wilson'],
  MO: ['St. Louis', 'Jackson', 'St. Charles', 'Greene', 'Clay', 'Jefferson', 'Boone', 'Jasper', 'Franklin', 'Cass', 'Platte', 'Cole'],
  MN: ['Hennepin', 'Ramsey', 'Dakota', 'Anoka', 'Washington', 'Wright', 'Stearns', 'St. Louis', 'Olmsted', 'Scott', 'Carver', 'Sherburne'],
  WI: ['Milwaukee', 'Dane', 'Waukesha', 'Brown', 'Racine', 'Outagamie', 'Winnebago', 'Kenosha', 'Rock', 'Marathon', 'Washington', 'La Crosse', 'Door'],
  SC: ['Greenville', 'Richland', 'Charleston', 'Horry', 'Spartanburg', 'Lexington', 'York', 'Berkeley', 'Anderson', 'Beaufort', 'Dorchester', 'Florence'],
  IN: ['Marion', 'Lake', 'Allen', 'Hamilton', 'St. Joseph', 'Elkhart', 'Vanderburgh', 'Tippecanoe', 'Porter', 'Hendricks', 'Johnson', 'Monroe'],
  NV: ['Clark', 'Washoe', 'Lyon', 'Carson City', 'Elko', 'Douglas', 'Nye'],
  OR: ['Multnomah', 'Washington', 'Clackamas', 'Lane', 'Marion', 'Jackson', 'Deschutes', 'Linn', 'Douglas', 'Benton', 'Yamhill', 'Josephine'],
  UT: ['Salt Lake', 'Utah', 'Davis', 'Weber', 'Washington', 'Cache', 'Tooele', 'Summit', 'Iron', 'Box Elder'],
  CT: ['Fairfield', 'Hartford', 'New Haven', 'New London', 'Litchfield', 'Middlesex', 'Tolland', 'Windham'],
  OK: ['Oklahoma', 'Tulsa', 'Cleveland', 'Canadian', 'Comanche', 'Rogers', 'Payne', 'Wagoner', 'Creek'],
  KY: ['Jefferson', 'Fayette', 'Kenton', 'Boone', 'Warren', 'Hardin', 'Daviess', 'Campbell', 'Bullitt'],
  LA: ['East Baton Rouge', 'Jefferson', 'Orleans', 'St. Tammany', 'Lafayette', 'Caddo', 'Calcasieu', 'Ouachita', 'Livingston', 'Ascension'],
  AL: ['Jefferson', 'Mobile', 'Madison', 'Montgomery', 'Shelby', 'Tuscaloosa', 'Baldwin', 'Lee', 'Morgan', 'Calhoun'],
  AR: ['Pulaski', 'Benton', 'Washington', 'Faulkner', 'Sebastian', 'Saline', 'Craighead', 'Garland'],
  IA: ['Polk', 'Linn', 'Scott', 'Johnson', 'Black Hawk', 'Woodbury', 'Dubuque', 'Story', 'Dallas'],
  KS: ['Johnson', 'Sedgwick', 'Shawnee', 'Wyandotte', 'Douglas', 'Riley', 'Leavenworth', 'Butler'],
  MS: ['Hinds', 'Harrison', 'DeSoto', 'Rankin', 'Jackson', 'Madison', 'Lee', 'Forrest'],
  NE: ['Douglas', 'Lancaster', 'Sarpy', 'Hall', 'Buffalo', 'Dodge', 'Madison'],
  NM: ['Bernalillo', 'Doña Ana', 'Santa Fe', 'Sandoval', 'San Juan', 'Valencia', 'Lea', 'Chaves'],
  ID: ['Ada', 'Canyon', 'Kootenai', 'Bonneville', 'Bannock', 'Twin Falls', 'Madison', 'Latah'],
  WV: ['Kanawha', 'Berkeley', 'Monongalia', 'Cabell', 'Wood', 'Raleigh', 'Harrison', 'Jefferson'],
  NH: ['Hillsborough', 'Rockingham', 'Merrimack', 'Strafford', 'Grafton', 'Cheshire', 'Belknap'],
  ME: ['Cumberland', 'York', 'Penobscot', 'Kennebec', 'Androscoggin', 'Aroostook', 'Oxford', 'Hancock'],
  RI: ['Providence', 'Kent', 'Washington', 'Newport', 'Bristol'],
  MT: ['Yellowstone', 'Missoula', 'Gallatin', 'Flathead', 'Cascade', 'Lewis and Clark', 'Ravalli'],
  DE: ['New Castle', 'Sussex', 'Kent'],
  SD: ['Minnehaha', 'Pennington', 'Lincoln', 'Brown', 'Brookings'],
  ND: ['Cass', 'Burleigh', 'Grand Forks', 'Ward', 'Williams'],
  AK: ['Anchorage', 'Matanuska-Susitna', 'Fairbanks North Star', 'Kenai Peninsula', 'Juneau'],
  VT: ['Chittenden', 'Rutland', 'Washington', 'Windsor', 'Windham', 'Franklin', 'Addison'],
  WY: ['Laramie', 'Natrona', 'Campbell', 'Sweetwater', 'Fremont', 'Albany', 'Teton'],
  HI: ['Honolulu', 'Hawaii', 'Maui', 'Kauai'],
};

/** Informal metro/region names consumers use. These are state-level only. */
const METROS: Record<string, string[]> = {
  'bay area': ['CA'],
  'san francisco bay area': ['CA'],
  'silicon valley': ['CA'],
  'southern california': ['CA'],
  'northern california': ['CA'],
  socal: ['CA'],
  norcal: ['CA'],
  'inland empire': ['CA'],
  'central valley': ['CA'],
  'orange county area': ['CA'],
  'los angeles area': ['CA'],
  dfw: ['TX'],
  'dallas fort worth': ['TX'],
  'dallas-fort worth': ['TX'],
  metroplex: ['TX'],
  'rio grande valley': ['TX'],
  'hill country': ['TX'],
  'south florida': ['FL'],
  'central florida': ['FL'],
  'north florida': ['FL'],
  'southwest florida': ['FL'],
  'tampa bay': ['FL'],
  'tampa bay area': ['FL'],
  'treasure coast': ['FL'],
  'space coast': ['FL'],
  'emerald coast': ['FL'],
  'florida panhandle': ['FL'],
  'puget sound': ['WA'],
  'greater seattle': ['WA'],
  'seattle area': ['WA'],
  eastside: ['WA'],
  'front range': ['CO'],
  'denver metro': ['CO'],
  'denver area': ['CO'],
  'western slope': ['CO'],
  'north jersey': ['NJ'],
  'south jersey': ['NJ'],
  'central jersey': ['NJ'],
  'jersey shore': ['NJ'],
  'twin cities': ['MN'],
  chicagoland: ['IL'],
  philly: ['PA'],
  'main line': ['PA'],
  'lehigh valley': ['PA'],
  nyc: ['NY'],
  'new york metro': ['NY'],
  'long island': ['NY'],
  'hudson valley': ['NY'],
  'westchester county area': ['NY'],
  'research triangle': ['NC'],
  triangle: ['NC'],
  triad: ['NC'],
  lowcountry: ['SC'],
  'wasatch front': ['UT'],
  'wine country': ['CA'],
  'dc metro': ['DC', 'MD', 'VA'],
  'dmv area': ['DC', 'MD', 'VA'],
  'metro atlanta': ['GA'],
  'greater boston': ['MA'],
  'cape cod': ['MA'],
  'the berkshires': ['MA'],
  'motor city': ['MI'],
  'music city': ['TN'],
  'bluegrass region': ['KY'],
};

/**
 * Dominant state when the same place name exists in several states. The dominant reading is the
 * largest US place of that name; the alternatives are always disclosed, never dropped silently.
 */
const DOMINANT_CITY_STATE: Record<string, string> = {
  portland: 'OR',
  springfield: 'MO',
  columbus: 'OH',
  'kansas city': 'MO',
  jacksonville: 'FL',
  charlotte: 'NC',
  richmond: 'VA',
  rochester: 'NY',
  salem: 'OR',
  aurora: 'CO',
  glendale: 'AZ',
  pasadena: 'CA',
  arlington: 'TX',
  alexandria: 'VA',
  athens: 'GA',
  augusta: 'GA',
  columbia: 'SC',
  peoria: 'AZ',
  lakewood: 'CO',
  hollywood: 'FL',
  bloomington: 'MN',
  cambridge: 'MA',
  manchester: 'NH',
  concord: 'CA',
  gainesville: 'FL',
  albany: 'NY',
  auburn: 'WA',
  newark: 'NJ',
  wilmington: 'DE',
  dover: 'DE',
  greenville: 'SC',
  florence: 'SC',
  lancaster: 'PA',
  reading: 'PA',
  washington: 'DC',
  madison: 'WI',
  jackson: 'MS',
  independence: 'MO',
  franklin: 'TN',
  burlington: 'VT',
  westminster: 'CO',
  englewood: 'CO',
  littleton: 'CO',
  brighton: 'CO',
  louisville: 'KY',
  lafayette: 'LA',
  monroe: 'LA',
  'long beach': 'CA',
  hudson: 'NY',
  medford: 'MA',
  everett: 'WA',
  danville: 'VA',
  middletown: 'NJ',
  clinton: 'MD',
  wayne: 'NJ',
  union: 'NJ',
  chester: 'PA',
  norwalk: 'CT',
  'garden city': 'NY',
  frisco: 'TX',
  'san marcos': 'CA',
  'des moines': 'IA',
  'iowa city': 'IA',
  'oklahoma city': 'OK',
  'new york': 'NY',
  brentwood: 'TN',
  westfield: 'NJ',
  ridgefield: 'CT',
  eagle: 'ID',
  quincy: 'MA',
  vancouver: 'WA',
  odessa: 'TX',
  'orange park': 'FL',
  orange: 'CA',
  victoria: 'TX',
  'winter park': 'FL',
  hampton: 'VA',
  newport: 'RI',
  'newport beach': 'CA',
  lexington: 'KY',
  norfolk: 'VA',
  fairfield: 'CT',
  greenwich: 'CT',
  cheyenne: 'WY',
  paris: 'TX',
  canton: 'OH',
  warren: 'MI',
  troy: 'MI',
  marion: 'IN',
  delaware: 'OH',
  hanover: 'NH',
  lebanon: 'NH',
  london: 'OH',
  clayton: 'MO',
  'spring hill': 'TN',
  bedford: 'MA',
  andover: 'MA',
  billerica: 'MA',
  westlake: 'OH',
  dublin: 'OH',
  berkeley: 'CA',
  'university park': 'TX',
  'highland park': 'IL',
  'mount vernon': 'NY',
  'new castle': 'DE',
  'st. charles': 'MO',
  'saint charles': 'MO',
  greenwood: 'IN',
  plymouth: 'MA',
  wellington: 'FL',
  'cape may': 'NJ',
  'ocean city': 'NJ',
  redmond: 'WA',
  'mount pleasant': 'SC',
  'palm beach': 'FL',
  boulder: 'CO',
  denver: 'CO',
  tacoma: 'WA',
  sacramento: 'CA',
  'jersey city': 'NJ',
  'fort worth': 'TX',
  miami: 'FL',
  dallas: 'TX',
  houston: 'TX',
  seattle: 'WA',
};

/** Two-word or dotted forms consumers type for the same place. */
const PLACE_ALIASES: Record<string, string> = {
  'st petersburg': 'saint petersburg',
  'st. petersburg': 'saint petersburg',
  'st louis': 'saint louis',
  'st. louis': 'saint louis',
  'st paul': 'saint paul',
  'st. paul': 'saint paul',
  'st augustine': 'saint augustine',
  'st. augustine': 'saint augustine',
  'st charles': 'saint charles',
  'st. charles': 'saint charles',
  'st cloud': 'saint cloud',
  'st. cloud': 'saint cloud',
  'ft worth': 'fort worth',
  'ft. worth': 'fort worth',
  'ft lauderdale': 'fort lauderdale',
  'ft. lauderdale': 'fort lauderdale',
  'ft myers': 'fort myers',
  'ft. myers': 'fort myers',
  'ft collins': 'fort collins',
  'ft. collins': 'fort collins',
  'mt pleasant': 'mount pleasant',
  'mt. pleasant': 'mount pleasant',
  'mt vernon': 'mount vernon',
  'mt. vernon': 'mount vernon',
  nyc: 'new york city',
  'new york, ny': 'new york city',
  'l a': 'los angeles',
  la: 'los angeles',
  sf: 'san francisco',
  philly: 'philadelphia',
  'washington d c': 'washington',
  'washington dc': 'washington',
  vegas: 'las vegas',
  'lake tahoe': 'south lake tahoe',
};

export const US_STATE_CODES: string[] = Object.keys(REGION_NAMES).filter((code) => /^[A-Z]{2}$/.test(code));
const STATE_NAME_TO_CODE = new Map<string, string>(
  US_STATE_CODES.map((code) => [normalizePlaceName(REGION_NAMES[code] ?? code), code]),
);

export function normalizePlaceName(value: string): string {
  const base = value
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return PLACE_ALIASES[base] ?? PLACE_ALIASES[base.replace(/\bst\b/g, 'st.')] ?? base;
}

type GazetteerEntry = { label: string; states: string[] };

function buildGazetteer(source: Record<string, string[]>): Map<string, GazetteerEntry> {
  const out = new Map<string, GazetteerEntry>();
  for (const [state, places] of Object.entries(source)) {
    for (const place of places) {
      const key = normalizePlaceName(place);
      const existing = out.get(key);
      if (!existing) {
        out.set(key, { label: place, states: [state] });
        continue;
      }
      if (!existing.states.includes(state)) existing.states.push(state);
    }
  }
  for (const [key, entry] of out) {
    const dominant = DOMINANT_CITY_STATE[key];
    if (dominant && entry.states.includes(dominant)) {
      entry.states = [dominant, ...entry.states.filter((s) => s !== dominant)];
    }
  }
  return out;
}

const CITY_GAZETTEER = buildGazetteer(CITIES_BY_STATE);
const COUNTY_GAZETTEER = buildGazetteer(COUNTIES_BY_STATE);
const METRO_GAZETTEER = new Map<string, GazetteerEntry>(
  Object.entries(METROS).map(([name, states]) => [normalizePlaceName(name), { label: name, states }]),
);

/** Longest gazetteer phrase, in words. Keeps the n-gram scan bounded. */
const MAX_PLACE_WORDS = 4;

/** Words that must never be read as a place name even when a gazetteer entry collides. */
const PLACE_STOPWORDS = new Set([
  'advice', 'adviser', 'advisers', 'advisor', 'advisors', 'advisory', 'firm', 'firms', 'ria', 'rias',
  'era', 'eras', 'investment', 'investments', 'financial', 'finance', 'wealth', 'management',
  'manager', 'managers', 'planner', 'planners', 'planning', 'retirement', 'fee', 'fees', 'only',
  'best', 'near', 'around', 'close', 'in', 'at', 'the', 'a', 'an', 'of', 'for', 'and', 'or',
  'me', 'my', 'show', 'find', 'list', 'research', 'who', 'what', 'where', 'how', 'many', 'county',
  'city', 'state', 'area', 'metro', 'office', 'offices', 'registered', 'crd', 'sec', 'form', 'adv',
  'raum', 'assets', 'compensation', 'fiduciary', 'independent', 'certified', 'hourly', 'flat',
]);

/**
 * TH-DISCOVERY-PARITY-001B-REVIEW finding 2: normalized city names that are also ordinary English
 * words. A bare, unqualified appearance of one of these words must never silently scope a query to
 * that city ("financial advisers who value independence and self-direction" must not resolve to
 * Independence, MO). Matching one of these requires real disambiguating evidence -- see the filter
 * applied in resolveUsPlaces() below -- not just a gazetteer key collision.
 */
const COMMON_WORD_CITY_NAMES = new Set(['independence', 'liberty', 'mobile', 'normal', 'enterprise', 'superior']);

/**
 * Words that count as "this place-like token was deliberately introduced as a location" evidence
 * for a COMMON_WORD_CITY_NAMES match -- the token immediately preceding it in the text.
 */
const CITY_EVIDENCE_PREPOSITIONS = new Set([
  'in', 'near', 'around', 'at', 'outside', 'by', 'based', 'located', 'headquartered',
]);

type Token = { raw: string; norm: string; index: number; capitalized: boolean };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /[A-Za-z][A-Za-z.'’-]*/g;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    const raw = m[0];
    tokens.push({
      raw,
      norm: normalizePlaceName(raw),
      index: i++,
      capitalized: /^[A-Z]/.test(raw),
    });
  }
  return tokens;
}

function lookup(phrase: string, wantsCounty: boolean): { kind: UsPlaceKind; entry: GazetteerEntry } | undefined {
  const key = normalizePlaceName(phrase);
  if (!key || PLACE_STOPWORDS.has(key)) return undefined;
  const stateCode = STATE_NAME_TO_CODE.get(key);
  if (stateCode) return { kind: 'state', entry: { label: REGION_NAMES[stateCode] ?? stateCode, states: [stateCode] } };
  if (wantsCounty) {
    const county = COUNTY_GAZETTEER.get(key);
    if (county) return { kind: 'county', entry: county };
  }
  const metro = METRO_GAZETTEER.get(key);
  if (metro) return { kind: 'metro', entry: metro };
  const city = CITY_GAZETTEER.get(key);
  if (city) return { kind: 'city', entry: city };
  const county = COUNTY_GAZETTEER.get(key);
  if (county) return { kind: 'county', entry: county };
  return undefined;
}

/** Uppercase state codes only count when written as a standalone uppercase token. */
function stateCodeToken(token: Token, raw: string): string | undefined {
  const code = raw.toUpperCase();
  if (!US_STATE_CODES.includes(code)) return undefined;
  if (raw !== code) return undefined;
  if (!token.capitalized) return undefined;
  return code;
}

/**
 * Every place this text names, longest phrase first and non-overlapping.
 * Only geography is decided here; nothing about firms or registration.
 */
export function resolveUsPlaces(text: string): UsPlaceMatch[] {
  const tokens = tokenize(text);
  const matches: UsPlaceMatch[] = [];
  const used = new Set<number>();
  for (let size = MAX_PLACE_WORDS; size >= 1; size -= 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      let overlaps = false;
      for (let k = start; k < start + size; k += 1) if (used.has(k)) overlaps = true;
      if (overlaps) continue;
      const window = tokens.slice(start, start + size);
      const phrase = window.map((t) => t.raw).join(' ');
      const next = tokens[start + size];
      const wantsCounty = next?.norm === 'county' || next?.norm === 'parish';
      let hit = lookup(phrase, wantsCounty);
      if (!hit && size === 1) {
        const code = stateCodeToken(window[0]!, window[0]!.raw);
        if (code) hit = { kind: 'state', entry: { label: REGION_NAMES[code] ?? code, states: [code] } };
      }
      if (!hit) continue;
      const kind: UsPlaceKind = wantsCounty && hit.kind !== 'state' ? 'county' : hit.kind;
      const entry =
        kind === 'county' && hit.kind !== 'county' ? COUNTY_GAZETTEER.get(normalizePlaceName(phrase)) ?? hit.entry : hit.entry;
      for (let k = start; k < start + size; k += 1) used.add(k);
      matches.push({
        kind,
        requested: wantsCounty ? `${phrase} County` : phrase,
        label: entry.label,
        state: entry.states[0]!,
        candidateStates: entry.states,
        ambiguous: entry.states.length > 1,
        stateLevelOnly: kind === 'county' || kind === 'metro',
        start,
        end: start + size,
      });
    }
  }
  const sorted = matches.sort((a, b) => a.start - b.start);
  // TH-DISCOVERY-PARITY-001B-REVIEW finding 2: a COMMON_WORD_CITY_NAMES match (e.g. "independence",
  // "liberty", "mobile") is only real geography when there is actual evidence it was meant as a
  // place -- proper capitalization plus either a location preposition immediately before it, or an
  // explicit state named right next to it. A bare, lowercase, or otherwise unqualified appearance
  // (the ordinary-word reading) must never resolve and silently scope a query to the wrong city.
  return sorted.filter((match) => {
    if (match.kind !== 'city' || !COMMON_WORD_CITY_NAMES.has(normalizePlaceName(match.label))) return true;
    const firstToken = tokens[match.start];
    if (!firstToken?.capitalized) return false;
    const precedingToken = tokens[match.start - 1];
    const precededByPreposition = !!precedingToken && CITY_EVIDENCE_PREPOSITIONS.has(precedingToken.norm);
    const adjacentState = sorted.some(
      (other) => other.kind === 'state' && (other.end === match.start || other.start === match.end),
    );
    return precededByPreposition || adjacentState;
  });
}

/** Prepositions and phrasings that show the question asked about a location. */
export const LOCATION_PREPOSITION_PATTERN =
  /\b(?:in|near|around|close to|outside|outside of|surrounding|nearby|by|within|throughout|across|based in|located in|headquartered in|serving|around the|near the)\b/i;

/** Phrasings that describe a radius/metro rather than one recorded office city. */
export const METRO_PHRASING_PATTERN =
  /\b(?:near|nearby|around|close to|outside|outside of|surrounding|greater|metro|metropolitan|suburbs?|suburban|area|region|vicinity|commutable)\b/i;

/**
 * TH-DISCOVERY-PARITY-001B-REVIEW finding 3: conventional nationwide-scope aliases. "US"/"USA" are
 * matched case-sensitively (and only as a standalone token) so the pronoun "us" is never mistaken
 * for the country; "United States" is unambiguous so it is matched case-insensitively. There is no
 * existing normalization constant for this elsewhere in the domain package (checked
 * firm-classification.ts's country-code display helper, which is a different, unrelated concept),
 * so this is this module's own convention, kept next to the rest of its location-phrasing patterns.
 */
const NATIONWIDE_ACRONYM_PATTERN = /\bU\.?S\.?A?\.?\b/;
const NATIONWIDE_NAME_PATTERN = /\bUnited States(?:\s+of\s+America)?\b/i;

export function isNationwideScope(text: string): boolean {
  return NATIONWIDE_NAME_PATTERN.test(text) || NATIONWIDE_ACRONYM_PATTERN.test(text);
}

function nationwideAlias(text: string): string | undefined {
  return text.match(NATIONWIDE_NAME_PATTERN)?.[0] ?? text.match(NATIONWIDE_ACRONYM_PATTERN)?.[0];
}

/**
 * TH-DISCOVERY-PARITY-001B-REVIEW finding 1: the mandatory fail-closed backstop in
 * investor-research-plan.ts must only fire when there is real evidence of an attempted place
 * reference the gazetteer scan did not resolve -- an explicit county/parish/metro/zip-code
 * reference, or a location preposition immediately followed by something that looks like a place
 * name attempt (a capitalized word that is not a shouting acronym like "AUM"/"SEC", and not a
 * nationwide-scope alias). A sentence that merely contains a benign preposition ("in", "by",
 * "across", "within", "throughout") followed by ordinary lowercase words ("in retirement
 * planning", "by AUM") is not location evidence and must not fail closed.
 */
export function hasUnresolvedLocationSignal(text: string): boolean {
  if (/\b(?:county|parish|metro|zip code)\b/i.test(text)) return true;
  const re =
    /\b(?:in|near|around|close to|outside(?: of)?|surrounding|nearby|by|within|throughout|across|based in|located in|headquartered in|serving)\s+([A-Za-z][A-Za-z.'’-]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const word = m[1]!;
    if (isNationwideScope(word)) continue;
    const looksLikePlaceAttempt = /^[A-Z]/.test(word) && word !== word.toUpperCase();
    if (!looksLikePlaceAttempt) continue;
    const norm = normalizePlaceName(word);
    if (!norm || PLACE_STOPWORDS.has(norm)) continue;
    return true;
  }
  return false;
}

/**
 * Text that follows a location preposition, used to report a place this gazetteer cannot resolve.
 * "financial advisor in Fakeville" must say the place was not resolved, never fall back to a
 * national list.
 */
export function unresolvedPlaceCandidate(text: string): string | undefined {
  const m = text.match(
    /\b(?:in|near|around|close to|outside(?: of)?|surrounding|based in|located in|headquartered in)\s+([A-Za-z][A-Za-z .'’-]{1,60}?)\s*[?.!,]?$/i,
  );
  const candidate = m?.[1]?.trim();
  if (!candidate) return undefined;
  if (isNationwideScope(candidate)) return undefined;
  const words = candidate.split(/\s+/);
  if (words.every((w) => PLACE_STOPWORDS.has(normalizePlaceName(w)))) return undefined;
  if (/\b(?:raum|form adv|crd|sec file|fees?|compensation|assets)\b/i.test(candidate)) return undefined;
  return candidate;
}

function labelFor(state: string): string {
  return REGION_NAMES[state] ?? state;
}

/**
 * Decide the principal-office filter a question requested.
 *
 * Contract: when this returns UNRESOLVED_PLACE the caller must not execute an unfiltered search.
 * Every widening (county/metro/radius phrasing, ambiguous place names) is reported in
 * `broadenings` so the answer can disclose it.
 */
export function decideUsGeography(text: string): UsGeographyDecision {
  const matches = resolveUsPlaces(text);
  const broadenings: string[] = [];
  const stateMatch = matches.find((m) => m.kind === 'state');
  const placeMatch = matches.find((m) => m.kind !== 'state');

  if (!matches.length) {
    // TH-DISCOVERY-PARITY-001B-REVIEW finding 3: "in the US" / "in the United States" is a
    // deliberate, recognized request for nationwide coverage, not a place this gazetteer failed to
    // resolve. This must be checked before unresolvedPlaceCandidate(), which would otherwise read
    // trailing "the United States" as an unresolved place candidate and fail closed on it.
    if (isNationwideScope(text)) {
      return {
        outcome: 'NATIONWIDE',
        requested: nationwideAlias(text),
        broadenings: [],
      };
    }
    const unresolved = unresolvedPlaceCandidate(text);
    if (unresolved) {
      return {
        outcome: 'UNRESOLVED_PLACE',
        requested: unresolved,
        broadenings: [],
      };
    }
    return { outcome: 'NO_LOCATION', broadenings: [] };
  }

  if (!placeMatch && stateMatch) {
    return {
      outcome: 'STATE',
      state: stateMatch.state,
      requested: stateMatch.requested,
      kind: 'state',
      candidateStates: stateMatch.candidateStates,
      broadenings,
    };
  }

  const place = placeMatch!;
  // An explicitly written state wins over the gazetteer's dominant reading for the same name.
  const resolvedState =
    stateMatch && (place.candidateStates.includes(stateMatch.state) || !place.ambiguous)
      ? stateMatch.state
      : stateMatch?.state ?? place.state;

  if (place.ambiguous && !stateMatch) {
    broadenings.push(
      `${place.requested} exists in more than one state (${place.candidateStates
        .map(labelFor)
        .join(', ')}). This answer used ${labelFor(resolvedState)}, the largest US place of that name. Name the state to change it.`,
    );
  }

  if (place.kind === 'county') {
    broadenings.push(
      `${place.requested} is a county. The SEC/IARD roster records a principal-office city and state, not a county, so this was researched at ${labelFor(resolvedState)} state level. County-level narrowing is not established by this source.`,
    );
    return {
      outcome: 'CITY_BROADENED_TO_STATE',
      state: resolvedState,
      requested: place.requested,
      kind: 'county',
      candidateStates: place.candidateStates,
      ambiguous: place.ambiguous,
      broadenings,
    };
  }

  if (place.kind === 'metro') {
    broadenings.push(
      `${place.requested} is a regional/metro name, not a recorded principal-office city. This was researched at ${labelFor(resolvedState)} state level.`,
    );
    return {
      outcome: 'CITY_BROADENED_TO_STATE',
      state: resolvedState,
      requested: place.requested,
      kind: 'metro',
      candidateStates: place.candidateStates,
      ambiguous: place.ambiguous,
      broadenings,
    };
  }

  // "near/around/outside/greater/<place> area" asks for a radius. Principal-office records cannot
  // establish distance, so the honest execution is the state, disclosed as a broadening.
  const radiusPhrasing = METRO_PHRASING_PATTERN.test(text);
  if (radiusPhrasing) {
    broadenings.push(
      `You asked for firms near ${place.label}. Recorded principal-office data cannot establish distance, radius or service area, so this was researched as ${labelFor(resolvedState)} principal offices. ${place.label} city-level narrowing was not applied.`,
    );
    return {
      outcome: 'CITY_BROADENED_TO_STATE',
      state: resolvedState,
      city: place.label,
      requested: place.requested,
      kind: 'city',
      candidateStates: place.candidateStates,
      ambiguous: place.ambiguous,
      broadenings,
    };
  }

  return {
    outcome: 'CITY',
    state: resolvedState,
    city: place.label,
    requested: place.requested,
    kind: 'city',
    candidateStates: place.candidateStates,
    ambiguous: place.ambiguous,
    broadenings,
  };
}

/** Gazetteer size, exposed so tests can assert this is real geography and not a few literals. */
export const US_GAZETTEER_STATS = {
  get cities() {
    return CITY_GAZETTEER.size;
  },
  get counties() {
    return COUNTY_GAZETTEER.size;
  },
  get metros() {
    return METRO_GAZETTEER.size;
  },
};
