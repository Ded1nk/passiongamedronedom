import React, { useState, useEffect, useMemo } from 'react';

// ============================================================
// CARD DATA — kingdom + base, matched to dronedom.json spec
// ============================================================
const CARDS = {
  // BASE
  local_shoot:        { name: "Local Shoot", orig: "Copper", type: "Revenue", cost: 0, value: 1, vp: 0, color: "amber" },
  commercial:         { name: "Commercial Contract", orig: "Silver", type: "Revenue", cost: 3, value: 2, vp: 0, color: "slate" },
  corporate:          { name: "Corporate Retainer", orig: "Gold", type: "Revenue", cost: 6, value: 3, vp: 0, color: "yellow" },
  brand:              { name: "Brand Recognition", orig: "Estate", type: "Brand", cost: 2, value: 0, vp: 1, color: "green" },
  presence:           { name: "Market Presence", orig: "Duchy", type: "Brand", cost: 5, value: 0, vp: 3, color: "green" },
  leader:             { name: "Industry Leader", orig: "Province", type: "Brand", cost: 8, value: 0, vp: 6, color: "green" },
  bad_review:         { name: "Bad Review", orig: "Curse", type: "Curse", cost: 0, value: 0, vp: -1, color: "red" },
  // KINGDOM — recommended first game set (10 cards)
  triage:             { name: "Triage Inbox", orig: "Cellar", type: "Operation", cost: 2,
                        text: "+1 Op. Discard any number of cards. +1 Card per card discarded.",
                        effect: { actions: 1, customDiscard: true } },
  insurance:          { name: "Liability Insurance", orig: "Moat", type: "Operation", cost: 2,
                        text: "+2 Cards.",
                        effect: { cards: 2 } },
  coworking:          { name: "Co-Working Space", orig: "Village", type: "Operation", cost: 3,
                        text: "+1 Card, +2 Ops.",
                        effect: { cards: 1, actions: 2 } },
  booking:            { name: "Quick Gig Booking", orig: "Workshop", type: "Operation", cost: 3,
                        text: "Gain a card costing up to $4.",
                        effect: { gainUpTo: 4 } },
  pricewar:           { name: "Price War", orig: "Militia", type: "Op-Attack", cost: 4,
                        text: "+$2. Each other player discards down to 3 cards.",
                        effect: { coins: 2, attack: "discard_to_3" } },
  upgrade:            { name: "Equipment Upgrade", orig: "Remodel", type: "Operation", cost: 4,
                        text: "Trash a card. Gain a card costing up to $2 more.",
                        effect: { remodel: 2 } },
  sprint:             { name: "Editing Sprint", orig: "Smithy", type: "Operation", cost: 4,
                        text: "+3 Cards.",
                        effect: { cards: 3 } },
  upsell:             { name: "Client Upsell", orig: "Mine", type: "Operation", cost: 5,
                        text: "Trash a Revenue. Gain a Revenue to hand costing up to $3 more.",
                        effect: { upsell: 3 } },
  leadgen:            { name: "Lead Gen Platform", orig: "Market", type: "Operation", cost: 5,
                        text: "+1 Card, +1 Op, +1 Buy, +$1.",
                        effect: { cards: 1, actions: 1, buys: 1, coins: 1 } },
  salesrep:           { name: "Sales Rep", orig: "Merchant", type: "Operation", cost: 3,
                        text: "+1 Card, +1 Op. First Commercial Contract played this turn gives +$1.",
                        effect: { cards: 1, actions: 1, merchant: true } }
};

// First game set
const KINGDOM_SET = ['triage', 'insurance', 'coworking', 'booking', 'pricewar', 'upgrade', 'sprint', 'upsell', 'leadgen', 'salesrep'];
const BASE_TREASURE = ['local_shoot', 'commercial', 'corporate'];
const BASE_VICTORY = ['brand', 'presence', 'leader'];

