import { CARDS, KINGDOM_SET, BASE_TREASURE, BASE_VICTORY } from './cards';
import type {
  CardId, GameState, PlayerState, Action, PromptChoice,
} from './types';

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface DrawResult { drawn: CardId[]; deck: CardId[]; discard: CardId[] }

function drawFrom(deck: CardId[], discard: CardId[], n: number): DrawResult {
  let d = [...deck], disc = [...discard], drawn: CardId[] = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break;
      d = shuffle(disc);
      disc = [];
    }
    drawn.push(d.shift()!);
  }
  return { drawn, deck: d, discard: disc };
}

function initialDeck(): CardId[] {
  const d: CardId[] = [];
  for (let i = 0; i < 7; i++) d.push('local_shoot');
  for (let i = 0; i < 3; i++) d.push('brand');
  return shuffle(d);
}

function makePlayer(name: string, isBot: boolean): PlayerState {
  const deck = initialDeck();
  const { drawn, deck: rest } = drawFrom(deck, [], 5);
  return {
    name, isBot,
    deck: rest, hand: drawn, discard: [], inPlay: [],
    actions: 1, buys: 1, coins: 0,
    merchantTriggers: 0, silverPlayedThisTurn: false,
  };
}

function initialSupply(): Record<CardId, number> {
  const s = {} as Record<CardId, number>;
  s.local_shoot = 46; // 60 minus 14 in starting decks
  s.commercial = 40;
  s.corporate = 40;
  s.brand = 8;
  s.presence = 8;
  s.leader = 8;
  s.bad_review = 10;
  KINGDOM_SET.forEach(id => { s[id] = 10; });
  return s;
}

