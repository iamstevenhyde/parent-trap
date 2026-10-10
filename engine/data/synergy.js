// Extracted programmatically from the spec JSON block by a script, not retyped. Do not edit numbers here; change config.js instead.
export const SYNERGY_MATRIX = {
 "ranching": {
  "ranching": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "grocery": {
   "pct": 1,
   "asset": "customers (surface only)",
   "note": "Looks related, near zero; +14 only after a $30M integration project builds the beef supply chain"
  },
  "cannabis": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "ski": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "energy": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "AI": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  }
 },
 "grocery": {
  "ranching": {
   "pct": 1,
   "asset": "customers (surface only)",
   "note": "Looks related, near zero; +14 only after a $30M integration project builds the beef supply chain"
  },
  "grocery": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "cannabis": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "ski": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "energy": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "AI": {
   "pct": 5,
   "asset": "data, customers",
   "note": "Loyalty data improves pricing and stock"
  }
 },
 "cannabis": {
  "ranching": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "grocery": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "cannabis": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "ski": {
   "pct": -12,
   "asset": "brand, regulator",
   "note": "Resort brand and permits conflict with cannabis"
  },
  "energy": {
   "pct": 8,
   "asset": "power",
   "note": "Cheap, firm power lowers grow cost"
  },
  "AI": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  }
 },
 "ski": {
  "ranching": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "grocery": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "cannabis": {
   "pct": -12,
   "asset": "brand, regulator",
   "note": "Resort brand and permits conflict with cannabis"
  },
  "ski": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "energy": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "AI": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  }
 },
 "energy": {
  "ranching": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "grocery": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "cannabis": {
   "pct": 8,
   "asset": "power",
   "note": "Cheap, firm power lowers grow cost"
  },
  "ski": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "energy": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "AI": {
   "pct": 14,
   "asset": "power",
   "note": "Firm power is the data-center bottleneck; the strongest settled pair"
  }
 },
 "AI": {
  "ranching": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "grocery": {
   "pct": 5,
   "asset": "data, customers",
   "note": "Loyalty data improves pricing and stock"
  },
  "cannabis": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "ski": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  },
  "energy": {
   "pct": 14,
   "asset": "power",
   "note": "Firm power is the data-center bottleneck; the strongest settled pair"
  },
  "AI": {
   "pct": 0,
   "asset": "none",
   "note": "No shared asset"
  }
 }
};

export const INDUSTRIES = ["ranching", "grocery", "cannabis", "ski", "energy", "AI"];

export const RANCH_GROCERY_INTEGRATED_PCT = 14;
export const INTEGRATION_COST_MUSD = 30;
