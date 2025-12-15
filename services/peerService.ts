

import { Message, LocationState, CombatState, MapToken, Quest, Note, Character, MapObject, MapTemplate, GameSettings } from '../types';

// Define the structure of data packages sent over P2P
export type PeerData = 
  | { type: 'CHAT'; payload: { text: string; senderName: string; timestamp: number; recipientId?: string; recipientName?: string; imageUrl?: string } }
  | { type: 'ROLL'; payload: { message: string; result: number; senderName: string; isBlind?: boolean } }
  | { type: 'STATE_SYNC'; payload: GameStateSync }
  | { type: 'DELTA_UPDATE'; payload: { type: 'TOKEN_MOVE'; id: string; pos: {x: number, y: number} } }
  | { type: 'JOIN_REQUEST'; payload: { character: Character } }
  | { type: 'JOIN_RESPONSE'; payload: { approved: boolean; reason?: string } }
  | { type: 'PLAYER_JOIN'; payload: { character: Character } } // Broadcast to others
  | { type: 'MAP_PING'; payload: { x: number; y: number; color: string; sender: string } }
  | { type: 'FORCE_VIEW'; payload: { x: number; y: number } }
  | { type: 'GAME_PAUSE'; payload: { isPaused: boolean } }
  | { type: 'TRADE'; payload: { from: string; to: string; item: string } }
  | { type: 'DRAW_LINE'; payload: { points: any[]; color: string; width: number } }
  | { type: 'UPDATE_SETTINGS'; payload: { settings: GameSettings } } // Host -> Clients
  | { type: 'PLAYER_READY'; payload: { peerId: string; isReady: boolean } } // Client -> Host
  | { type: 'START_GAME'; payload: { timestamp: number } } // Host -> Clients
  | { type: 'PING' }; // Keep-alive packet

export interface GameStateSync {
  messages: Message[];
  location: LocationState;
  combatState: CombatState;
  mapTokens: MapToken[];
  mapObjects: MapObject[];
  mapTemplates: MapTemplate[];
  quests: Quest[];
  notes: Note[];
  storySummary: string;
  isGamePaused?: boolean; // Sync pause state
  gameSettings?: GameSettings; // Sync global settings
}

declare global {
  interface Window {
    Peer: any;
  }
}

class PeerService {
  private peer: any = null;
  private connections: any[] = []; // List of connected data connections (for Host)
  private hostConnection: any = null; // Connection to Host (for Client)
  private heartbeatInterval: any = null;
  
  public myPeerId: string = '';
  public isHost: boolean = false;

  // Callbacks
  public onDataReceived: ((data: PeerData, connId: string) => void) | null = null;
  public onPeerConnected: ((connId: string) => void) | null = null;
  public onPeerDisconnected: ((connId: string) => void) | null = null;
  public onConnectionRequest: ((connId: string, meta: any) => void) | null = null;

  initialize(id?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.Peer) {
        reject("PeerJS library not loaded");
        return;
      }

