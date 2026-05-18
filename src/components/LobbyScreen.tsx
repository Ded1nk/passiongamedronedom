import type { LobbyState } from '../useGame';

interface Props {
  lobby: LobbyState;
  roomId: string;
}

export function LobbyScreen({ lobby, roomId }: Props) {
  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c12',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: '"Space Mono", monospace', color: '#dfe3ee',
    }}>
      <div style={{
        background: '#11141d', border: '1px solid #2a3142',
        borderRadius: 12, padding: '40px 48px', textAlign: 'center', maxWidth: 440,
      }}>
        <div style={{
          fontFamily: '"Instrument Serif", serif', fontStyle: 'italic',
          fontSize: 52, color: '#f4f6fb', letterSpacing: '-0.02em', lineHeight: 1,
          marginBottom: 8,
        }}>
          Dronedom<span style={{ color: '#5b8def' }}>.</span>
        </div>
        <div style={{ fontSize: 10, color: '#6b7392', letterSpacing: 3, marginBottom: 32, textTransform: 'uppercase' }}>
          Drone photography startup deckbuilder
        </div>

        {lobby.you === null ? (
          <div style={{ color: '#8a92a8', fontSize: 13 }}>Connecting…</div>
        ) : (
          <>
            <div style={{
              background: '#0e1118', border: '1px solid #2a3142',
              borderRadius: 6, padding: '12px 20px', marginBottom: 20,
            }}>
              <div style={{ fontSize: 10, color: '#4a5168', letterSpacing: 2, marginBottom: 4 }}>ROOM CODE</div>
              <div style={{ fontSize: 22, color: '#5b8def', fontWeight: 700, letterSpacing: 4 }}>
                {roomId.toUpperCase()}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#8a92a8' }}>
              {lobby.opponentJoined
                ? '✓ Opponent connected — starting…'
                : 'Waiting for RivalCo Bot…'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
