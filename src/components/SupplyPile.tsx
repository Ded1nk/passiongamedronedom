import { CARDS } from '../../party/cards';
import type { CardId } from '../../party/types';
import { CardFace } from './CardFace';

interface Props {
  cardId: CardId;
  count: number;
  onClick?: () => void;
  canAfford: boolean;
  isBuyPhase: boolean;
  size?: 'compact' | 'small';
}

export function SupplyPile({ cardId, count, onClick, canAfford, isBuyPhase, size = 'compact' }: Props) {
  const empty = count === 0;
  const isSmall = size === 'small';
  const card = CARDS[cardId];
  if (!card) return null;

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
        color: empty ? '#6b3a3a' : '#8a92a8', fontWeight: 700,
      }}>
        ×{count}
      </div>
    </div>
  );
}
