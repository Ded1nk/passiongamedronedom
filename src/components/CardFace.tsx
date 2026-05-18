import { CARDS } from '../../party/cards';
import type { CardId } from '../../party/types';

interface Props {
  cardId: CardId;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
  small?: boolean;
  highlight?: boolean;
  dimmed?: boolean;
}

const typeColors = {
  Revenue:    { bg: '#1a1f2e', border: '#d4a73b', accent: '#d4a73b', text: '#f4d27a' },
  Brand:      { bg: '#15201a', border: '#5fb878', accent: '#5fb878', text: '#a8e0b8' },
  Curse:      { bg: '#231414', border: '#c14545', accent: '#c14545', text: '#e89a9a' },
  Operation:  { bg: '#161a24', border: '#5b8def', accent: '#5b8def', text: '#a8c4ff' },
  'Op-Attack':{ bg: '#1d1620', border: '#b15bef', accent: '#b15bef', text: '#d8a8ff' },
};

export function CardFace({ cardId, onClick, disabled, compact, small, highlight, dimmed }: Props) {
  const card = CARDS[cardId];
  if (!card) return null;

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
        transform: highlight ? 'translateY(-4px)' : 'translateY(0)',
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
        fontFamily: '"Space Mono", monospace',
      }}>
        ${card.cost}
      </div>

      {/* Type tag */}
      <div style={{
        fontSize: small ? 7 : 8, color: c.accent, letterSpacing: 1.5,
        textTransform: 'uppercase', fontWeight: 600, marginBottom: small ? 2 : 4,
      }}>
        {card.type}
      </div>

      {/* Name */}
      <div style={{
        fontFamily: '"Instrument Serif", "Cormorant Garamond", serif',
        fontSize: small ? 13 : (compact ? 16 : 19),
        fontWeight: 400, color: c.text,
        lineHeight: 1.05, marginBottom: small ? 4 : 8,
        letterSpacing: '-0.01em',
      }}>
        {card.name}
      </div>

      {!small && (
        <>
          <div style={{
            height: 1,
            background: `linear-gradient(to right, ${c.border}66, transparent)`,
            marginBottom: 6,
          }} />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {card.text ? (
              <div style={{ fontSize: compact ? 8.5 : 9.5, color: '#bdc4d6', lineHeight: 1.35, textAlign: 'left' }}>
                {card.text}
              </div>
            ) : (
              <div style={{ textAlign: 'center', width: '100%' }}>
                {card.value > 0 && (
                  <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: compact ? 36 : 48, color: c.accent, lineHeight: 1 }}>
                    ${card.value}
                  </div>
                )}
                {card.vp !== 0 && (
                  <div style={{ fontFamily: '"Instrument Serif", serif', fontSize: compact ? 36 : 48, color: c.accent, lineHeight: 1 }}>
                    {card.vp}★
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
          fontSize: 18, color: c.accent,
        }}>
          {card.value > 0 ? `$${card.value}` : `${card.vp}★`}
        </div>
      )}
    </div>
  );
}
