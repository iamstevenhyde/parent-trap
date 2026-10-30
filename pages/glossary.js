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
  cobid: ['Co-bid (alliance)', 'Two teams with players bid together on one company. One team invites the other and the bid only counts once the other joins. Each team then pays half the price (plus its own deal fee) and owns half the company and half its value. It ends when the market closes; there is no joint venture after that. A company two teams share cannot be Integrated, given a Turnaround or sold by either team alone, and its capital request only goes through if both teams pick the same option. Compare your estimates before you join. When a joint bid wins, each partner also gets an alliance dividend of $15M in cash and one extra action in the next round.'],
  capability: ['Capability', 'A skill your company earns by doing the same kind of move well twice.'],
  catalog: ['Listed value', 'The public price tag. Everyone sees the same number. It is not always the truth.'],
  signal: ['Your team\'s estimate', 'A range for the company\'s true value. The real value is usually inside it but can fall outside. Each team gets its own range. Listed value and the seller\'s claim are public and may be off. A deep dive narrows the range.'],
  integrate: ['Integrate', 'Make two of your businesses work together. It pays off only if they truly share something, and most pairs do not, so a Deep dive comes first.'],
  turnaround: ['Turnaround', 'Step in and fix a struggling business. It works when the problem is the business, not the whole industry.'],
  deepdive: ['Deep dive', 'Spend 1 attention to learn whether two of your businesses fit (most do not), or to see the true value of a company for sale. The answer shows in the Deep dive results box in Corporate actions.'],
  parenting: ['Parenting advantage', 'How much more your businesses were worth under your ownership than they would have been on their own, through the same events.'],
  inherited: ['Inherited businesses', 'The value of the businesses you started with, and how they would have done anyway.'],
  allocation: ['Capital allocation returns', 'What you gained or lost by choosing where to put your cash each round.'],
  mna: ['Buying and selling companies', 'Price paid compared with real value. Overpaying shows up here as a loss.'],
  skills: ['Skills you earned', 'Value from capabilities you earned by doing the same kind of move well twice.'],
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

// What each capability gives once it is earned (two uses). Numbers come from engine/config.js: DEAL_FEE 1.5%, BUILD_COST 60% vs BUILD_COST_ACQ 55%, INT_COST_SAVE 20%, INT_REAL 70% vs INT_REAL_CAP 85%,
// TURN_COST_PCT 4% vs TURN_COST_PCT_OP 3%, TURN_GAIN 12% vs TURN_GAIN_OP 16%, SIGMA_DEEP 5.3% vs SIGMA_DEEP_ANALYST 4.2%.
export const CAP_TEXT = {
  acquirer: "You stop paying the 1.5% deal fee on purchases, and a build costs 55% of the company's value instead of 60%.",
  integrator: 'Integrate projects cost 20% less, and a project that works captures 85% of the promised synergy instead of 70%.',
  operator: "A Turnaround costs 3% of the business's value instead of 4%, and wins back 16% of its value instead of 12%.",
  analyst: 'Your Deep dives are sharper: the error in your estimate shrinks from about 5.3% to 4.2%.',
};
