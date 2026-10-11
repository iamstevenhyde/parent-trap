// What a player should do right now, in plain words (Steven's ask 4, 2026-10-09: make the order of choices obvious).
// DOM-free so the team page and the headless class simulation use the same function and the sim can test it.

export const STEPS = [
  { n: 1, key: 'market', label: 'Bid in the market' },
  { n: 2, key: 'run', label: 'Run your businesses' },
  { n: 3, key: 'lock', label: 'Lock in' },
];

// input: { phase, round, live, hasMarket, role, locked, ledCount, wonCount, lockedCount, seatedTeams, requireWhy, names }
// Since 2026-10-10 (Steven's asks 1, 4 and 10) there is no news step, no roles and no sequence: the market, the businesses and the lock are all open
// from the start of the round to its end, so this is a short reminder of what is open, not a set of steps. The steps in STEPS are a checklist.
// output: { step (0 = none lit), done: [step numbers finished], title, text, mine }
export function flowFor(f) {
  const done = [];
  const mkt = f.hasMarket;
  switch (f.phase) {
    case 'lobby':
      return { step: 0, done, title: 'Waiting to start', text: 'Your instructor starts the game when every team has joined.', mine: false };
    case 'news':   // only a game started before this change can be here
    case 'market':
    case 'decide': {
      if (f.locked) { done.push(1, 2, 3); return { step: 0, done, title: 'Locked in', text: 'Your plan is locked. Waiting for the other teams (' + f.lockedCount + ' of ' + f.seatedTeams + ' locked).', mine: false }; }
      const lead = mkt ? (f.ledCount ? ' You lead on ' + f.ledCount + ' ' + (f.ledCount === 1 ? 'company' : 'companies') + ' right now.' : ' You do not lead on anything yet.') : '';
      return { step: 0, done, title: 'Round open', text: (mkt ? 'Everything is open until the round ends: bid in the market, pick a capital request for each business, choose corporate actions, then lock in.' + lead + ' You keep a company only if nobody beats your price when the market closes.' : 'Pick a capital request for each business, choose corporate actions' + (f.round === 1 ? ', bid on a company' : '') + ', then lock in.'), mine: true };
    }
    case 'resolving':
      return { step: 0, done: [1, 2, 3], title: 'Working it out', text: 'The engine is working out the round. This takes a few seconds.', mine: false };
    case 'results':
      return { step: 0, done: [1, 2, 3], title: 'Results', text: 'Read your round results. The next round starts when your instructor presses Advance.', mine: false };
    case 'final':
      return { step: 0, done: [1, 2, 3], title: 'Game over', text: 'Watch the big screen for the final standings and the replay.', mine: false };
    default:
      return { step: 0, done, title: '', text: '', mine: false };
  }
}

// The row patch a team writes to place one live bid. Shared by the team page and the simulation so they cannot drift apart.
export function liveBidPatch(market, lot, amount, t) {
  const m = market || {};
  return { market: { bids: m.bids || [], builds: m.builds || [], live: { ...(m.live || {}), [lot]: { amount: Number(amount), t } }, closed: false } };
}
