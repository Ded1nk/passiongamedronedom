import { useGame } from './useGame';
import { GameBoard } from './components/GameBoard';
import { LobbyScreen } from './components/LobbyScreen';

const ROOM_ID = 'dronedom-main';
const PLAYER_NAME = 'You';

export default function App() {
  const { view, log, lobby, sendAction } = useGame(ROOM_ID, PLAYER_NAME);

  if (!view) {
    return <LobbyScreen lobby={lobby} roomId={ROOM_ID} />;
  }

  return <GameBoard view={view} log={log} onAction={sendAction} />;
}
