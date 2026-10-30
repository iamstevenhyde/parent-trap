// Every tunable number for The Parent Trap engine lives here.
// Values start as the numbers in spec/04-bots-and-calibration.md (section A.0 and the rest).
// Any change made during calibration is recorded in README.md. Do not tune anywhere else.

export const CONFIG = {
  // value and growth
  PHI: 0.40,              // share of an earnings shock that sticks to base value (first 2 rounds of a chain)
  GROWTH: { steady: 0.03, cyclical: 0.02, lottery: 0.02 },   // spec drift by class, used when GROWTH_MODE is 'class'
  GROWTH_MODE: 'equalize',   // CALIBRATED (spec: 'class'). See README calibration log
  PREMIUM_ON: true, PREMIUM_SCALE: 1.0,   // CALIBRATED (spec: none). data/premium.js offsets each company's average shock edge
  INHERIT_LN_SCALE: 0.5,   // CALIBRATED (spec: 1). Shrinks the hidden truth gap of the 16 inherited units toward catalog (start spread cap)
  INHERIT_EQUALIZE: 1.0, INHERIT_EQ_RANGE: [0.75, 1.4],   // CALIBRATED (spec: off). Starting true EV equalized across seats
  TOTAL_RETURN: 0.07, GROWTH_MIN: 0.005, GROWTH_MAX: 0.07,
  S_CLASS: { steady: 0.07, cyclical: 0.12, lottery: 0.35 },
  THETA_CLAMP: [0.35, 2.0],
  THETA_FIXED: {          // hidden truth ratio for flagged lots (times exp(N(0, THETA_FIXED_SD)))
    R3: 1.30, G3: 1.25, A4: 1.40, C2: 0.70, C5: 0.65, A1: 0.60,
  },
  THETA_FIXED_SD: 0.05,
  THETA_FIXED_MIN_LN: 0.22,  // CALIBRATED (spec: 0). Gate E.6 asks for |ln theta| >= 0.22 on flagged lots in every seed
  E3_LOW: 0.30, E3_HIGH: 2.50, E3_P_LOW: 0.70,   // Kestrel lottery: usually 0.3x or 2.5x

  // shocks
  K_IND: { ranching: 0.5, grocery: 0.4, cannabis: 0.6, ski: 0.6, energy: 0.5, ai: 0.6 },
  M_CLAMP: [0.30, 2.00],
  SHOCK_SCALE: 1.0,        // 1 = spec. Scales every earnings multiplier's distance from 1.00
  CHAIN_COLUMN: {         // chains that use the roster's per-unit column (04 A.3)
    warm_winter: 'snow', grid_crunch: 'power_price', beef_shortage: 'beef_price',
    cannabis_reform: 'cannabis_banking', ai_compute_boom: 'ai_demand',
    ai_commoditization: 'ai_price_collapse', recession: 'recession',
    food_inflation_backlash: 'food_price_reg',
  },
  CHAINS_PER_GAME: 11,
  MAX_SCHEDULE_ATTEMPTS: 60,   // spec asks for 10; see README (acceptance is about 47 percent)
  RESOLVED_RANGE: [5, 8],

  // capital requests and insurance
  RHO_GROWTH: 1.5, RHO_DECAY: 0.9,   // CALIBRATED (spec 1.25 / 0.85)
  RHO_DEFEND: 0.85, RHO_LOCK: 0.90,
  // Skills (rules change 2026-10-29, batch 1). One Develop capability earns a skill outright; a team holds at most MAX_SKILLS. Every number below is CALIBRATED-1029: start values from the approved spec, to be tuned by the gates.
  MAX_SKILLS: 2, DEVCAP_LAST_ROUND: 4,   // Develop capability is blocked in round 5
  OPERATOR_RHO_MULT: 0.15,         // CALIBRATED-1029: Operator, capital put into businesses returns this much more (was +0.05 flat)
  OPERATOR_DOWN_SHARE: 0.5,        // CALIBRATED-1029: Operator, a Turnaround still works at this share of its gain when the whole industry is down
  ACQ_SIGMA_MULT: 0.5,             // CALIBRATED-1029: Acquirer, the error on every estimate of a company for sale is this share of normal (twice as tight)
  BUILDER_DELAY: 1, BUILDER_STRENGTH: 0.85,   // CALIBRATED-1029: Builder, a build arrives one round sooner (delay 1 instead of 2) at 85 percent strength instead of 70
  ALLY_DIV_MULT: 2, ALLY_REBATE: 0.20,   // CALIBRATED-1029: Alliance partner, the alliance dividend doubles and the holder gets back this share of its half of a won co-bid
  INT_RAMP_CAP: [1.0, 1.0],        // CALIBRATED-1029: Integrator, a fitting pair keeps all its synergy from the first round
  LEAN_KAPPA_MULT: 0.70,           // CALIBRATED-1029: Lean headquarters, complexity cost is this share of normal (cut by 30 percent)
  PORTFOLIO_SALE: 0.95,            // CALIBRATED-1029: Portfolio manager, a market sale returns this share of stand-alone value (85 percent without the skill)
  RISK_COST_MULT: 0.5, RISK_BLOCK: 0.75,   // CALIBRATED-1029: Risk manager, Protect costs half and blocks this share of the damage (50 percent without the skill)
  ANALYST_FREE_DEEP: 1,            // CALIBRATED-1029: Analyst, this many Deep dives each round use no attention

  // synergy and integration
  SYN_BASIS: 'value', SYN_YIELD: 0.04,   // CALIBRATED (spec: 'cash'). Synergy rate applies to value x 4%, not to each unit's own yield
  SYN_CAP: 35.0,   // CALIBRATED (spec 5.0)
  INT_COST_PCT: 0.03, INT_COST_MIN: 10,
  INT_REAL: 0.70, INT_REAL_CAP: 0.85,   // CAP = with Integrator I
  INT_RAMP: [0.5, 1.0],
  INT_COST_SAVE: 0.50,                  // CALIBRATED-1029 (was 0.20): Integrator cuts Integrate cost by this share
  RANCH_GROCERY_SIGMA: 0.14,
  SIGMA_CAP: 1.0,   // 1 = spec (no cap). Largest absolute pair synergy rate the engine will use

  // turnaround
  TURN_COST_PCT: 0.04, TURN_COST_PCT_OP: 0.03, TURN_COST_MIN: 8,
  TURN_GAIN: 0.12, TURN_GAIN_OP: 0.16,
  STRUGGLE_M: 0.92, STRUGGLE_V: 0.95, INDUSTRY_M: 0.92,

  // build and deals
  BUILD_COST: 0.60,
  BUILD_STRENGTH: 0.70, BUILD_STEP: 0.15, BUILD_DELAY: 2, BUILD_LAST_ORDER_ROUND: 3,
  DEAL_FEE: 0.015,
  COBID_CASH: 30, COBID_ATT: 1,   // alliance dividend (Steven, 2026-10-13; raised from 15 to 30 on 2026-10-29): each partner of a winning co-bid gets this much cash now and this many extra actions next round
  DEVCAP_COST: 20,   // CALIBRATED-1029 (was 10)
  SALE_MARKET: 0.85, SALE_FORCED: 0.80, LIST_FRACTIONS: [0.8, 1.0, 1.2],

  // cash, credit, receivership
  CASH0: 400, LINE: 200, LINE_RATE: 0.08, REC_LOAN: 100, REC_RATE: 0.10, IDLE_RATE: 0.0,
  RATES_UP: { chain: 'rates_up', LINE: 170, LINE_RATE: 0.10, IDLE_RATE: 0.02 },
  REPAY_KEEP: 50,
  ATT_PER_ROUND: 3,

  // complexity (04 A.5)
  KAPPA_A: 0.004, KAPPA_B: 0.015, KAPPA_C: 0.009, KAPPA_CAP: 0.08, OVERSIGHT_PER_UNIT: 0.9,
  RELATED_HOOK_MIN: 2,

  // signals
  SIGMA_SIGNAL: 0.20, SIGMA_DEEP: 0.0530,
  BOT_SIGMA: 0.15, BOT_CASH: 400,

  // listings
  ROUND1_LOTS: ['C2', 'C5', 'R3', 'G3', 'A4', 'S2', 'E1', 'E5', 'A3', 'E4'],   // reworked 2026-10-08 with the inheritance table
  SCARCE: ['S2', 'S3', 'E1'],
  LOTS_R2: 3, LOTS_R3: 3, LOTS_R4_MAX: 5,   // round 5 has no auction lots (Steven, 2026-10-12 evening): it only shows what other teams listed in round 4
  // Later-round lot counts (rules change 2026-10-29): the base counts above are the most a round lists. Rounds 3 and 4 list fewer when the tables hold little cash. See engine.js lotCount.
  LOT_CASH_FRAC: 0.12, LOT_MIN: 2,   // CALIBRATED-1029: lots = total cash x this share / average listed value of the candidate lots, between LOT_MIN and the base count
  LIST_LAST_ROUND: 4,   // listings for other teams open rounds 2 to 4 (a listing shows one round later, so the last one is bought in round 5)
  // AI price floor (2026-10-12 evening): an AI seat steps in on an auction lot whose price sits well below that seat's own estimate
  AI_FLOOR: true, FLOOR_TRIGGER: 0.97, FLOOR_MAX_SHARE: 1.00, FLOOR_BID_SHARE: 0.95, FLOOR_KEEP: 100, FLOOR_FROM_TICK: 6, FLOOR_MAX_LEADS: 4, BOT_MAX_WINS_LIVE: 4, FLOOR_BOT_CASH: 400,   // live games with the floor: AI seats start with the same cash as students (was 800 until 10/29)

  // counterfactual
  CF_SEED_CASH: 0,

  // bots (04 B)
  B1_AI_MULT: 1.30, B1_OTHER_MULT: 0.90, B2_MULT: 0.85, B4_CANNABIS_MULT: 1.10, B4_OTHER_MULT: 0.80,
  BOT_MIN_BID_SHARE: 0.60, BOT_MAX_BID_SHARE: 1.60,

  ARCH_OVERSIGHT: true,   // CALIBRATED (spec: off). Archetypes spend spare attention on pair Deep dives so they do not pay avoidable unfunded-oversight cost

  // archetype shading
  FOCUSED_BID: 0.85, RELATED_BID: 0.90, UNRELATED_BID: 0.90, ACQUIRER_BID: 1.00, REF_BID: 0.90,
};

// The numbers exactly as written in spec/04 (and 01), for auditing the first measured values.
// Use: node test/gates.mjs --spec
export const SPEC_OVERRIDES = {
  GROWTH_MODE: 'class', PREMIUM_ON: false, INHERIT_EQUALIZE: 0, INHERIT_LN_SCALE: 1, THETA_FIXED_MIN_LN: 0,
  S_CLASS: { steady: 0.07, cyclical: 0.12, lottery: 0.35 }, RHO_GROWTH: 1.25, RHO_DECAY: 0.85, SYN_BASIS: 'cash', SYN_CAP: 5.0,
  BUILD_COST: 0.60, INT_COST_PCT: 0.03, ARCH_OVERSIGHT: false, SIGMA_SIGNAL: 0.15, KAPPA_A: 0.004, KAPPA_B: 0.015, KAPPA_C: 0.0075,
};
