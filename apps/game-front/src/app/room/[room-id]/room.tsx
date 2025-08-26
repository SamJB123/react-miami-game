"use client";

import { ControlsQrOverlay } from "@/app/room/[room-id]/controls-qr-overlay";
import { GameCanvas } from "@/app/components/game";
import { useMedia } from "@/hooks/use-media";
import { ControlsMobileOverlay } from "./controls-mobile-overlay";
import { ServerStatusOverlay } from "./server-status-overlay";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { GithubOverlay } from "./github-overlay";
import { MoQDebugOverlay } from "@/app/components/moq-debug-overlay";
import { useEffect, useState } from "react";

export function Room({ roomId }: { roomId: string }) {
  const isMobile = useIsMobile();
  const bigScreen = useMedia("(min-width: 1024px)", false);
  const [showMoQDebug, setShowMoQDebug] = useState(false);

  useEffect(() => {
    // Check if MoQ debug should be shown (via URL param or env)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const shouldShowDebug = urlParams.has("moq-debug") || 
                             urlParams.has("moq") ||
                             process.env.NEXT_PUBLIC_USE_MOQ === "true" ||
                             process.env.NEXT_PUBLIC_MOQ_FORCE === "true";
      setShowMoQDebug(shouldShowDebug);
    }
  }, []);

  if (isMobile === undefined) return null;

  const mobileControls = isMobile && !bigScreen;

  return (
    <div className="w-screen h-[100svh]">
      <GameCanvas roomId={roomId} />

      {mobileControls && (
        <div className="absolute top-0 left-0 w-full h-full">
          <ControlsMobileOverlay />
        </div>
      )}
      <ServerStatusOverlay />
      <GithubOverlay />
      {!isMobile && <ControlsQrOverlay />}
    </div>
  );
}
