import { useRef, useEffect, useState } from 'react';
import { CARDS, KINGDOM_SET, BASE_TREASURE, BASE_VICTORY } from '../../party/cards';
import type { PlayerView, Action, CardId } from '../../party/types';
import { CardFace } from './CardFace';
import { SupplyPile } from './SupplyPile';
import { PromptBar } from './PromptBar';

interface Props {
  view: PlayerView;
  log: string[];
  onAction: (action: Action) => void;
}

// ── Utility styles ────────────────────────────────────────────────────────────

const btnStyle = (variant: 'primary' | 'ghost' | 'gold') => {
  const base = {
    fontFamily: '"Space Mono", monospace',
    fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase' as const,
    padding: '8px 16px', borderRadius: 4, cursor: 'pointer',
    fontWeight: 700, transition: 'all 0.15s ease', border: 'none' as const,
  };
  if (variant === 'primary') return { ...base, background: '#5b8def', color: '#0a0c12' };
  if (variant === 'gold')    return { ...base, background: '#d4a73b', color: '#0a0c12', padding: '10px 22px', fontSize: 11, letterSpacing: 2, boxShadow: '0 4px 16px -4px #d4a73b66' };
  return { ...base, background: 'transparent', color: '#8a92a8', border: '1px solid #2a3142' };
};

function SectionHeader({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderBottom: '1px solid #1a1f2c', paddingBottom: 6 }}>
      <div style={{ fontSize: 11, color: '#7a86a8', letterSpacing: 3, fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#4a5168', fontStyle: 'italic' }}>{sub}</div>}
    </div>
  );
}

function Stat({ label, value, color, highlight }: { label: string; value: string | number; color: string; highlight?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 9, color: '#6b7392', letterSpacing: 2, marginBottom: 2 }}>{label}</div>
      <div style={{
        fontFamily: '"Instrument Serif", serif', fontSize: highlight ? 34 : 28,
        color, lineHeight: 1, textShadow: highlight ? `0 0 18px ${color}66` : 'none',
      }}>
        {value}
      </div>
    </div>
  );
}

// ── Sub-panels ────────────────────────────────────────────────────────────────

function HelpPanel() {
  return (
    <div style={{ background: '#11141d', border: '1px solid #2a3142', borderRadius: 8, padding: 18, marginBottom: 14, fontSize: 12, color: '#bdc4d6', lineHeight: 1.6 }}>
      <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 22, color: '#f4f6fb', marginBottom: 8, fontStyle: 'italic' }}>
        How a week works
      </div>
      <div><strong style={{ color: '#5b8def' }}>1. OPERATIONS</strong> — play Operation cards from your hand.</div>
      <div><strong style={{ color: '#5b8def' }}>2. INVESTMENT</strong> — Revenue cards become cash. Click a market card to buy it.</div>
      <div><strong style={{ color: '#5b8def' }}>3. END WEEK</strong> — discard everything, draw 5 fresh cards.</div>
      <div style={{ marginTop: 10 }}>Game ends when <strong>Industry Leader</strong> sells out, or any <strong>3 piles</strong> empty.</div>
    </div>
  );
}

function GameOverPanel({ view }: { view: PlayerView }) {
  const myVP = view.you.discard.concat(view.you.hand, view.you.inPlay).reduce((s, c) => s + (CARDS[c].vp || 0), 0);
  // Opponent VP is not fully known (we don't have their deck), show what we can
  const oppPublicVP = view.opponent.discard.concat(view.opponent.inPlay).reduce((s, c) => s + (CARDS[c].vp || 0), 0);

  return (
    <div style={{ background: 'linear-gradient(135deg, #1d2030, #11141d)', border: '2px solid #5fb878', borderRadius: 12, padding: '24px 28px', marginBottom: 16, boxShadow: '0 0 40px -10px #5fb87866' }}>
      <div style={{ fontSize: 11, letterSpacing: 4, color: '#6b7392', marginBottom: 6 }}>QUARTERLY EARNINGS REPORT</div>
      <div style={{ fontFamily: '"Instrument Serif", serif', fontStyle: 'italic', fontSize: 44, color: '#5fb878', lineHeight: 1, marginBottom: 16 }}>
        Game over.
      </div>
      <div style={{ display: 'flex', gap: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: '#8a92a8', marginBottom: 4 }}>YOUR STARTUP</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 32, color: '#f4f6fb' }}>{myVP}★ (visible)</div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#8a92a8', marginBottom: 4 }}>{view.opponent.name.toUpperCase()}</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 32, color: '#f4f6fb' }}>{oppPublicVP}★ (visible)</div>
        </div>
      </div>
      <button onClick={() => window.location.reload()} style={{ marginTop: 20, ...btnStyle('primary') }}>
        NEW GAME ▸
      </button>
    </div>
  );
}

