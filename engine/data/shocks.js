// Extracted programmatically from the spec JSON block by a script, not retyped. Do not edit numbers here; change config.js instead.
export const CHAINS = [
 {
  "id": "warm_winter",
  "name": "Warm winter",
  "category": "ski",
  "teaches": [
   "correlated shock",
   "internal capital market squeeze",
   "relatedness (snowmaking runs on power)"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ski"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Weather",
   "ticker": "Weather models lean warm for the mountains this winter",
   "forecast": "50% chance of a below-average snow year",
   "p": 0.5
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Weather",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Early storms miss the peaks; snowpack trails last year",
    "forecast": "75% chance of a warm, thin-snow winter",
    "p": 0.75
   },
   "down": {
    "ticker": "Late-fall storms stack snow in the high country",
    "forecast": "25% chance of a warm, thin-snow winter",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Snowmaking upgrade (ski owner)",
     "cost": "6% of resort value + 1 attention",
     "result": "If the warm winter hits, ski demand loss shrinks from -20% to -10% and snowmaking cost rise shrinks from +25% to +12%"
    },
    {
     "label": "Sign a fixed-price power contract (ski owner with energy owner)",
     "cost": "3% premium on power for 2 rounds",
     "result": "Caps the snowmaking power bill if the winter is warm; overpaid if not"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.5,
   "breaking": "BREAKING: Warm winter confirmed. Resorts open late and run snow guns nonstop",
   "effects": {
    "ski": {
     "d": 0.8,
     "c": 1.25
    },
    "energy": {
     "d": 1.08,
     "p": 1.06
    },
    "cannabis": {
     "d": 0.97
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Cannabis effect applies to resort-town units only. Energy effect is spillover from snowmaking load.",
   "tradeoffs": [
    {
     "owner": "Ski owner with unrelated sibling units (ranch, grocery)",
     "options": [
      {
       "label": "Upgrade snowmaking now (if not done at Stage 2)",
       "cost": "6% of resort value + 1 attention",
       "result": "Halves the damage next round"
      },
      {
       "label": "Run lean and cut the season",
       "cost": "No capital; ski cash flow down about 20%",
       "result": "Shortfall of about 15% of resort value is pulled from sibling units unless the team cuts ski spending (capital squeeze)"
      },
      {
       "label": "Sell the resort",
       "cost": "Fire-sale haircut about 15% below stand-alone",
       "result": "Refocus, but sells at the bottom"
      }
     ]
    },
    {
     "owner": "Owner of both ski and energy",
     "options": [
      {
       "label": "Supply snowmaking power to own resort at cost",
       "cost": "Gives up the energy windfall on that load",
       "result": "Natural hedge: the energy gain offsets the ski loss; the portfolio looks diversified and acts like one bet"
      },
      {
       "label": "Sell power at market price and let the resort pay",
       "cost": "Keeps energy cash, deepens ski loss",
       "result": "Parent chooses which unit wins"
      }
     ]
    },
    {
     "owner": "Energy owner with no ski",
     "options": [
      {
       "label": "Sell fixed-price snowmaking contracts to resorts",
       "cost": "Gives up some of the spike",
       "result": "Locks in cash, builds a repeat partner"
      },
      {
       "label": "Hold capacity for the spot spike",
       "cost": "No cost, price risk",
       "result": "Higher upside, lower certainty"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Weather",
   "ticker": "Storms arrive on time; resorts report solid base depths. Warm-winter fears fade",
   "learning_note": "Teams that bought the upgrade paid for protection they did not need."
  },
  "conflicts_with": [
   "tourism_boom"
  ],
  "lifts_out": [
   {
    "to": "drought",
    "delta": 0.05
   },
   {
    "to": "grid_crunch",
    "delta": 0.05
   }
  ],
  "lifts_in": []
 },
 {
  "id": "ai_compute_boom",
  "name": "AI compute boom",
  "category": "ai",
  "teaches": [
   "relatedness (energy powers AI)",
   "correlated shock",
   "parenting advantage"
  ],
  "targeting": "industry",
  "primary_industries": [
   "energy",
   "ai"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Data-center builders say chip orders are climbing",
   "forecast": "60% chance AI computing demand jumps this year",
   "p": 0.6
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Industry",
   "q_up_path": 0.5455,
   "up": {
    "ticker": "Cloud giants raise their data-center spending plans",
    "forecast": "85% chance of an AI demand surge",
    "p": 0.85
   },
   "down": {
    "ticker": "Chip lead times shrink and some orders are canceled",
    "forecast": "30% chance of an AI demand surge",
    "p": 0.3
   },
   "actions": [
    {
     "label": "Lock a power contract (AI owner)",
     "cost": "3% of AI unit value + 1 attention",
     "result": "Fixes power cost for 3 rounds at today's price plus 10%"
    },
    {
     "label": "Reserve capacity (energy owner)",
     "cost": "2% of energy unit value",
     "result": "Sets aside 20% of output for AI buyers at a premium; wasted if demand fades"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.6,
   "breaking": "BREAKING: AI demand surges, and the power bill follows",
   "effects": {
    "ai": {
     "d": 1.25,
     "c": 1.35
    },
    "energy": {
     "d": 1.12,
     "p": 1.18
    },
    "ranching": {
     "c": 1.03
    },
    "grocery": {
     "c": 1.03
    },
    "cannabis": {
     "c": 1.03
    },
    "ski": {
     "c": 1.03
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "AI revenue rises about 25% but power cost rises 35%, so margin falls. Energy owners gain. Other industries pay a small regional power markup.",
   "tradeoffs": [
    {
     "owner": "AI-only owner (no energy)",
     "options": [
      {
       "label": "Sign a long power contract now",
       "cost": "Premium of about 10% over the old price",
       "result": "Caps cost, gives up the benefit if power falls"
      },
      {
       "label": "Buy power at spot",
       "cost": "No cost up front",
       "result": "Exposed to further spikes (see Grid crunch)"
      },
      {
       "label": "Ally with an energy team",
       "cost": "Share 30% of profit",
       "result": "Cheaper power, shared control"
      }
     ]
    },
    {
     "owner": "Owner of both AI and energy",
     "options": [
      {
       "label": "Serve own AI at cost",
       "cost": "Forgo the market price on that load",
       "result": "AI margin protected; energy windfall smaller"
      },
      {
       "label": "Sell power to rival AI teams at market",
       "cost": "Own AI pays the market price too",
       "result": "Biggest cash, but the AI unit groans like everyone else"
      }
     ]
    },
    {
     "owner": "Energy-only owner",
     "options": [
      {
       "label": "Sell to the highest bidder",
       "cost": "None",
       "result": "Windfall; strengthens rivals' AI units"
      },
      {
       "label": "Add a plant (build)",
       "cost": "10% of unit value, 2 rounds",
       "result": "Catches the next leg up; risk if demand fades"
      }
     ]
    },
    {
     "owner": "Ranch, grocery or ski owner with no AI or energy",
     "options": [
      {
       "label": "Accept the small power markup",
       "cost": "About +3% input cost",
       "result": "No action needed; a reminder that the boom reaches everyone"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Industry",
   "ticker": "Orders level off. AI firms call demand 'healthy, not wild'",
   "learning_note": "Locked power contracts now look expensive."
  },
  "conflicts_with": [
   "ai_commoditization",
   "recession"
  ],
  "lifts_out": [
   {
    "to": "grid_crunch",
    "delta": 0.1
   },
   {
    "to": "data_center_incentive",
    "delta": 0.1
   },
   {
    "to": "ai_commoditization",
    "delta": 0.1
   }
  ],
  "lifts_in": []
 },
 {
  "id": "grid_crunch",
  "name": "Grid crunch",
  "category": "energy",
  "teaches": [
   "correlated shock (energy owners gain, heavy users lose)",
   "build vs buy vs ally"
  ],
  "targeting": "industry",
  "primary_industries": [
   "energy",
   "ai"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Grid operator warns that reserve capacity is thin",
   "forecast": "45% chance of a regional power shortage",
   "p": 0.45
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "State regulator orders an emergency reliability review",
    "forecast": "75% chance of a power shortage",
    "p": 0.75
   },
   "down": {
    "ticker": "Grid operator adds temporary capacity; review postponed",
    "forecast": "20% chance of a power shortage",
    "p": 0.2
   },
   "actions": [
    {
     "label": "Backup power (heavy user: AI, cannabis grow, ski)",
     "cost": "4% of unit value + 1 attention",
     "result": "Avoids the 8% curtailment loss if a shortage hits"
    },
    {
     "label": "Capacity option (energy owner)",
     "cost": "2% of energy unit value",
     "result": "Right to build one plant at today's price for 2 rounds"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.45,
   "breaking": "BREAKING: Rolling power shortages declared. Prices spike",
   "effects": {
    "energy": {
     "d": 1.1,
     "p": 1.3
    },
    "ai": {
     "d": 0.92,
     "c": 1.25
    },
    "ski": {
     "c": 1.12
    },
    "cannabis": {
     "d": 0.95,
     "c": 1.1
    },
    "grocery": {
     "c": 1.06
    },
    "ranching": {
     "c": 1.03
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Heavy users without backup power also lose 8% of output. Backup power removes the demand hit and halves the cost rise.",
   "tradeoffs": [
    {
     "owner": "Energy owner",
     "options": [
      {
       "label": "Sell capacity at the spike price",
       "cost": "None",
       "result": "Big cash now; regulator goodwill falls"
      },
      {
       "label": "Honor fixed-price reliability contracts",
       "cost": "Gives up part of the spike",
       "result": "Lower cash, keeps regulator and customer trust for later rounds"
      },
      {
       "label": "Build a plant (use the option if held)",
       "cost": "10% of unit value",
       "result": "New supply arrives next round; shortage may be over"
      }
     ]
    },
    {
     "owner": "Heavy user (AI, cannabis grow, ski)",
     "options": [
      {
       "label": "Pay for backup power",
       "cost": "4% of unit value + 1 attention",
       "result": "Protects output"
      },
      {
       "label": "Accept curtailment",
       "cost": "Output -8%, cost up",
       "result": "Keeps cash, hurts the unit"
      },
      {
       "label": "Sell the unit to an energy owner",
       "cost": "Distressed price",
       "result": "Exit; buyer gains a captive customer"
      }
     ]
    },
    {
     "owner": "Owner of AI and energy",
     "options": [
      {
       "label": "Run AI first, sell the remainder",
       "cost": "Gives up part of the spike",
       "result": "Internal hedge works; the team looks like a genius or just lucky"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Mild weather; the grid holds. Regulator closes the review",
   "learning_note": "Backup power and spare capacity were insurance premiums that paid nothing."
  },
  "conflicts_with": [],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "ai_compute_boom",
    "delta": 0.1
   },
   {
    "from": "data_center_incentive",
    "delta": 0.1
   },
   {
    "from": "warm_winter",
    "delta": 0.05
   },
   {
    "from": "wind_backlash",
    "delta": -0.1
   }
  ]
 },
 {
  "id": "cannabis_reform",
  "name": "Cannabis banking reform",
  "category": "cannabis",
  "teaches": [
   "internal capital market squeeze (cannabis has no bank)",
   "real option"
  ],
  "targeting": "industry",
  "primary_industries": [
   "cannabis"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Politics",
   "ticker": "Senator floats federal cannabis banking bill",
   "forecast": "40% chance a banking bill passes this session",
   "p": 0.4
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Banking bill clears committee with votes to spare",
    "forecast": "70% chance the bill becomes law",
    "p": 0.7
   },
   "down": {
    "ticker": "Bill stuck in committee; leaders cool on it",
    "forecast": "15% chance the bill becomes law",
    "p": 0.15
   },
   "actions": [
    {
     "label": "Reform option (any team)",
     "cost": "2% of a cannabis unit's value",
     "result": "Right to buy that unit at today's price for 2 rounds"
    },
    {
     "label": "Keep funding cannabis from the parent (cannabis owner)",
     "cost": "Capital drawn from sibling units",
     "result": "Needed as long as banks refuse to lend"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.4,
   "breaking": "BREAKING: Cannabis banking bill signed. Banks can now lend to dispensaries",
   "effects": {
    "cannabis": {
     "d": 1.1,
     "p": 0.95,
     "c": 0.92,
     "v": 1.25
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Valuation multiple jumps 25%; unit can now borrow instead of drawing on the parent.",
   "tradeoffs": [
    {
     "owner": "Cannabis owner",
     "options": [
      {
       "label": "Use bank loans to expand",
       "cost": "1 attention; adds debt",
       "result": "Growth without draining siblings; risk if prices fall"
      },
      {
       "label": "Stop subsidizing and send cash back to HQ",
       "cost": "None",
       "result": "Frees the capital pool for other units, slower cannabis growth"
      },
      {
       "label": "Sell at the new, higher multiple",
       "cost": "None",
       "result": "Refocus at a good price; give up the growth"
      }
     ]
    },
    {
     "owner": "Ski, grocery or other owner with no cannabis",
     "options": [
      {
       "label": "Buy in now at the higher multiple",
       "cost": "About 25% above the old price",
       "result": "Winner's curse risk if the auction heats up"
      },
      {
       "label": "Ally with a cannabis owner",
       "cost": "Share 30% of profit",
       "result": "Cheaper entry, shared control"
      },
      {
       "label": "Sit out",
       "cost": "None",
       "result": "Avoids overpaying; misses the upside"
      }
     ]
    },
    {
     "owner": "Holder of a Reform option",
     "options": [
      {
       "label": "Exercise at the old price",
       "cost": "Price fixed pre-reform",
       "result": "Immediate gain of about 25% of the unit's value, minus the fee"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Banking bill dies in committee; dispensaries stay cash-only",
   "learning_note": "Reform options expire worthless. Teams that bought in early overpaid."
  },
  "conflicts_with": [
   "tax_280e"
  ],
  "lifts_out": [
   {
    "to": "tax_280e",
    "delta": -0.1
   }
  ],
  "lifts_in": []
 },
 {
  "id": "beef_shortage",
  "name": "Beef shortage",
  "category": "ranching",
  "teaches": [
   "relatedness (ranch feeds grocery)",
   "internal capital market squeeze",
   "build vs buy vs ally (forward contracts)"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ranching",
   "grocery"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Herd data shows fewer heifers kept for breeding",
   "forecast": "55% chance of a beef shortage within two rounds",
   "p": 0.55
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Industry",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Packers bid up for cattle; wholesale beef climbs",
    "forecast": "80% chance of a beef shortage",
    "p": 0.8
   },
   "down": {
    "ticker": "Imports and heavy culling ease supply worries",
    "forecast": "30% chance of a beef shortage",
    "p": 0.3
   },
   "actions": [
    {
     "label": "Forward contract (grocery owner with a ranch team)",
     "cost": "5% premium for 3 rounds",
     "result": "Locks beef cost; both sides commit"
    },
    {
     "label": "Hold heifers (ranch owner)",
     "cost": "1 attention; 15% of herd value stays off the market",
     "result": "Smaller sales now, bigger herd in 2 rounds"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.55,
   "breaking": "BREAKING: Beef shortage. Cattle prices jump, shelves thin",
   "effects": {
    "ranching": {
     "p": 1.3,
     "c": 1.05
    },
    "grocery": {
     "d": 0.97,
     "p": 1.06,
     "c": 1.2
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Grocery passes through only 6% of its 20% cost rise, so margin falls.",
   "tradeoffs": [
    {
     "owner": "Ranch-only owner",
     "options": [
      {
       "label": "Sell the herd at the peak",
       "cost": "Smaller herd for 2 rounds",
       "result": "Large cash now; sell-high, rebuild-slow"
      },
      {
       "label": "Keep heifers and expand",
       "cost": "Gives up cash now",
       "result": "Bigger herd when prices are still high next round"
      }
     ]
    },
    {
     "owner": "Owner of ranch and grocery",
     "options": [
      {
       "label": "Supply own grocery at cost",
       "cost": "Gives up the ranch windfall on that volume",
       "result": "Protects grocery margin; vertical link pays"
      },
      {
       "label": "Sell ranch output at market, let grocery pay",
       "cost": "None",
       "result": "Conglomerate allocation choice: which unit wins?"
      }
     ]
    },
    {
     "owner": "Grocery-only owner",
     "options": [
      {
       "label": "Sign a forward contract with a ranch team (if not done)",
       "cost": "5% premium",
       "result": "Caps exposure; ranch team gains a repeat partner"
      },
      {
       "label": "Build a private-label chicken line",
       "cost": "4% of unit value + 1 attention",
       "result": "Shifts 15% of volume off beef"
      },
      {
       "label": "Absorb the cost",
       "cost": "Margin down about 14%",
       "result": "No action, no cash"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Industry",
   "ticker": "Imports and a good calf crop fill the gap; beef prices settle",
   "learning_note": "Forward contracts and held heifers cost money for nothing."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "food_inflation_backlash",
    "delta": 0.1
   }
  ],
  "lifts_in": [
   {
    "from": "drought",
    "delta": 0.15
   },
   {
    "from": "listeria_recall",
    "delta": 0.05
   }
  ]
 },
 {
  "id": "food_inflation_backlash",
  "name": "Food inflation backlash",
  "category": "grocery",
  "teaches": [
   "parenting advantage (vertical integration)",
   "internal capital market squeeze",
   "relatedness"
  ],
  "targeting": "industry",
  "primary_industries": [
   "grocery"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Analysts",
   "ticker": "Analysts: food prices rising faster than wages",
   "forecast": "45% chance regulators act on food prices",
   "p": 0.45
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Senators call grocery chiefs to testify on prices",
    "forecast": "75% chance of price rules",
    "p": 0.75
   },
   "down": {
    "ticker": "Food prices cool; hearing postponed",
    "forecast": "20% chance of price rules",
    "p": 0.2
   },
   "actions": [
    {
     "label": "Private-label push (grocery owner)",
     "cost": "3% of unit value + 1 attention",
     "result": "Moves 15% of sales to own brand, cushions caps"
    },
    {
     "label": "Buy-ahead contract with a ranch team (grocery owner)",
     "cost": "5% premium for 3 rounds",
     "result": "Locks input cost"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.45,
   "breaking": "BREAKING: Price caps on staple foods. Grocers squeezed",
   "effects": {
    "grocery": {
     "d": 1.04,
     "p": 0.85,
     "c": 1.08,
     "v": 0.9
    },
    "ranching": {
     "d": 0.97
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Special: a grocery unit with a linked ranch under the same owner keeps input cost at 1.00 and valuation +10%.",
   "tradeoffs": [
    {
     "owner": "Grocery-only owner",
     "options": [
      {
       "label": "Private-label push (if not done)",
       "cost": "3% of unit value + 1 attention",
       "result": "Recovers part of the margin"
      },
      {
       "label": "Buy a ranch now",
       "cost": "About 15% above the pre-backlash price",
       "result": "Becomes the integrated firm; winner's curse risk"
      },
      {
       "label": "Sell the grocery unit",
       "cost": "Valuation down 10%",
       "result": "Refocus; sells into a bad market"
      }
     ]
    },
    {
     "owner": "Owner of grocery and ranch",
     "options": [
      {
       "label": "Hold the integration",
       "cost": "None",
       "result": "Margin protected; unit worth more under this parent than a stand-alone"
      },
      {
       "label": "Sell ranch output at market",
       "cost": "Grocery margin falls again",
       "result": "Cash up, integration advantage wasted"
      }
     ]
    },
    {
     "owner": "Owner of grocery plus unrelated cash cows",
     "options": [
      {
       "label": "Cross-subsidize grocery from the pool",
       "cost": "Draws from other units",
       "result": "Keeps stores open; starves winners (capital squeeze)"
      },
      {
       "label": "Let grocery shrink",
       "cost": "Lower grocery value",
       "result": "Keeps capital for better units"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Hearing canceled; no caps. Grocers keep raising prices",
   "learning_note": "Private-label and buy-ahead spending bought nothing."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "grocery_antitrust",
    "delta": 0.1
   }
  ],
  "lifts_in": [
   {
    "from": "beef_shortage",
    "delta": 0.1
   },
   {
    "from": "rates_up",
    "delta": 0.05
   }
  ]
 },
 {
  "id": "wind_backlash",
  "name": "Wind farm backlash",
  "category": "energy",
  "teaches": [
   "anergy (forced linkage between conflicting units)",
   "relatedness (shared brand and regulators)"
  ],
  "targeting": "industry",
  "primary_industries": [
   "energy"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Wind project faces local opposition",
   "forecast": "50% chance the wind farm is approved over local objections",
   "p": 0.5
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.5,
   "up": {
    "ticker": "State officials signal they may override the county",
    "forecast": "75% chance the wind farm is approved",
    "p": 0.75
   },
   "down": {
    "ticker": "County board votes to block turbine permits",
    "forecast": "25% chance the wind farm is approved",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Community benefit offer (energy owner)",
     "cost": "4% of energy unit value",
     "result": "Cuts local opposition effect on resort brand in half; delays project 1 round"
    },
    {
     "label": "Lobby against (ski owner)",
     "cost": "1 attention",
     "result": "50% chance the impact on ski demand is halved"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.5,
   "breaking": "BREAKING: Wind farm approved over local objections. Valley residents furious",
   "effects": {
    "energy": {
     "p": 0.85,
     "c": 0.88
    },
    "ai": {
     "c": 0.95
    },
    "ski": {
     "d": 0.88
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Ski effect applies to resorts in the wind valley. More supply lowers power price and cost for energy owners with wind permits. Lowers grid crunch odds.",
   "tradeoffs": [
    {
     "owner": "Energy owner with wind permits",
     "options": [
      {
       "label": "Build at once",
       "cost": "8% of unit value",
       "result": "Cheaper supply; community anger sticks to the brand"
      },
      {
       "label": "Pay community benefits and build next round",
       "cost": "4% + 1 round delay",
       "result": "Slower, but protects relationships with ski owners and regulators"
      }
     ]
    },
    {
     "owner": "Ski owner in the valley",
     "options": [
      {
       "label": "Fight (spend attention)",
       "cost": "1 attention",
       "result": "50% chance of halving the demand loss"
      },
      {
       "label": "Negotiate easement payments",
       "cost": "None",
       "result": "Receive about 3% of resort value in cash; brand loss stays"
      },
      {
       "label": "Sell to the wind developer",
       "cost": "None",
       "result": "Exit at a modest premium"
      }
     ]
    },
    {
     "owner": "Owner of both wind and the resort",
     "options": [
      {
       "label": "Favor the wind farm",
       "cost": "Resort demand loss",
       "result": "Anergy: shared brand and regulator asset pulls the two units in opposite directions"
      },
      {
       "label": "Favor the resort",
       "cost": "Wind project delayed",
       "result": "Energy unit loses value; the parent fixes one unit by hurting the other"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Industry",
   "ticker": "Developer withdraws wind project after local pushback",
   "learning_note": "Community offers and lobbying were spent for nothing."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "grid_crunch",
    "delta": -0.1
   }
  ],
  "lifts_in": []
 },
 {
  "id": "ai_commoditization",
  "name": "AI commoditization",
  "category": "ai",
  "teaches": [
   "parenting advantage (capability deployed across units)",
   "conglomerate discount (owning the sexy unit is not enough)",
   "refocus"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ai"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Free AI model matches paid models on key tests",
   "forecast": "55% chance AI prices fall sharply",
   "p": 0.55
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Industry",
   "q_up_path": 0.5455,
   "up": {
    "ticker": "Cloud rivals cut AI prices in half",
    "forecast": "80% chance AI prices collapse",
    "p": 0.8
   },
   "down": {
    "ticker": "Free model stumbles in real-world tests",
    "forecast": "25% chance AI prices collapse",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Pivot to apps (AI model owner)",
     "cost": "6% of unit value + 1 attention",
     "result": "Moves 40% of revenue to products built on top of models"
    },
    {
     "label": "Pilot AI across units (any owner with an AI unit)",
     "cost": "1 attention",
     "result": "Prepares the integration project for next round"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.55,
   "breaking": "BREAKING: Model prices collapse. Anyone can run top AI cheaply",
   "effects": {
    "ai": {
     "d": 1.2,
     "p": 0.55,
     "c": 0.9,
     "v": 0.75
    },
    "energy": {
     "d": 1.06
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Special: any owner with an AI unit may spend 1 attention per unit to cut that unit's input cost 5% (AI deployed). Without the attention, nothing happens.",
   "tradeoffs": [
    {
     "owner": "Owner of a pure AI model unit",
     "options": [
      {
       "label": "Pivot to apps (if not done)",
       "cost": "6% of unit value + 1 attention",
       "result": "Rescues part of the margin"
      },
      {
       "label": "Sell the unit now",
       "cost": "Valuation down 25%",
       "result": "Refocus; exit before further declines"
      },
      {
       "label": "Double down on a frontier model",
       "cost": "8% of unit value + 1 attention",
       "result": "30% chance of restored pricing power, 70% wasted"
      }
     ]
    },
    {
     "owner": "Diversified owner with an AI unit",
     "options": [
      {
       "label": "Deploy AI across ranch, grocery, ski, cannabis",
       "cost": "1 attention per unit",
       "result": "Cuts costs 5% in each; owning the AI unit becomes valuable because of the others"
      },
      {
       "label": "Ignore and leave the AI unit alone",
       "cost": "None",
       "result": "AI unit loses value, no offset"
      }
     ]
    },
    {
     "owner": "Owner with no AI",
     "options": [
      {
       "label": "Buy a cheap AI unit now",
       "cost": "About 35% below the old price",
       "result": "Gains the capability; winner's curse if bidding heats up"
      },
      {
       "label": "License AI from a market provider",
       "cost": "1% of revenue",
       "result": "Smaller gain, no purchase risk"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Industry",
   "ticker": "Free model fades; paid AI keeps its pricing",
   "learning_note": "Teams that sold AI units early gave up value."
  },
  "conflicts_with": [
   "ai_compute_boom"
  ],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "ai_compute_boom",
    "delta": 0.1
   }
  ]
 },
 {
  "id": "recession",
  "name": "Recession",
  "category": "macro",
  "teaches": [
   "correlated shock",
   "internal capital market squeeze",
   "conglomerate discount"
  ],
  "targeting": "industry",
  "primary_industries": [],
  "earliest_start_round": 2,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Markets",
   "ticker": "Factory orders slip for a second month",
   "forecast": "35% chance of a recession within two rounds",
   "p": 0.35
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Analysts",
   "q_up_path": 0.4,
   "up": {
    "ticker": "Economists: 'recession risk rising'; shoppers cut back",
    "forecast": "65% chance of a recession",
    "p": 0.65
   },
   "down": {
    "ticker": "Jobs report beats forecasts; recession talk fades",
    "forecast": "15% chance of a recession",
    "p": 0.15
   },
   "actions": [
    {
     "label": "Raise a cash buffer (any team)",
     "cost": "10% of cash sits idle for a round",
     "result": "Cash on hand to survive or buy cheap"
    },
    {
     "label": "Cut costs (any unit)",
     "cost": "1 attention per unit",
     "result": "Cuts the unit's input cost 4%; lowers growth"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.35,
   "breaking": "BREAKING: Recession declared. Spending falls across the board",
   "effects": {
    "ski": {
     "d": 0.88,
     "v": 0.9
    },
    "cannabis": {
     "d": 0.93,
     "v": 0.9
    },
    "grocery": {
     "d": 1.02,
     "p": 0.98,
     "v": 0.95
    },
    "ranching": {
     "d": 0.95,
     "p": 0.92,
     "v": 0.9
    },
    "energy": {
     "d": 0.94,
     "p": 0.93,
     "v": 0.9
    },
    "ai": {
     "d": 0.9,
     "p": 0.95,
     "v": 0.85
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Every team's capital pool shrinks 10% (credit tightens). Grocery barely moves because shoppers trade down.",
   "tradeoffs": [
    {
     "owner": "Cash-rich team",
     "options": [
      {
       "label": "Buy distressed units",
       "cost": "Prices about 20% below normal",
       "result": "Cheap entry; winner's curse if the slide continues"
      },
      {
       "label": "Hold cash",
       "cost": "None",
       "result": "Safe; misses the discount"
      }
     ]
    },
    {
     "owner": "Leveraged or cash-poor team",
     "options": [
      {
       "label": "Cut investment in the weakest unit",
       "cost": "Weak unit shrinks",
       "result": "Preserves the strong units"
      },
      {
       "label": "Sell a unit to raise cash",
       "cost": "Fire-sale haircut about 25%",
       "result": "Refocus under pressure"
      },
      {
       "label": "Keep funding everyone",
       "cost": "Capital pool exhausted",
       "result": "Risk of going bust; internal capital market squeeze"
      }
     ]
    },
    {
     "owner": "Team that believed diversification would protect it",
     "options": [
      {
       "label": "Review the portfolio",
       "cost": "1 attention",
       "result": "Debrief point: unrelated units still fell together because the shock was correlated"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Markets",
   "ticker": "Growth holds up; recession talk fades",
   "learning_note": "Cash buffers and cost cuts slowed teams down for nothing."
  },
  "conflicts_with": [
   "ai_compute_boom",
   "rates_up",
   "tourism_boom"
  ],
  "lifts_out": [],
  "lifts_in": []
 },
 {
  "id": "rates_up",
  "name": "Interest rate jump",
  "category": "macro",
  "teaches": [
   "winner's curse (valuations reset)",
   "internal capital market squeeze",
   "real option (wait for cheaper prices)"
  ],
  "targeting": "industry",
  "primary_industries": [],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Markets",
   "ticker": "Central bank says inflation is 'still too high'",
   "forecast": "50% chance of an interest rate hike",
   "p": 0.5
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Markets",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Bond yields jump; traders bet on a hike",
    "forecast": "75% chance of a rate hike",
    "p": 0.75
   },
   "down": {
    "ticker": "Inflation data softer than expected",
    "forecast": "25% chance of a rate hike",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Lock debt now (any team)",
     "cost": "2% of debt value as a fee",
     "result": "Fixes borrowing cost for 3 rounds"
    },
    {
     "label": "Buy before prices fall (any team)",
     "cost": "Normal auction price",
     "result": "Risk of overpaying if rates rise and values reset"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.5,
   "breaking": "BREAKING: Central bank raises rates 2 points. Borrowing costs jump",
   "effects": {
    "ai": {
     "v": 0.8
    },
    "cannabis": {
     "v": 0.85
    },
    "energy": {
     "c": 1.06,
     "v": 0.92
    },
    "ski": {
     "c": 1.06,
     "v": 0.92
    },
    "grocery": {
     "v": 0.96
    },
    "ranching": {
     "v": 0.97
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Special: asking prices in auctions fall 8%, borrowing capacity falls 15%, idle cash earns +2% per round.",
   "tradeoffs": [
    {
     "owner": "Cash-rich team",
     "options": [
      {
       "label": "Buy while prices have reset",
       "cost": "Auction prices 8% lower",
       "result": "Cheap entry; cash also earns 2% by waiting"
      },
      {
       "label": "Hold and earn interest",
       "cost": "None",
       "result": "Safe, small return"
      }
     ]
    },
    {
     "owner": "Leveraged team (heavy borrowing)",
     "options": [
      {
       "label": "Pay down debt by selling a unit",
       "cost": "Sale at market",
       "result": "Refocus; lose the unit"
      },
      {
       "label": "Defer expansion",
       "cost": "Growth slows",
       "result": "Survive, fall behind rivals"
      },
      {
       "label": "Refinance (if debt was not locked)",
       "cost": "Higher rate",
       "result": "Costs cash each round"
      }
     ]
    },
    {
     "owner": "Team holding AI or cannabis units",
     "options": [
      {
       "label": "Hold through the valuation drop",
       "cost": "None",
       "result": "Paper loss only; sell later or never"
      },
      {
       "label": "Sell now",
       "cost": "Lock the loss",
       "result": "Cash for other units"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Markets",
   "ticker": "Central bank holds rates; markets exhale",
   "learning_note": "Teams that locked debt paid a fee for nothing."
  },
  "conflicts_with": [
   "recession"
  ],
  "lifts_out": [
   {
    "to": "food_inflation_backlash",
    "delta": 0.05
   }
  ],
  "lifts_in": []
 },
 {
  "id": "drought",
  "name": "Drought",
  "category": "ranching",
  "teaches": [
   "internal capital market squeeze (ranch becomes a net recipient)",
   "correlated shock"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ranching"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Weather",
   "ticker": "Reservoirs lower than usual for the season",
   "forecast": "45% chance of a drought year",
   "p": 0.45
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Weather",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Rain misses the plains for a third month",
    "forecast": "75% chance of a drought year",
    "p": 0.75
   },
   "down": {
    "ticker": "Soaking rain refills pastures",
    "forecast": "20% chance of a drought year",
    "p": 0.2
   },
   "actions": [
    {
     "label": "Buy feed ahead (ranch owner)",
     "cost": "5% of ranch value",
     "result": "Halves the feed cost rise if drought hits"
    },
    {
     "label": "Lease pasture elsewhere (ranch owner)",
     "cost": "4% of ranch value + 1 attention",
     "result": "Keeps herd size; wasted if rain comes"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.45,
   "breaking": "BREAKING: Drought declared. Pastures burn, hay prices soar",
   "effects": {
    "ranching": {
     "d": 0.9,
     "p": 0.95,
     "c": 1.25
    },
    "energy": {
     "p": 1.08
    },
    "grocery": {
     "c": 1.05
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Short-run price falls as ranchers sell off herds. Can set up Beef shortage later.",
   "tradeoffs": [
    {
     "owner": "Ranch-only owner",
     "options": [
      {
       "label": "Sell part of the herd now",
       "cost": "Smaller herd, price -5%",
       "result": "Cash now; rebuild takes 2 rounds"
      },
      {
       "label": "Pay for feed or lease land (if not done)",
       "cost": "5% of ranch value",
       "result": "Keeps the herd; costly"
      },
      {
       "label": "Ally with another ranch team to share pasture",
       "cost": "Share 25% of output",
       "result": "Cheaper survival, shared control"
      }
     ]
    },
    {
     "owner": "Ranch owner with cash-rich siblings (energy, ski, AI)",
     "options": [
      {
       "label": "Subsidize the ranch from the pool",
       "cost": "About 8% of ranch value",
       "result": "Keeps the herd; starves other units (capital squeeze)"
      },
      {
       "label": "Let the ranch shrink and sell cattle",
       "cost": "Herd -20%",
       "result": "Capital stays with better units; refocus-like choice"
      }
     ]
    },
    {
     "owner": "Grocery owner",
     "options": [
      {
       "label": "Buy a distressed ranch cheaply",
       "cost": "Price about 15% below normal",
       "result": "Vertical link for later; risk that drought lasts"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Weather",
   "ticker": "Rain returns; pastures green up",
   "learning_note": "Feed and lease spending was wasted."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "beef_shortage",
    "delta": 0.15
   },
   {
    "to": "water_rights_ruling",
    "delta": 0.1
   }
  ],
  "lifts_in": [
   {
    "from": "warm_winter",
    "delta": 0.05
   }
  ]
 },
 {
  "id": "grocery_antitrust",
  "name": "Grocery merger limits",
  "category": "grocery",
  "teaches": [
   "refocus and divestiture",
   "parenting advantage (best owner)"
  ],
  "targeting": "unit (two largest grocery units)",
  "primary_industries": [
   "grocery"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Analysts",
   "ticker": "Analysts increasingly concerned about grocery consolidation",
   "forecast": "40% chance regulators set merger limits",
   "p": 0.4
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Regulators open review of the largest grocery chains",
    "forecast": "70% chance of merger limits",
    "p": 0.7
   },
   "down": {
    "ticker": "Regulators say no review is planned",
    "forecast": "15% chance of merger limits",
    "p": 0.15
   },
   "actions": [
    {
     "label": "Legal prep (large grocery owner)",
     "cost": "3% of unit value + 1 attention",
     "result": "Halves forced-divestiture cost if limits arrive"
    },
    {
     "label": "Pre-sell stores (large grocery owner)",
     "cost": "1 attention",
     "result": "Sell 25% of the unit at today's price, no haircut"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.4,
   "breaking": "BREAKING: Regulators cap grocery market share. Largest chains must sell stores",
   "effects": {
    "grocery": {
     "p": 0.97,
     "v": 0.85
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Valuation cut applies to the two largest grocery units. Smaller grocery units gain v 1.04. Ranch-to-grocery integration is allowed. All grocery deals now cost +1 attention.",
   "tradeoffs": [
    {
     "owner": "Owner of a large grocery unit",
     "options": [
      {
       "label": "Divest 25% of stores at fair price",
       "cost": "1 attention",
       "result": "Refocus; shrinks the unit, avoids the penalty"
      },
      {
       "label": "Fight the ruling",
       "cost": "6% of unit value + 1 attention",
       "result": "50% chance of waiving the cap, 50% of wasted cost"
      },
      {
       "label": "Accept the valuation cut",
       "cost": "Value down 15%",
       "result": "Keeps size, loses value"
      }
     ]
    },
    {
     "owner": "Owner of a small grocery unit or a ranch",
     "options": [
      {
       "label": "Buy divested stores",
       "cost": "Price about 10% below normal",
       "result": "Growth; check whether you are the best owner or just the bidder"
      },
      {
       "label": "Ally with the large chain on supply",
       "cost": "Share 20% of margin",
       "result": "Safer entry, shared control"
      }
     ]
    },
    {
     "owner": "Owner of ranch and grocery",
     "options": [
      {
       "label": "Keep the vertical link",
       "cost": "None",
       "result": "Regulators treat vertical links differently; integration advantage stays"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Regulators clear the review; grocery deals proceed",
   "learning_note": "Legal prep and pre-sales cost money or growth for nothing."
  },
  "conflicts_with": [],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "food_inflation_backlash",
    "delta": 0.1
   }
  ]
 },
 {
  "id": "tax_280e",
  "name": "280E tax relief",
  "category": "cannabis",
  "teaches": [
   "internal capital market (capital sink turns into cash cow)",
   "real option"
  ],
  "targeting": "industry",
  "primary_industries": [
   "cannabis"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Politics",
   "ticker": "Treasury hints at reviewing the tax penalty on cannabis firms",
   "forecast": "40% chance the 280E tax penalty is eased",
   "p": 0.4
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Treasury sends a draft rule to the White House",
    "forecast": "70% chance the penalty is eased",
    "p": 0.7
   },
   "down": {
    "ticker": "Treasury says review will take years",
    "forecast": "15% chance the penalty is eased",
    "p": 0.15
   },
   "actions": [
    {
     "label": "Tax-relief option (any team)",
     "cost": "1.5% of a cannabis unit's value",
     "result": "Right to buy that unit at today's price for 2 rounds"
    },
    {
     "label": "Hold cash in the cannabis unit (cannabis owner)",
     "cost": "Delays dividends to HQ",
     "result": "Cash ready to expand if relief arrives"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.4,
   "breaking": "BREAKING: 280E penalty eased. Cannabis firms keep far more of each dollar",
   "effects": {
    "cannabis": {
     "c": 0.85,
     "v": 1.2
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Tax burden counts as a cost; cash flow per sale rises. No effect on banking.",
   "tradeoffs": [
    {
     "owner": "Cannabis owner",
     "options": [
      {
       "label": "Send surplus cash to HQ for other units",
       "cost": "None",
       "result": "Cannabis flips from capital sink to cash cow; siblings benefit"
      },
      {
       "label": "Reinvest to expand cannabis",
       "cost": "1 attention",
       "result": "Faster growth; HQ pool stays tight"
      }
     ]
    },
    {
     "owner": "Non-cannabis owner",
     "options": [
      {
       "label": "Buy in at the new multiple",
       "cost": "About 20% above old price",
       "result": "Winner's curse risk"
      },
      {
       "label": "Ally with a cannabis owner",
       "cost": "Share 30% of profit",
       "result": "Cheaper entry"
      }
     ]
    },
    {
     "owner": "Holder of a tax-relief option",
     "options": [
      {
       "label": "Exercise at the old price",
       "cost": "Fee already paid",
       "result": "Gain of about 20% of unit value minus fee"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Treasury shelves the rule; cannabis taxes unchanged",
   "learning_note": "Options expire and cash sat idle."
  },
  "conflicts_with": [
   "cannabis_reform"
  ],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "cannabis_reform",
    "delta": -0.1
   }
  ]
 },
 {
  "id": "tourism_boom",
  "name": "Tourism boom",
  "category": "macro",
  "teaches": [
   "winner's curse (tourism-linked units get bid up)",
   "real option (capacity)",
   "correlated shock"
  ],
  "targeting": "industry",
  "primary_industries": [],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Tourism",
   "ticker": "Hotel bookings for the season run ahead of last year",
   "forecast": "50% chance of a travel boom",
   "p": 0.5
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Tourism",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Airlines add flights to mountain airports",
    "forecast": "75% chance of a travel boom",
    "p": 0.75
   },
   "down": {
    "ticker": "Bookings cool as airfares rise",
    "forecast": "25% chance of a travel boom",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Expand lifts and lodging (ski owner)",
     "cost": "8% of resort value + 1 attention",
     "result": "Captures the full demand gain if the boom hits"
    },
    {
     "label": "Stock resort-town dispensary (cannabis owner)",
     "cost": "2% of unit value",
     "result": "Captures the full gain; small waste otherwise"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.5,
   "breaking": "BREAKING: Travel boom. Mountain towns sell out",
   "effects": {
    "ski": {
     "d": 1.15,
     "v": 1.15
    },
    "cannabis": {
     "d": 1.12,
     "v": 1.1
    },
    "grocery": {
     "d": 1.04
    },
    "energy": {
     "d": 1.03
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 2,
   "notes": "Resorts that did not expand capture only 60% of the gain and take a brand ding from crowding. Cannabis effect applies to resort-town units.",
   "tradeoffs": [
    {
     "owner": "Ski owner",
     "options": [
      {
       "label": "Raise prices",
       "cost": "None",
       "result": "More margin per visitor, risk of brand damage"
      },
      {
       "label": "Expand capacity (if not done)",
       "cost": "8% of resort value",
       "result": "Captures volume next round; boom may be over"
      },
      {
       "label": "Sell at the peak multiple",
       "cost": "None",
       "result": "Refocus at a high price; miss further gains"
      }
     ]
    },
    {
     "owner": "Owner with no tourism units",
     "options": [
      {
       "label": "Buy tourism-linked units now",
       "cost": "About 15% above old price",
       "result": "Winner's curse: you pay for the boom after it is public"
      },
      {
       "label": "Ignore it",
       "cost": "None",
       "result": "Little direct gain; correlated gain for others"
      }
     ]
    },
    {
     "owner": "Cannabis owner in a resort town",
     "options": [
      {
       "label": "Open a second location",
       "cost": "6% of unit value + 1 attention",
       "result": "More volume; a long-run bet on tourism"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Tourism",
   "ticker": "Bookings flatten; the travel boom was a rumor",
   "learning_note": "Capacity and stock spending bought nothing."
  },
  "conflicts_with": [
   "recession",
   "warm_winter"
  ],
  "lifts_out": [
   {
    "to": "ski_megapass",
    "delta": 0.1
   }
  ],
  "lifts_in": []
 },
 {
  "id": "water_rights_ruling",
  "name": "Water rights ruling",
  "category": "ranching",
  "teaches": [
   "relatedness (shared water asset)",
   "real option",
   "parenting advantage (best owner of water)"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ranching",
   "ski"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Politics",
   "ticker": "Court to hear fight over who gets river water first",
   "forecast": "45% chance the court favors senior (ranch) water rights",
   "p": 0.45
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Judge signals old farm water claims come first",
    "forecast": "70% chance of a senior-rights ruling",
    "p": 0.7
   },
   "down": {
    "ticker": "Judge hints at cuts shared across all users",
    "forecast": "20% chance of a senior-rights ruling",
    "p": 0.2
   },
   "actions": [
    {
     "label": "Water option (ski or AI owner)",
     "cost": "2% of unit value",
     "result": "Right to buy or lease water from a ranch team at today's price for 2 rounds"
    },
    {
     "label": "Pre-sell water lease (ranch owner)",
     "cost": "1 attention",
     "result": "Lease some water now at a modest price"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.45,
   "breaking": "BREAKING: Court upholds senior water rights. Ranches first; resorts and data centers cut back",
   "effects": {
    "ranching": {
     "c": 0.85,
     "v": 1.2
    },
    "ski": {
     "d": 0.97,
     "c": 1.18
    },
    "ai": {
     "c": 1.08
    },
    "energy": {
     "c": 1.04
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Ranch water becomes a scarce shared asset. Resort snowmaking and data-center cooling are capped.",
   "tradeoffs": [
    {
     "owner": "Ranch owner",
     "options": [
      {
       "label": "Lease water to resort or AI owners",
       "cost": "Less water for the herd",
       "result": "New cash stream; fixes the other side's problem"
      },
      {
       "label": "Keep water for the herd",
       "cost": "None",
       "result": "Herd grows; water value unused"
      }
     ]
    },
    {
     "owner": "Ski owner (not a ranch owner)",
     "options": [
      {
       "label": "Buy or lease water at a premium",
       "cost": "About 12% above old price",
       "result": "Keeps snowmaking running; pays the ranch team"
      },
      {
       "label": "Cut snowmaking",
       "cost": "Ski demand -3%",
       "result": "Saves cash, thinner trails"
      }
     ]
    },
    {
     "owner": "Owner of both ranch and ski",
     "options": [
      {
       "label": "Transfer water internally",
       "cost": "None",
       "result": "Synergy from the shared asset; shows relatedness the hidden matrix created"
      },
      {
       "label": "Sell water to rivals",
       "cost": "Own resort pays market",
       "result": "Parent chooses between units"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Court postpones the ruling until next year; everyone waits",
   "learning_note": "Water options expire. Waiting teams keep their capital."
  },
  "conflicts_with": [],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "drought",
    "delta": 0.1
   }
  ]
 },
 {
  "id": "ski_megapass",
  "name": "Ski megapass enters",
  "category": "ski",
  "teaches": [
   "build vs buy vs ally (alliance relational rents)",
   "winner's curse",
   "refocus"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ski"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Tourism",
   "ticker": "Rumor: a giant season pass is coming to the region",
   "forecast": "55% chance PeakPass enters the market",
   "p": 0.55
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Deal",
   "q_up_path": 0.5,
   "up": {
    "ticker": "PeakPass signs two big resorts and eyes more",
    "forecast": "80% chance PeakPass launches",
    "p": 0.8
   },
   "down": {
    "ticker": "PeakPass talks stall over revenue split",
    "forecast": "30% chance PeakPass launches",
    "p": 0.3
   },
   "actions": [
    {
     "label": "Pre-negotiate (ski owner)",
     "cost": "1 attention",
     "result": "Better terms (revenue share +5 points) if PeakPass launches"
    },
    {
     "label": "Launch own multi-resort pass (ski owners as a pair)",
     "cost": "4% of unit value each",
     "result": "Joint pass; repeat partners cost less next time"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.55,
   "breaking": "BREAKING: PeakPass launches. One cheap pass, dozens of resorts",
   "effects": {
    "ski": {
     "d": 0.85
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "Base effect hits any resort that does nothing. Choices below replace it. Join: d 1.10, p 0.88. Stay independent: d 0.85, p 1.08. Sell: PeakPass pays 1.20x stand-alone value to the first seller.",
   "tradeoffs": [
    {
     "owner": "Independent ski owner",
     "options": [
      {
       "label": "Join the pass",
       "cost": "Lose pricing control",
       "result": "Volume up 10% at 12% lower price; easier life"
      },
      {
       "label": "Stay independent and premium",
       "cost": "Visitors -15%",
       "result": "Price +8%; brand differentiation"
      },
      {
       "label": "Sell to PeakPass",
       "cost": "None",
       "result": "Refocus at 1.20x; only the first seller gets it"
      }
     ]
    },
    {
     "owner": "Owner of ski with unrelated sibling units",
     "options": [
      {
       "label": "Join the pass",
       "cost": "Lower margins",
       "result": "Lower capital need; sibling units are not squeezed"
      },
      {
       "label": "Stay independent",
       "cost": "Needs more marketing",
       "result": "Capital pulled from siblings"
      }
     ]
    },
    {
     "owner": "Non-ski owner",
     "options": [
      {
       "label": "Buy a resort that is refusing to join",
       "cost": "Priced low after the shock",
       "result": "Cheap entry; risk the pass keeps growing"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Deal",
   "ticker": "PeakPass shelves its plan; resorts keep their own pricing",
   "learning_note": "Pre-negotiation time and joint-pass costs were wasted."
  },
  "conflicts_with": [],
  "lifts_out": [],
  "lifts_in": [
   {
    "from": "tourism_boom",
    "delta": 0.1
   }
  ]
 },
 {
  "id": "data_center_incentive",
  "name": "Data-center tax break",
  "category": "ai",
  "teaches": [
   "real option",
   "build vs buy vs ally (AI plus energy joint venture)",
   "winner's curse (scarce sites)"
  ],
  "targeting": "industry",
  "primary_industries": [
   "ai"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Politics",
   "ticker": "Governor floats tax breaks to attract data centers",
   "forecast": "50% chance the state offers a data-center tax break",
   "p": 0.5
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Politics",
   "q_up_path": 0.5,
   "up": {
    "ticker": "Tax break bill clears the state senate; three sites shortlisted",
    "forecast": "75% chance the tax break is law",
    "p": 0.75
   },
   "down": {
    "ticker": "Bill amended; breaks limited to small projects",
    "forecast": "25% chance the tax break is law",
    "p": 0.25
   },
   "actions": [
    {
     "label": "Pre-apply for a site (AI owner)",
     "cost": "2% of AI unit value + 1 attention",
     "result": "Moves your bid to the front of the line"
    },
    {
     "label": "Power letter of intent (energy owner)",
     "cost": "1% of energy unit value",
     "result": "Promises power to the first AI team to claim a site"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.5,
   "breaking": "BREAKING: State offers data-center tax breaks. Three sites open for bids",
   "effects": {
    "ai": {
     "d": 1.06,
     "c": 0.85
    },
    "energy": {
     "d": 1.15,
     "p": 1.03
    },
    "ranching": {
     "c": 1.02
    },
    "grocery": {
     "c": 1.02
    },
    "cannabis": {
     "c": 1.02
    },
    "ski": {
     "c": 1.02
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 3,
   "notes": "AI cost cut applies only to the three site winners. Others see only a small regional power markup.",
   "tradeoffs": [
    {
     "owner": "AI owner",
     "options": [
      {
       "label": "Bid for a site",
       "cost": "Bid price set in a sealed auction",
       "result": "Cost cut 15%; winner's curse if you overbid"
      },
      {
       "label": "Ally with an energy team on a joint site",
       "cost": "Share 40% of the gain",
       "result": "Cheaper entry, shared control"
      },
      {
       "label": "Skip it",
       "cost": "None",
       "result": "Lose ground to winners"
      }
     ]
    },
    {
     "owner": "Energy owner",
     "options": [
      {
       "label": "Sell power contracts to site winners",
       "cost": "None",
       "result": "Steady demand; reliability promises"
      },
      {
       "label": "Hold capacity for the spot market",
       "cost": "None",
       "result": "Higher upside; risk if grid stays calm (see Grid crunch)"
      }
     ]
    },
    {
     "owner": "Ranch, grocery, ski or cannabis owner",
     "options": [
      {
       "label": "Accept the small markup",
       "cost": "Input cost +2%",
       "result": "No action; spillover from rival's decisions"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Politics",
   "ticker": "Tax break bill dies; data-center builders look to other states",
   "learning_note": "Pre-applications and letters of intent were wasted."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "grid_crunch",
    "delta": 0.1
   }
  ],
  "lifts_in": [
   {
    "from": "ai_compute_boom",
    "delta": 0.1
   }
  ]
 },
 {
  "id": "listeria_recall",
  "name": "Listeria recall",
  "category": "grocery",
  "teaches": [
   "anergy (vertical link spreads damage)",
   "relatedness (cuts both ways)",
   "refocus"
  ],
  "targeting": "unit (one grocery unit, with its linked ranch)",
  "primary_industries": [
   "ranching",
   "grocery"
  ],
  "earliest_start_round": 1,
  "latest_start_round": 3,
  "stage1": {
   "round_offset": 0,
   "tag": "Industry",
   "ticker": "Food safety agency opens a routine inspection at a meat plant",
   "forecast": "35% chance of a major recall",
   "p": 0.35
  },
  "stage2": {
   "round_offset": 1,
   "tag": "Industry",
   "q_up_path": 0.4545,
   "up": {
    "ticker": "Lab finds bacteria in plant samples; one brand pulled",
    "forecast": "65% chance of a major recall",
    "p": 0.65
   },
   "down": {
    "ticker": "Inspection passes with minor notes",
    "forecast": "10% chance of a major recall",
    "p": 0.1
   },
   "actions": [
    {
     "label": "Safety audit (grocery or ranch owner)",
     "cost": "2% of unit value + 1 attention",
     "result": "Halves the damage if a recall hits"
    },
    {
     "label": "Switch supplier (grocery owner)",
     "cost": "1 attention + 3% premium",
     "result": "Breaks the link to the suspect plant"
    }
   ]
  },
  "stage3": {
   "timing": "end of round (start + 1); effects apply from round (start + 2)",
   "p_overall": 0.35,
   "breaking": "BREAKING: Listeria recall. Beef products pulled from shelves nationwide",
   "effects": {
    "grocery": {
     "d": 0.8,
     "v": 0.88
    },
    "ranching": {
     "d": 0.85
    }
   },
   "effect_keys": {
    "d": "demand",
    "p": "price",
    "c": "input cost",
    "v": "valuation multiple"
   },
   "duration_rounds": 1,
   "notes": "Hits one grocery unit chosen at random among those with a linked ranch under the same owner (else an AI grocery) and that ranch. Other grocery units gain d 1.03 from switching shoppers.",
   "tradeoffs": [
    {
     "owner": "Owner of grocery and ranch (the hit unit)",
     "options": [
      {
       "label": "Pay for the recall response",
       "cost": "4% of unit value",
       "result": "Rebuilds trust; keeps the vertical link"
      },
      {
       "label": "Cut the ranch loose and sell it",
       "cost": "Sale at a haircut",
       "result": "Refocus; vertical link was the problem"
      },
      {
       "label": "Ignore it",
       "cost": "Both units keep losing demand",
       "result": "Anergy: the link spreads damage"
      }
     ]
    },
    {
     "owner": "Grocery-only owner",
     "options": [
      {
       "label": "Capture shoppers from the hit chain",
       "cost": "2% of unit value in marketing",
       "result": "Gains of about 3% demand"
      },
      {
       "label": "Do nothing",
       "cost": "None",
       "result": "Gets the small shopper gain for free"
      }
     ]
    },
    {
     "owner": "Ranch-only owner",
     "options": [
      {
       "label": "Switch buyers",
       "cost": "1 attention",
       "result": "Avoids brand damage if the recalled plant was not yours"
      }
     ]
    }
   ]
  },
  "dud": {
   "tag": "Industry",
   "ticker": "Plant passes tests; no recall",
   "learning_note": "Safety audits and supplier switches cost money for nothing."
  },
  "conflicts_with": [],
  "lifts_out": [
   {
    "to": "beef_shortage",
    "delta": 0.05
   }
  ],
  "lifts_in": []
 }
];

export const SCHEDULE_RULE = {"chains_per_game": 11, "min_macro_chains": 1, "max_scheduled_per_primary_industry": 3, "max_resolved_per_primary_industry": 2, "start_round_counts": {"1": 4, "2": 3, "3": 4}, "max_live_forecasts": 7, "resolutions_target_range": [5, 8], "resolutions_gate": "redraw seed unless 5-8 resolved and <=2 resolved per primary industry", "bad_overlap": [["warm_winter", "tourism_boom"], ["ai_compute_boom", "ai_commoditization"], ["recession", "tourism_boom"], ["recession", "rates_up"], ["recession", "ai_compute_boom"], ["cannabis_reform", "tax_280e"]], "lifts": [{"from": "drought", "to": "beef_shortage", "delta": 0.15}, {"from": "drought", "to": "water_rights_ruling", "delta": 0.1}, {"from": "warm_winter", "to": "drought", "delta": 0.05}, {"from": "ai_compute_boom", "to": "grid_crunch", "delta": 0.1}, {"from": "ai_compute_boom", "to": "data_center_incentive", "delta": 0.1}, {"from": "ai_compute_boom", "to": "ai_commoditization", "delta": 0.1}, {"from": "data_center_incentive", "to": "grid_crunch", "delta": 0.1}, {"from": "warm_winter", "to": "grid_crunch", "delta": 0.05}, {"from": "wind_backlash", "to": "grid_crunch", "delta": -0.1}, {"from": "beef_shortage", "to": "food_inflation_backlash", "delta": 0.1}, {"from": "rates_up", "to": "food_inflation_backlash", "delta": 0.05}, {"from": "food_inflation_backlash", "to": "grocery_antitrust", "delta": 0.1}, {"from": "listeria_recall", "to": "beef_shortage", "delta": 0.05}, {"from": "tourism_boom", "to": "ski_megapass", "delta": 0.1}, {"from": "cannabis_reform", "to": "tax_280e", "delta": -0.1}], "stage_timing": {"stage1": "start of round r", "stage2": "start of round r+1", "stage3": "end of round r+1", "effects_from": "round r+2"}};

export const NOISE_TICKER = {"is_noise": true, "tags": {"Markets": [{"text": "Stocks end the day flat on thin trading", "noise": true}, {"text": "Bond yields little changed ahead of Friday data", "noise": true}, {"text": "Small-company index edges up 0.2%", "noise": true}, {"text": "Trading volume lowest in three weeks", "noise": true}, {"text": "Dollar steady against major currencies", "noise": true}, {"text": "Futures point to a quiet open", "noise": true}, {"text": "Market breadth is narrow; a few stocks lead", "noise": true}, {"text": "Volatility index sits near its monthly average", "noise": true}, {"text": "Commodity index drifts sideways", "noise": true}, {"text": "Investors wait on next week's earnings", "noise": true}, {"text": "Midday: buyers and sellers about even", "noise": true}, {"text": "Overnight markets in Asia close mixed", "noise": true}, {"text": "Corporate bond sales steady this week", "noise": true}, {"text": "Fund rebalancing moves a few shares, nothing major", "noise": true}, {"text": "Closing bell: market ends where it started", "noise": true}, {"text": "Exchange extends lunch-hour trading test by a week", "noise": true}], "Industry": [{"text": "Grocery trade group holds annual meeting in Denver", "noise": true}, {"text": "Ski patrol union ratifies routine contract", "noise": true}, {"text": "Cannabis trade show opens with average turnout", "noise": true}, {"text": "Utility publishes its yearly maintenance schedule", "noise": true}, {"text": "AI lab hires a new head of research", "noise": true}, {"text": "Cattle trucking firm adds two routes", "noise": true}, {"text": "Grocer opens one store and closes another", "noise": true}, {"text": "Resort replaces a chairlift motor on schedule", "noise": true}, {"text": "Dispensary chain updates its loyalty app", "noise": true}, {"text": "Power plant finishes a scheduled inspection", "noise": true}, {"text": "Chip maker ships quarterly orders on time", "noise": true}, {"text": "Rancher co-op elects a new board chair", "noise": true}, {"text": "Supermarket chain redesigns its logo", "noise": true}, {"text": "Ski resort adds a new beginner trail", "noise": true}, {"text": "Energy firm names a new finance chief", "noise": true}, {"text": "AI conference posts its keynote speakers", "noise": true}], "Politics": [{"text": "Legislature opens session with procedural votes", "noise": true}, {"text": "Governor signs bill renaming a state highway", "noise": true}, {"text": "Senator tours a manufacturing plant", "noise": true}, {"text": "County board debates parking rules", "noise": true}, {"text": "Mayor cuts ribbon on a new library", "noise": true}, {"text": "Lawmakers argue over the budget calendar", "noise": true}, {"text": "State election office posts candidate lists", "noise": true}, {"text": "Governor's schedule today: two ceremonial events", "noise": true}, {"text": "Congress takes a long weekend", "noise": true}, {"text": "City council approves road repaving", "noise": true}, {"text": "Poll: voters care most about local roads", "noise": true}, {"text": "Lieutenant governor speaks at chamber lunch", "noise": true}, {"text": "Bill to change the state bird fails on a voice vote", "noise": true}, {"text": "Party leaders trade criticism; no action planned", "noise": true}, {"text": "Federal agency posts a routine meeting notice", "noise": true}, {"text": "Capitol cafeteria raises coffee prices", "noise": true}], "Tourism": [{"text": "Hotel occupancy about normal for the season", "noise": true}, {"text": "Airport reports an average passenger count", "noise": true}, {"text": "Mountain town farmers market returns", "noise": true}, {"text": "Tour bus company replaces two vehicles", "noise": true}, {"text": "Visitor center extends weekend hours", "noise": true}, {"text": "Scenic railway runs on schedule", "noise": true}, {"text": "Lodge reports its usual reservations", "noise": true}, {"text": "Rental car rates unchanged", "noise": true}, {"text": "Valley festival moves to a new date", "noise": true}, {"text": "Airline adds one weekend flight", "noise": true}, {"text": "Local museum opens a new exhibit", "noise": true}, {"text": "Tourism board redesigns its website", "noise": true}, {"text": "Trail guidebook gets a new edition", "noise": true}, {"text": "Hotel chain repaints its lobbies", "noise": true}, {"text": "Visitors keep asking about parking", "noise": true}, {"text": "Gift shop owner retires after 30 years", "noise": true}], "Analysts": [{"text": "Analyst repeats a hold rating and changes nothing", "noise": true}, {"text": "Report calls the sector fairly valued", "noise": true}, {"text": "Strategist says 'it depends'", "noise": true}, {"text": "Firm moves a price target up by one dollar", "noise": true}, {"text": "Analyst day scheduled for next quarter", "noise": true}, {"text": "Research note praises management's tone", "noise": true}, {"text": "Two analysts disagree on whether margins matter", "noise": true}, {"text": "Analyst drops coverage of a small company", "noise": true}, {"text": "Survey: most investors expect more of the same", "noise": true}, {"text": "Analyst notes the company's slide deck has new colors", "noise": true}, {"text": "Note says earnings should come in line", "noise": true}, {"text": "Forecasters call next quarter 'uncertain'", "noise": true}, {"text": "Brokerage upgrades one stock and downgrades another the same day", "noise": true}, {"text": "Analyst nudges a forecast by half a percent", "noise": true}, {"text": "Strategist offers three scenarios and picks none", "noise": true}, {"text": "Ratings agency affirms a mid-size firm's outlook", "noise": true}], "Deal": [{"text": "Trucking firm buys a repair shop", "noise": true}, {"text": "Software firm acquires a rival with ten employees", "noise": true}, {"text": "Two law firms merge", "noise": true}, {"text": "Bakery chain sold to its managers", "noise": true}, {"text": "Dental group buys two clinics", "noise": true}, {"text": "Company drops plan to buy a sign maker", "noise": true}, {"text": "Investor takes a 5% stake in a toy company", "noise": true}, {"text": "Buyout talks between two printing firms end without a deal", "noise": true}, {"text": "Hardware chain sells its paint brand", "noise": true}, {"text": "Two sandwich shops merge", "noise": true}, {"text": "Car wash operator raises debt", "noise": true}, {"text": "Staffing firm completes a purchase announced in spring", "noise": true}, {"text": "Minority stake in a fitness chain changes hands", "noise": true}, {"text": "Auction house sells a vintage pickup truck", "noise": true}, {"text": "Pet food maker agrees terms with its lender", "noise": true}, {"text": "Furniture maker hires an adviser to explore a sale", "noise": true}], "Weather": [{"text": "Clear skies and mild temperatures across the region", "noise": true}, {"text": "Light breeze; no storms in the forecast this week", "noise": true}, {"text": "Overnight lows near the seasonal average", "noise": true}, {"text": "Fog clears by mid-morning in the valley", "noise": true}, {"text": "Afternoon clouds; no rain expected", "noise": true}, {"text": "Weekend looks sunny", "noise": true}, {"text": "Wind advisory for one county; expires tonight", "noise": true}, {"text": "Humidity moderate; air quality good", "noise": true}, {"text": "Thunderstorms pass through the plains; no damage", "noise": true}, {"text": "Temperatures within two degrees of normal", "noise": true}, {"text": "Brief rain shower; dry again by noon", "noise": true}, {"text": "Sunrise at 6:41, the usual", "noise": true}, {"text": "Cool morning, warm afternoon", "noise": true}, {"text": "Pressure steady, skies partly cloudy", "noise": true}, {"text": "Dew on the grass at dawn across the region", "noise": true}, {"text": "Evening breeze picks up, then settles", "noise": true}]}};
