// Inheritance and start_home reworked 2026-10-08 for seat fairness (see spec/03). Extracted programmatically from the spec JSON block by a script, not retyped. Do not edit numbers here; change config.js instead.
export const COMPANIES = [
 {
  "id": "R1",
  "name": "Crooked Creek Cattle Co.",
  "industry": "ranching",
  "hook": "Big, plain, weather-dependent: sells calves by the truckload and lives or dies on the beef price.",
  "value_musd": 380,
  "cash_yield_pct": 5.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Expand herd & grazing",
    "cost_musd": 50,
    "effect": "Increase capacity, lower unit costs",
    "kind": "growth"
   },
   {
    "name": "Drought-proof the water",
    "cost_musd": 30,
    "effect": "Cut drought losses, small cost per head",
    "kind": "defend"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.98,
   "beef_price": 1.3,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 3,
   "water": 3,
   "customers": 1,
   "seasonal_labor": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$380M on 14,000 head at last year's calf prices.",
   "truth": "Fair if beef holds; drought years cut true value about 15 percent, shortage years add about 20 percent."
  },
  "scarce": false,
  "start_home": "inherited:T1",
  "source_flavor": "Bull Market commodity cow-calf (Low Cost / Rapid Expansion); name from the ranch game's AI ranch list"
 },
 {
  "id": "R2",
  "name": "Three Forks Genetics",
  "industry": "ranching",
  "hook": "Small herd, famous bulls: the money is in the sale-day catalog, and it is lumpy.",
  "value_musd": 300,
  "cash_yield_pct": 4.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Buy elite cow families",
    "cost_musd": 40,
    "effect": "Raise sale averages, slower cash",
    "kind": "growth"
   },
   {
    "name": "Host a bull sale",
    "cost_musd": 20,
    "effect": "One-time cash spike, builds reputation",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.98,
   "beef_price": 1.12,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.85,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 2,
   "brand": 3,
   "data": 2,
   "customers": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$300M with a strong 5-year sale average.",
   "truth": "Close to fair; value swings with one or two top lots, so true value runs 0.85x to 1.15x."
  },
  "scarce": false,
  "start_home": "inherited:T4",
  "source_flavor": "Bull Market Elite Genetics / Seedstock (bull auction)"
 },
 {
  "id": "R3",
  "name": "Owyhee Grass-Fed Co-op",
  "industry": "ranching",
  "hook": "Local brand, loyal shoppers, thin margins that look worse than they are.",
  "value_musd": 250,
  "cash_yield_pct": 4.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Add finishing pasture",
    "cost_musd": 35,
    "effect": "Higher premium share, more water needed",
    "kind": "growth"
   },
   {
    "name": "Direct-to-store contract",
    "cost_musd": 15,
    "effect": "Locks in a buyer, lowers price risk",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 1.08,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.9,
   "food_price_reg": 1.05
  },
  "relatedness_hooks": {
   "land": 2,
   "water": 3,
   "brand": 2,
   "customers": 2
  },
  "auction_note": {
   "verdict": "hidden_gem",
   "listing_claims": "$250M, listed as a low-margin co-op.",
   "truth": "Owns senior water rights and a waitlisted customer base not in the catalog; true value about 1.3x ($325M)."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Bull Market Specialist / local grass-fed"
 },
 {
  "id": "R4",
  "name": "Malheur Feeder Yards",
  "industry": "ranching",
  "hook": "Fattens other people's cattle and lives on the spread between calf cost and finished price.",
  "value_musd": 340,
  "cash_yield_pct": 3.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Expand pens",
    "cost_musd": 45,
    "effect": "Increase capacity, more feed exposure",
    "kind": "growth"
   },
   {
    "name": "Hedge cattle futures",
    "cost_musd": 10,
    "effect": "Narrow the margin swing, small fee",
    "kind": "defend"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 0.85,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.93,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 2,
   "water": 2,
   "customers": 2,
   "seasonal_labor": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$340M on full pens.",
   "truth": "Fair at normal spreads; a beef price spike squeezes feedlot margin and cuts true value about 15 percent."
  },
  "scarce": false,
  "start_home": "bot:B3",
  "source_flavor": "Bull Market cost-side lessons (feeder price in the data)"
 },
 {
  "id": "R5",
  "name": "Silver Sage Land and Livestock",
  "industry": "ranching",
  "hook": "Most of its value is the dirt, and the cattle are almost an excuse.",
  "value_musd": 420,
  "cash_yield_pct": 3.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Add hunting & recreation leases",
    "cost_musd": 15,
    "effect": "New cash line, lowers grazing",
    "kind": "growth"
   },
   {
    "name": "Sell a conservation easement",
    "cost_musd": 5,
    "effect": "Cash now, permanent land limit",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.98,
   "beef_price": 1.15,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 3,
   "water": 3,
   "regulator": 2,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$420M, valued on land comparables.",
   "truth": "Fair; land prices move slowly, so true value runs 0.9x to 1.1x."
  },
  "scarce": false,
  "start_home": "inherited:T2",
  "source_flavor": "Bull Market AI ranch list name"
 },
 {
  "id": "G1",
  "name": "Gem State Foods",
  "industry": "grocery",
  "hook": "Boise's price fighter: huge volume, pennies of margin, steady cash.",
  "value_musd": 620,
  "cash_yield_pct": 3.5,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Open 6 discount stores",
    "cost_musd": 60,
    "effect": "Add volume, lower unit costs",
    "kind": "growth"
   },
   {
    "name": "Build regional distribution center",
    "cost_musd": 40,
    "effect": "Cut supply cost, enables ranch sourcing",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 0.88,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 1.05,
   "food_price_reg": 0.85
  },
  "relatedness_hooks": {
   "customers": 3,
   "regulator": 3,
   "land": 1,
   "data": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$620M at 8x trailing earnings.",
   "truth": "Fair; carries an antitrust overhang above about 25 percent regional share (priced in)."
  },
  "scarce": false,
  "start_home": "pool-R2plus",
  "source_flavor": "Kroger-Albertsons discount format"
 },
 {
  "id": "G2",
  "name": "Sawtooth Market",
  "industry": "grocery",
  "hook": "Premium natural-foods grocer with an affluent shopper and a shrinking cushion on beef.",
  "value_musd": 480,
  "cash_yield_pct": 4.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Remodel 8 stores",
    "cost_musd": 45,
    "effect": "Raise basket size, lift brand",
    "kind": "growth"
   },
   {
    "name": "Private-label meat program",
    "cost_musd": 25,
    "effect": "Higher margin, needs ranch supply",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.96,
   "beef_price": 0.85,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.88,
   "food_price_reg": 0.9
  },
  "relatedness_hooks": {
   "customers": 3,
   "brand": 3,
   "regulator": 2,
   "data": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$480M, premium multiple.",
   "truth": "Fair, but premium shoppers trade down in a recession, so true value is 0.9x if a downturn hits."
  },
  "scarce": false,
  "start_home": "bot:B2",
  "source_flavor": "Kroger-Albertsons premium format"
 },
 {
  "id": "G3",
  "name": "High Desert Grocers",
  "industry": "grocery",
  "hook": "Sleepy rural chain that is the only store in four towns.",
  "value_musd": 300,
  "cash_yield_pct": 5.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Fill the cooler gaps",
    "cost_musd": 20,
    "effect": "Fewer stock-outs, small margin lift",
    "kind": "growth"
   },
   {
    "name": "Buy two local stores",
    "cost_musd": 35,
    "effect": "Add volume, little competition",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 0.92,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.98,
   "food_price_reg": 0.92
  },
  "relatedness_hooks": {
   "customers": 2,
   "land": 2,
   "regulator": 1,
   "seasonal_labor": 1
  },
  "auction_note": {
   "verdict": "hidden_gem",
   "listing_claims": "$300M, listed at a rural-chain multiple.",
   "truth": "Owns most of its store real estate, not in the earnings; true value about 1.25x ($375M)."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Kroger-Albertsons rural focus"
 },
 {
  "id": "G4",
  "name": "Treasure Valley Wholesale",
  "industry": "grocery",
  "hook": "The truck behind the shelves: supplies independent grocers across two states.",
  "value_musd": 380,
  "cash_yield_pct": 3.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Add cold-chain trucks",
    "cost_musd": 30,
    "effect": "Raise capacity, lower spoilage",
    "kind": "growth"
   },
   {
    "name": "Sign a ranch supply deal",
    "cost_musd": 15,
    "effect": "Locks beef source, ties to one supplier",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.96,
   "beef_price": 0.9,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 1.0,
   "food_price_reg": 0.93
  },
  "relatedness_hooks": {
   "customers": 3,
   "regulator": 2,
   "land": 1,
   "seasonal_labor": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$380M on contracted volume.",
   "truth": "Fair; loses its biggest customer if a chain consolidates, a 10 percent downside."
  },
  "scarce": false,
  "start_home": "inherited:T6",
  "source_flavor": "Kroger-Albertsons case (C&S wholesale role)"
 },
 {
  "id": "G5",
  "name": "Clearwater Fresh",
  "industry": "grocery",
  "hook": "Grocery delivery app that grows fast and has not found out what it costs.",
  "value_musd": 260,
  "cash_yield_pct": 2.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Launch same-day delivery",
    "cost_musd": 35,
    "effect": "Add customers, thin margin",
    "kind": "growth"
   },
   {
    "name": "Build customer-data engine",
    "cost_musd": 20,
    "effect": "Lift basket size, data asset",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 0.9,
   "cannabis_banking": 1,
   "ai_demand": 1.05,
   "ai_price_collapse": 1.1,
   "recession": 0.88,
   "food_price_reg": 0.9
  },
  "relatedness_hooks": {
   "customers": 3,
   "data": 3,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$260M on user growth.",
   "truth": "Fair as a lottery ticket; true value runs 0.4x to 1.8x depending on delivery economics."
  },
  "scarce": false,
  "start_home": "pool-R2plus",
  "source_flavor": "Kroger-Albertsons digital angle"
 },
 {
  "id": "C1",
  "name": "Rogue Valley Growers",
  "industry": "cannabis",
  "hook": "Wholesale grower with big electric bills and a banking problem.",
  "value_musd": 220,
  "cash_yield_pct": 6.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add indoor grow rooms",
    "cost_musd": 35,
    "effect": "Increase capacity, raise power load",
    "kind": "growth"
   },
   {
    "name": "Switch to efficient lighting",
    "cost_musd": 12,
    "effect": "Lower power cost per pound",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.78,
   "beef_price": 1,
   "cannabis_banking": 1.3,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "land": 1,
   "regulator": 3,
   "seasonal_labor": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$220M at last year's wholesale price.",
   "truth": "Fair; true value swings 0.7x to 1.4x with Oregon wholesale price and power cost."
  },
  "scarce": false,
  "start_home": "inherited:T7",
  "source_flavor": "Better Off grower tier (280E, no banking)"
 },
 {
  "id": "C2",
  "name": "Cascade Leaf",
  "industry": "cannabis",
  "hook": "The nicest brand in Oregon cannabis, and it knows it.",
  "value_musd": 340,
  "cash_yield_pct": 4.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Open 4 branded stores",
    "cost_musd": 55,
    "effect": "Increase reach, lift brand",
    "kind": "growth"
   },
   {
    "name": "Launch premium line",
    "cost_musd": 25,
    "effect": "Higher price per unit, needs premium input",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.95,
   "beef_price": 1,
   "cannabis_banking": 1.35,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.93,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "brand": 3,
   "customers": 3,
   "regulator": 3,
   "data": 1
  },
  "auction_note": {
   "verdict": "overhyped",
   "listing_claims": "$340M, valued as a brand platform.",
   "truth": "Retail licenses are tied to the founders and part of the brand premium does not transfer; true value about 0.7x ($240M)."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Better Off branded chain (PREMIUM)"
 },
 {
  "id": "C3",
  "name": "Border Line Dispensary",
  "industry": "cannabis",
  "hook": "One store on the Idaho line that sells to people who drove an hour.",
  "value_musd": 180,
  "cash_yield_pct": 7.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Add drive-through lane",
    "cost_musd": 10,
    "effect": "Raise throughput, small cost",
    "kind": "growth"
   },
   {
    "name": "Open a second border store",
    "cost_musd": 30,
    "effect": "Add customers, more regulator attention",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1.05,
   "power_price": 1,
   "beef_price": 1,
   "cannabis_banking": 1.15,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 1.0,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "customers": 3,
   "regulator": 3,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$180M, mostly one location.",
   "truth": "Fair; high-variance single site, 0.6x to 1.6x depending on border-state politics."
  },
  "scarce": false,
  "start_home": "bot:B4",
  "source_flavor": "Better Off border store (NICHE)"
 },
 {
  "id": "C4",
  "name": "Willamette Extracts",
  "industry": "cannabis",
  "hook": "Turns other growers' flower into oils and edibles, and runs hot all night to do it.",
  "value_musd": 260,
  "cash_yield_pct": 5.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add extraction line",
    "cost_musd": 40,
    "effect": "Increase capacity, raise power load",
    "kind": "growth"
   },
   {
    "name": "Sign processor contracts",
    "cost_musd": 15,
    "effect": "Locks input supply, ties to growers",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.82,
   "beef_price": 1,
   "cannabis_banking": 1.25,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "regulator": 3,
   "customers": 2,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$260M on contracted throughput.",
   "truth": "Fair; margins depend on the grower price it pays, 0.75x to 1.25x."
  },
  "scarce": false,
  "start_home": "inherited:T1",
  "source_flavor": "Better Off processor tier"
 },
 {
  "id": "C5",
  "name": "Pacific Pines Holdings",
  "industry": "cannabis",
  "hook": "Multi-state operator with a stock-ticker swagger and a lot of debt.",
  "value_musd": 410,
  "cash_yield_pct": 3.5,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Refinance debt",
    "cost_musd": 30,
    "effect": "Cut interest, depends on banking reform",
    "kind": "defend"
   },
   {
    "name": "Acquire 3 licensed stores",
    "cost_musd": 60,
    "effect": "Add reach, more regulator exposure",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.93,
   "beef_price": 1,
   "cannabis_banking": 1.4,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.9,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "brand": 2,
   "regulator": 3,
   "customers": 3,
   "data": 1
  },
  "auction_note": {
   "verdict": "overhyped",
   "listing_claims": "$410M, valued as if banking reform has already passed.",
   "truth": "Without reform its debt eats the equity; true value about 0.65x ($265M), and above 1.2x only if reform passes."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Better Off roll-up and banking theme"
 },
 {
  "id": "S1",
  "name": "Sawtooth Megapass Resorts",
  "industry": "ski",
  "hook": "Three mid-size hills on one pass: the volume play, with snowmaking bills.",
  "value_musd": 700,
  "cash_yield_pct": 5.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add snowmaking & lifts",
    "cost_musd": 70,
    "effect": "Cut snow risk, raise capacity, raise power use",
    "kind": "defend"
   },
   {
    "name": "Pass-price push",
    "cost_musd": 15,
    "effect": "More season-pass revenue, risks crowding",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 0.72,
   "power_price": 0.93,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.85,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 3,
   "customers": 3,
   "brand": 2,
   "land": 2,
   "water": 2,
   "power": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$700M, multiples borrowed from Vail.",
   "truth": "Fair on a normal snow year; a warm winter takes about 25 percent off true value."
  },
  "scarce": false,
  "start_home": "inherited:T5",
  "source_flavor": "Chasing Powder NETWORK archetype (Vail-style)"
 },
 {
  "id": "S2",
  "name": "Brundage Mountain",
  "industry": "ski",
  "hook": "Powder-day destination, high prices, small footprint, and nobody is building another one.",
  "value_musd": 450,
  "cash_yield_pct": 5.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Build luxury lodge",
    "cost_musd": 65,
    "effect": "Raise price per visit, brand lift, more seasonal labor",
    "kind": "growth"
   },
   {
    "name": "Add a new chairlift",
    "cost_musd": 35,
    "effect": "Raise capacity on peak days",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 0.8,
   "power_price": 0.95,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.82,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 3,
   "customers": 3,
   "brand": 3,
   "land": 3,
   "water": 2,
   "regulator": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$450M, scarcity premium already in the price.",
   "truth": "Fair for a destination hill; the scarcity premium is real but a bid war can push price past it."
  },
  "scarce": true,
  "start_home": "auction-R1",
  "source_flavor": "Chasing Powder hill names (HILL_NAMES), FORTRESS archetype (Alta)"
 },
 {
  "id": "S3",
  "name": "Soldier Mountain",
  "industry": "ski",
  "hook": "Local hill that locals love, with no snowmaking and no safety net.",
  "value_musd": 300,
  "cash_yield_pct": 4.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add snowmaking on the lower slope",
    "cost_musd": 40,
    "effect": "Cut snow risk, raise power use",
    "kind": "defend"
   },
   {
    "name": "Local season-pass drive",
    "cost_musd": 8,
    "effect": "Steady cash, low price",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 0.6,
   "power_price": 0.97,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 2,
   "customers": 2,
   "brand": 2,
   "land": 3,
   "water": 2,
   "regulator": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$300M for the base and the permit.",
   "truth": "Fair-looking, but it only holds in a normal winter; the most snow-skewed value in the game."
  },
  "scarce": true,
  "start_home": "pool-R2plus",
  "source_flavor": "Chasing Powder hill names; local hill strategy"
 },
 {
  "id": "S4",
  "name": "Bogus Basin Mountain Co.",
  "industry": "ski",
  "hook": "Close to town, great for night skiing, and short on altitude.",
  "value_musd": 480,
  "cash_yield_pct": 4.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add night-ski lighting",
    "cost_musd": 20,
    "effect": "Raise day-trip volume, small power use",
    "kind": "growth"
   },
   {
    "name": "Add tubing & summer park",
    "cost_musd": 30,
    "effect": "Smooth seasonality, new customers",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 0.68,
   "power_price": 0.95,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.93,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 2,
   "customers": 3,
   "land": 2,
   "brand": 1,
   "power": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$480M, near-town premium.",
   "truth": "Fair; day-trippers drop fast in a recession or poor snow, true value 0.8x to 1.1x."
  },
  "scarce": false,
  "start_home": "inherited:T2",
  "source_flavor": "Chasing Powder hill names; Day-Trip Feeder segment"
 },
 {
  "id": "S5",
  "name": "Idaho Backcountry Guides",
  "industry": "ski",
  "hook": "Cat-skiing and guided tours: tiny, expensive, and very exposed to the weather.",
  "value_musd": 170,
  "cash_yield_pct": 6.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Add a second snowcat",
    "cost_musd": 20,
    "effect": "Raise capacity, raise fuel cost",
    "kind": "growth"
   },
   {
    "name": "Add summer guiding",
    "cost_musd": 10,
    "effect": "Smooth seasonality, small cash",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 0.55,
   "power_price": 0.97,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.8,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 3,
   "customers": 2,
   "brand": 3,
   "land": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$170M for permits and equipment.",
   "truth": "Fair; value is mostly in the permit, 0.6x to 1.4x by snow."
  },
  "scarce": false,
  "start_home": "inherited:T8",
  "source_flavor": "Chasing Powder Core/Expert and Luxury segments"
 },
 {
  "id": "E1",
  "name": "Columbia Basin SMR Site",
  "industry": "energy",
  "hook": "The only licensed reactor site in the region, with no reactor on it yet.",
  "value_musd": 500,
  "cash_yield_pct": 2.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Fund licensing study",
    "cost_musd": 40,
    "effect": "Cut regulatory risk, unlocks the build option",
    "kind": "defend"
   },
   {
    "name": "Sign anchor power contract",
    "cost_musd": 25,
    "effect": "Locks in revenue, ties to one buyer",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.3,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.25,
   "ai_price_collapse": 0.85,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "land": 3,
   "water": 3,
   "regulator": 3
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$500M as an option on a 2030s plant.",
   "truth": "Value rides on a regulator ruling revealed in year 2; true value spans 0.6x to 1.6x, so the option fee is the real price."
  },
  "scarce": true,
  "start_home": "auction-R1",
  "source_flavor": "Amazon nuclear case (SMR site near Richland; hold-the-option)"
 },
 {
  "id": "E2",
  "name": "Snake River Power & Light",
  "industry": "energy",
  "hook": "Owns a working plant and sells every megawatt it can make.",
  "value_musd": 700,
  "cash_yield_pct": 6.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Uprate the plant",
    "cost_musd": 60,
    "effect": "Increase capacity, lower unit costs",
    "kind": "growth"
   },
   {
    "name": "Long-term data-center contract",
    "cost_musd": 25,
    "effect": "Lock in price, ties output to AI buyers",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.25,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.2,
   "ai_price_collapse": 0.92,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "water": 3,
   "land": 2,
   "regulator": 3
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$700M at utility-style multiples.",
   "truth": "Fair; a rate case could trim true value about 10 percent."
  },
  "scarce": false,
  "start_home": "inherited:T8",
  "source_flavor": "Amazon case own-the-plant (Talen-style)"
 },
 {
  "id": "E3",
  "name": "Kestrel Reactor Works",
  "industry": "energy",
  "hook": "Reactor startup with a slide deck, a prototype, and a lot of friends in Washington.",
  "value_musd": 350,
  "cash_yield_pct": 0.5,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Fund demo reactor",
    "cost_musd": 80,
    "effect": "Big payoff if it works, long lead time",
    "kind": "growth"
   },
   {
    "name": "Hire licensing team",
    "cost_musd": 20,
    "effect": "Cut regulatory risk, builds regulator tie",
    "kind": "defend"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.15,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.35,
   "ai_price_collapse": 0.7,
   "recession": 0.88,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "data": 2,
   "regulator": 3,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$350M on venture-style marks.",
   "truth": "Fair as a lottery ticket; true value is usually 0.3x or 2.5x, rarely in between."
  },
  "scarce": false,
  "start_home": "inherited:T3",
  "source_flavor": "Amazon case fund-the-startup (X-energy-style)"
 },
 {
  "id": "E4",
  "name": "Idaho Wind & Solar Partners",
  "industry": "energy",
  "hook": "Wind and solar on leased ranch land, popular with the grid and not with the neighbors.",
  "value_musd": 480,
  "cash_yield_pct": 5.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add 100 MW wind",
    "cost_musd": 55,
    "effect": "Increase capacity, raises local backlash risk",
    "kind": "growth"
   },
   {
    "name": "Community benefit fund",
    "cost_musd": 10,
    "effect": "Cut backlash risk, small cost",
    "kind": "defend"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.1,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.15,
   "ai_price_collapse": 0.95,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 3,
   "power": 3,
   "regulator": 3,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$480M on signed offtake contracts.",
   "truth": "Fair; permitting fights can delay a build, 0.8x to 1.15x."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Brief wind-backlash chain"
 },
 {
  "id": "E5",
  "name": "Gridlock Storage",
  "industry": "energy",
  "hook": "Big batteries that earn money when the grid panics and idle money when it does not.",
  "value_musd": 310,
  "cash_yield_pct": 4.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Add 200 MWh storage",
    "cost_musd": 40,
    "effect": "Increase capacity, bigger spike capture",
    "kind": "growth"
   },
   {
    "name": "Sign capacity contract",
    "cost_musd": 15,
    "effect": "Steady pay, caps the upside",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.2,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.2,
   "ai_price_collapse": 0.95,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "regulator": 2,
   "land": 1,
   "data": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$310M on last summer's spike revenue.",
   "truth": "Fair as a lottery; if the grid stays calm true value is 0.7x, in a crunch 1.5x."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Brief grid-crunch chain"
 },
 {
  "id": "A1",
  "name": "Parallax Labs",
  "industry": "AI",
  "hook": "Closed frontier model with the biggest ecosystem lock-in, and every analyst has a price target.",
  "value_musd": 780,
  "cash_yield_pct": 1.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Train next model",
    "cost_musd": 90,
    "effect": "Raise capability, spikes power use",
    "kind": "growth"
   },
   {
    "name": "Sign enterprise customers",
    "cost_musd": 25,
    "effect": "Locks revenue, thin margins",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.88,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.4,
   "ai_price_collapse": 0.55,
   "recession": 0.92,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "data": 3,
   "power": 3,
   "customers": 2,
   "brand": 3
  },
  "auction_note": {
   "verdict": "overhyped",
   "listing_claims": "$780M on a revenue multiple from the last funding round.",
   "truth": "If inference prices fall or open models catch up, true value is about 0.6x ($470M); only a standard win justifies the claim."
  },
  "scarce": false,
  "start_home": "pool-R2plus",
  "source_flavor": "Format War / Model Race pick-a-standard archetype (game folder not found)"
 },
 {
  "id": "A2",
  "name": "Commons Model Co.",
  "industry": "AI",
  "hook": "Open-weight model: gives the format away to win the standards race and sells support, tuning, and trust.",
  "value_musd": 350,
  "cash_yield_pct": 2.0,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Build developer ecosystem",
    "cost_musd": 30,
    "effect": "Grows usage, little direct revenue",
    "kind": "growth"
   },
   {
    "name": "Launch managed hosting",
    "cost_musd": 25,
    "effect": "Add revenue, needs power",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.92,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.2,
   "ai_price_collapse": 1.05,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "data": 3,
   "customers": 2,
   "brand": 2,
   "power": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$350M, discounted for no pricing power.",
   "truth": "Fair; holds up if prices collapse, so it is a hedge more than a growth bet."
  },
  "scarce": false,
  "start_home": "bot:B1",
  "source_flavor": "Format War open-standard archetype (game folder not found)"
 },
 {
  "id": "A3",
  "name": "Bunchgrass Compute",
  "industry": "AI",
  "hook": "Hosts every format, open or closed, and wins whichever standard wins, but pays the power company first.",
  "value_musd": 550,
  "cash_yield_pct": 4.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Build second data hall",
    "cost_musd": 70,
    "effect": "Increase capacity, raises power load",
    "kind": "growth"
   },
   {
    "name": "Sign power purchase agreement",
    "cost_musd": 20,
    "effect": "Lower power cost, ties to a supplier",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.8,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.3,
   "ai_price_collapse": 0.85,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "land": 2,
   "water": 2,
   "customers": 3,
   "data": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$550M at infrastructure multiples.",
   "truth": "Fair in a normal year; a power spike cuts true value about 20 percent unless it holds a contract."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Amazon case data-center side"
 },
 {
  "id": "A4",
  "name": "Gem Analytics",
  "industry": "AI",
  "hook": "Applied AI that switches between rival model formats, so it stays neutral in the standards war.",
  "value_musd": 300,
  "cash_yield_pct": 3.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Build vertical product",
    "cost_musd": 25,
    "effect": "Raise price per customer, builds data asset",
    "kind": "growth"
   },
   {
    "name": "Add model-switching layer",
    "cost_musd": 15,
    "effect": "Lower cost if model prices fall",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.98,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.05,
   "ai_price_collapse": 1.3,
   "recession": 0.9,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "data": 3,
   "customers": 3,
   "brand": 1
  },
  "auction_note": {
   "verdict": "hidden_gem",
   "listing_claims": "$300M, tagged as a small reseller.",
   "truth": "Its customer data and multi-model design make it the winner of price collapse; true value about 1.4x ($420M), more if inference prices fall."
  },
  "scarce": false,
  "start_home": "auction-R1",
  "source_flavor": "Brief AI-commoditization chain"
 },
 {
  "id": "A5",
  "name": "Sagebrush Silicon",
  "industry": "AI",
  "hook": "Sells chips and cooling to every side of the format war.",
  "value_musd": 620,
  "cash_yield_pct": 3.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Build a packaging plant",
    "cost_musd": 75,
    "effect": "Increase capacity, raises power load",
    "kind": "growth"
   },
   {
    "name": "Long-term supply deals",
    "cost_musd": 20,
    "effect": "Locks demand, caps the upside",
    "kind": "lock"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.9,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.3,
   "ai_price_collapse": 1.05,
   "recession": 0.9,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 2,
   "water": 2,
   "data": 1,
   "customers": 2,
   "land": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$620M on boom-year orders.",
   "truth": "Fair at current orders; a demand pause cuts true value about 25 percent."
  },
  "scarce": false,
  "start_home": "inherited:T4",
  "source_flavor": "Brief AI compute boom chain"
 },
 {
  "id": "R6",
  "name": "Rimrock Ridge Ranch",
  "industry": "ranching",
  "hook": "Mid-size family cow-calf outfit with a good brand name and a mortgage.",
  "value_musd": 330,
  "cash_yield_pct": 4.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Rebuild fences & corrals",
    "cost_musd": 20,
    "effect": "Lower labor and loss per head",
    "kind": "growth"
   },
   {
    "name": "Add replacement heifers",
    "cost_musd": 35,
    "effect": "Grow herd, slower cash",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.98,
   "beef_price": 1.2,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "land": 3,
   "water": 2,
   "brand": 1,
   "customers": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$330M on comparable ranch sales.",
   "truth": "Fair; leverage makes a bad beef year hurt more, 0.85x to 1.2x."
  },
  "scarce": false,
  "start_home": "inherited:T3",
  "source_flavor": "Bull Market AI ranch list name"
 },
 {
  "id": "G6",
  "name": "Palouse Farmers Co-op",
  "industry": "grocery",
  "hook": "Member-owned co-op stores: loyal, local, and slow to change.",
  "value_musd": 280,
  "cash_yield_pct": 4.0,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Add member produce program",
    "cost_musd": 20,
    "effect": "Lift margin, ties to local growers",
    "kind": "growth"
   },
   {
    "name": "Modernize checkout & data",
    "cost_musd": 15,
    "effect": "Lower cost, builds data asset",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.97,
   "beef_price": 0.93,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 1.0,
   "food_price_reg": 0.95
  },
  "relatedness_hooks": {
   "customers": 3,
   "land": 1,
   "regulator": 1,
   "data": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$280M on steady same-store sales.",
   "truth": "Fair; low growth and low variance, 0.9x to 1.1x."
  },
  "scarce": false,
  "start_home": "inherited:T5",
  "source_flavor": "Kroger-Albertsons rural/local angle"
 },
 {
  "id": "C6",
  "name": "Siskiyou Seed & Clone",
  "industry": "cannabis",
  "hook": "Sells genetics and clones to growers: small, sticky, and fond of paperwork.",
  "value_musd": 200,
  "cash_yield_pct": 5.0,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "License a flagship strain",
    "cost_musd": 15,
    "effect": "Royalty income, depends on brand",
    "kind": "growth"
   },
   {
    "name": "Build tissue-culture lab",
    "cost_musd": 25,
    "effect": "Raise quality, raises power use",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.92,
   "beef_price": 1,
   "cannabis_banking": 1.15,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "brand": 2,
   "regulator": 3,
   "customers": 2,
   "data": 2
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$200M on royalty contracts.",
   "truth": "Fair; a single hit strain makes it 2x, a regulator change halves it."
  },
  "scarce": false,
  "start_home": "pool-R2plus",
  "source_flavor": "Better Off grower tier, upstream input"
 },
 {
  "id": "S6",
  "name": "Pomerelle Mountain Resort",
  "industry": "ski",
  "hook": "Southern Idaho family hill with cheap tickets and a loyal weekend crowd.",
  "value_musd": 260,
  "cash_yield_pct": 4.5,
  "growth": "cyclical",
  "capital_requests": [
   {
    "name": "Add a magic carpet & terrain park",
    "cost_musd": 15,
    "effect": "Lift beginner and youth visits",
    "kind": "growth"
   },
   {
    "name": "Add snowmaking on the lower slope",
    "cost_musd": 35,
    "effect": "Cut snow risk, raise power use",
    "kind": "defend"
   }
  ],
  "shock_multipliers": {
   "snow": 0.62,
   "power_price": 0.97,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1,
   "ai_price_collapse": 1,
   "recession": 0.95,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "seasonal_labor": 2,
   "customers": 3,
   "land": 2,
   "brand": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$260M for the base and the lifts.",
   "truth": "Fair; thin cushion in a warm winter, 0.6x to 1.1x."
  },
  "scarce": false,
  "start_home": "pool-R2plus",
  "source_flavor": "Chasing Powder hill names (Pomerelle); Beginner/Learn-to-Ski segment"
 },
 {
  "id": "E6",
  "name": "Hells Canyon Hydro",
  "industry": "energy",
  "hook": "Old dams, cheap power, and the first to feel a dry year.",
  "value_musd": 560,
  "cash_yield_pct": 5.5,
  "growth": "steady",
  "capital_requests": [
   {
    "name": "Relicense the dam",
    "cost_musd": 35,
    "effect": "Lock in operating rights, regulator exposure",
    "kind": "lock"
   },
   {
    "name": "Add pumped storage",
    "cost_musd": 50,
    "effect": "Capture peak prices, raises capacity",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 1.2,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.1,
   "ai_price_collapse": 0.95,
   "recession": 0.97,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "power": 3,
   "water": 3,
   "land": 2,
   "regulator": 3
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$560M on long-run hydro output.",
   "truth": "Fair; a drought year or relicensing fight cuts true value about 15 percent."
  },
  "scarce": false,
  "start_home": "inherited:T6",
  "source_flavor": "Amazon case regional power backdrop"
 },
 {
  "id": "A6",
  "name": "Homestead Assistant",
  "industry": "AI",
  "hook": "Consumer assistant whose value is its user base: every new user raises the cost of leaving.",
  "value_musd": 400,
  "cash_yield_pct": 1.5,
  "growth": "lottery",
  "capital_requests": [
   {
    "name": "Add third-party app marketplace",
    "cost_musd": 30,
    "effect": "Builds ecosystem lock-in, slower cash",
    "kind": "growth"
   },
   {
    "name": "Subsidize hardware bundles",
    "cost_musd": 45,
    "effect": "Grows installed base, burns cash",
    "kind": "growth"
   }
  ],
  "shock_multipliers": {
   "snow": 1,
   "power_price": 0.92,
   "beef_price": 1,
   "cannabis_banking": 1,
   "ai_demand": 1.35,
   "ai_price_collapse": 0.65,
   "recession": 0.92,
   "food_price_reg": 1.0
  },
  "relatedness_hooks": {
   "data": 3,
   "customers": 3,
   "brand": 2,
   "power": 1
  },
  "auction_note": {
   "verdict": "fair",
   "listing_claims": "$400M on user count.",
   "truth": "Fair as a lottery on installed base; a rival standard winning leaves 0.4x, a lock-in win 2x."
  },
  "scarce": false,
  "start_home": "inherited:T7",
  "source_flavor": "Format War / Model Race network-effects and lock-in mechanic"
 }
];

