import type * as Party from 'partykit/server';
import { initialState, isLegal, applyAction, tallyVP } from './engine';
import { redactFor } from './redact';
import type { ClientMsg, ServerMsg, GameState, LobbyPlayer } from './types';

const FORFEIT_MS = 30_000;

export default class DroneDomServer implements Party.Server {
  state: GameState | null = null;
  connections: [string | null, string | null] = [null, null];
  names: [string, string] = ['Player 1', 'Player 2'];
  ready: [boolean, boolean] = [false, false];
  rematch: [boolean, boolean] = [false, false];
  forfeitTimers: [number | null, number | null] = [null, null];

  constructor(readonly room: Party.Room) {}

  // ── Helpers ──────────────────────────────────────────────────────────────

  lobbyPlayers(): [LobbyPlayer, LobbyPlayer] {
    return [
      { name: this.names[0], connected: this.connections[0] !== null, ready: this.ready[0] },
      { name: this.names[1], connected: this.connections[1] !== null, ready: this.ready[1] },
    ];
  }

  broadcastLobby() {
    const players = this.lobbyPlayers();
    for (const conn of this.room.getConnections()) {
      const slot = this.connections.indexOf(conn.id) as 0 | 1 | -1;
      if (slot === -1) continue;
      conn.send(JSON.stringify({ type: 'lobby', you: slot, players } as ServerMsg));
    }
  }

  broadcastState() {
    if (!this.state) return;
    for (const conn of this.room.getConnections()) {
      const slot = this.connections.indexOf(conn.id) as 0 | 1 | -1;
      if (slot === -1) continue;
      conn.send(JSON.stringify({ type: 'state', view: redactFor(this.state, slot), log: this.state.log } as ServerMsg));
    }
    if (this.state.gameOver) this.broadcastGameOver();
  }

  broadcastGameOver() {
    if (!this.state) return;
    const scores: [number, number] = [tallyVP(this.state.players[0]), tallyVP(this.state.players[1])];
    const winner: 0 | 1 | 'tie' = scores[0] > scores[1] ? 0 : scores[0] < scores[1] ? 1 : 'tie';
    const msg: ServerMsg = { type: 'gameOver', scores, winner, rematch: this.rematch };
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify(msg));
    }
  }

  broadcastForfeit(winner: 0 | 1, reason: string) {
    const msg: ServerMsg = { type: 'forfeit', winner, reason };
    for (const conn of this.room.getConnections()) {
      conn.send(JSON.stringify(msg));
    }
    this.resetRoom();
  }

  resetRoom() {
    this.state = null;
    this.ready = [false, false];
    this.rematch = [false, false];
    this.clearForfeitTimer(0);
    this.clearForfeitTimer(1);
    this.broadcastLobby();
  }

  clearForfeitTimer(slot: 0 | 1) {
    if (this.forfeitTimers[slot]) {
      clearTimeout(this.forfeitTimers[slot]!);
      this.forfeitTimers[slot] = null;
    }
  }

  // ── Party lifecycle ───────────────────────────────────────────────────────

  onConnect(conn: Party.Connection) {
    const slot = this.connections.findIndex(c => c === null) as 0 | 1 | -1;
    if (slot === -1) { conn.close(1008, 'room full'); return; }
    this.connections[slot] = conn.id;

    // Cancel any pending forfeit for this slot
    this.clearForfeitTimer(slot);

    if (this.state) {
      // Reconnect mid-game — send current state
      conn.send(JSON.stringify({ type: 'state', view: redactFor(this.state, slot), log: this.state.log } as ServerMsg));
      if (this.state.gameOver) this.broadcastGameOver();
    } else {
      this.broadcastLobby();
    }
  }

  onClose(conn: Party.Connection) {
    const slot = this.connections.indexOf(conn.id) as 0 | 1 | -1;
    if (slot === -1) return;
    this.connections[slot] = null;

    if (this.state && !this.state.gameOver) {
      // Game in progress — start forfeit countdown
      const winner = (1 - slot) as 0 | 1;
      const name = this.names[slot];
      this.forfeitTimers[slot] = setTimeout(() => {
        this.broadcastForfeit(winner, `${name} disconnected for 30 seconds.`);
      }, FORFEIT_MS);
    } else if (!this.state) {
      // Still in lobby
      this.ready[slot] = false;
      this.broadcastLobby();
    }
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMsg;
    const slot = this.connections.indexOf(sender.id) as 0 | 1 | -1;
    if (slot === -1) return;

    if (msg.type === 'ping') return;

    if (msg.type === 'join') {
      this.names[slot] = msg.name;
      if (this.state) this.state.players[slot].name = msg.name;
      else this.broadcastLobby();
      return;
    }

    if (msg.type === 'ready') {
      if (this.state) return;
      this.ready[slot] = true;
      this.broadcastLobby();
      if (this.ready[0] && this.ready[1] && this.connections[0] && this.connections[1]) {
        this.state = initialState(this.names[0], this.names[1]);
        this.broadcastState();
      }
      return;
    }

    if (msg.type === 'rematch') {
      if (!this.state?.gameOver) return;
      this.rematch[slot] = true;
      this.broadcastGameOver(); // sends updated rematch flags
      if (this.rematch[0] && this.rematch[1]) {
        // Both agreed — reset to lobby
        this.resetRoom();
      }
      return;
    }

    if (msg.type === 'action') {
      if (!this.state) { sender.send(JSON.stringify({ type: 'error', reason: 'game not started' } as ServerMsg)); return; }
      if (!isLegal(this.state, slot, msg.action)) { sender.send(JSON.stringify({ type: 'error', reason: 'illegal action' } as ServerMsg)); return; }
      this.state = applyAction(this.state, slot, msg.action);
      this.broadcastState();
    }
  }
}
