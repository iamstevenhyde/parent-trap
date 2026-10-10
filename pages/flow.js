// What a player should do right now, in plain words.
// DOM-free so the team page and the headless class simulation use the same function and the sim can test it.

import { can } from './roles.js';

export const STEPS = [
  { n: 1, key: 'news', label: 'Read the news' },
  { n: 2, key: 'market', label: 'Bid in the market' },
  { n: 3, key: 'run', label: 'Run your businesses' },
  { n: 4, key: 'lock', label: 'Lock in' },
];

// input: { phase, round, live, hasMarket, role, locked, ledCount, wonCount, lockedCount, seatedTeams, requireWhy, names: { deals, ceo, cfo, ops } }
// names are the seat names on this team that hold each job this round, so a player sees who to look to, not just a job title.
// output: { step (0 to 4, 0 = none lit), done: [step numbers finished], title, text, mine: true if this seat has something to do now }
export function flowFor(f) {
  const done = [];
  const isDeals = can(f.role, 'market'), isCfo = can(f.role, 'capital'), isOps = can(f.role, 'ops'), isCeo = can(f.role, 'lock');
  const mkt = f.hasMarket, nm = f.names || {};
  const who = (k, title) => (nm[k] ? title + ' (' + nm[k] + ')' : title);
  switch (f.phase) {
    case 'lobby':
      return { step: 0, done, title: 'Waiting to start', text: 'Your instructor starts the game when every team has joined.', mine: false };
    case 'news':
      return { step: 1, done, title: 'Step 1: read the news', text: 'Read the headlines. They tell you which industries are about to move. ' + (mkt ? 'The market opens next.' : 'Decisions open next.'), mine: true };
    case 'market': {
      done.push(1);
      if (isDeals) {
        const lead = f.ledCount ? ' You lead on ' + f.ledCount + ' ' + (f.ledCount === 1 ? 'company' : 'companies') + ' right now.' : ' You do not lead on anything yet.';
        return { step: 2, done, title: 'Step 2: bid in the market', text: 'Raise the price on any company you want, as many as you like. You keep a company only if nobody beats your price before the market closes.' + lead, mine: true };
      }
      return { step: 2, done, title: 'Step 2: the market is open', text: 'The ' + who('deals', 'Head of Deals') + ' is bidding for your team. Watch the prices, and use Suggest to leave them a one-line note.' + (f.ledCount ? ' Your team leads on ' + f.ledCount + '.' : ''), mine: false };
    }
    case 'decide': {
      done.push(1); if (mkt) done.push(2);
      if (f.locked) { done.push(3, 4); return { step: 0, done, title: 'Locked in', text: 'Your plan is locked. Waiting for the other teams (' + f.lockedCount + ' of ' + f.seatedTeams + ' locked).', mine: false }; }
      const won = mkt ? (f.wonCount ? 'You won ' + f.wonCount + (f.wonCount === 1 ? ' company' : ' companies') + ' in the market. ' : 'You won nothing in the market' + (f.round === 1 ? ', so you get one automatic build. ' : '. ')) : '';
      if (isCeo && !isCfo && !isOps) return { step: 4, done: [...done, 3], title: 'Step 4: lock in', text: won + 'When the ' + who('cfo', 'CFO') + ' and the ' + who('ops', 'Head of Operations') + ' are done, ' + (f.requireWhy ? 'write your one-sentence why and your predicted value, then ' : '') + 'press Lock in.', mine: true };
      if (isCfo && isOps) return { step: 3, done, title: 'Step 3: run your businesses', text: won + 'On each business card pick a capital request, then choose any corporate actions. The ' + who('ceo', 'CEO') + ' locks in when you are done.', mine: true };
      if (isCfo) return { step: 3, done, title: 'Step 3: run your businesses', text: won + 'On each business card pick one capital request or hold. Then tell the ' + who('ceo', 'CEO') + '.', mine: true };
      if (isOps) return { step: 3, done, title: 'Step 3: run your businesses', text: won + 'Choose Integrate, Turnaround or Develop a capability if they help. Then tell the ' + who('ceo', 'CEO') + '.', mine: true };
      if (isDeals && !isCeo) return { step: 3, done, title: 'Step 3: your market work is done', text: won + 'You can still sell a business from Corporate actions. Otherwise help your team decide and wait for the ' + who('ceo', 'CEO') + ' to lock in.', mine: false };
      return { step: 3, done, title: 'Step 3: run your businesses', text: won + 'Choose capital and actions, then lock in.', mine: true };
    }
    case 'resolving':
      return { step: 0, done: [1, 2, 3, 4], title: 'Working it out', text: 'The engine is working out the round. This takes a few seconds.', mine: false };
    case 'results':
      return { step: 0, done: [1, 2, 3, 4], title: 'Results', text: 'Read your round results. The next round starts when your instructor presses Advance.', mine: false };
    case 'final':
      return { step: 0, done: [1, 2, 3, 4], title: 'Game over', text: 'Watch the big screen for the final standings and the replay.', mine: false };
    default:
      return { step: 0, done, title: '', text: '', mine: false };
  }
}

// The row patch a team writes to place one live bid. Shared by the team page and the simulation so they cannot drift apart.
export function liveBidPatch(market, lot, amount, t) {
  const m = market || {};
  return { market: { bids: m.bids || [], builds: m.builds || [], live: { ...(m.live || {}), [lot]: { amount: Number(amount), t } }, closed: false } };
}
