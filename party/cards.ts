import type { CardId, CardType } from './types';

export interface CardEffect {
  cards?: number;
  actions?: number;
  buys?: number;
  coins?: number;
  merchant?: boolean;
  customDiscard?: boolean;
  gainUpTo?: number;
  remodel?: number;
  upsell?: number;
  attack?: 'discard_to_3';
}

export interface CardDef {
  name: string;
  orig: string;
  type: CardType;
  cost: number;
  value: number;
  vp: number;
  color: string;
  text?: string;
  effect?: CardEffect;
}

export const CARDS: Record<CardId, CardDef> = {
  // BASE
  local_shoot:  { name: 'Local Shoot',           orig: 'Copper',   type: 'Revenue',   cost: 0, value: 1, vp: 0,  color: 'amber' },
  commercial:   { name: 'Commercial Contract',    orig: 'Silver',   type: 'Revenue',   cost: 3, value: 2, vp: 0,  color: 'slate' },
  corporate:    { name: 'Corporate Retainer',     orig: 'Gold',     type: 'Revenue',   cost: 6, value: 3, vp: 0,  color: 'yellow' },
  brand:        { name: 'Brand Recognition',      orig: 'Estate',   type: 'Brand',     cost: 2, value: 0, vp: 1,  color: 'green' },
  presence:     { name: 'Market Presence',        orig: 'Duchy',    type: 'Brand',     cost: 5, value: 0, vp: 3,  color: 'green' },
  leader:       { name: 'Industry Leader',        orig: 'Province', type: 'Brand',     cost: 8, value: 0, vp: 6,  color: 'green' },
  bad_review:   { name: 'Bad Review',             orig: 'Curse',    type: 'Curse',     cost: 0, value: 0, vp: -1, color: 'red' },
  // KINGDOM
  triage:    { name: 'Triage Inbox',       orig: 'Cellar',   type: 'Operation',  cost: 2, value: 0, vp: 0, color: 'blue',
               text: '+1 Op. Discard any number of cards. +1 Card per card discarded.',
               effect: { actions: 1, customDiscard: true } },
  insurance: { name: 'Liability Insurance', orig: 'Moat',    type: 'Operation',  cost: 2, value: 0, vp: 0, color: 'blue',
               text: '+2 Cards.',
               effect: { cards: 2 } },
  coworking: { name: 'Co-Working Space',   orig: 'Village',  type: 'Operation',  cost: 3, value: 0, vp: 0, color: 'blue',
               text: '+1 Card, +2 Ops.',
               effect: { cards: 1, actions: 2 } },
  booking:   { name: 'Quick Gig Booking',  orig: 'Workshop', type: 'Operation',  cost: 3, value: 0, vp: 0, color: 'blue',
               text: 'Gain a card costing up to $4.',
               effect: { gainUpTo: 4 } },
  pricewar:  { name: 'Price War',          orig: 'Militia',  type: 'Op-Attack',  cost: 4, value: 0, vp: 0, color: 'purple',
               text: '+$2. Each other player discards down to 3 cards.',
               effect: { coins: 2, attack: 'discard_to_3' } },
  upgrade:   { name: 'Equipment Upgrade',  orig: 'Remodel',  type: 'Operation',  cost: 4, value: 0, vp: 0, color: 'blue',
               text: 'Trash a card. Gain a card costing up to $2 more.',
               effect: { remodel: 2 } },
  sprint:    { name: 'Editing Sprint',     orig: 'Smithy',   type: 'Operation',  cost: 4, value: 0, vp: 0, color: 'blue',
               text: '+3 Cards.',
               effect: { cards: 3 } },
  upsell:    { name: 'Client Upsell',      orig: 'Mine',     type: 'Operation',  cost: 5, value: 0, vp: 0, color: 'blue',
               text: 'Trash a Revenue. Gain a Revenue to hand costing up to $3 more.',
               effect: { upsell: 3 } },
  leadgen:   { name: 'Lead Gen Platform',  orig: 'Market',   type: 'Operation',  cost: 5, value: 0, vp: 0, color: 'blue',
               text: '+1 Card, +1 Op, +1 Buy, +$1.',
               effect: { cards: 1, actions: 1, buys: 1, coins: 1 } },
  salesrep:  { name: 'Sales Rep',          orig: 'Merchant', type: 'Operation',  cost: 3, value: 0, vp: 0, color: 'blue',
               text: '+1 Card, +1 Op. First Commercial Contract played this turn gives +$1.',
               effect: { cards: 1, actions: 1, merchant: true } },
};

export const KINGDOM_SET: CardId[] = [
  'triage', 'insurance', 'coworking', 'booking', 'pricewar',
  'upgrade', 'sprint', 'upsell', 'leadgen', 'salesrep',
];

export const BASE_TREASURE: CardId[] = ['local_shoot', 'commercial', 'corporate'];
export const BASE_VICTORY: CardId[] = ['brand', 'presence', 'leader'];