      try {
          if (this.peer) {
              resolve(this.myPeerId);
              return;
          }

          // Added keep-alive configs to PeerJS options
          this.peer = new window.Peer(id, {
            debug: 1,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
          });

          this.peer.on('open', (id: string) => {
            this.myPeerId = id;
            console.log('My peer ID is: ' + id);
            this.startHeartbeat(); // Start sending pings immediately
            resolve(id);
          });

          this.peer.on('connection', (conn: any) => {
            this.handleIncomingConnection(conn);
          });

          // CRITICAL: Auto-reconnect if connection to signaling server is lost
          // This keeps the "Room" alive even if internet blips
          this.peer.on('disconnected', () => {
              console.log('Connection lost. Reconnecting...');
              try {
                 this.peer.reconnect();
              } catch (e) { console.error("Reconnect failed", e); }
          });

          this.peer.on('close', () => {
              console.log('Connection destroyed');
              this.stopHeartbeat();
          });

          this.peer.on('error', (err: any) => {
            console.error("PeerJS Error:", err);
            // Don't reject immediately on all errors, only fatal ones during init
            if (err.type === 'unavailable-id' || err.type === 'invalid-id') {
                reject(err);
            }
          });
      } catch (e) {
          reject(e);
      }
    });
  }

  connectToHost(hostId: string, character: Character): Promise<void> {
    return new Promise((resolve, reject) => {
      // 1. Validation
      if (!hostId || hostId.length < 3) {
          reject(new Error("Invalid Host ID format"));
          return;
      }

      const attemptConnection = () => {
          try {
            // Connect without timeout to allow for network latency
            this._connect(hostId, character, 
                () => {
                    resolve();
                }, 
                (err: any) => {
                    reject(err);
                }
            );
          } catch (e) {
              reject(e);
          }
      };

      if (!this.peer) {
        this.initialize().then(attemptConnection).catch(reject);
      } else {
        attemptConnection();
      }
    });
  }

  private _connect(hostId: string, character: Character, resolve: any, reject: any) {
    try {
        const conn = this.peer.connect(hostId, {
            metadata: { name: character.name },
            reliable: true,
            serialization: 'json'
        });

        if (!conn) {
            reject(new Error("Could not create connection object"));
            return;
        }

        // Set connection reference early
        this.hostConnection = conn;
        this.isHost = false;

        conn.on('open', () => {
            // Send Join Request
            this.sendToHost({ 
                type: 'JOIN_REQUEST', 
                payload: { character: character } 
            });
            // We don't resolve yet, we wait for JOIN_RESPONSE
        });

        conn.on('data', (data: PeerData) => {
            if (data.type === 'PING') return; // Ignore heartbeats
            
            if (data.type === 'JOIN_RESPONSE') {
                if (data.payload.approved) {
                    resolve();
                } else {
                    reject(new Error(data.payload.reason || "Connection Rejected"));
                    this.destroy(); // Close connection
                }
            } else {
                if (this.onDataReceived) this.onDataReceived(data, hostId);
            }
        });

        conn.on('close', () => {
            console.warn("Connection to host lost");
            this.hostConnection = null;
            if (this.onPeerDisconnected) this.onPeerDisconnected(hostId);
        });

        conn.on('error', (err: any) => {
            console.error("Connection Error:", err);
            reject(err);
        });
        
    } catch (e) {
        reject(e);
    }
  }

  private handleIncomingConnection(conn: any) {
    // We don't add to 'connections' yet. We wait for JOIN_REQUEST.
    
    conn.on('open', () => {
      // Wait for data
    });

    conn.on('data', (data: PeerData) => {
      if (data.type === 'PING') return;

      if (data.type === 'JOIN_REQUEST') {
          // Notify Host App to Approve/Reject
          if (this.onConnectionRequest) {
              // Temporary attach connection object so we can reference it
              (conn as any)._pendingChar = data.payload.character;
              this.onConnectionRequest(conn.peer, { conn, character: data.payload.character });
          }
      } else {
          // Normal data handling
          // Verify if this connection is in our approved list
          if (this.connections.find(c => c.peer === conn.peer)) {
              if (this.onDataReceived) this.onDataReceived(data, conn.peer);
          }
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      if (this.onPeerDisconnected) this.onPeerDisconnected(conn.peer);
    });

    conn.on('error', (err: any) => {
        console.error("Incoming connection error", err);
        this.connections = this.connections.filter(c => c.peer !== conn.peer);
    });
  }

  // --- Keep Alive System ---
  
  private startHeartbeat() {
      this.stopHeartbeat();
      // Send a ping every 4 seconds to keep connections open through routers/NAT
      this.heartbeatInterval = setInterval(() => {
          if (this.connections.length > 0) {
              this.broadcast({ type: 'PING' });
          }
          if (this.hostConnection && this.hostConnection.open) {
              this.sendToHost({ type: 'PING' });
          }
      }, 4000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
      }
  }

  // --- Sending Methods ---

  acceptConnection(conn: any) {
      if (!this.connections.find(c => c.peer === conn.peer)) {
          this.connections.push(conn);
          // Send approval
          conn.send({ type: 'JOIN_RESPONSE', payload: { approved: true } });
          
          if (this.onPeerConnected) this.onPeerConnected(conn.peer);
          
          // Broadcast new player to others
          if ((conn as any)._pendingChar) {
             this.broadcast({ type: 'PLAYER_JOIN', payload: { character: (conn as any)._pendingChar } });
          }
      }
  }

  rejectConnection(conn: any) {
      try {
        conn.send({ type: 'JOIN_RESPONSE', payload: { approved: false, reason: "Host rejected connection" } });
        setTimeout(() => conn.close(), 500);
      } catch (e) {}
  }

  kickPeer(peerId: string) {
      const conn = this.connections.find(c => c.peer === peerId);
      if (conn) {
          this.rejectConnection(conn); // Reuse reject logic
          this.connections = this.connections.filter(c => c.peer !== peerId);
          if (this.onPeerDisconnected) this.onPeerDisconnected(peerId);
      }
  }

  broadcast(data: PeerData, excludeId?: string) {
    this.connections.forEach(conn => {
      if (conn.open && conn.peer !== excludeId) {
        try {
            conn.send(data);
        } catch (e) {
            console.error("Failed to broadcast to", conn.peer, e);
        }
      }
    });
  }

  sendToHost(data: PeerData) {
    if (this.hostConnection && this.hostConnection.open) {
        try {
             this.hostConnection.send(data);
        } catch (e) {
            console.error("Failed to send to host", e);
        }
    }
  }

  // Send to a specific client (Host use only)
  sendDirect(connId: string, data: PeerData) {
      const conn = this.connections.find(c => c.peer === connId);
      if (conn && conn.open) {
          try {
              conn.send(data);
          } catch (e) {
              console.error("Failed to send direct message", e);
          }
      }
  }

  destroy() {
    this.stopHeartbeat();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.hostConnection = null;
  }
}

export const peerService = new PeerService();
