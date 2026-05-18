import type { GameOverState, ForfeitState, LobbyState } from '../useGame';

interface Props {
  type: 'gameover' | 'forfeit';
  gameOver?: GameOverState;
  forfeit?: ForfeitState;
  lobby: LobbyState;
  onRematch: () => void;
}

export function EndScreen({ type, gameOver, forfeit, lobby, onRematch }: Props) {
  const mySlot = lobby.you ?? 0;
  const rematch = gameOver?.rematch ?? [false, false];
  const iRequestedRematch = rematch[mySlot];
  const opponentRequestedRematch = rematch[1 - mySlot as 0 | 1];

  const winner = type === 'forfeit' ? forfeit!.winner : gameOver!.winner;
  const iWon = winner === mySlot;
  const tied = winner === 'tie';

  const accentColor = iWon ? '#5fb878' : tied ? '#d4a73b' : '#c14545';

  let headline = '';
  let subline = '';
  if (type === 'forfeit') {
    headline = iWon ? 'Opponent forfeited.' : 'You forfeited.';
    subline = forfeit!.reason;
  } else {
    headline = iWon ? 'Market dominance achieved.' : tied ? 'A tie in brand equity.' : 'RivalCo edges you out.';
    const scores = gameOver!.scores;
    subline = `${scores[mySlot]}★ vs ${scores[1 - mySlot as 0 | 1]}★`;
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace', color: '#dfe3ee',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #1d2030, #11141d)',
        border: `2px solid ${accentColor}`,
        borderRadius: 12, padding: '40px 48px', textAlign: 'center', width: 420,
        boxShadow: `0 0 40px -10px ${accentColor}66`,
      }}>
        <div style={{ fontSize: 10, letterSpacing: 4, color: '#6b7392', marginBottom: 8 }}>
          {type === 'forfeit' ? 'DISCONNECTION' : 'QUARTERLY EARNINGS REPORT'}
        </div>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 40, color: accentColor, lineHeight: 1.1, marginBottom: 12,
        }}>
          {headline}
        </div>
        <div style={{ fontSize: 13, color: '#8a92a8', marginBottom: 32 }}>{subline}</div>

        {/* Rematch section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={onRematch}
            disabled={iRequestedRematch}
            style={{
              fontFamily: '"Space Mono", monospace',
              fontSize: 11, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
              padding: '12px',
              background: iRequestedRematch ? '#1f2638' : '#5b8def',
              color: iRequestedRematch ? '#5fb878' : '#0a0c12',
              border: iRequestedRematch ? '1px solid #5fb87844' : 'none',
              borderRadius: 6,
              cursor: iRequestedRematch ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {iRequestedRematch ? '✓ Rematch requested' : 'Request rematch'}
          </button>

          <div style={{ fontSize: 10, color: '#4a5168', letterSpacing: 1 }}>
            {opponentRequestedRematch
              ? '⚡ Opponent wants a rematch — click above to start'
              : iRequestedRematch
                ? 'Waiting for opponent…'
                : 'Both players must agree to rematch'}
          </div>
        </div>
      </div>
    </div>
  );
}
