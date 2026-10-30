// Glossary popovers (spec 05 section 1.10). Any element with class "gl" and data-term opens a popover on click.
// Bodies are kept to about 30 words, no jargon.
import { h } from './util.js';

export const GLOSSARY = {
  mw: ['MW', 'Megawatt, a measure of electric power. One MW runs about 750 homes.'],
  smr: ['SMR', 'Small modular reactor: a small nuclear plant built from factory pieces. It takes years to build and can power a data center or a town.'],
  '280e': ['280E', 'A US tax rule that stops cannabis companies from deducting normal business costs, so they pay far more tax. Banks avoid cannabis too.'],
  ev: ['Enterprise value', 'What your whole company is worth: your businesses at true value, plus cash, minus debt. It decides the Biggest parent prize.'],
  worth: ['Worth', 'What the market says this business is worth under your ownership right now.'],
  reserved: ['Held back', 'Money set aside this round. It includes interest and running costs that come due at the end of the round, plus anything you have bid, requested or ordered.'],
  free: ['Free to spend', 'Cash plus credit line, minus what is held back. It includes borrowed money from the credit line, which costs interest.'],
  creditline: ['Credit line', 'The most you can borrow. You pay 8% interest each round on what you have borrowed. The line can shrink and the interest can rise if interest rates go up in the news.'],
  attention: ['Attention', 'Your time as a holding company. Each corporate action costs 1. It resets every round and cannot be saved.'],
  synergy: ['Synergy', 'Two businesses worth more together than apart, because they truly share something, like a power supply or customers. Owning both is not enough. You have to join them up.'],
  anergy: ['Anergy', 'The opposite of synergy: two businesses that are worth less together than apart.'],
  winners_curse: ['Winner\'s curse', 'In a sealed auction the team with the highest guess wins, and the highest guess is usually too high. So the winner often pays more than the company is worth.'],
  complexity: ['Complexity cost', 'The price of running many different businesses. Each extra unrelated business takes more of your attention and costs a slice of your value every round.'],
  cobid: ['Co-bid (alliance)', 'Two teams with players bid together on one company. One team invites the other and the bid only counts once the other joins. Each team then pays half the price (plus its own deal fee) and owns half the company and half its value. It ends when the market closes; there is no joint venture after that. A company two teams share cannot be Integrated, given a Turnaround or sold by either team alone, and its capital request only goes through if both teams pick the same option. Compare your estimates before you join. When a joint bid wins, each partner also gets an alliance dividend of $30M in cash and one extra action in the next round.'],
  capability: ['Capability', 'A skill your company earns when you pay for Develop capability. A team can hold two skills.'],
  catalog: ['Listed value', 'The public price tag. Everyone sees the same number. It is not always the truth.'],
  signal: ['Your team\'s estimate', 'A range for the company\'s true value. The real value is usually inside it but can fall outside. Each team gets its own range. Listed value and the seller\'s claim are public and may be off. A deep dive narrows the range.'],
  integrate: ['Integrate', 'Make two of your businesses work together. It pays off only if they truly share something, and most pairs do not, so a Deep dive comes first.'],
  turnaround: ['Turnaround', 'Step in and fix a struggling business. It works when the problem is the business, not the whole industry.'],
  deepdive: ['Deep dive', 'Spend 1 attention to learn whether two of your businesses fit (most do not), or to see the true value of a company for sale. The answer shows in the Deep dive results box in Corporate actions.'],
  parenting: ['Parenting advantage', 'How much more your businesses were worth under your ownership than they would have been on their own, through the same events.'],
  inherited: ['Inherited businesses', 'The value of the businesses you started with, and how they would have done anyway.'],
  allocation: ['Capital allocation returns', 'What you gained or lost by choosing where to put your cash each round.'],
  mna: ['Buying and selling companies', 'Price paid compared with real value. Overpaying shows up here as a loss.'],
  skills: ['Skills you earned', 'Value from the skills you paid to develop, less what they cost.'],
  wasted: ['Attention wasted', 'Attention or money spent on moves that did nothing, like an Integrate on two businesses that share nothing.'],
  financing: ['Financing', 'Interest on the credit line, and the gain from fixing struggling businesses.'],
  meter: ['Cash meter', 'Shows what you can afford. Every bid, capital request and alliance share counts against it before you can lock.'],
  receivership: ['Receivership', 'Your debts were bigger than what selling a business could cover. You keep playing, with a loan that comes off your final score.'],
};

let pop = null;
function closePop() { if (pop) { pop.remove(); pop = null; } }

export function gl(key, label) {
  const g = GLOSSARY[key];
  return h('span.gl', { dataset: { term: key }, tabindex: 0, role: 'button' }, label || (g ? g[0] : key));
}
function openPop(target, key) {
  const g = GLOSSARY[key]; if (!g) return;
  closePop();
  const r = target.getBoundingClientRect();
  pop = h('div.popover', { role: 'tooltip', dataset: { for: key } }, h('b', g[0]), h('p', g[1]));
  document.body.append(pop);
  const w = pop.offsetWidth;
  pop.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
  pop.style.top = Math.max(8, Math.min(innerHeight - pop.offsetHeight - 8, r.bottom + 6)) + 'px';
}
export function installGlossary() {
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('.gl');
    if (t) {
      e.stopPropagation();
      if (pop && pop.dataset.for === t.dataset.term) closePop(); else openPop(t, t.dataset.term);
    } else closePop();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop(); });
}

// What each skill gives (rules change 2026-10-29). Numbers come from the CALIBRATED-1029 lines in engine/config.js; engine/core.js CAP_BENEFIT holds the same sentences for the results.
export const CAP_TEXT = {
  acquirer: 'No deal fee, and your estimate on every company for sale is twice as tight.',
  builder: 'A build arrives one round sooner and starts at 85% strength instead of 70%.',
  ally: 'You get back 20% of your half of a joint win, and the alliance dividend doubles.',
  integrator: 'Integrate costs half, and a pair that fits keeps all its synergy from the first round.',
  operator: 'Money you put into businesses returns 15% more, and a Turnaround still works at half strength when the whole industry is down.',
  analyst: 'One Deep dive each round uses no attention.',
  leanhq: 'The cost of running many businesses is 30% lower.',
  portfolio: 'A market sale pays 95% of value instead of 85%.',
  risk: 'Protect costs half and blocks 75% of the damage instead of 50%.',
};
