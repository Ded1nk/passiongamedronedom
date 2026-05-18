import { useGame } from './useGame';
import { GameBoard } from './components/GameBoard';
import { LobbyScreen } from './components/LobbyScreen';
import { EndScreen } from './components/EndScreen';

const ROOM_ID = 'dronedom-main';
const PLAYER_NAME = 'You';

export default function App() {
  const { view, log, lobby, gameOver, forfeit, sendAction, sendReady, sendRematch, sendPlayBot } = useGame(ROOM_ID, PLAYER_NAME);

  if (forfeit) {
    return <EndScreen type="forfeit" forfeit={forfeit} lobby={lobby} onRematch={sendRematch} />;
  }

  if (gameOver) {
    return <EndScreen type="gameover" gameOver={gameOver} lobby={lobby} onRematch={sendRematch} />;
  }

  if (!view) {
    return <LobbyScreen lobby={lobby} onReady={sendReady} onPlayBot={sendPlayBot} />;
  }

  return <GameBoard view={view} log={log} onAction={sendAction} />;
}