// ============================================================
// GAME LOGIC
// ============================================================
const initialDeck = () => {
  const d = [];
  for (let i = 0; i < 7; i++) d.push('local_shoot');
  for (let i = 0; i < 3; i++) d.push('brand');
  return shuffle(d);
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const initialSupply = () => {
  const s = {};
  BASE_TREASURE.forEach(id => { s[id] = id === 'local_shoot' ? 46 : 40; }); // 60 minus 14 in starting decks
  s.brand = 8; // 2-player counts
  s.presence = 8;
  s.leader = 8;
  s.bad_review = 10;
  KINGDOM_SET.forEach(id => { s[id] = 10; });
  return s;
};

function drawFrom(deck, discard, n) {
  let d = [...deck], disc = [...discard], drawn = [];
  for (let i = 0; i < n; i++) {
    if (d.length === 0) {
      if (disc.length === 0) break;
      d = shuffle(disc);
      disc = [];
    }
    drawn.push(d.shift());
  }
  return { drawn, deck: d, discard: disc };
}

function makePlayer(name, isBot = false) {
  const deck = initialDeck();
  const { drawn, deck: rest } = drawFrom(deck, [], 5);
  return {
    name,
    isBot,
    deck: rest,
    hand: drawn,
    discard: [],
    inPlay: [],
    actions: 1,
    buys: 1,
    coins: 0,
    merchantTriggers: 0,
    silverPlayedThisTurn: false
  };
}

// ============================================================
// UI COMPONENTS
// ============================================================

const CardFace = ({ cardId, onClick, disabled, compact, small, highlight, dimmed }) => {
  const card = CARDS[cardId];
  if (!card) return null;

  const typeColors = {
    'Revenue':   { bg: '#1a1f2e', border: '#d4a73b', accent: '#d4a73b', text: '#f4d27a' },
    'Brand':     { bg: '#15201a', border: '#5fb878', accent: '#5fb878', text: '#a8e0b8' },
    'Curse':     { bg: '#231414', border: '#c14545', accent: '#c14545', text: '#e89a9a' },
    'Operation': { bg: '#161a24', border: '#5b8def', accent: '#5b8def', text: '#a8c4ff' },
    'Op-Attack': { bg: '#1d1620', border: '#b15bef', accent: '#b15bef', text: '#d8a8ff' }
  };

  const c = typeColors[card.type];
  const cursor = disabled ? 'default' : (onClick ? 'pointer' : 'default');
  const opacity = dimmed ? 0.35 : 1;

  const width = small ? 90 : (compact ? 120 : 160);
  const height = small ? 130 : (compact ? 170 : 224);

  return (
    <div
      onClick={!disabled && onClick ? onClick : undefined}
      style={{
        width, height, cursor, opacity,
        background: c.bg,
        border: `1.5px solid ${highlight ? c.accent : c.border + '88'}`,
        borderRadius: 8,
        padding: small ? 6 : 10,
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        boxShadow: highlight
          ? `0 0 0 2px ${c.accent}, 0 8px 24px -8px ${c.accent}66`
          : '0 2px 6px rgba(0,0,0,0.4)',
        transition: 'all 0.18s ease',
        fontFamily: '"Space Mono", monospace',
        flexShrink: 0,
        transform: highlight ? 'translateY(-4px)' : 'translateY(0)'
      }}
      onMouseEnter={e => {
        if (disabled || !onClick) return;
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = `0 8px 24px -8px ${c.accent}88, 0 0 0 1px ${c.accent}`;
      }}
      onMouseLeave={e => {
        if (highlight) return;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.4)';
      }}
    >
      {/* Cost badge */}
      <div style={{
        position: 'absolute', top: small ? 4 : 6, right: small ? 4 : 6,
        background: c.accent, color: '#0a0c12',
        fontSize: small ? 10 : 12, fontWeight: 700,
        borderRadius: 4, padding: small ? '1px 5px' : '2px 7px',
        fontFamily: '"Space Mono", monospace'
      }}>
        ${card.cost}
      </div>

      {/* Type tag */}
      <div style={{
        fontSize: small ? 7 : 8, color: c.accent, letterSpacing: 1.5,
        textTransform: 'uppercase', fontWeight: 600, marginBottom: small ? 2 : 4
      }}>
        {card.type}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: '"Instrument Serif", "Cormorant Garamond", serif',
        fontSize: small ? 13 : (compact ? 16 : 19),
        fontWeight: 400, color: c.text,
        lineHeight: 1.05, marginBottom: small ? 4 : 8,
        letterSpacing: '-0.01em'
      }}>
        {card.name}
      </div>

      {!small && (
        <>
          {/* Divider */}
          <div style={{
            height: 1, background: `linear-gradient(to right, ${c.border}66, transparent)`,
            marginBottom: 6
          }} />

          {/* Rules text or value */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {card.text ? (
              <div style={{
                fontSize: compact ? 8.5 : 9.5, color: '#bdc4d6',
                lineHeight: 1.35, textAlign: 'left'
              }}>
                {card.text}
              </div>
            ) : (
              <div style={{ textAlign: 'center', width: '100%' }}>
                {card.value > 0 && (
                  <div style={{
                    fontFamily: '"Instrument Serif", serif',
                    fontSize: compact ? 36 : 48, color: c.accent, lineHeight: 1
                  }}>
                    ${card.value}
                  </div>
                )}
                {card.vp !== 0 && (
                  <div style={{
                    fontFamily: '"Instrument Serif", serif',
                    fontSize: compact ? 36 : 48, color: c.accent, lineHeight: 1
                  }}>
                    {card.vp > 0 ? `${card.vp}★` : `${card.vp}★`}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {small && (card.value > 0 || card.vp !== 0) && (
        <div style={{
          position: 'absolute', bottom: 4, left: 6,
          fontFamily: '"Instrument Serif", serif',
          fontSize: 18, color: c.accent
        }}>
          {card.value > 0 ? `$${card.value}` : `${card.vp}★`}
        </div>
      )}
    </div>
  );
};

const SupplyPile = ({ cardId, count, onClick, canAfford, isBuyPhase, size = 'compact' }) => {
  const card = CARDS[cardId];
  const empty = count === 0;
  const isSmall = size === 'small';
  return (
    <div style={{ position: 'relative' }}>
      <CardFace
        cardId={cardId}
        compact={!isSmall}
        small={isSmall}
        onClick={!empty && isBuyPhase && canAfford ? onClick : undefined}
        disabled={empty || !isBuyPhase || !canAfford}
        dimmed={empty || (isBuyPhase && !canAfford)}
        highlight={isBuyPhase && canAfford && !empty}
      />
      <div style={{
        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
        background: '#0a0c12', border: '1px solid #2a3142',
        padding: isSmall ? '1px 7px' : '2px 10px', borderRadius: 10,
        fontFamily: '"Space Mono", monospace', fontSize: isSmall ? 9 : 11,
        color: empty ? '#6b3a3a' : '#8a92a8', fontWeight: 700
      }}>
        ×{count}
      </div>
    </div>
  );
};

// ============================================================
// MAIN GAME COMPONENT
// ============================================================

export default function Dronedom() {
  const [supply, setSupply] = useState(initialSupply());
  const [players, setPlayers] = useState([makePlayer("You"), makePlayer("RivalCo Bot", true)]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [phase, setPhase] = useState('action'); // action | buy | cleanup
  const [trash, setTrash] = useState([]);
  const [log, setLog] = useState(["Welcome to Dronedom. Your week begins."]);
  const [gameOver, setGameOver] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState(null); // { type, cardId?, max? }
  const [selectedHandIdxs, setSelectedHandIdxs] = useState([]);
  const [hoverCard, setHoverCard] = useState(null);
  const [showHelp, setShowHelp] = useState(false);

  const me = players[0];
  const bot = players[1];
  const active = players[currentPlayer];
  const isMyTurn = currentPlayer === 0;

  // Inject Google Fonts on mount
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link);
  }, []);

  const addLog = (msg) => setLog(l => [...l.slice(-30), msg]);

  const updatePlayer = (idx, updates) => {
    setPlayers(p => p.map((pl, i) => i === idx ? { ...pl, ...updates } : pl));
  };

  // ----- TREASURE VALUE in hand -----
  const treasureInHand = useMemo(() => {
    return me.hand.reduce((sum, c) => sum + (CARDS[c].value || 0), 0);
  }, [me.hand]);

  const totalCoins = me.coins + (phase === 'buy' ? treasureInHand : 0);

  // ----- CHECK GAME END -----
  useEffect(() => {
    if (gameOver) return;
    if (supply.leader === 0) {
      endGame("Industry Leader pile is empty.");
      return;
    }
    const emptyPiles = Object.values(supply).filter(c => c === 0).length;
    if (emptyPiles >= 3) {
      endGame("Three supply piles are exhausted.");
    }
  }, [supply, gameOver]);

  function endGame(reason) {
    setGameOver(true);
    addLog(`GAME OVER: ${reason}`);
  }

  function tallyVP(player) {
    const all = [...player.deck, ...player.hand, ...player.discard, ...player.inPlay];
    return all.reduce((sum, c) => sum + (CARDS[c].vp || 0), 0);
  }

  function countCards(player) {
    return player.deck.length + player.hand.length + player.discard.length + player.inPlay.length;
  }

  // ----- PLAY AN ACTION CARD -----
  function playAction(handIdx) {
    if (!isMyTurn || phase !== 'action' || me.actions < 1) return;
    const cardId = me.hand[handIdx];
    const card = CARDS[cardId];
    if (card.type !== 'Operation' && card.type !== 'Op-Attack') return;

    const newHand = [...me.hand];
    newHand.splice(handIdx, 1);
    const newInPlay = [...me.inPlay, cardId];

    let newState = {
      hand: newHand,
      inPlay: newInPlay,
      actions: me.actions - 1
    };

    const e = card.effect;
    addLog(`You play ${card.name}.`);

    // Draw cards
    if (e.cards) {
      const { drawn, deck, discard } = drawFrom(me.deck, me.discard, e.cards);
      newState.hand = [...newState.hand, ...drawn];
      newState.deck = deck;
      newState.discard = discard;
    }
    if (e.actions) newState.actions += e.actions;
    if (e.buys) newState = { ...newState, buys: me.buys + e.buys };
    if (e.coins) newState = { ...newState, coins: me.coins + e.coins };
    if (e.merchant) newState.merchantTriggers = (me.merchantTriggers || 0) + 1;

    updatePlayer(0, newState);

    // Handle prompts (cards that need more input)
    if (e.customDiscard) {
      setPendingPrompt({ type: 'triage' });
      setSelectedHandIdxs([]);
    } else if (e.gainUpTo) {
      setPendingPrompt({ type: 'gain', max: e.gainUpTo });
    } else if (e.remodel) {
      setPendingPrompt({ type: 'remodel_trash', plus: e.remodel });
    } else if (e.upsell) {
      setPendingPrompt({ type: 'upsell_trash', plus: e.upsell });
    } else if (e.attack === 'discard_to_3') {
      // Bot can't moat in this mock — just enforce
      if (bot.hand.length > 3) {
        const target = 3;
        const toDiscard = bot.hand.length - target;
        // Bot discards worst (lowest cost) cards first to "feel fair"
        const sorted = bot.hand.map((id, i) => ({ id, i, cost: CARDS[id].cost }))
                               .sort((a, b) => a.cost - b.cost);
        const discardIdxs = new Set(sorted.slice(0, toDiscard).map(x => x.i));
        const newBotHand = bot.hand.filter((_, i) => !discardIdxs.has(i));
        const discarded = bot.hand.filter((_, i) => discardIdxs.has(i));
        updatePlayer(1, { hand: newBotHand, discard: [...bot.discard, ...discarded] });
        addLog(`RivalCo Bot discards ${toDiscard} card(s) from Price War.`);
      }
    }
  }

  // ----- PLAY ALL TREASURES (one click) -----
  function playAllTreasures() {
    if (!isMyTurn || phase !== 'buy') return;
    const treasureIdxs = me.hand.map((id, i) => ({ id, i }))
                                .filter(x => CARDS[x.id].value > 0);
    if (treasureIdxs.length === 0) return;

    let bonus = 0;
    let silverPlayedAlready = me.silverPlayedThisTurn;
    let merchantTriggers = me.merchantTriggers || 0;

    treasureIdxs.forEach(t => {
      if (t.id === 'commercial' && !silverPlayedAlready && merchantTriggers > 0) {
        bonus += merchantTriggers;
        silverPlayedAlready = true;
      }
    });

    const playedCards = treasureIdxs.map(t => t.id);
    const newHand = me.hand.filter((_, i) => !treasureIdxs.some(t => t.i === i));
    const newCoins = me.coins + playedCards.reduce((s, id) => s + CARDS[id].value, 0) + bonus;

    updatePlayer(0, {
      hand: newHand,
      inPlay: [...me.inPlay, ...playedCards],
      coins: newCoins,
      silverPlayedThisTurn: silverPlayedAlready
    });
    addLog(`You play ${playedCards.length} revenue cards (+$${newCoins - me.coins}).`);
  }

  // ----- BUY A CARD -----
  function buyCard(cardId) {
    if (!isMyTurn || phase !== 'buy' || me.buys < 1) return;
    const cost = CARDS[cardId].cost;
    if (totalCoins < cost || supply[cardId] === 0) return;

    // First-time entering buy phase implicitly plays treasures
    let workingMe = { ...me };
    if (treasureInHand > 0) {
      const treasureIdxs = workingMe.hand.map((id, i) => ({ id, i }))
                                  .filter(x => CARDS[x.id].value > 0);
      const playedCards = treasureIdxs.map(t => t.id);
      let bonus = 0;
      let silverPlayedAlready = workingMe.silverPlayedThisTurn;
      const mt = workingMe.merchantTriggers || 0;
      playedCards.forEach(id => {
        if (id === 'commercial' && !silverPlayedAlready && mt > 0) {
          bonus += mt;
          silverPlayedAlready = true;
        }
      });
      workingMe.hand = workingMe.hand.filter((_, i) => !treasureIdxs.some(t => t.i === i));
      workingMe.inPlay = [...workingMe.inPlay, ...playedCards];
      workingMe.coins += playedCards.reduce((s, id) => s + CARDS[id].value, 0) + bonus;
      workingMe.silverPlayedThisTurn = silverPlayedAlready;
    }

    workingMe.coins -= cost;
    workingMe.buys -= 1;
    workingMe.discard = [...workingMe.discard, cardId];
    updatePlayer(0, workingMe);
    setSupply(s => ({ ...s, [cardId]: s[cardId] - 1 }));
    addLog(`You buy ${CARDS[cardId].name}.`);
  }

  // ----- TRIAGE INBOX prompt -----
  function confirmTriage() {
    const discardedIds = selectedHandIdxs.map(i => me.hand[i]);
    const newHand = me.hand.filter((_, i) => !selectedHandIdxs.includes(i));
    const { drawn, deck, discard } = drawFrom(me.deck, [...me.discard, ...discardedIds], discardedIds.length);
    updatePlayer(0, {
      hand: [...newHand, ...drawn],
      deck,
      discard
    });
    addLog(`You discard ${discardedIds.length} card(s) and redraw.`);
    setPendingPrompt(null);
    setSelectedHandIdxs([]);
  }

  // ----- GAIN A CARD from supply (workshop / booking) -----
  function gainFromSupply(cardId) {
    if (!pendingPrompt || pendingPrompt.type !== 'gain') return;
    if (CARDS[cardId].cost > pendingPrompt.max) return;
    if (supply[cardId] === 0) return;
    updatePlayer(0, { discard: [...me.discard, cardId] });
    setSupply(s => ({ ...s, [cardId]: s[cardId] - 1 }));
    addLog(`You gain ${CARDS[cardId].name}.`);
    setPendingPrompt(null);
  }

  // ----- REMODEL: trash a card, then gain one -----
  function trashForRemodel(handIdx) {
    if (!pendingPrompt) return;
    const cardId = me.hand[handIdx];
    const trashedCost = CARDS[cardId].cost;
    const newHand = [...me.hand];
    newHand.splice(handIdx, 1);
    updatePlayer(0, { hand: newHand });
    setTrash(t => [...t, cardId]);
    addLog(`You trash ${CARDS[cardId].name}.`);

    if (pendingPrompt.type === 'remodel_trash') {
      setPendingPrompt({ type: 'remodel_gain', max: trashedCost + pendingPrompt.plus });
    } else if (pendingPrompt.type === 'upsell_trash') {
      // upsell: card must be Revenue, gain goes to HAND
      if (CARDS[cardId].type !== 'Revenue') {
        addLog("(That wasn't a Revenue card — Upsell fizzles.)");
        setPendingPrompt(null);
        return;
      }
      setPendingPrompt({ type: 'upsell_gain', max: trashedCost + pendingPrompt.plus });
    }
  }

  function gainForRemodel(cardId) {
    if (!pendingPrompt) return;
    if (CARDS[cardId].cost > pendingPrompt.max) return;
    if (supply[cardId] === 0) return;
    if (pendingPrompt.type === 'upsell_gain') {
      if (CARDS[cardId].type !== 'Revenue') return;
      updatePlayer(0, { hand: [...me.hand, cardId] });
    } else {
      updatePlayer(0, { discard: [...me.discard, cardId] });
    }
    setSupply(s => ({ ...s, [cardId]: s[cardId] - 1 }));
    addLog(`You gain ${CARDS[cardId].name}.`);
    setPendingPrompt(null);
  }

  function cancelPrompt() {
    if (!pendingPrompt) return;
    if (pendingPrompt.type === 'remodel_gain' || pendingPrompt.type === 'upsell_gain') {
      addLog("(No gain made.)");
    }
    setPendingPrompt(null);
    setSelectedHandIdxs([]);
  }

  // ----- END TURN -----
  function endTurn() {
    if (!isMyTurn) return;
    if (pendingPrompt) return;
    // Discard hand + inPlay
    const newDiscard = [...me.discard, ...me.hand, ...me.inPlay];
    const { drawn, deck, discard } = drawFrom(me.deck, newDiscard, 5);
    updatePlayer(0, {
      hand: drawn,
      deck,
      discard,
      inPlay: [],
      actions: 1,
      buys: 1,
      coins: 0,
      merchantTriggers: 0,
      silverPlayedThisTurn: false
    });
    setPhase('action');
    setCurrentPlayer(1);
    addLog("--- RivalCo Bot's turn ---");
  }

  // ----- BOT TURN -----
  useEffect(() => {
    if (currentPlayer !== 1 || gameOver) return;
    const t = setTimeout(() => runBotTurn(), 1100);
    return () => clearTimeout(t);
  }, [currentPlayer, gameOver]);

  function runBotTurn() {
    let b = { ...bot };
    let s = { ...supply };

    // ACTION PHASE — play simple priority actions
    let safety = 10;
    while (b.actions > 0 && safety-- > 0) {
      const actionIdx = b.hand.findIndex(id => CARDS[id].type === 'Operation' || CARDS[id].type === 'Op-Attack');
      if (actionIdx === -1) break;
      const cid = b.hand[actionIdx];
      const c = CARDS[cid];
      const newHand = [...b.hand]; newHand.splice(actionIdx, 1);
      b.hand = newHand;
      b.inPlay = [...b.inPlay, cid];
      b.actions -= 1;
      addLog(`Bot plays ${c.name}.`);
      const e = c.effect || {};
      if (e.cards) {
        const r = drawFrom(b.deck, b.discard, e.cards);
        b.hand = [...b.hand, ...r.drawn]; b.deck = r.deck; b.discard = r.discard;
      }
      if (e.actions) b.actions += e.actions;
      if (e.buys) b.buys = (b.buys || 1) + e.buys;
      if (e.coins) b.coins = (b.coins || 0) + e.coins;
      // Bot-only attack effect: discard player to 3
      if (e.attack === 'discard_to_3') {
        // Player loses 2 cards (worst ones)
        setPlayers(prev => {
          const player = prev[0];
          if (player.hand.length <= 3) return prev;
          const toDiscard = player.hand.length - 3;
          const sorted = player.hand.map((id, i) => ({ id, i, cost: CARDS[id].cost }))
                                    .sort((a, b) => a.cost - b.cost);
          const idxs = new Set(sorted.slice(0, toDiscard).map(x => x.i));
          const newH = player.hand.filter((_, i) => !idxs.has(i));
          const dropped = player.hand.filter((_, i) => idxs.has(i));
          addLog(`You discard ${toDiscard} card(s) from Bot's Price War.`);
          return [{ ...player, hand: newH, discard: [...player.discard, ...dropped] }, prev[1]];
        });
      }
      // Bot doesn't bother with complex prompts (gain/remodel/upsell) — skip those effects in mock
    }

    // BUY PHASE — play treasures, buy best card
    const treasureCoins = b.hand.filter(id => CARDS[id].value > 0)
                                .reduce((s, id) => s + CARDS[id].value, 0);
    const treasures = b.hand.filter(id => CARDS[id].value > 0);
    b.hand = b.hand.filter(id => CARDS[id].value === 0);
    b.inPlay = [...b.inPlay, ...treasures];
    b.coins = (b.coins || 0) + treasureCoins;

    // Simple bot priorities
    const buyPriority = ['leader', 'corporate', 'presence', 'leadgen', 'upsell', 'sprint', 'coworking', 'commercial', 'salesrep', 'triage'];
    while (b.buys > 0) {
      let bought = false;
      for (const cid of buyPriority) {
        if (s[cid] > 0 && b.coins >= CARDS[cid].cost) {
          // Don't buy too many brands too early
          if ((cid === 'brand' || cid === 'presence') && b.deck.length + b.discard.length + b.hand.length + b.inPlay.length < 12) continue;
          b.coins -= CARDS[cid].cost;
          b.discard = [...b.discard, cid];
          s = { ...s, [cid]: s[cid] - 1 };
          b.buys -= 1;
          addLog(`Bot buys ${CARDS[cid].name}.`);
          bought = true;
          break;
        }
      }
      if (!bought) break;
    }

    // CLEAN-UP
    const newDiscard = [...b.discard, ...b.hand, ...b.inPlay];
    const r = drawFrom(b.deck, newDiscard, 5);
    b = {
      ...b, hand: r.drawn, deck: r.deck, discard: r.discard, inPlay: [],
      actions: 1, buys: 1, coins: 0
    };
    setPlayers(prev => [prev[0], b]);
    setSupply(s);
    setCurrentPlayer(0);
    setPhase('action');
    addLog("--- Your turn ---");
  }

  // ----- RENDER -----
  const baseSupplyIds = [...BASE_TREASURE, ...BASE_VICTORY, 'bad_review']
    .sort((a, b) => CARDS[a].cost - CARDS[b].cost);
  const kingdomSupplyIds = [...KINGDOM_SET]
    .sort((a, b) => CARDS[a].cost - CARDS[b].cost);

  const handleSupplyClick = (cid) => {
    if (pendingPrompt?.type === 'gain') gainFromSupply(cid);
    else if (pendingPrompt?.type === 'remodel_gain') gainForRemodel(cid);
    else if (pendingPrompt?.type === 'upsell_gain') gainForRemodel(cid);
    else buyCard(cid);
  };

  const isBuyClickable = isMyTurn && (phase === 'buy' || (phase === 'action' && me.actions === 0)) && !pendingPrompt;

  const promptText = pendingPrompt && {
    'triage':       "Select cards to discard, then confirm. You'll redraw the same number.",
    'gain':         `Choose a card costing up to $${pendingPrompt.max} to gain.`,
    'remodel_trash': "Choose a card in your hand to trash.",
    'remodel_gain': `Choose a card costing up to $${pendingPrompt.max} to gain.`,
    'upsell_trash': "Choose a Revenue card to trash.",
    'upsell_gain':  `Choose a Revenue card costing up to $${pendingPrompt.max} to gain to hand.`
  }[pendingPrompt.type];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0c12',
      backgroundImage: `
        radial-gradient(circle at 15% 25%, rgba(91,141,239,0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 75%, rgba(212,167,59,0.04) 0%, transparent 40%),
        linear-gradient(rgba(91,141,239,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(91,141,239,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
      color: '#dfe3ee',
      fontFamily: '"Space Mono", monospace',
      padding: '16px 20px 24px',
      position: 'relative'
    }}>
      {/* HEADER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: 18, paddingBottom: 14,
        borderBottom: '1px solid #1f2638'
      }}>
        <div>
          <div style={{
            fontFamily: '"Instrument Serif", serif',
            fontSize: 44, lineHeight: 0.95,
            color: '#f4f6fb', letterSpacing: '-0.02em', fontStyle: 'italic'
          }}>
            Dronedom<span style={{ color: '#5b8def' }}>.</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b7392', letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' }}>
            A drone photography startup deckbuilder · MOCK v0.1
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button onClick={() => setShowHelp(!showHelp)} style={btnStyle('ghost')}>
            {showHelp ? 'Hide' : 'How to play'}
          </button>
          <button onClick={() => window.location.reload()} style={btnStyle('ghost')}>
            Reset
          </button>
        </div>
      </div>

      {showHelp && <HelpPanel />}

      {gameOver && <GameOverPanel me={me} bot={bot} tallyVP={tallyVP} countCards={countCards} />}

      {/* RIVAL STATS */}
      <RivalRow bot={bot} countCards={countCards} />

      {/* SUPPLY — split layout: base cards (small, left) and kingdom cards (bigger, right) */}
      <div style={{ marginTop: 18 }}>
        <SectionHeader label="THE MARKET" sub="Tap a card during INVESTMENT phase to acquire it." />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 260px) 1fr',
          gap: 20,
          paddingTop: 14
        }}>
          {/* LEFT: base cards split into Revenue (left side) and Brand+Curse (right side) */}
          <div style={{
            padding: '14px 14px 18px',
            background: 'rgba(15, 18, 28, 0.6)',
            border: '1px solid #1a1f2c',
            borderRadius: 8
          }}>
            <div style={{
              fontSize: 9, color: '#6b7392', letterSpacing: 2.5,
              fontWeight: 700, marginBottom: 12
            }}>
              CORE ECONOMY
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1px 1fr',
              gap: 12,
              alignItems: 'start'
            }}>
              {/* Revenue column (with Bad Review stacked below) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                {BASE_TREASURE
                  .slice()
                  .sort((a, b) => CARDS[a].cost - CARDS[b].cost)
                  .map(cid => (
                    <SupplyPile
                      key={cid} cardId={cid}
                      size="small"
                      count={supply[cid]}
                      canAfford={totalCoins >= CARDS[cid].cost}
                      isBuyPhase={isBuyClickable}
                      onClick={() => handleSupplyClick(cid)}
                    />
                  ))}
                <SupplyPile
                  key="bad_review" cardId="bad_review"
                  size="small"
                  count={supply.bad_review}
                  canAfford={totalCoins >= CARDS.bad_review.cost}
                  isBuyPhase={isBuyClickable}
                  onClick={() => handleSupplyClick('bad_review')}
                />
              </div>

              {/* Vertical divider */}
              <div style={{
                width: 1,
                alignSelf: 'stretch',
                background: 'linear-gradient(to bottom, transparent, #2a3142 20%, #2a3142 80%, transparent)'
              }} />

              {/* Brand column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                {BASE_VICTORY
                  .slice()
                  .sort((a, b) => CARDS[a].cost - CARDS[b].cost)
                  .map(cid => (
                    <SupplyPile
                      key={cid} cardId={cid}
                      size="small"
                      count={supply[cid]}
                      canAfford={totalCoins >= CARDS[cid].cost}
                      isBuyPhase={isBuyClickable}
                      onClick={() => handleSupplyClick(cid)}
                    />
                  ))}
              </div>
            </div>
          </div>

          {/* RIGHT: kingdom cards (the 10 unique cards this game) */}
          <div style={{
            padding: '14px 14px 18px',
            background: 'rgba(15, 18, 28, 0.6)',
            border: '1px solid #1a1f2c',
            borderRadius: 8
          }}>
            <div style={{
              fontSize: 9, color: '#5b8def', letterSpacing: 2.5,
              fontWeight: 700, marginBottom: 12
            }}>
              THIS WEEK'S MARKET
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 16
            }}>
              {kingdomSupplyIds.map(cid => (
                <SupplyPile
                  key={cid} cardId={cid}
                  size="compact"
                  count={supply[cid]}
                  canAfford={totalCoins >= CARDS[cid].cost}
                  isBuyPhase={isBuyClickable}
                  onClick={() => handleSupplyClick(cid)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT BAR */}
      {pendingPrompt && (
        <div style={{
          margin: '12px 0',
          padding: '12px 16px',
          background: 'linear-gradient(to right, #1d2030, #161a24)',
          border: '1px solid #5b8def',
          borderRadius: 8,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 0 20px -8px #5b8def88'
        }}>
          <div style={{ color: '#a8c4ff', fontSize: 13 }}>
            <span style={{ color: '#5b8def', fontWeight: 700, marginRight: 10 }}>►</span>
            {promptText}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {pendingPrompt.type === 'triage' && (
              <button onClick={confirmTriage} style={btnStyle('primary')}>
                Confirm ({selectedHandIdxs.length})
              </button>
            )}
            <button onClick={cancelPrompt} style={btnStyle('ghost')}>
              {pendingPrompt.type === 'remodel_gain' || pendingPrompt.type === 'upsell_gain' ? 'Skip' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* MY DASHBOARD */}
      <MyDashboard
        me={me}
        phase={phase}
        totalCoins={totalCoins}
        isMyTurn={isMyTurn}
        countCards={countCards}
        gameOver={gameOver}
        onEndTurn={endTurn}
        onAdvancePhase={() => { if (phase === 'action') setPhase('buy'); }}
        pendingPrompt={pendingPrompt}
      />

      {/* MY HAND */}
      <div style={{ marginTop: 12 }}>
        <SectionHeader
          label="YOUR HAND"
          sub={phase === 'action'
            ? 'Click an Operation card to play it.'
            : phase === 'buy'
              ? 'Revenue cards auto-played when buying. Click a market card to invest.'
              : ''}
        />
        <div style={{
          display: 'flex', gap: 12, padding: '14px 0',
          minHeight: 240, overflowX: 'auto'
        }}>
          {me.hand.map((cid, i) => {
            const card = CARDS[cid];
            const isAction = card.type === 'Operation' || card.type === 'Op-Attack';
            const isRevenue = card.type === 'Revenue';
            const isSelected = selectedHandIdxs.includes(i);

            let clickHandler = null;
            let canClick = false;

            if (pendingPrompt?.type === 'triage') {
              canClick = true;
              clickHandler = () => {
                setSelectedHandIdxs(s =>
                  s.includes(i) ? s.filter(x => x !== i) : [...s, i]
                );
              };
            } else if (pendingPrompt?.type === 'remodel_trash') {
              canClick = true;
              clickHandler = () => trashForRemodel(i);
            } else if (pendingPrompt?.type === 'upsell_trash') {
              canClick = isRevenue;
              if (canClick) clickHandler = () => trashForRemodel(i);
            } else if (phase === 'action' && isAction && me.actions > 0 && isMyTurn && !pendingPrompt) {
              canClick = true;
              clickHandler = () => playAction(i);
            }

            return (
              <CardFace
                key={i}
                cardId={cid}
                onClick={canClick ? clickHandler : undefined}
                disabled={!canClick}
                highlight={isSelected}
                dimmed={pendingPrompt?.type === 'upsell_trash' && !isRevenue}
              />
            );
          })}
          {me.hand.length === 0 && (
            <div style={{ color: '#4a5168', fontStyle: 'italic', alignSelf: 'center', paddingLeft: 20 }}>
              Hand is empty.
            </div>
          )}
        </div>
      </div>

      {/* IN PLAY */}
      {me.inPlay.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <SectionHeader label="IN PLAY THIS WEEK" sub="" />
          <div style={{ display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto' }}>
            {me.inPlay.map((cid, i) => <CardFace key={i} cardId={cid} small disabled />)}
          </div>
        </div>
      )}

      {/* LOG */}
      <LogPanel log={log} />
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

const btnStyle = (variant) => {
  const base = {
    fontFamily: '"Space Mono", monospace',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    fontWeight: 700,
    transition: 'all 0.15s ease',
    border: 'none'
  };
  if (variant === 'primary') return { ...base, background: '#5b8def', color: '#0a0c12' };
  if (variant === 'ghost') return { ...base, background: 'transparent', color: '#8a92a8', border: '1px solid #2a3142' };
  return base;
};

function SectionHeader({ label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '1px solid #1a1f2c', paddingBottom: 6 }}>
      <div style={{
        fontSize: 11, color: '#7a86a8', letterSpacing: 3, fontWeight: 700
      }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: 10, color: '#4a5168', fontStyle: 'italic' }}>{sub}</div>}
    </div>
  );
}

function HelpPanel() {
  return (
    <div style={{
      background: '#11141d', border: '1px solid #2a3142', borderRadius: 8,
      padding: 18, marginBottom: 14, fontSize: 12, color: '#bdc4d6', lineHeight: 1.6
    }}>
      <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, color: '#f4f6fb', marginBottom: 8, fontStyle: 'italic' }}>
        How a week works
      </div>
      <div><strong style={{ color: '#5b8def' }}>1. OPERATIONS</strong> — play Operation cards from your hand. Each gives effects; some let you play more.</div>
      <div><strong style={{ color: '#5b8def' }}>2. INVESTMENT</strong> — Revenue cards in hand become cash. Click a market card to buy it (goes to your archive).</div>
      <div><strong style={{ color: '#5b8def' }}>3. END WEEK</strong> — discard everything, draw 5 fresh cards. Reset Ops/Buys/Cash for next week.</div>
      <div style={{ marginTop: 10 }}>Game ends when <strong>Industry Leader</strong> sells out, or any <strong>3 piles</strong> empty. Most ★ (brand equity) wins.</div>
    </div>
  );
}

function RivalRow({ bot, countCards }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px',
      background: '#11141d', border: '1px solid #1f2638', borderRadius: 6
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#c14545', boxShadow: '0 0 6px #c14545'
        }} />
        <div style={{ fontSize: 12, color: '#dfe3ee', letterSpacing: 1.5, fontWeight: 700 }}>
          RIVALCO BOT
        </div>
        <div style={{ fontSize: 10, color: '#4a5168', fontStyle: 'italic' }}>
          competitor startup
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 11, color: '#8a92a8' }}>
        <span>Hand <strong style={{ color: '#dfe3ee' }}>{bot.hand.length}</strong></span>
        <span>Deck <strong style={{ color: '#dfe3ee' }}>{bot.deck.length}</strong></span>
        <span>Archive <strong style={{ color: '#dfe3ee' }}>{bot.discard.length}</strong></span>
        <span>Total Assets <strong style={{ color: '#dfe3ee' }}>{countCards(bot)}</strong></span>
      </div>
    </div>
  );
}

function MyDashboard({ me, phase, totalCoins, isMyTurn, countCards, gameOver, onEndTurn, onAdvancePhase, pendingPrompt }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
      padding: '14px 16px',
      background: 'linear-gradient(to bottom, #131724, #0e1118)',
      border: '1px solid #2a3142',
      borderRadius: 8,
      marginTop: 14,
      boxShadow: '0 0 24px -12px #5b8def44'
    }}>
      {/* Identity */}
      <div>
        <div style={{ fontSize: 10, color: '#5b8def', letterSpacing: 2, marginBottom: 4 }}>
          YOUR STARTUP
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontSize: 26,
          fontStyle: 'italic', color: '#f4f6fb', lineHeight: 1
        }}>
          {me.name}
        </div>
        <div style={{ fontSize: 10, color: '#6b7392', marginTop: 6 }}>
          {countCards(me)} total assets · {me.deck.length} deck · {me.discard.length} archive
        </div>
      </div>

      {/* Resources */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
        <Stat label="OPS" value={me.actions} color="#5b8def" />
        <Stat label="BUYS" value={me.buys} color="#d4a73b" />
        <Stat label="CASH" value={`$${totalCoins}`} color="#5fb878" highlight />
      </div>

      {/* Phase + button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['OPS','action'],['INVEST','buy'],['END','cleanup']].map(([label, ph]) => {
            const active = phase === ph;
            return (
              <div key={label} style={{
                fontSize: 9, padding: '4px 8px',
                background: active ? '#5b8def' : 'transparent',
                color: active ? '#0a0c12' : '#4a5168',
                border: `1px solid ${active ? '#5b8def' : '#2a3142'}`,
                borderRadius: 3, letterSpacing: 1.5, fontWeight: 700
              }}>
                {label}
              </div>
            );
          })}
        </div>
        {!gameOver && (
          <div style={{ display: 'flex', gap: 6 }}>
            {phase === 'action' && isMyTurn && !pendingPrompt && (
              <button
                onClick={onAdvancePhase}
                style={{
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 10, letterSpacing: 2, fontWeight: 700,
                  padding: '8px 14px',
                  background: 'transparent', color: '#8a92a8',
                  border: '1px solid #2a3142', borderRadius: 4, cursor: 'pointer'
                }}
              >
                SKIP TO INVEST
              </button>
            )}
            <button
              onClick={onEndTurn}
              disabled={!isMyTurn || !!pendingPrompt}
              style={{
                fontFamily: '"Space Mono", monospace',
                fontSize: 11, letterSpacing: 2, fontWeight: 700,
                padding: '10px 22px',
                background: (isMyTurn && !pendingPrompt) ? '#d4a73b' : '#2a3142',
                color: (isMyTurn && !pendingPrompt) ? '#0a0c12' : '#6b7392',
                border: 'none', borderRadius: 4,
                cursor: (isMyTurn && !pendingPrompt) ? 'pointer' : 'not-allowed',
                boxShadow: (isMyTurn && !pendingPrompt) ? '0 4px 16px -4px #d4a73b66' : 'none',
                transition: 'all 0.15s'
              }}
            >
              END WEEK ▸
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color, highlight }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#6b7392', letterSpacing: 2, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontFamily: '"Instrument Serif", serif',
        fontSize: highlight ? 34 : 28,
        color, lineHeight: 1,
        textShadow: highlight ? `0 0 18px ${color}66` : 'none'
      }}>
        {value}
      </div>
    </div>
  );
}

function GameOverPanel({ me, bot, tallyVP, countCards }) {
  const myVP = tallyVP(me);
  const botVP = tallyVP(bot);
  const won = myVP > botVP;
  const tied = myVP === botVP;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1d2030, #11141d)',
      border: `2px solid ${won ? '#5fb878' : tied ? '#d4a73b' : '#c14545'}`,
      borderRadius: 12,
      padding: '24px 28px',
      marginBottom: 16,
      boxShadow: `0 0 40px -10px ${won ? '#5fb878' : tied ? '#d4a73b' : '#c14545'}66`
    }}>
      <div style={{ fontSize: 11, letterSpacing: 4, color: '#6b7392', marginBottom: 6 }}>
        QUARTERLY EARNINGS REPORT
      </div>
      <div style={{
        fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
        fontSize: 44, color: won ? '#5fb878' : tied ? '#d4a73b' : '#c14545',
        lineHeight: 1, marginBottom: 16
      }}>
        {won ? "Market dominance achieved." : tied ? "A tie in brand equity." : "RivalCo edges you out."}
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: '#8a92a8', marginBottom: 4 }}>YOUR STARTUP</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 32, color: '#f4f6fb' }}>
            {myVP}★
          </div>
          <div style={{ fontSize: 10, color: '#6b7392' }}>{countCards(me)} assets</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8a92a8', marginBottom: 4 }}>RIVALCO BOT</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 32, color: '#f4f6fb' }}>
            {botVP}★
          </div>
          <div style={{ fontSize: 10, color: '#6b7392' }}>{countCards(bot)} assets</div>
        </div>
      </div>
      <button onClick={() => window.location.reload()} style={{
        marginTop: 20,
        fontFamily: '"Space Mono", monospace',
        fontSize: 11, letterSpacing: 2, fontWeight: 700,
        padding: '10px 22px',
        background: '#5b8def', color: '#0a0c12',
        border: 'none', borderRadius: 4, cursor: 'pointer'
      }}>
        NEW GAME ▸
      </button>
    </div>
  );
}

function LogPanel({ log }) {
  const ref = React.useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  return (
    <div style={{
      marginTop: 18,
      background: '#0e1118',
      border: '1px solid #1f2638',
      borderRadius: 6,
      padding: '10px 14px',
      maxHeight: 110,
      overflowY: 'auto',
      fontSize: 11, fontFamily: '"Space Mono", monospace',
      color: '#8a92a8'
    }} ref={ref}>
      <div style={{ fontSize: 9, color: '#4a5168', letterSpacing: 2, marginBottom: 6 }}>
        ACTIVITY LOG
      </div>
      {log.map((l, i) => (
        <div key={i} style={{ marginBottom: 2, opacity: i === log.length - 1 ? 1 : 0.6 }}>
          {l.startsWith('---') || l.startsWith('GAME')
            ? <span style={{ color: '#d4a73b' }}>{l}</span>
            : l}
        </div>
      ))}
    </div>
  );
}
