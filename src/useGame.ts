/// <reference types="vite/client" />
import { useEffect, useState, useCallback } from 'react';
import PartySocket from 'partysocket';
import type { ServerMsg, PlayerView, Action, ClientMsg, LobbyPlayer } from '../party/types';

const PARTYKIT_HOST = import.meta.env.DEV
  ? 'localhost:1999'
  : (import.meta.env.VITE_PARTYKIT_HOST ?? 'dronedom.ded1nk.partykit.dev');

export interface LobbyState {
  you: 0 | 1 | null;
  players: [LobbyPlayer, LobbyPlayer] | null;
}

export interface GameOverState {
  scores: [number, number];
  winner: 0 | 1 | 'tie';
  rematch: [boolean, boolean];
}

export interface ForfeitState {
  winner: 0 | 1;
  reason: string;
}

export function useGame(roomId: string, playerName: string) {
  const [view, setView] = useState<PlayerView | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [lobby, setLobby] = useState<LobbyState>({ you: null, players: null });
  const [gameOver, setGameOver] = useState<GameOverState | null>(null);
  const [forfeit, setForfeit] = useState<ForfeitState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<PartySocket | null>(null);

  useEffect(() => {
    const ws = new PartySocket({ host: PARTYKIT_HOST, room: roomId });

    ws.addEventListener('message', (evt: MessageEvent) => {
      const msg = JSON.parse(evt.data as string) as ServerMsg;

      switch (msg.type) {
        case 'lobby':
          setLobby({ you: msg.you, players: msg.players });
          setView(null);
          setGameOver(null);
          setForfeit(null);
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
          setGameOver({ scores: msg.scores, winner: msg.winner, rematch: msg.rematch });
          break;
        case 'forfeit':
          setForfeit({ winner: msg.winner, reason: msg.reason });
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

  const sendReady = useCallback(() => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'ready' } as ClientMsg));
  }, [socket]);

  const sendRematch = useCallback(() => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'rematch' } as ClientMsg));
  }, [socket]);

  const sendPlayBot = useCallback(() => {
    if (!socket) return;
    socket.send(JSON.stringify({ type: 'playBot' } as ClientMsg));
  }, [socket]);

  return { view, log, lobby, gameOver, forfeit, error, sendAction, sendReady, sendRematch, sendPlayBot };
}
