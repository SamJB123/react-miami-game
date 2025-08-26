"use client";

import { Html } from "@react-three/drei";
import { useEffect, useState, useRef } from "react";
import { useMoQParty } from "./moq-party-provider";
import type { PresenceType } from "game-schemas";
import type { MoQGameStreamState, PresenceUpdate } from "@/hooks/useMoQGameStream";

interface LogEntry {
  id: string;
  timestamp: number;
  data: PresenceUpdate | PresenceType;
  size: number;
}

const MAX_LOG_ENTRIES = 10;

export function MoQDebugOverlay3D({ enabled = false }: { enabled?: boolean }) {
  const [outgoingLogs, setOutgoingLogs] = useState<LogEntry[]>([]);
  const [incomingLogs, setIncomingLogs] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [moqStatus, setMoqStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const outgoingCountRef = useRef(0);
  const incomingCountRef = useRef(0);
  
  // Try to get MoQ stream
  let moqStream: MoQGameStreamState | null = null;
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
      const unsubscribeOutgoing = moqStream.debugEvents.onOutgoing((data: PresenceUpdate) => {
        const entry: LogEntry = {
          id: `out-${outgoingCountRef.current++}`,
          timestamp: Date.now(),
          data: data,
          size: JSON.stringify(data).length,
        };
        setOutgoingLogs(prev => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
      });
      
      const unsubscribeIncoming = moqStream.debugEvents.onIncoming((data: PresenceType) => {
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
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
  };
  
  const formatData = (data: PresenceUpdate | PresenceType) => {
    if (!data) return "null";
    
    // For presence data, show key fields
    if (data.pos && data.rot && data.vel) {
      return `P:${data.pos.x?.toFixed(0)},${data.pos.y?.toFixed(0)},${data.pos.z?.toFixed(0)}`;
    }
    
    // For other data, show first few fields
    const str = JSON.stringify(data);
    if (str.length > 30) {
      return str.substring(0, 30) + "...";
    }
    return str;
  };
  
  const getStatusColor = () => {
    switch (moqStatus) {
      case "connected": return "#10b981";
      case "connecting": return "#f59e0b";
      case "disconnected": return "#ef4444";
    }
  };
  
  const getStatusText = () => {
    switch (moqStatus) {
      case "connected": return "MoQ ✓";
      case "connecting": return "MoQ ...";
      case "disconnected": return "MoQ ✗";
    }
  };
  
  return (
    <Html
      position={[0, 2, -5]}
      transform
      occlude
      style={{
        width: '600px',
        userSelect: 'none',
        pointerEvents: isMinimized ? 'auto' : 'auto',
      }}
    >
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            fontSize: '12px',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: getStatusColor(),
          }} />
          <span>MoQ Debug</span>
        </button>
      ) : (
        <div style={{
          background: 'rgba(0, 0, 0, 0.9)',
          color: 'white',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'hidden',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(),
              }} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{getStatusText()}</span>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ▼
            </button>
          </div>
          
          {/* Content */}
          <div style={{ display: 'flex' }}>
            {/* Outgoing Column */}
            <div style={{ width: '300px', borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{
                padding: '4px 12px',
                background: 'rgba(59, 130, 246, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#93c5fd' }}>
                  ↑ OUT ({outgoingCountRef.current})
                </div>
              </div>
              <div style={{ height: '150px', overflowY: 'auto', overflowX: 'hidden' }}>
                {outgoingLogs.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    No data sent
                  </div>
                ) : (
                  <div>
                    {outgoingLogs.map(log => (
                      <div key={log.id} style={{
                        padding: '4px 8px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '9px',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}>
                          <span>{formatTimestamp(log.timestamp)}</span>
                          <span>{log.size}B</span>
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#93c5fd',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {formatData(log.data)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Incoming Column */}
            <div style={{ width: '300px' }}>
              <div style={{
                padding: '4px 12px',
                background: 'rgba(34, 197, 94, 0.2)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#86efac' }}>
                  ↓ IN ({incomingCountRef.current})
                </div>
              </div>
              <div style={{ height: '150px', overflowY: 'auto', overflowX: 'hidden' }}>
                {incomingLogs.length === 0 ? (
                  <div style={{ padding: '8px 12px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    No data received
                  </div>
                ) : (
                  <div>
                    {incomingLogs.map(log => (
                      <div key={log.id} style={{
                        padding: '4px 8px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '9px',
                          color: 'rgba(255, 255, 255, 0.4)',
                        }}>
                          <span>{formatTimestamp(log.timestamp)}</span>
                          <span>{log.size}B</span>
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#86efac',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
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
          <div style={{
            padding: '4px 12px',
            background: 'rgba(0, 0, 0, 0.5)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.4)',
          }}>
            <span>{moqStream?.participants?.length || 0} peers</span>
            <span>Cloudflare MoQ Relay</span>
          </div>
        </div>
      )}
    </Html>
  );
}