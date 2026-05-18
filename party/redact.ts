import type { GameState, PlayerView } from './types';

export function redactFor(state: GameState, slot: 0 | 1): PlayerView {
  const you = state.players[slot];
  const opp = state.players[1 - slot as 0 | 1];
  const prompt = state.pendingPrompt;

  return {
    you: {
      name: you.name,
      hand: you.hand,
      deck: you.deck.length,
      discard: you.discard,
      inPlay: you.inPlay,
      actions: you.actions,
      buys: you.buys,
      coins: you.coins,
    },
    opponent: {
      name: opp.name,
      handCount: opp.hand.length,
      deck: opp.deck.length,
      discard: opp.discard,
      inPlay: opp.inPlay,
    },
    supply: state.supply,
    phase: state.phase,
    currentPlayerIdx: state.currentPlayer,
    isYourTurn: state.currentPlayer === slot,
    pendingPrompt: prompt !== null && prompt.for === slot ? prompt : null,
    trash: state.trash,
    gameOver: state.gameOver,
    turnNumber: state.turnNumber,
  };
}
