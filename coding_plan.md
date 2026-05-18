
Weighed centralized server versus peer-to-peer for hidden-information card game
Good questions, and worth unpacking because the "shared seed + verify moves" instinct works beautifully for some games and trips over its own feet on Dominion. Let me walk through both.

The trust/info problem
The deterministic-seed approach (both clients agree on RNG, replay each other's moves, verify hashes) is the standard for fully-observable games — chess, Go, checkers. It's elegant because there's no hidden state: anything one player sees, the other sees, so the only thing you need to sync is the move list.

Dominion is the opposite. Almost everything is hidden:

Your deck order is hidden even from you until you draw
Your hand is hidden from your opponent
Sentry/Harbinger let you peek at and rearrange private info
Shuffles happen mid-turn at unpredictable moments
If you and your friend share a seed and both simulate locally, then both clients necessarily know each other's full deck order — because deterministic simulation requires it. That makes cheating trivial (one modified client and you can see your opponent's hand). The "real" cryptographic answer for peer-to-peer hidden-info games is the mental poker family of protocols — commit-reveal schemes with homomorphic encryption — and it's massive overkill for a two-friend hobby project. You'd spend weeks on it.

So: yes, you want an authoritative host. It holds the canonical state and sends each player a redacted view of the world (your hand + public stuff like the supply, opponent's discard-pile top card, played cards, hand sizes). Clients send actions ("play Cellar, discard these two card IDs"), server validates, mutates state, broadcasts updated views.

Where the host lives
For a friend game, three reasonable options, in increasing order of effort:

One player runs the server on their machine. Other player connects via Tailscale (free, basically zero-config VPN) or a tunnel like ngrok/cloudflared. Simplest possible thing. Downside: that player has to be online to host, and there's a tiny latency asymmetry.
Tiny free-tier cloud server. Fly.io, Render, Railway, or a $5/mo VPS. Always-on, both players are symmetric clients. Easy to deploy a Node app.
Backend-as-a-service (Firebase Realtime DB / Supabase / PartyKit). PartyKit is actually really nice for this exact use case — it's basically "WebSocket rooms as a service" built on Cloudflare Durable Objects. You get a stateful room per game for free-ish.
I'd lean option 2 or PartyKit if you want it always-available, option 1 if you just want to hack and play.

Stack recommendation
Your frontend is already React, so:

Frontend: Vite + React (keep what you have). Replace the local useState game state with a useGameSocket hook that subscribes to server pushes.
Server: Node + ws (the bare WebSocket library, ~50 lines of glue) or Bun if you like it. Skip Express unless you also want HTTP routes. The game logic from your JSX moves to the server — playCard, buyCard, endTurn become handlers that mutate the canonical state.
Protocol: JSON messages. Two flavors — {type: "action", action: "playCard", cardId: "triage", payload: {...}} from client to server, and {type: "stateUpdate", you: {...}, opponent: {...redacted}, supply: {...}, log: [...]} from server to clients. Send the whole redacted state after each action; at Dominion-scale state sizes (a few KB max), patching/diffing isn't worth the complexity.
Auth: for two friends, a 6-character room code is plenty. First socket to send {type: "join", code: "ABCD12", name: "..."} is player 1, second is player 2, third gets bounced.
Persistence: none needed. Game lives in server memory, dies when the match ends. If you want reconnect-on-refresh, key the player to a session token stored in localStorage and let them rejoin if the socket drops.
A few specific gotchas for Dominion
Shuffle on the server only, using its own RNG. Never expose deck order to either client. When a client needs to "look at top 2 cards" (Sentry, Harbinger), the server reveals just those to that client.
Reactions need a server-driven prompt loop. When player A plays Witch, server sends player B a {type: "promptReaction", options: ["reveal_moat", "decline"]} and waits. Don't try to make this synchronous on the client side; model it as a state machine where the server is always "waiting for input from player X."
Action validation must be server-side. Even with a trusted friend, doing it server-side means your client code doesn't have to be defensive, and the server is the one source of truth for "is this move legal."
Log everything the server does. Makes it trivial to debug desyncs and replay weird turns.
The PartyKit option deserves a mention
If you want this deployed and shareable in a weekend, PartyKit is basically tailor-made: one file (server.ts) exporting a class with onConnect and onMessage, deploys to Cloudflare, gives you a WebSocket URL per room. You'd write the same game logic, just in their handler shape, and skip the "where do I host" problem entirely. For a 1v1 turn-based card game, it's almost too convenient.

So my short answer: authoritative server (don't try seed-sync for hidden-info games), Node + ws or PartyKit, JSON-over-WebSocket, server pushes redacted state. Want me to sketch the server skeleton with the message types and an example handler or two?

look up documentation for partykit, and lets start talking about how we could write the skeleton

5:53 AM

Investigated PartyKit's current status and architected multiplayer game skeleton design
Investigated PartyKit's current status and architected multiplayer game skeleton design
Quick orientation on what PartyKit actually is right now, because there are two flavors:

PartyKit was acquired by Cloudflare in April 2024 and is still alive. Existing PartyKit projects continue to work, and you can deploy to your own Cloudflare account for free (you just pay standard Workers usage, which for two friends playing card games will be effectively $0). The classic experience — npm create partykit@latest and a party/server.ts file — is still the easiest on-ramp. There's also a newer Cloudflare-native successor called partyserver at github.com/cloudflare/partykit, which is where active development is heading; it's a thin enhancement over a Durable Object that adds WebSocket lifecycle hooks and broadcasting, plus the partysocket client library with reconnection and buffering. For a hobby project I'd just use classic PartyKit — fewer moving parts, more tutorials match, and migrating later is straightforward. So that's what I'll sketch against. 
GitHub

The shape of the project
After npm create partykit@latest, you get a structure like this. I'd extend it to roughly:

dronedom/
├── party/
│   ├── server.ts        # the PartyServer class — networking + room state
│   ├── engine.ts        # pure game logic, no React, no networking
│   ├── types.ts         # GameState, Action, Message types (shared)
│   └── redact.ts        # GameState → PlayerView
├── src/
│   ├── App.tsx          # what's currently dronedom_app.jsx, slimmed down
│   ├── useGame.ts       # hook that wraps partysocket
│   └── components/      # CardFace, MyDashboard, etc. — already written
└── partykit.json
The big refactor isn't the networking — that's maybe 150 lines. It's pulling all the game logic out of your current useState handlers in the JSX and into engine.ts as pure functions. Every mutation in your current code (playCard, buyCard, endTurn, the bot's turn loop, the Cellar discard prompt, etc.) becomes a function (state, action) => newState. Then both the server and your tests can call them without involving React at all.

Message protocol
Client → server, three message types is enough:

ts
type ClientMsg =
  | { type: "join"; name: string }
  | { type: "action"; action: Action }
  | { type: "ping" };

type Action =
  | { kind: "playCard"; cardId: CardId }
  | { kind: "buyCard"; cardId: CardId }
  | { kind: "endTurn" }
  | { kind: "advancePhase" }                       // skip to buy
  | { kind: "promptResponse"; choice: unknown };   // answers to Cellar/Sentry/etc.
Server → client:

ts
type ServerMsg =
  | { type: "lobby"; you: 0 | 1; opponentJoined: boolean }
  | { type: "state"; view: PlayerView; log: string[] }
  | { type: "error"; reason: string }
  | { type: "gameOver"; scores: [number, number]; winner: 0 | 1 | "tie" };
PlayerView is the redacted state — your own hand spelled out, opponent's hand as a count, deck as a count, discard as { topCard, count }. The server sends state after every action that changes anything; for two players that's at most a few KB per turn, well below the threshold where you'd care about diffs.

Server skeleton
The whole PartyServer class is mostly bookkeeping around your engine. Roughly:

ts
import type * as Party from "partykit/server";
import { initialState, applyAction, isLegal } from "./engine";
import { redactFor } from "./redact";

export default class DroneDomServer implements Party.Server {
  state = initialState();              // canonical GameState
  players: (string | null)[] = [null, null];   // connection IDs
  names: string[] = ["", ""];

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const slot = this.players.findIndex(p => p === null);
    if (slot === -1) { conn.close(1008, "room full"); return; }
    this.players[slot] = conn.id;
  }

  onMessage(raw: string, sender: Party.Connection) {
    const msg = JSON.parse(raw) as ClientMsg;
    const slot = this.players.indexOf(sender.id);
    if (slot === -1) return;

    if (msg.type === "join") {
      this.names[slot] = msg.name;
      this.broadcastState();
    } else if (msg.type === "action") {
      if (!isLegal(this.state, slot, msg.action)) {
        sender.send(JSON.stringify({ type: "error", reason: "illegal move" }));
        return;
      }
      this.state = applyAction(this.state, slot, msg.action);
      this.broadcastState();
    }
  }

  broadcastState() {
    for (const conn of this.room.getConnections()) {
      const slot = this.players.indexOf(conn.id) as 0 | 1;
      conn.send(JSON.stringify({
        type: "state",
        view: redactFor(this.state, slot),
        log: this.state.log
      }));
    }
  }
}
That's pretty close to functional. The hard part hides inside applyAction and isLegal.