export const INHERITANCE = [{"team": "T1", "type": "neutral", "companies": ["R1", "C4"], "pair_value_musd": 640, "rationale": "Ranch+Cannabis, no shared asset"}, {"team": "T2", "type": "neutral", "companies": ["S4", "R5"], "pair_value_musd": 900, "rationale": "Ski+Ranch, no shared asset"}, {"team": "T3", "type": "neutral", "companies": ["R6", "E3"], "pair_value_musd": 680, "rationale": "Ranch+Energy, no shared asset"}, {"team": "T4", "type": "neutral", "companies": ["R2", "A5"], "pair_value_musd": 920, "rationale": "Ranch+AI, no shared asset"}, {"team": "T5", "type": "neutral", "companies": ["G6", "S1"], "pair_value_musd": 980, "rationale": "Grocery+Ski, no shared asset"}, {"team": "T6", "type": "neutral", "companies": ["G4", "E6"], "pair_value_musd": 940, "rationale": "Grocery+Energy, no shared asset"}, {"team": "T7", "type": "neutral", "companies": ["C1", "A6"], "pair_value_musd": 620, "rationale": "Cannabis+AI, no shared asset"}, {"team": "T8", "type": "neutral", "companies": ["E2", "S5"], "pair_value_musd": 870, "rationale": "Energy+Ski, no shared asset"}];

export const BOT_ROSTER = [{"id": "B1", "name": "Hype Capital", "style": "overpays for AI", "personality": "Bids up every AI lot to 1.3x its own estimate and talks about platforms.", "portfolio": ["A2"], "bid_rule": "AI bids at 1.3x; others at 0.9x"}, {"id": "B2", "name": "Ledger & Sons", "style": "patient value buyer", "personality": "Bids only below its own estimate and waits for the late rounds.", "portfolio": ["G2"], "bid_rule": "all bids at 0.85x; buys only in rounds 4 and 5"}, {"id": "B3", "name": "Plainsman Holdings", "style": "pure operator, never acquires", "personality": "Never bids; plows cash into its own capital requests and sells when bid 1.15x.", "portfolio": ["R4"], "bid_rule": "never bids; sells at 1.15x"}, {"id": "B4", "name": "Gemstone Roll-Up", "style": "roll-up machine", "personality": "Buys every cannabis and small-ski lot it can reach, one industry at a time.", "portfolio": ["C3"], "bid_rule": "bids 1.1x in cannabis; 0.8x elsewhere"}];

export const SHOCK_TYPES = ["snow", "power_price", "beef_price", "cannabis_banking", "ai_demand", "ai_price_collapse", "recession", "food_price_reg"];
