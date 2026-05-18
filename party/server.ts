import type * as Party from 'partykit/server';
import { initialState, isLegal, applyAction, botTurn, tallyVP } from './engine';
import { redactFor } from './redact';
import type { ClientMsg, ServerMsg, GameState } from './types';

export default class DroneDomServer implements Party.Server {
  state: GameState | null = null;
  players: [string | null, string | null] = [null, null];
  names: [string, string] = ['Player 1', 'RivalCo Bot'];

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const slot = this.players.findIndex(p => p === null) as 0 | 1 | -1;
    if (slot === -1) {
      conn.close(1008, 'room full');
      return;
    }
    this.players[slot] = conn.id;

    const lobbyMsg: ServerMsg = {
      type: 'lobby',
      you: slot,
      opponentJoined: this.players[1 - slot as 0 | 1] !== null,
    };
    conn.send(JSON.stringify(lobbyMsg));

    // When the first human connects, start vs bot immediately
    if (slot === 0) {
      this.state = initialState(this.names[0], this.names[1]);
      this.broadcastState();
    } else {
      // Second human connected — update player 0 that opponent joined
      for (const c of this.room.getConnections()) {
        if (c.id === this.players[0]) {
          c.send(JSON.stringify({ type: 'lobby', you: 0, opponentJoined: true } as ServerMsg));
          break;
        }
      }
      if (this.state) this.broadcastState();
    }
  }

  onClose(conn: Party.Connection) {
    const slot = this.players.indexOf(conn.id) as 0 | 1 | -1;
    if (slot !== -1) this.players[slot] = null;
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMsg;
    const slot = this.players.indexOf(sender.id) as 0 | 1 | -1;
    if (slot === -1) return;

    if (msg.type === 'ping') {
      sender.send(JSON.stringify({ type: 'state', view: this.state ? redactFor(this.state, slot) : null, log: this.state?.log ?? [] }));
      return;
    }

    if (msg.type === 'join') {
      this.names[slot] = msg.name;
      if (this.state) {
        this.state.players[slot].name = msg.name;
        this.broadcastState();
      }
      return;
    }

    if (msg.type === 'action') {
      if (!this.state) {
        sender.send(JSON.stringify({ type: 'error', reason: 'game not started' } as ServerMsg));
        return;
      }
      if (!isLegal(this.state, slot, msg.action)) {
        sender.send(JSON.stringify({ type: 'error', reason: 'illegal action' } as ServerMsg));
        return;
      }
      this.state = applyAction(this.state, slot, msg.action);

      // If it's now the bot's turn, resolve synchronously
      if (!this.state.gameOver && this.state.currentPlayer === 1 && this.state.players[1].isBot) {
        this.state = botTurn(this.state);
      }

      this.broadcastState();
    }
  }

  broadcastState() {
    if (!this.state) return;

    for (const conn of this.room.getConnections()) {
      const slot = this.players.indexOf(conn.id) as 0 | 1 | -1;
      if (slot === -1) continue;
      const msg: ServerMsg = {
        type: 'state',
        view: redactFor(this.state, slot),
        log: this.state.log,
      };
      conn.send(JSON.stringify(msg));
    }

    if (this.state.gameOver) {
      const scores: [number, number] = [
        tallyVP(this.state.players[0]),
        tallyVP(this.state.players[1]),
      ];
      const winner: 0 | 1 | 'tie' = scores[0] > scores[1] ? 0 : scores[0] < scores[1] ? 1 : 'tie';
      const msg: ServerMsg = { type: 'gameOver', scores, winner };
      for (const conn of this.room.getConnections()) {
        conn.send(JSON.stringify(msg));
      }
    }
  }
}