function addLog(state: GameState, msg: string): void {
  state.log = [...state.log.slice(-30), msg];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function initialState(p0name: string, p1name: string): GameState {
  return {
    supply: initialSupply(),
    players: [makePlayer(p0name, false), makePlayer(p1name, false)],
    currentPlayer: 0,
    phase: 'action',
    trash: [],
    log: [`Welcome to Dronedom. ${p0name}'s week begins.`],
    gameOver: false,
    pendingPrompt: null,
    turnNumber: 1,
  };
}

export function tallyVP(player: PlayerState): number {
  const all = [...player.deck, ...player.hand, ...player.discard, ...player.inPlay];
  return all.reduce((sum, c) => sum + (CARDS[c].vp || 0), 0);
}

function checkGameEnd(state: GameState): GameState {
  if (state.gameOver) return state;
  if (state.supply.leader === 0) {
    addLog(state, 'GAME OVER: Industry Leader pile is empty.');
    state.gameOver = true;
    return state;
  }
  const emptyPiles = Object.values(state.supply).filter(c => c === 0).length;
  if (emptyPiles >= 3) {
    addLog(state, 'GAME OVER: Three supply piles are exhausted.');
    state.gameOver = true;
  }
  return state;
}

export function isLegal(state: GameState, playerIdx: 0 | 1, action: Action): boolean {
  if (state.gameOver) return false;
  if (state.currentPlayer !== playerIdx) return false;

  const p = state.players[playerIdx];
  const prompt = state.pendingPrompt;

  if (prompt !== null && prompt.for === playerIdx) {
    return action.kind === 'promptResponse';
  }

  switch (action.kind) {
    case 'playCard': {
      if (state.phase !== 'action') return false;
      if (p.actions < 1) return false;
      if (!p.hand.includes(action.cardId)) return false;
      const card = CARDS[action.cardId];
      return card.type === 'Operation' || card.type === 'Op-Attack';
    }
    case 'playAllTreasures':
      return state.phase === 'buy';
    case 'buyCard': {
      if (state.phase !== 'buy') return false;
      if (p.buys < 1) return false;
      if ((state.supply[action.cardId] ?? 0) === 0) return false;
      return p.coins >= CARDS[action.cardId].cost;
    }
    case 'endTurn':
      return prompt === null;
    case 'advancePhase':
      return state.phase === 'action';
    case 'promptResponse':
      return prompt !== null && prompt.for === playerIdx;
    default:
      return false;
  }
}

export function applyAction(state: GameState, playerIdx: 0 | 1, action: Action): GameState {
  const s = deepClone(state);
  switch (action.kind) {
    case 'playCard':        return checkGameEnd(resolvePlayCard(s, playerIdx, action.cardId));
    case 'playAllTreasures': return checkGameEnd(resolvePlayAllTreasures(s, playerIdx));
    case 'buyCard':         return checkGameEnd(resolveBuy(s, playerIdx, action.cardId));
    case 'endTurn':         return checkGameEnd(resolveEndTurn(s, playerIdx));
    case 'advancePhase':    s.phase = 'buy'; return s;
    case 'promptResponse':  return checkGameEnd(resolvePrompt(s, playerIdx, action.choice));
    default:                return s;
  }
}

// ── Card play ─────────────────────────────────────────────────────────────────

function resolvePlayCard(s: GameState, idx: 0 | 1, cardId: CardId): GameState {
  const p = s.players[idx];
  const card = CARDS[cardId];
  const e = card.effect ?? {};

  // Remove only first occurrence (hand may have duplicates)
  const firstIdx = p.hand.indexOf(cardId);
  if (firstIdx !== -1) p.hand.splice(firstIdx, 1);
  p.inPlay = [...p.inPlay, cardId];
  p.actions -= 1;
  addLog(s, `${p.name} plays ${card.name}.`);

  if (e.cards) {
    const r = drawFrom(p.deck, p.discard, e.cards);
    p.hand = [...p.hand, ...r.drawn];
    p.deck = r.deck; p.discard = r.discard;
  }
  if (e.actions) p.actions += e.actions;
  if (e.buys)    p.buys    += e.buys;
  if (e.coins)   p.coins   += e.coins;
  if (e.merchant) p.merchantTriggers += 1;

  if (e.customDiscard) {
    s.pendingPrompt = { for: idx, kind: 'discardAny', from: 'hand', min: 0, max: p.hand.length };
  } else if (e.gainUpTo) {
    s.pendingPrompt = { for: idx, kind: 'chooseCardToGain', maxCost: e.gainUpTo };
  } else if (e.remodel) {
    s.pendingPrompt = { for: idx, kind: 'chooseCardToTrash', from: 'hand', plus: e.remodel };
  } else if (e.upsell) {
    s.pendingPrompt = { for: idx, kind: 'chooseCardToTrash', from: 'hand', filter: 'Revenue', plus: e.upsell };
  } else if (e.attack === 'discard_to_3') {
    const victimIdx = (1 - idx) as 0 | 1;
    const victim = s.players[victimIdx];
    if (victim.hand.length > 3) {
      if (victim.isBot) {
        // resolve inline for bot victim
        const toDiscard = victim.hand.length - 3;
        const sorted = victim.hand
          .map((id, i) => ({ id, i, cost: CARDS[id].cost }))
          .sort((a, b) => a.cost - b.cost);
        const drop = new Set(sorted.slice(0, toDiscard).map(x => x.i));
        victim.discard = [...victim.discard, ...victim.hand.filter((_, i) => drop.has(i))];
        victim.hand = victim.hand.filter((_, i) => !drop.has(i));
        addLog(s, `${victim.name} discards ${toDiscard} card(s) from Price War.`);
      } else {
        // human must respond
        s.pendingPrompt = {
          for: victimIdx,
          kind: 'discardAny',
          from: 'hand',
          min: victim.hand.length - 3,
          max: victim.hand.length - 3,
        };
        addLog(s, `${victim.name} must discard down to 3 cards.`);
      }
    }
  }

  return s;
}

function resolvePlayAllTreasures(s: GameState, idx: 0 | 1): GameState {
  const p = s.players[idx];
  const treasures = p.hand.filter(id => (CARDS[id].value ?? 0) > 0);
  if (treasures.length === 0) return s;

  let bonus = 0;
  let silverPlayed = p.silverPlayedThisTurn;
  const mt = p.merchantTriggers;

  for (const id of treasures) {
    if (id === 'commercial' && !silverPlayed && mt > 0) {
      bonus += mt;
      silverPlayed = true;
    }
  }

  const earned = treasures.reduce((sum, id) => sum + CARDS[id].value, 0) + bonus;
  p.hand = p.hand.filter(id => (CARDS[id].value ?? 0) === 0);
  p.inPlay = [...p.inPlay, ...treasures];
  p.coins += earned;
  p.silverPlayedThisTurn = silverPlayed;
  addLog(s, `${p.name} plays ${treasures.length} revenue card(s) (+$${earned}).`);
  return s;
}

function resolveBuy(s: GameState, idx: 0 | 1, cardId: CardId): GameState {
  const p = s.players[idx];

  // Auto-play remaining treasures if any in hand
  if (p.hand.some(id => (CARDS[id].value ?? 0) > 0)) {
    resolvePlayAllTreasures(s, idx);
  }

  p.coins -= CARDS[cardId].cost;
  p.buys  -= 1;
  p.discard = [...p.discard, cardId];
  s.supply[cardId] -= 1;
  addLog(s, `${p.name} buys ${CARDS[cardId].name}.`);
  return s;
}

function resolveEndTurn(s: GameState, idx: 0 | 1): GameState {
  const p = s.players[idx];
  const newDiscard = [...p.discard, ...p.hand, ...p.inPlay];
  const r = drawFrom(p.deck, newDiscard, 5);
  s.players[idx] = {
    ...p,
    hand: r.drawn, deck: r.deck, discard: r.discard, inPlay: [],
    actions: 1, buys: 1, coins: 0,
    merchantTriggers: 0, silverPlayedThisTurn: false,
  };

  const nextPlayer = (1 - idx) as 0 | 1;
  s.currentPlayer = nextPlayer;
  s.phase = 'action';
  s.turnNumber += 1;

  const nextName = s.players[nextPlayer].name;
  addLog(s, `--- ${nextName}'s turn ---`);
  return s;
}

// ── Prompt resolution ─────────────────────────────────────────────────────────

function resolvePrompt(s: GameState, idx: 0 | 1, choice: PromptChoice): GameState {
  const prompt = s.pendingPrompt;
  if (!prompt || prompt.for !== idx) return s;
  const p = s.players[idx];

  switch (choice.kind) {
    case 'discardAny': {
      const ids = [...choice.cardIds]; // snapshot before any mutation
      const count = ids.length;
      p.discard = [...p.discard, ...ids];
      // Remove each card from hand once (handles duplicates correctly)
      const remaining = [...ids];
      p.hand = p.hand.filter(id => {
        const i = remaining.indexOf(id);
        if (i !== -1) { remaining.splice(i, 1); return false; }
        return true;
      });

      // discardAny from triage: draw replacement cards equal to discard count
      if (prompt.kind === 'discardAny' && count > 0) {
        const r = drawFrom(p.deck, p.discard, count);
        p.hand = [...p.hand, ...r.drawn];
        p.deck = r.deck; p.discard = r.discard;
        addLog(s, `${p.name} discards ${count} card(s) and redraws.`);
      } else {
        addLog(s, `${p.name} discards ${count} card(s).`);
      }
      s.pendingPrompt = null;
      break;
    }

    case 'chooseCardToTrash': {
      if (prompt.kind !== 'chooseCardToTrash') break;
      const cardId = choice.cardId;
      const trashedCost = CARDS[cardId].cost;
      const handIdx = p.hand.indexOf(cardId);
      if (handIdx === -1) break;
      p.hand.splice(handIdx, 1);
      s.trash = [...s.trash, cardId];
      addLog(s, `${p.name} trashes ${CARDS[cardId].name}.`);

      if (prompt.filter === 'Revenue' && CARDS[cardId].type !== 'Revenue') {
        addLog(s, "(That wasn't a Revenue card — Client Upsell fizzles.)");
        s.pendingPrompt = null;
      } else {
        const gainToHand = prompt.filter === 'Revenue';
        s.pendingPrompt = {
          for: idx,
          kind: 'chooseCardToGain',
          maxCost: trashedCost + prompt.plus,
          filter: gainToHand ? 'Revenue' : undefined,
          toHand: gainToHand,
        };
      }
      break;
    }

    case 'chooseCardToGain': {
      if (prompt.kind !== 'chooseCardToGain') break;
      const cardId = choice.cardId;
      if (CARDS[cardId].cost > prompt.maxCost) break;
      if ((s.supply[cardId] ?? 0) === 0) break;
      if (prompt.filter && CARDS[cardId].type !== prompt.filter) break;
      s.supply[cardId] -= 1;
      if (prompt.toHand) {
        p.hand = [...p.hand, cardId];
      } else {
        p.discard = [...p.discard, cardId];
      }
      addLog(s, `${p.name} gains ${CARDS[cardId].name}.`);
      s.pendingPrompt = null;
      break;
    }

    case 'cancelPrompt': {
      if (prompt.kind === 'chooseCardToGain') {
        addLog(s, `${p.name} skips the gain.`);
      }
      s.pendingPrompt = null;
      break;
    }
  }

  return s;
}

// ── Bot turn ──────────────────────────────────────────────────────────────────

export function botTurn(state: GameState): GameState {
  const s = deepClone(state);
  runBotActionPhase(s);
  runBotBuyPhase(s);
  resolveEndTurn(s, 1);
  return checkGameEnd(s);
}

function runBotActionPhase(s: GameState): void {
  const b = s.players[1];
  let safety = 15;

  while (b.actions > 0 && safety-- > 0) {
    const actionIdx = b.hand.findIndex(id => {
      const t = CARDS[id].type;
      return t === 'Operation' || t === 'Op-Attack';
    });
    if (actionIdx === -1) break;

    const cardId = b.hand[actionIdx];
    b.hand.splice(actionIdx, 1);
    b.inPlay = [...b.inPlay, cardId];
    b.actions -= 1;
    addLog(s, `${b.name} plays ${CARDS[cardId].name}.`);

    const e = CARDS[cardId].effect ?? {};
    if (e.cards) {
      const r = drawFrom(b.deck, b.discard, e.cards);
      b.hand = [...b.hand, ...r.drawn]; b.deck = r.deck; b.discard = r.discard;
    }
    if (e.actions) b.actions += e.actions;
    if (e.buys)    b.buys    += e.buys;
    if (e.coins)   b.coins   += e.coins;
    if (e.merchant) b.merchantTriggers += 1;

    if (e.attack === 'discard_to_3') {
      const human = s.players[0];
      if (human.hand.length > 3) {
        const toDiscard = human.hand.length - 3;
        const sorted = human.hand
          .map((id, i) => ({ id, i, cost: CARDS[id].cost }))
          .sort((a, b) => a.cost - b.cost);
        const drop = new Set(sorted.slice(0, toDiscard).map(x => x.i));
        human.discard = [...human.discard, ...human.hand.filter((_, i) => drop.has(i))];
        human.hand = human.hand.filter((_, i) => !drop.has(i));
        addLog(s, `You discard ${toDiscard} card(s) from ${b.name}'s Price War.`);
      }
    }

    if (e.customDiscard) {
      // Bot discards cheapest cards, keeps best
      const toDiscard = Math.floor(b.hand.length / 2);
      const sorted = b.hand
        .map((id, i) => ({ id, i, cost: CARDS[id].cost }))
        .sort((a, b) => a.cost - b.cost);
      const discardIds = sorted.slice(0, toDiscard).map(x => x.id);
      const keepIdx = new Set(sorted.slice(toDiscard).map(x => x.i));
      b.discard = [...b.discard, ...discardIds];
      b.hand = b.hand.filter((_, i) => keepIdx.has(i));
      if (discardIds.length > 0) {
        const r = drawFrom(b.deck, b.discard, discardIds.length);
        b.hand = [...b.hand, ...r.drawn]; b.deck = r.deck; b.discard = r.discard;
        addLog(s, `${b.name} discards ${discardIds.length} and redraws.`);
      }
    } else if (e.gainUpTo) {
      botGain(s, 1, e.gainUpTo, undefined, false);
    } else if (e.remodel) {
      botTrashAndGain(s, 1, e.remodel, undefined, false);
    } else if (e.upsell) {
      botTrashAndGain(s, 1, e.upsell, 'Revenue', true);
    }
  }
}

function botGain(s: GameState, idx: 0 | 1, maxCost: number, filter: string | undefined, toHand: boolean): void {
  const b = s.players[idx];
  const priority: CardId[] = ['leader', 'corporate', 'presence', 'leadgen', 'upsell', 'sprint', 'coworking', 'commercial', 'salesrep', 'triage', 'brand', 'insurance', 'booking', 'upgrade', 'local_shoot'];
  for (const cid of priority) {
    if (CARDS[cid].cost > maxCost) continue;
    if ((s.supply[cid] ?? 0) === 0) continue;
    if (filter && CARDS[cid].type !== filter) continue;
    s.supply[cid] -= 1;
    if (toHand) b.hand = [...b.hand, cid];
    else b.discard = [...b.discard, cid];
    addLog(s, `${b.name} gains ${CARDS[cid].name}.`);
    return;
  }
}

function botTrashAndGain(s: GameState, idx: 0 | 1, plus: number, filter: string | undefined, toHand: boolean): void {
  const b = s.players[idx];
  const candidates = filter
    ? b.hand.filter(id => CARDS[id].type === filter)
    : b.hand;
  if (candidates.length === 0) return;
  // Trash cheapest matching card
  const toTrash = [...candidates].sort((a, b) => CARDS[a].cost - CARDS[b].cost)[0];
  const trashedCost = CARDS[toTrash].cost;
  b.hand = b.hand.filter(id => id !== toTrash);
  s.trash = [...s.trash, toTrash];
  addLog(s, `${b.name} trashes ${CARDS[toTrash].name}.`);
  botGain(s, idx, trashedCost + plus, filter, toHand);
}

function runBotBuyPhase(s: GameState): void {
  const b = s.players[1];

  // Play all treasures
  const treasures = b.hand.filter(id => (CARDS[id].value ?? 0) > 0);
  let bonus = 0;
  let silverPlayed = b.silverPlayedThisTurn;
  for (const id of treasures) {
    if (id === 'commercial' && !silverPlayed && b.merchantTriggers > 0) {
      bonus += b.merchantTriggers;
      silverPlayed = true;
    }
  }
  b.coins += treasures.reduce((sum, id) => sum + CARDS[id].value, 0) + bonus;
  b.inPlay = [...b.inPlay, ...treasures];
  b.hand = b.hand.filter(id => (CARDS[id].value ?? 0) === 0);

  const buyPriority: CardId[] = ['leader', 'corporate', 'presence', 'leadgen', 'upsell', 'sprint', 'coworking', 'commercial', 'salesrep', 'triage'];
  while (b.buys > 0) {
    let bought = false;
    for (const cid of buyPriority) {
      if ((s.supply[cid] ?? 0) === 0) continue;
      if (b.coins < CARDS[cid].cost) continue;
      // Don't buy VP too early
      const totalCards = b.deck.length + b.discard.length + b.hand.length + b.inPlay.length;
      if ((cid === 'brand' || cid === 'presence') && totalCards < 12) continue;
      b.coins -= CARDS[cid].cost;
      b.discard = [...b.discard, cid];
      s.supply[cid] -= 1;
      b.buys -= 1;
      addLog(s, `${b.name} buys ${CARDS[cid].name}.`);
      bought = true;
      break;
    }
    if (!bought) break;
  }
}

// ── Exports for CardId lists (used by frontend) ───────────────────────────────
export { KINGDOM_SET, BASE_TREASURE, BASE_VICTORY };
