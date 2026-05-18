/// <reference types="vite/client" />
import { useEffect, useState, useCallback } from 'react';
import PartySocket from 'partysocket';
import type { ServerMsg, PlayerView, Action, ClientMsg } from '../party/types';

const PARTYKIT_HOST = import.meta.env.DEV
  ? 'localhost:1999'
  : (import.meta.env.VITE_PARTYKIT_HOST ?? 'dronedom.ded1nk.partykit.dev');

export interface LobbyState {
  you: 0 | 1 | null;
  opponentJoined: boolean;
}

export function useGame(roomId: string, playerName: string) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [lobby, setLobby] = useState<LobbyState>({ you: null, opponentJoined: false });
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<PartySocket | null>(null);

  useEffect(() => {
    const ws = new PartySocket({ host: PARTYKIT_HOST, room: roomId });

    ws.addEventListener('message', (evt: MessageEvent) => {
      const msg = JSON.parse(evt.data as string) as ServerMsg;

      switch (msg.type) {
        case 'lobby':
          setLobby({ you: msg.you, opponentJoined: msg.opponentJoined });
          ws.send(JSON.stringify({ type: 'join', name: playerName } as ClientMsg));
          break;
        case 'state':
          setView(msg.view);
          setLog(msg.log);
          setError(null);
          break;
        case 'error':
          setError(msg.reason);
          break;
        case 'gameOver':
          // gameOver state is already in view.gameOver; scores come here if needed
          break;
      }
    });

    setSocket(ws);
    return () => ws.close();
  }, [roomId, playerName]);

  const sendAction = useCallback((action: Action) => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'action', action } as ClientMsg));
  }, [socket]);

  return { view, log, lobby, error, sendAction };
}
