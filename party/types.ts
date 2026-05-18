export type CardId =
  | 'local_shoot' | 'commercial' | 'corporate'
  | 'brand' | 'presence' | 'leader' | 'bad_review'
  | 'triage' | 'insurance' | 'coworking' | 'booking'
  | 'pricewar' | 'upgrade' | 'sprint' | 'upsell'
  | 'leadgen' | 'salesrep';

export type CardType = 'Revenue' | 'Brand' | 'Curse' | 'Operation' | 'Op-Attack';

export type Phase = 'action' | 'buy' | 'cleanup';

export interface PlayerState {
  name: string;
  isBot: boolean;
  deck: CardId[];
  hand: CardId[];
  discard: CardId[];
  inPlay: CardId[];
  actions: number;
  buys: number;
  coins: number;
  merchantTriggers: number;
  silverPlayedThisTurn: boolean;
}

export type PendingPrompt =
  | { for: 0 | 1; kind: 'discardAny'; from: 'hand'; min: number; max: number }
  | { for: 0 | 1; kind: 'chooseCardToTrash'; from: 'hand'; filter?: CardType; plus: number }
  | { for: 0 | 1; kind: 'chooseCardToGain'; maxCost: number; filter?: CardType; toHand?: boolean }
  | { for: 0 | 1; kind: 'reactToAttack'; attack: 'discard_to_3' };

export interface GameState {
  supply: Record<CardId, number>;
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  phase: Phase;
  trash: CardId[];
  log: string[];
  gameOver: boolean;
  pendingPrompt: PendingPrompt | null;
  turnNumber: number;
}

export interface YouView {
  name: string;
  hand: CardId[];
  deck: number;
  discard: CardId[];
  inPlay: CardId[];
  actions: number;
  buys: number;
  coins: number;
}

export interface OpponentView {
  name: string;
  handCount: number;
  deck: number;
  discard: CardId[];
  inPlay: CardId[];
}

export interface PlayerView {
  you: YouView;
  opponent: OpponentView;
  supply: Record<CardId, number>;
  phase: Phase;
  currentPlayerIdx: 0 | 1;
  isYourTurn: boolean;
  pendingPrompt: PendingPrompt | null;
  trash: CardId[];
  gameOver: boolean;
  turnNumber: number;
}

export type PromptChoice =
  | { kind: 'discardAny'; cardIds: CardId[] }
  | { kind: 'chooseCardToTrash'; cardId: CardId }
  | { kind: 'chooseCardToGain'; cardId: CardId }
  | { kind: 'cancelPrompt' };

export type Action =
  | { kind: 'playCard'; cardId: CardId }
  | { kind: 'playAllTreasures' }
  | { kind: 'buyCard'; cardId: CardId }
  | { kind: 'endTurn' }
  | { kind: 'advancePhase' }
  | { kind: 'promptResponse'; choice: PromptChoice };

export type ClientMsg =
  | { type: 'join'; name: string }
  | { type: 'action'; action: Action }
  | { type: 'ping' };

export type ServerMsg =
  | { type: 'lobby'; you: 0 | 1; opponentJoined: boolean }
  | { type: 'state'; view: PlayerView; log: string[] }
  | { type: 'error'; reason: string }
  | { type: 'gameOver'; scores: [number, number]; winner: 0 | 1 | 'tie' };
