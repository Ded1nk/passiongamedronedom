import type { LobbyState } from '../useGame';

interface Props {
  lobby: LobbyState;
  onReady: () => void;
  onPlayBot: () => void;
}

export function LobbyScreen({ lobby, onReady, onPlayBot }: Props) {
  const { you, players } = lobby;
  const mySlot = you ?? 0;
  const me = players?.[mySlot];
  const opponent = players?.[1 - mySlot as 0 | 1];
  const opponentConnected = opponent?.connected ?? false;
  const iAmReady = me?.ready ?? false;

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace', color: '#dfe3ee',
    }}>
      <div style={{
        background: '#11141d', border: '1px solid #2a3142',
        borderRadius: 12, padding: '40px 48px', textAlign: 'center', width: 400,
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 52, color: '#f4f6fb', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 8,
        }}>
          Dronedom<span style={{ color: '#5b8def' }}>.</span>
        </div>
        <div style={{ fontSize: 10, color: '#6b7392', letterSpacing: 3, marginBottom: 36, textTransform: 'uppercase' }}>
          Drone photography startup deckbuilder
        </div>

        {/* Player slots */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {([0, 1] as const).map(slot => {
            const player = players?.[slot];
            const isYou = slot === mySlot;
            const connected = player?.connected ?? false;
            const ready = player?.ready ?? false;

            return (
              <div key={slot} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                background: isYou ? 'rgba(91,141,239,0.08)' : '#0e1118',
                border: `1px solid ${isYou ? '#5b8def44' : '#1f2638'}`,
                borderRadius: 6,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: connected ? '#5fb878' : '#2a3142',
                    boxShadow: connected ? '0 0 6px #5fb878' : 'none',
                  }} />
                  <div style={{ fontSize: 12, color: connected ? '#dfe3ee' : '#4a5168' }}>
                    {connected ? (player?.name || `Player ${slot + 1}`) : 'Waiting…'}
                    {isYou && <span style={{ fontSize: 9, color: '#5b8def', marginLeft: 8, letterSpacing: 1 }}>YOU</span>}
                  </div>
                </div>
                <div style={{
                  fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase',
                  color: ready ? '#5fb878' : '#4a5168',
                }}>
                  {ready ? '✓ Ready' : connected ? 'Not ready' : '—'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ready button */}
        {you !== null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onReady}
              disabled={iAmReady || !opponentConnected}
              style={{
                width: '100%',
                fontFamily: '"Space Mono", monospace',
                fontSize: 12, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
                padding: '14px',
                background: iAmReady ? '#1f2638' : opponentConnected ? '#5b8def' : '#1f2638',
                color: iAmReady ? '#5fb878' : opponentConnected ? '#0a0c12' : '#4a5168',
                border: iAmReady ? '1px solid #5fb87844' : 'none',
                borderRadius: 6,
                cursor: iAmReady || !opponentConnected ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {iAmReady ? '✓ Ready — waiting for opponent' : opponentConnected ? 'Ready up' : 'Waiting for opponent…'}
            </button>

            {/* Play vs Bot — only show while waiting for opponent */}
            {!opponentConnected && !iAmReady && (
              <button
                onClick={onPlayBot}
                style={{
                  width: '100%',
                  fontFamily: '"Space Mono", monospace',
                  fontSize: 11, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase',
                  padding: '12px',
                  background: 'transparent',
                  color: '#8a92a8',
                  border: '1px solid #2a3142',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                Play vs Bot
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
