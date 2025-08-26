/**
 * MoQ Connection Broker Party for Racing Game
 * 
 * This PartyKit server acts as a connection broker for MoQ/WebTransport clients,
 * solving the discovery problem where players need to know about each other.
 * Unlike the main game server, this ONLY handles discovery - all game data
 * flows directly between clients via MoQ/QUIC.
 * 
 * Based on the moqstuff pattern but simplified for racing game needs.
 */

import type * as Party from "partykit/server";

// Type for each participant in the room
interface MoQParticipant {
  id: string;
  playerName: string;
  moqPath: string; // The MoQ broadcast path for this player (e.g., "game/room-123/player-abc")
  joinedAt: number;
  lastSeen: number;
}

// Connection state stored per WebSocket connection
interface ConnectionState {
  participantId?: string;
}

// Messages the broker handles
type BrokerMessage = 
  | { type: "join"; id: string; playerName: string; moqPath: string }
  | { type: "leave"; id: string }
  | { type: "heartbeat"; id: string }
  | { type: "request_peers"; id: string };

// Message sent to clients
interface BrokerUpdate {
  type: "broker_update";
  participants: MoQParticipant[];
  stats: {
    totalConnections: number;
    activeCount: number;
  };
}

export default class MoQBrokerParty implements Party.Server {
  private participants: Map<string, MoQParticipant> = new Map();

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection<ConnectionState>, ctx: Party.ConnectionContext): void {
    console.log(`[MoQ Broker] New connection: ${connection.id}`);
    
    // Send current participant list to the new connection
    this.sendBrokerUpdate(connection);
  }

  onMessage(message: string, sender: Party.Connection<ConnectionState>): void {
    try {
      const msg = JSON.parse(message) as BrokerMessage;
      
      switch (msg.type) {
        case "join":
          this.handleJoin(msg, sender);
          break;
        
        case "leave":
          this.handleLeave(msg.id);
          break;
        
        case "heartbeat":
          this.handleHeartbeat(msg.id);
          break;
        
        case "request_peers":
          this.sendBrokerUpdate(sender);
          break;
        
        default:
          console.warn(`[MoQ Broker] Unknown message type:`, msg);
      }
    } catch (error) {
      console.error("[MoQ Broker] Failed to parse message:", error);
    }
  }

  onClose(connection: Party.Connection<ConnectionState>): void {
    // Remove participant when connection closes
    const state = connection.state;
    if (state?.participantId) {
      this.handleLeave(state.participantId);
    }
  }

  private handleJoin(msg: { id: string; playerName: string; moqPath: string }, connection: Party.Connection<ConnectionState>) {
    const participant: MoQParticipant = {
      id: msg.id,
      playerName: msg.playerName,
      moqPath: msg.moqPath,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    
    // Store participant
    this.participants.set(msg.id, participant);
    
    // Store participant ID in connection state for cleanup
    connection.setState({ participantId: msg.id });
    
    console.log(`[MoQ Broker] Player joined: ${msg.playerName} (${msg.id}) with path: ${msg.moqPath}`);
    
    // Broadcast updated participant list to all connections
    this.broadcastUpdate();
  }

  private handleLeave(participantId: string) {
    const participant = this.participants.get(participantId);
    if (participant) {
      this.participants.delete(participantId);
      console.log(`[MoQ Broker] Player left: ${participant.playerName} (${participantId})`);
      
      // Broadcast updated participant list
      this.broadcastUpdate();
    }
  }

  private handleHeartbeat(participantId: string) {
    const participant = this.participants.get(participantId);
    if (participant) {
      participant.lastSeen = Date.now();
    }
  }

  private sendBrokerUpdate(connection: Party.Connection<ConnectionState>) {
    const update: BrokerUpdate = {
      type: "broker_update",
      participants: Array.from(this.participants.values()),
      stats: {
        totalConnections: Array.from(this.room.getConnections()).length,
        activeCount: this.participants.size,
      },
    };
    
    connection.send(JSON.stringify(update));
  }

  private broadcastUpdate() {
    const update: BrokerUpdate = {
      type: "broker_update",
      participants: Array.from(this.participants.values()),
      stats: {
        totalConnections: Array.from(this.room.getConnections()).length,
        activeCount: this.participants.size,
      },
    };
    
    const message = JSON.stringify(update);
    for (const connection of this.room.getConnections()) {
      connection.send(message);
    }
  }

  // HTTP endpoint for debugging
  async onRequest(request: Party.Request): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === "/participants") {
      return Response.json({
        participants: Array.from(this.participants.values()),
        count: this.participants.size,
      });
    }
    
    return new Response("MoQ Broker Party - Racing Game", { status: 200 });
  }
}