/**
 * useMoQGameStream Hook
 * 
 * Uses PartyKit for peer discovery and MoQ for game data transport.
 * Based on the moqstuff pattern but adapted for racing game needs.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import usePartySocket from "partysocket/react";
import { PresenceType } from "game-schemas";
import { Connection } from "@kixelated/hang/connection";
import * as Moq from "@kixelated/moq";
import * as Publish from "@kixelated/hang/publish";
import * as Watch from "@kixelated/hang/watch";
import { Room } from "@kixelated/hang/meet";

// Type for partial presence updates (movement data without name)
export type PresenceUpdate = Omit<PresenceType, 'name'>;

// MoQ participant info from broker
interface MoQParticipant {
  id: string;
  playerName: string;
  moqPath: string;
  joinedAt: number;
  lastSeen: number;
}

// Broker message types
interface BrokerUpdate {
  type: "broker_update";
  participants: MoQParticipant[];
  stats: {
    totalConnections: number;
    activeCount: number;
  };
}

export interface UseMoQGameStreamOptions {
  roomId: string;
  playerId: string;
  playerName: string;
  enabled?: boolean;
  forceMoQ?: boolean; // Force MoQ mode - no WebSocket fallback
  onParticipantJoin?: (participant: MoQParticipant) => void;
  onParticipantLeave?: (participantId: string) => void;
}

export interface MoQGameStreamState {
  isConnected: boolean;
  isMoQReady: boolean;
  participants: MoQParticipant[];
  localBroadcast: Publish.Broadcast | null;
  remoteBroadcasts: Map<string, Watch.Broadcast>;
  publishGameState: (state: PresenceUpdate) => void;
  remoteStates: Map<string, PresenceType>;
  debugEvents: {
    onOutgoing: (callback: (data: PresenceUpdate) => void) => () => void;
    onIncoming: (callback: (data: PresenceType) => void) => () => void;
  };
}

export function useMoQGameStream({
  roomId,
  playerId,
  playerName,
  enabled = true,
  forceMoQ = false,
  onParticipantJoin,
  onParticipantLeave,
}: UseMoQGameStreamOptions): MoQGameStreamState {
  // Use refs for stable references - no React re-renders needed
  const moqConnectionRef = useRef<Connection | null>(null);
  const moqRoomRef = useRef<Room | null>(null);
  const localBroadcastRef = useRef<Publish.Broadcast | null>(null);
  const remoteBroadcastsRef = useRef<Map<string, Watch.Broadcast>>(new Map());
  const remoteStatesRef = useRef<Map<string, PresenceType>>(new Map());
  const participantsRef = useRef<MoQParticipant[]>([]);

  // These need to be state for UI updates
  const [isConnected, setIsConnected] = useState(false);
  const [isMoQReady, setIsMoQReady] = useState(false);
  
  const prevParticipantsRef = useRef<Set<string>>(new Set());
  const moqPath = `game/${roomId}/${playerId}`;
  const relayUrl = "https://relay.cloudflare.mediaoverquic.com";
  
  // Debug event callbacks
  const debugCallbacks = useRef<{
    outgoing: Set<(data: PresenceUpdate) => void>;
    incoming: Set<(data: PresenceType) => void>;
  }>({
    outgoing: new Set(),
    incoming: new Set(),
  });
  
  // Get PartyKit server URL from environment
  const partyHost = process.env.NEXT_PUBLIC_PARTY_SOCKET_HOST || "localhost:1999";
  
  // Connect to PartyKit broker for peer discovery
  const socket = usePartySocket({
    host: partyHost,
    room: roomId,
    party: "moqbroker", // Use the MoQ broker party
    query: {
      id: playerId,
      playerName,
      moqPath,
    },
    onOpen() {
      console.log("[MoQ Game] Connected to PartyKit broker");
      setIsConnected(true);
      
      // Send join message
      socket.send(JSON.stringify({
        type: "join",
        id: playerId,
        playerName,
        moqPath,
      }));
    },
    onMessage(event) {
      try {
        const data = JSON.parse(event.data as string) as BrokerUpdate;
        
        if (data.type === "broker_update") {
          // Filter out self from participants
          const otherParticipants = data.participants.filter(p => p.id !== playerId);
          participantsRef.current = otherParticipants;
          
          // Handle participant changes
          const currentIds = new Set(otherParticipants.map(p => p.id));
          
          // Check for new participants
          for (const participant of otherParticipants) {
            if (!prevParticipantsRef.current.has(participant.id)) {
              onParticipantJoin?.(participant);
              // Only create watch broadcast if MoQ is ready
              if (moqConnectionRef.current && isMoQReady) {
                createWatchBroadcast(participant);
              }
            }
          }
          
          // Check for participants who left
          for (const prevId of prevParticipantsRef.current) {
            if (!currentIds.has(prevId)) {
              onParticipantLeave?.(prevId);
              cleanupWatchBroadcast(prevId);
            }
          }
          
          prevParticipantsRef.current = currentIds;
        }
      } catch (error) {
        console.error("[MoQ Game] Failed to parse broker message:", error);
      }
    },
    onClose() {
      console.log("[MoQ Game] Disconnected from PartyKit broker");
      setIsConnected(false);
    },
  });
  
  // Initialize MoQ connection
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    
    console.log("[MoQ Game] Initializing MoQ connection...");
    
    const initMoQ = async () => {
      try {
        // Create connection to MoQ relay
        const connection = new Connection({ 
          url: new URL(relayUrl),
          reload: true // Auto-reconnect
        });
        
        moqConnectionRef.current = connection;
        
        // Wait for connection to establish
        await new Promise<void>((resolve) => {
          const checkConnection = () => {
            if (connection.status.peek() === "connected") {
              resolve();
            } else {
              setTimeout(checkConnection, 100);
            }
          };
          checkConnection();
        });
        
        // Create room for discovery
        const roomNamespace = Moq.Path.from("game", roomId);
        const room = new Room(connection, { name: roomNamespace });
        moqRoomRef.current = room;
        
        // Create local broadcast for publishing game state
        const broadcastPath = Moq.Path.from("game", roomId, playerId);
        const broadcast = new Publish.Broadcast(connection, {
          enabled: true,
          name: broadcastPath,
          chat: { enabled: true }, // Use chat track for game data
          reload: false,
        });

        localBroadcastRef.current = broadcast;

        // Announce our broadcast to the room
        try {
          room.preview(broadcastPath, broadcast);
          console.log("[MoQ Game] Announced broadcast to room:", broadcastPath);
        } catch (error) {
          console.error("[MoQ Game] Failed to announce broadcast to room:", error);
        }

        setIsMoQReady(true);
        console.log("[MoQ Game] MoQ connection established with broadcast:", broadcastPath);
        
      } catch (error) {
        console.error("[MoQ Game] Failed to initialize MoQ:", error);
        setIsMoQReady(false);
        
        // If forceMoQ is enabled, throw the error instead of silently failing
        if (forceMoQ) {
          throw new Error(`[MoQ Force Mode] Failed to initialize MoQ connection: ${error}`);
        }
      }
    };
    
    initMoQ();
    
    return () => {
      // Cleanup
      if (localBroadcastRef.current) {
        localBroadcastRef.current.close();
      }
      if (moqRoomRef.current) {
        moqRoomRef.current.close();
      }
      if (moqConnectionRef.current) {
        moqConnectionRef.current.close();
      }
    };
  }, [enabled, roomId, playerId]);
  
    // Create watch broadcast for a participant
  const createWatchBroadcast = useCallback(async (participant: MoQParticipant, retryCount = 0) => {
    if (!moqConnectionRef.current) return;
    if (participant.id === playerId) return; // Don't watch self

    try {
      const peerPath = Moq.Path.from(...participant.moqPath.split("/"));

      // Double-check we're not watching ourselves (compare full paths)
      const ourPath = `game/${roomId}/${playerId}`;
      if (participant.moqPath === ourPath) {
        console.warn(`[MoQ Game] Skipping self-watch for ${participant.playerName}`);
        return;
      }

      const watchBroadcast = new Watch.Broadcast(moqConnectionRef.current, {
        enabled: true,
        name: peerPath,
        reload: false,
        chat: { enabled: true }, // Subscribe to chat track for game data
      });

      // Wait a bit for the broadcast to initialize
      await new Promise(resolve => setTimeout(resolve, 100));

      // Subscribe to chat messages (we'll use this for game state)
      if (watchBroadcast.chat) {
        watchBroadcast.chat.message.subscribe((data: string | undefined) => {
          if (data) {
            try {
              // Parse the JSON game state from chat message
              const gameState = JSON.parse(data) as PresenceType;
              // Directly update the ref - no React state needed
              remoteStatesRef.current.set(participant.id, gameState);

              // Trigger debug callbacks for incoming data
              debugCallbacks.current.incoming.forEach(cb => cb(gameState));
            } catch (e) {
              console.error("[MoQ Game] Failed to parse incoming game state:", e);
            }
          }
        });
      }

      // Directly update the ref
      if (!remoteBroadcastsRef.current.has(participant.id)) {
        remoteBroadcastsRef.current.set(participant.id, watchBroadcast);
      }

      console.log(`[MoQ Game] Created watch broadcast for ${participant.playerName}`);
    } catch (error) {
      console.error(`[MoQ Game] Failed to create watch broadcast for ${participant.playerName}:`, error);

      // Retry after a delay if the broadcast creation fails (max 3 attempts)
      if (retryCount < 3) {
        setTimeout(() => {
          console.log(`[MoQ Game] Retrying watch broadcast creation for ${participant.playerName} (attempt ${retryCount + 1})`);
          createWatchBroadcast(participant, retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        console.error(`[MoQ Game] Failed to create watch broadcast for ${participant.playerName} after 3 attempts`);
      }
    }
  }, [playerId, roomId]);
  
  // Cleanup watch broadcast
  const cleanupWatchBroadcast = useCallback((participantId: string) => {
    const broadcast = remoteBroadcastsRef.current.get(participantId);
    if (broadcast) {
      broadcast.close();
      remoteBroadcastsRef.current.delete(participantId);
      remoteStatesRef.current.delete(participantId);
    }
  }, []);
  
  // Publish game state
  const publishGameState = useCallback((state: PresenceUpdate) => {
    if (!localBroadcastRef.current || !isMoQReady) return;
    
    try {
      // Use the chat track to send game state as JSON
      if (localBroadcastRef.current.chat) {
        const message = JSON.stringify(state);
        localBroadcastRef.current.chat.message.set(message);
        
        // Trigger debug callbacks for outgoing data
        debugCallbacks.current.outgoing.forEach(cb => cb(state));
      } else {
        console.warn("[MoQ Game] Chat track not available on broadcast");
      }
    } catch (error) {
      console.error("[MoQ Game] Failed to publish game state:", error);
    }
  }, [isMoQReady]);
  
  // PartyKit handles its own heartbeats/connection management
  
  // Debug event subscription API
  const debugEvents = {
    onOutgoing: (callback: (data: PresenceUpdate) => void) => {
      debugCallbacks.current.outgoing.add(callback);
      return () => {
        debugCallbacks.current.outgoing.delete(callback);
      };
    },
    onIncoming: (callback: (data: PresenceType) => void) => {
      debugCallbacks.current.incoming.add(callback);
      return () => {
        debugCallbacks.current.incoming.delete(callback);
      };
    },
  };

  return {
    isConnected,
    isMoQReady,
    participants: participantsRef.current,
    localBroadcast: localBroadcastRef.current,
    remoteBroadcasts: remoteBroadcastsRef.current,
    publishGameState,
    remoteStates: remoteStatesRef.current,
    debugEvents,
  };
}