The tricky part: prompts mid-resolution
Most Dominion-clone bugs live in the moments when a card stops to ask the player something. Cellar (choose any number to discard), Sentry (trash/discard/reorder the top two), Workshop/Remodel (which card to gain), Mine (which Treasure to trash and upgrade), Throne Room (which Action to double), Moat (reveal it? — and this is the opponent's choice during YOUR turn).

I'd model this as a pendingPrompt field on GameState:

ts
type PendingPrompt =
  | { for: 0 | 1; kind: "discardAny"; from: "hand"; min: 0; max: number }
  | { for: 0 | 1; kind: "chooseCardToTrash"; from: "hand"; filter?: CardType }
  | { for: 0 | 1; kind: "chooseCardToGain"; maxCost: number; filter?: CardType }
  | { for: 0 | 1; kind: "sentryReorder"; cards: [CardId, CardId] }
  | { for: 0 | 1; kind: "reactToAttack"; attack: AttackKind };
While a prompt is pending, the engine refuses every other action from the player it's waiting on, and the only legal action is promptResponse. The redactor sends the prompt to the relevant player so the UI can render the choice. Multi-step cards (Sentry: draw → look at 2 → reorder/trash/discard) become a small state machine that resolves each step then either finishes or pushes the next prompt.

What I'd suggest tackling first
Three honest-sized chunks, in order:

Extract the engine. Move everything in your current handlers into engine.ts as pure functions, with GameState as the central type. No partykit, no React. Write a tiny test that runs through First Game-set scenarios. This is the most work but also where bugs hide, and it pays off everywhere else.
Pick a representation for PendingPrompt and make sure every card in your set maps to a sequence of (immediate effect → optional prompt → resolution) steps. Your current code does this implicitly via customDiscard, remodel, etc.; we make it explicit.
Then add PartyKit on top. Maybe 100 lines of server.ts plus a useGame hook in React. Lobby/join handling is the last 20%.
