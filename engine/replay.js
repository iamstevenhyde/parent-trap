// Export the whole game as plain JSON for the projector replay and the debrief.
// Every decision (with the why sentence and predicted value), every event, and a snapshot after each round.

import { score, leaderboard } from './scoring.js';
import { evOf } from './core.js';

export function exportLog(state) {
  const ids = [...state.teamIds, ...state.botIds];
  const final = ids.map(id => score(state, id));
  const board = leaderboard(state, { includeBots: true });
  const check = final.every(r => Math.abs(r.residual) <= 1) && board.every(b => Math.abs(b.ev - final.find(f => f.team === b.team).ev) < 1e-9);
  return {
    game: 'the-parent-trap', version: 1, seed: state.seed, teamCount: state.teamCount, round: state.round, phase: state.phase,
    teams: ids.map(id => ({ id, name: state.teams[id].name, isBot: state.teams[id].isBot, startingEV: state.teams[id].ev1, capabilities: { ...state.teams[id].capabilities }, receivership: state.teams[id].receivership })),
    schedule: state.schedule.chains.map(c => ({ ...c })), scheduleAttempts: state.schedule.attempts,
    decisions: state.log.map(l => ({ ...l, predictedAtLock: l.predicted, actualEVAfter: state.snapshots[l.round] ? state.snapshots[l.round].teams[l.team].ev : null })),
    auctions: state.auctions, events: state.events, snapshots: state.snapshots,
    final, leaderboard: board.map(b => ({ team: b.team, ev: b.ev, rankEV: b.rankEV, rankPA: b.rankPA, parentingAdvantage: b.parentingAdvantage })),
    scoreCheck: { allDecompositionsSum: check, tolerance: 1 },
    evNow: Object.fromEntries(ids.map(id => [id, evOf(state, id)])),
  };
}