function LogPanel({ log }: { log: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  return (
    <div style={{ marginTop: 18, background: '#0e1118', border: '1px solid #1f2638', borderRadius: 6, padding: '10px 14px', maxHeight: 110, overflowY: 'auto', fontSize: 11, color: '#8a92a8' }} ref={ref}>
      <div style={{ fontSize: 9, color: '#4a5168', letterSpacing: 2, marginBottom: 6 }}>ACTIVITY LOG</div>
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

// ── Main component ────────────────────────────────────────────────────────────

export function GameBoard({ view, log, onAction }: Props) {
  const [selectedCardIds, setSelectedCardIds] = useState<CardId[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const { you, opponent, supply, phase, isYourTurn, pendingPrompt, gameOver } = view;

  const totalCoins = you.coins;
  const isBuyClickable = isYourTurn && phase === 'buy' && !pendingPrompt;

  const kingdomSupplyIds = [...KINGDOM_SET].sort((a, b) => CARDS[a].cost - CARDS[b].cost);

  function handleSupplyClick(cid: CardId) {
    if (!pendingPrompt) {
      onAction({ kind: 'buyCard', cardId: cid });
    } else if (pendingPrompt.kind === 'chooseCardToGain') {
      onAction({ kind: 'promptResponse', choice: { kind: 'chooseCardToGain', cardId: cid } });
    }
  }

  function handleHandCardClick(cid: CardId, idx: number) {
    if (!pendingPrompt) {
      onAction({ kind: 'playCard', cardId: cid });
      return;
    }
    if (pendingPrompt.kind === 'discardAny') {
      setSelectedCardIds(prev => {
        const key = `${cid}:${idx}`;
        // track by index to handle duplicate cards
        const asKeys = prev.map((id, i) => `${id}:${i}`);
        if (asKeys.includes(key)) return prev.filter((_, i) => `${prev[i]}:${i}` !== key);
        return [...prev, cid];
      });
    } else if (pendingPrompt.kind === 'chooseCardToTrash') {
      onAction({ kind: 'promptResponse', choice: { kind: 'chooseCardToTrash', cardId: cid } });
    }
  }

  const isHandClickable = (cid: CardId): boolean => {
    if (gameOver) return false;
    if (!pendingPrompt) {
      const card = CARDS[cid];
      return isYourTurn && phase === 'action' && you.actions > 0 &&
        (card.type === 'Operation' || card.type === 'Op-Attack');
    }
    if (pendingPrompt.kind === 'discardAny') return true;
    if (pendingPrompt.kind === 'chooseCardToTrash') {
      return pendingPrompt.filter ? CARDS[cid].type === pendingPrompt.filter : true;
    }
    return false;
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12',
      backgroundImage: `
        radial-gradient(circle at 15% 25%, rgba(91,141,239,0.06) 0%, transparent 40%),
        radial-gradient(circle at 85% 75%, rgba(212,167,59,0.04) 0%, transparent 40%),
        linear-gradient(rgba(91,141,239,0.025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(91,141,239,0.025) 1px, transparent 1px)
      `,
      backgroundSize: '100% 100%, 100% 100%, 32px 32px, 32px 32px',
      color: '#dfe3ee', fontFamily: '"Space Mono", monospace',
      padding: '16px 20px 24px',
    }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid #1f2638' }}>
        <div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 44, lineHeight: 0.95, color: '#f4f6fb', letterSpacing: '-0.02em', fontStyle: 'italic' }}>
            Dronedom<span style={{ color: '#5b8def' }}>.</span>
          </div>
          <div style={{ fontSize: 10, color: '#6b7392', letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' }}>
            A drone photography startup deckbuilder · v0.2
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <button onClick={() => setShowHelp(h => !h)} style={btnStyle('ghost')}>
            {showHelp ? 'Hide' : 'How to play'}
          </button>
          <button onClick={() => window.location.reload()} style={btnStyle('ghost')}>
            Reset
          </button>
        </div>
      </div>

      {showHelp && <HelpPanel />}
      {gameOver && <GameOverPanel view={view} />}

      {/* OPPONENT ROW */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#11141d', border: '1px solid #1f2638', borderRadius: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#c14545', boxShadow: '0 0 6px #c14545' }} />
          <div style={{ fontSize: 12, color: '#dfe3ee', letterSpacing: 1.5, fontWeight: 700 }}>
            {opponent.name.toUpperCase()}
          </div>
          {!isYourTurn && <div style={{ fontSize: 10, color: '#5b8def', fontStyle: 'italic' }}>taking turn…</div>}
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 11, color: '#8a92a8' }}>
          <span>Hand <strong style={{ color: '#dfe3ee' }}>{opponent.handCount}</strong></span>
          <span>Deck <strong style={{ color: '#dfe3ee' }}>{opponent.deck}</strong></span>
          <span>Archive <strong style={{ color: '#dfe3ee' }}>{opponent.discard.length}</strong></span>
        </div>
      </div>

      {/* SUPPLY */}
      <div style={{ marginTop: 18 }}>
        <SectionHeader label="THE MARKET" sub="Tap a card during INVESTMENT phase to acquire it." />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 260px) 1fr', gap: 20, paddingTop: 14 }}>

          {/* Core Economy */}
          <div style={{ padding: '14px 14px 18px', background: 'rgba(15,18,28,0.6)', border: '1px solid #1a1f2c', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#6b7392', letterSpacing: 2.5, fontWeight: 700, marginBottom: 12 }}>CORE ECONOMY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: 12, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                {BASE_TREASURE.slice().sort((a, b) => CARDS[a].cost - CARDS[b].cost).map(cid => (
                  <SupplyPile key={cid} cardId={cid} size="small" count={supply[cid] ?? 0}
                    canAfford={totalCoins >= CARDS[cid].cost} isBuyPhase={isBuyClickable}
                    onClick={() => handleSupplyClick(cid)} />
                ))}
                <SupplyPile cardId="bad_review" size="small" count={supply.bad_review ?? 0}
                  canAfford={totalCoins >= CARDS.bad_review.cost} isBuyPhase={isBuyClickable}
                  onClick={() => handleSupplyClick('bad_review')} />
              </div>
              <div style={{ width: 1, alignSelf: 'stretch', background: 'linear-gradient(to bottom, transparent, #2a3142 20%, #2a3142 80%, transparent)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                {BASE_VICTORY.slice().sort((a, b) => CARDS[a].cost - CARDS[b].cost).map(cid => (
                  <SupplyPile key={cid} cardId={cid} size="small" count={supply[cid] ?? 0}
                    canAfford={totalCoins >= CARDS[cid].cost} isBuyPhase={isBuyClickable}
                    onClick={() => handleSupplyClick(cid)} />
                ))}
              </div>
            </div>
          </div>

          {/* Kingdom cards */}
          <div style={{ padding: '14px 14px 18px', background: 'rgba(15,18,28,0.6)', border: '1px solid #1a1f2c', borderRadius: 8 }}>
            <div style={{ fontSize: 9, color: '#5b8def', letterSpacing: 2.5, fontWeight: 700, marginBottom: 12 }}>THIS WEEK'S MARKET</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 16 }}>
              {kingdomSupplyIds.map(cid => (
                <SupplyPile key={cid} cardId={cid} size="compact" count={supply[cid] ?? 0}
                  canAfford={totalCoins >= CARDS[cid].cost} isBuyPhase={isBuyClickable}
                  onClick={() => handleSupplyClick(cid)} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT BAR */}
      {pendingPrompt && (
        <PromptBar
          prompt={pendingPrompt}
          selectedCardIds={selectedCardIds}
          onAction={onAction}
          onClearSelection={() => setSelectedCardIds([])}
        />
      )}

      {/* MY DASHBOARD */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, padding: '14px 16px', background: 'linear-gradient(to bottom, #131724, #0e1118)', border: '1px solid #2a3142', borderRadius: 8, marginTop: 14, boxShadow: '0 0 24px -12px #5b8def44' }}>
        <div>
          <div style={{ fontSize: 10, color: '#5b8def', letterSpacing: 2, marginBottom: 4 }}>YOUR STARTUP</div>
          <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: 26, fontStyle: 'italic', color: '#f4f6fb', lineHeight: 1 }}>
            {you.name}
          </div>
          <div style={{ fontSize: 10, color: '#6b7392', marginTop: 6 }}>
            {you.deck} deck · {you.discard.length} archive
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'center' }}>
          <Stat label="OPS"  value={you.actions} color="#5b8def" />
          <Stat label="BUYS" value={you.buys}    color="#d4a73b" />
          <Stat label="CASH" value={`$${totalCoins}`} color="#5fb878" highlight />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['action', 'buy', 'cleanup'] as const).map((ph, i) => {
              const labels = ['OPS', 'INVEST', 'END'];
              const active = phase === ph;
              return (
                <div key={ph} style={{ fontSize: 9, padding: '4px 8px', background: active ? '#5b8def' : 'transparent', color: active ? '#0a0c12' : '#4a5168', border: `1px solid ${active ? '#5b8def' : '#2a3142'}`, borderRadius: 3, letterSpacing: 1.5, fontWeight: 700 }}>
                  {labels[i]}
                </div>
              );
            })}
          </div>
          {!gameOver && (
            <div style={{ display: 'flex', gap: 6 }}>
              {phase === 'action' && isYourTurn && !pendingPrompt && (
                <button onClick={() => onAction({ kind: 'advancePhase' })} style={{ fontFamily: '"Space Mono", monospace', fontSize: 10, letterSpacing: 2, fontWeight: 700, padding: '8px 14px', background: 'transparent', color: '#8a92a8', border: '1px solid #2a3142', borderRadius: 4, cursor: 'pointer' }}>
                  SKIP TO INVEST
                </button>
              )}
              {phase === 'buy' && isYourTurn && !pendingPrompt && you.hand.some(id => (CARDS[id].value ?? 0) > 0) && (
                <button onClick={() => onAction({ kind: 'playAllTreasures' })} style={btnStyle('ghost')}>
                  Play Revenue
                </button>
              )}
              <button
                onClick={() => onAction({ kind: 'endTurn' })}
                disabled={!isYourTurn || !!pendingPrompt}
                style={{
                  ...btnStyle('gold'),
                  background: (isYourTurn && !pendingPrompt) ? '#d4a73b' : '#2a3142',
                  color:      (isYourTurn && !pendingPrompt) ? '#0a0c12' : '#6b7392',
                  cursor:     (isYourTurn && !pendingPrompt) ? 'pointer' : 'not-allowed',
                  boxShadow:  (isYourTurn && !pendingPrompt) ? '0 4px 16px -4px #d4a73b66' : 'none',
                }}
              >
                END WEEK ▸
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MY HAND */}
      <div style={{ marginTop: 12 }}>
        <SectionHeader
          label="YOUR HAND"
          sub={phase === 'action' ? 'Click an Operation card to play it.' : phase === 'buy' ? 'Revenue cards auto-played when buying. Click market to invest.' : ''}
        />
        <div style={{ display: 'flex', gap: 12, padding: '14px 0', minHeight: 240, overflowX: 'auto' }}>
          {you.hand.map((cid, i) => {
            const canClick = isHandClickable(cid);
            const isSelected = selectedCardIds.includes(cid);
            const dimForUpsell = pendingPrompt?.kind === 'chooseCardToTrash' && pendingPrompt.filter === 'Revenue' && CARDS[cid].type !== 'Revenue';
            return (
              <CardFace
                key={i}
                cardId={cid}
                onClick={canClick ? () => handleHandCardClick(cid, i) : undefined}
                disabled={!canClick}
                highlight={isSelected}
                dimmed={dimForUpsell}
              />
            );
          })}
          {you.hand.length === 0 && (
            <div style={{ color: '#4a5168', fontStyle: 'italic', alignSelf: 'center', paddingLeft: 20 }}>Hand is empty.</div>
          )}
        </div>
      </div>

      {/* IN PLAY */}
      {you.inPlay.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <SectionHeader label="IN PLAY THIS WEEK" />
          <div style={{ display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto' }}>
            {you.inPlay.map((cid, i) => <CardFace key={i} cardId={cid} small disabled />)}
          </div>
        </div>
      )}

      <LogPanel log={log} />
    </div>
  );
}
