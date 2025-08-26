"use client";

import { useEffect, useState, useRef } from "react";
import { useMoQParty } from "./moq-party-provider";

interface LogEntry {
  id: string;
  timestamp: number;
  data: any;
  size: number;
}

const MAX_LOG_ENTRIES = 20;

export function MoQDebugOverlay({ enabled = false }: { enabled?: boolean }) {
  const [outgoingLogs, setOutgoingLogs] = useState<LogEntry[]>([]);
  const [incomingLogs, setIncomingLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [moqStatus, setMoqStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const outgoingCountRef = useRef(0);
  const incomingCountRef = useRef(0);
  
  // Try to get MoQ stream
  let moqStream: any = null;
  try {
    const moqParty = useMoQParty();
    moqStream = moqParty.moqStream;
  } catch {
    // MoQ not available
  }
  
  useEffect(() => {
    if (!moqStream) return;
    
    // Update status
    if (moqStream.isMoQReady) {
      setMoqStatus("connected");
    } else if (moqStream.isConnected) {
      setMoqStatus("connecting");
    } else {
      setMoqStatus("disconnected");
    }
    
    // Subscribe to MoQ debug events if available
    if (moqStream.debugEvents) {
      const unsubscribeOutgoing = moqStream.debugEvents.onOutgoing?.((data: any) => {
        const entry: LogEntry = {
          id: `out-${outgoingCountRef.current++}`,
          timestamp: Date.now(),
          data: data,
          size: JSON.stringify(data).length,
        };
        setOutgoingLogs(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
      });
      
      const unsubscribeIncoming = moqStream.debugEvents.onIncoming?.((data: any) => {
        const entry: LogEntry = {
          id: `in-${incomingCountRef.current++}`,
          timestamp: Date.now(),
          data: data,
          size: JSON.stringify(data).length,
        };
        setIncomingLogs(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
      });
      
      return () => {
        unsubscribeOutgoing?.();
        unsubscribeIncoming?.();
      };
    }
  }, [moqStream]);
  
  if (!enabled || !moqStream) return null;
  
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
  };
  
  const formatData = (data: any) => {
    if (!data) return "null";
    
    // For presence data, show key fields
    if (data.pos && data.rot && data.vel) {
      return `pos: ${data.pos.x?.toFixed(1)},${data.pos.y?.toFixed(1)},${data.pos.z?.toFixed(1)}`;
    }
    
    // For other data, show first few fields
    const str = JSON.stringify(data);
    if (str.length > 50) {
      return str.substring(0, 50) + "...";
    }
    return str;
  };
  
  const getStatusColor = () => {
    switch (moqStatus) {
      case "connected": return "bg-green-500";
      case "connecting": return "bg-yellow-500";
      case "disconnected": return "bg-red-500";
    }
  };
  
  const getStatusText = () => {
    switch (moqStatus) {
      case "connected": return "MoQ Connected";
      case "connecting": return "MoQ Connecting...";
      case "disconnected": return "MoQ Disconnected";
    }
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-black/80 text-white px-4 py-2 rounded-lg backdrop-blur-sm hover:bg-black/90 transition-colors flex items-center gap-2"
        >
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
          <span className="text-xs font-mono">MoQ Debug</span>
        </button>
      ) : (
        <div className="bg-black/90 text-white rounded-lg backdrop-blur-sm border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-black/50 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
              <span className="text-xs font-bold">{getStatusText()}</span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-white/60 hover:text-white transition-colors text-xs"
            >
              ▼
            </button>
          </div>
          
          {/* Content */}
          <div className="flex divide-x divide-white/10">
            {/* Outgoing Column */}
            <div className="w-64">
              <div className="px-3 py-1 bg-blue-900/30 border-b border-white/10">
                <div className="text-xs font-semibold text-blue-300">
                  ↑ Outgoing ({outgoingCountRef.current})
                </div>
              </div>
              <div className="h-64 overflow-y-auto overflow-x-hidden">
                {outgoingLogs.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-white/40">No data sent yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {outgoingLogs.map(log => (
                      <div key={log.id} className="px-2 py-1 hover:bg-white/5 group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40 font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {log.size}B
                          </span>
                        </div>
                        <div className="text-[11px] text-blue-300 font-mono truncate">
                          {formatData(log.data)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Incoming Column */}
            <div className="w-64">
              <div className="px-3 py-1 bg-green-900/30 border-b border-white/10">
                <div className="text-xs font-semibold text-green-300">
                  ↓ Incoming ({incomingCountRef.current})
                </div>
              </div>
              <div className="h-64 overflow-y-auto overflow-x-hidden">
                {incomingLogs.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-white/40">No data received yet</div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {incomingLogs.map(log => (
                      <div key={log.id} className="px-2 py-1 hover:bg-white/5 group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-white/40 font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <span className="text-[10px] text-white/30">
                            {log.size}B
                          </span>
                        </div>
                        <div className="text-[11px] text-green-300 font-mono truncate">
                          {formatData(log.data)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-3 py-1 bg-black/50 border-t border-white/10 flex justify-between items-center">
            <div className="text-[10px] text-white/40">
              {moqStream?.participants?.length || 0} peers connected
            </div>
            <div className="text-[10px] text-white/40">
              Relay: Cloudflare MoQ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}