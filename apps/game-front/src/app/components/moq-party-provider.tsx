"use client";

import { createContext, useContext, ReactNode } from "react";
import type { PartySocket } from "partysocket";
import { PartyProvider } from "./use-party";
import { useMoQGameStream, type MoQGameStreamState } from "@/hooks/useMoQGameStream";

interface MoQPartyContextType {
  socket: PartySocket;
  moqStream: MoQGameStreamState;
}

const MoQPartyContext = createContext<MoQPartyContextType | null>(null);

export function MoQPartyProvider({
  children,
  socket,
  roomId,
  playerId,
  playerName,
  useMoQ = false,
  forceMoQ = false,
}: {
  children: ReactNode;
  socket: PartySocket;
  roomId: string;
  playerId: string;
  playerName: string;
  useMoQ?: boolean;
  forceMoQ?: boolean;
}) {
  // Initialize MoQ stream if enabled
  const moqStream = useMoQGameStream({
    roomId,
    playerId,
    playerName,
    enabled: useMoQ,
    forceMoQ,
    onParticipantJoin: (participant) => {
      console.log(`[MoQ] Participant joined: ${participant.playerName}`);
    },
    onParticipantLeave: (participantId) => {
      console.log(`[MoQ] Participant left: ${participantId}`);
    },
  });

  return (
    <PartyProvider socket={socket}>
      <MoQPartyContext.Provider value={{ socket, moqStream }}>
        {children}
      </MoQPartyContext.Provider>
    </PartyProvider>
  );
}

export function useMoQParty() {
  const context = useContext(MoQPartyContext);
  if (!context) {
    throw new Error("useMoQParty must be used within a MoQPartyProvider");
  }
  return context;
}