
import { Character, GameSettings } from '../types';
import Peer from 'peerjs';

export type PeerData = 
  | { type: 'CHAT'; payload: { text: string; senderName: string; timestamp: number; recipientId?: string; recipientName?: string; imageUrl?: string } }
  | { type: 'ROLL'; payload: { message: string; result: number; senderName: string; isBlind?: boolean } }
  | { type: 'STATE_SYNC'; payload: any }
  | { type: 'DELTA_UPDATE'; payload: { type: 'TOKEN_MOVE'; id: string; pos: {x: number, y: number} } }
  | { type: 'JOIN_REQUEST'; payload: { character: Character } }
  | { type: 'JOIN_RESPONSE'; payload: { approved: boolean; reason?: string } }
  | { type: 'PLAYER_JOIN'; payload: { character: Character; peerId?: string } }
  | { type: 'MAP_PING'; payload: { x: number; y: number; color: string; sender: string } }
  | { type: 'FORCE_VIEW'; payload: { x: number; y: number } }
  | { type: 'GAME_PAUSE'; payload: { isPaused: boolean } }
  | { type: 'TRADE'; payload: { from: string; to: string; item: string } }
  | { type: 'DRAW_LINE'; payload: { points: any[]; color: string; width: number } }
  | { type: 'UPDATE_SETTINGS'; payload: { settings: GameSettings } }
  | { type: 'PLAYER_READY'; payload: { peerId: string; isReady: boolean } }
  | { type: 'START_GAME'; payload: { timestamp: number } }
  | { type: 'PING' }
  | { type: 'CRDT_UPDATE'; payload: { updateData: Uint8Array } }
  | { type: 'CRDT_SYNC'; payload: { syncData: Uint8Array } }
  | { type: 'CURSOR_MOVE'; payload: { peerId: string; x: number; y: number; color: string } };

class PeerService {
  private peer: any = null;
  private connections: any[] = []; 
  private hostConnection: any = null; 
  private meshConnections: Map<string, any> = new Map(); 
  private heartbeatInterval: any = null;
  
  private disconnectTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private manuallyDisconnected: boolean = false;
  private retryAttempt: number = 0;
  private maxRetries: number = 10;

  private localStream: MediaStream | null = null;
  private activeCalls: Map<string, any> = new Map();

  public myPeerId: string = '';
  public isHost: boolean = false;

  // Callbacks
  public onDataReceived: ((data: PeerData, connId: string) => void) | null = null;
  public onPeerConnected: ((connId: string) => void) | null = null;
  public onPeerDisconnected: ((connId: string) => void) | null = null;
  public onConnectionRequest: ((connId: string, meta: any) => void) | null = null;
  public onPeerStatusChange: ((connId: string, status: 'online' | 'reconnecting' | 'offline') => void) | null = null;
  public onStreamFound: ((peerId: string, stream: MediaStream) => void) | null = null;
  public onStreamLost: ((peerId: string) => void) | null = null;

  initialize(id?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
          if (this.peer) {
              resolve(this.myPeerId);
              return;
          }

          this.peer = new Peer(id, {
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
            this.startHeartbeat();
            resolve(id);
          });

          this.peer.on('connection', (conn: any) => {
            this.handleIncomingConnection(conn);
          });

          this.peer.on('call', (call: any) => {
              this.handleIncomingCall(call);
          });

          this.peer.on('disconnected', () => {
              console.log('Connection lost. Reconnecting...');
              if (!this.manuallyDisconnected) {
                  this.reconnect();
              }
          });

          this.peer.on('close', () => {
              console.log('Connection destroyed');
              this.stopHeartbeat();
          });

          this.peer.on('error', (err: any) => {
            console.error("PeerJS Error:", err);
            if (err.type === 'peer-unavailable') return;
            if (err.type === 'unavailable-id' || err.type === 'invalid-id') {
                reject(err);
            }
          });
      } catch (e) {
          reject(e);
      }
    });
  }

  private reconnect() {
      if (this.retryAttempt < this.maxRetries) {
          setTimeout(() => {
              if (this.peer && !this.peer.destroyed) {
                  this.peer.reconnect();
                  this.retryAttempt++;
              }
          }, 2000 * Math.pow(2, this.retryAttempt));
      }
  }

  connectToHost(hostId: string, character: Character): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!hostId || hostId.length < 3) {
          reject(new Error("Invalid Host ID format"));
          return;
      }

      const attemptConnection = () => {
          try {
            this._connect(hostId, character, resolve, reject);
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
    if (!this.peer) {
        reject(new Error("Peer not initialized"));
        return;
    }
    const conn = this.peer.connect(hostId, {
        metadata: { name: character.name },
        reliable: true,
        serialization: 'json'
    });

    if (!conn) {
        reject(new Error("Could not create connection object"));
        return;
    }

    this.hostConnection = conn;
    this.isHost = false;

    conn.on('open', () => {
        this.sendToHost({ 
            type: 'JOIN_REQUEST', 
            payload: { character: character } 
        });
    });

    conn.on('data', (data: PeerData) => {
        if (data.type === 'PING') return;
        
        if (data.type === 'JOIN_RESPONSE') {
            if (data.payload.approved) {
                resolve();
            } else {
                reject(new Error(data.payload.reason || "Connection Rejected"));
                this.destroy(); 
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

    conn.on('error', (err: any) => reject(err));
  }

  private handleIncomingConnection(conn: any) {
    conn.on('open', () => {});

    conn.on('data', (data: PeerData) => {
      if (data.type === 'PING') {
          if (this.disconnectTimers.has(conn.peer)) {
              clearTimeout(this.disconnectTimers.get(conn.peer)!);
          }
          if (this.onPeerStatusChange) this.onPeerStatusChange(conn.peer, 'online');
          
          this.disconnectTimers.set(conn.peer, setTimeout(() => {
              if (this.onPeerStatusChange) this.onPeerStatusChange(conn.peer, 'reconnecting');
          }, 10000));
          return;
      }

      if (data.type === 'JOIN_REQUEST') {
          if (this.onConnectionRequest) {
              (conn as any)._pendingChar = data.payload.character;
              this.onConnectionRequest(conn.peer, { conn, character: data.payload.character });
          }
      } else {
          if (this.isHost && this.connections.find(c => c.peer === conn.peer)) {
              if (this.onDataReceived) this.onDataReceived(data, conn.peer);
          } else if (!this.isHost) {
              if (this.onDataReceived) this.onDataReceived(data, conn.peer);
          }
      }
    });

    conn.on('close', () => {
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      this.meshConnections.delete(conn.peer);
      if (this.onPeerDisconnected) this.onPeerDisconnected(conn.peer);
    });
  }

  private startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatInterval = setInterval(() => {
          if (this.connections.length > 0) this.broadcast({ type: 'PING' });
          if (this.hostConnection && this.hostConnection.open) this.sendToHost({ type: 'PING' });
          this.meshConnections.forEach(conn => {
              if (conn.open) conn.send({ type: 'PING' });
          });
      }, 4000);
  }

  private stopHeartbeat() {
      if (this.heartbeatInterval) {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = null;
      }
  }

  acceptConnection(conn: any) {
      if (!this.connections.find(c => c.peer === conn.peer)) {
          this.connections.push(conn);
          conn.send({ type: 'JOIN_RESPONSE', payload: { approved: true } });
          if (this.onPeerConnected) this.onPeerConnected(conn.peer);
          
          if ((conn as any)._pendingChar) {
             this.broadcast({ type: 'PLAYER_JOIN', payload: { character: (conn as any)._pendingChar, peerId: conn.peer } });
          }
      }
  }

  rejectConnection(conn: any) {
      try {
        conn.send({ type: 'JOIN_RESPONSE', payload: { approved: false, reason: "Host rejected connection" } });
        setTimeout(() => conn.close(), 500);
      } catch (e) {}
  }

  broadcast(data: PeerData, excludeId?: string) {
    this.connections.forEach(conn => {
      if (conn.open && conn.peer !== excludeId) {
        try { conn.send(data); } catch (e) { console.error("Broadcast failed", e); }
      }
    });
  }

  sendToHost(data: PeerData) {
    if (this.hostConnection && this.hostConnection.open) {
        try { this.hostConnection.send(data); } catch (e) { console.error("Send to host failed", e); }
    }
  }

  sendDirect(connId: string, data: PeerData) {
      const conn = this.connections.find(c => c.peer === connId) || this.meshConnections.get(connId);
      if (conn && conn.open) {
          try { conn.send(data); } catch (e) { console.error("Direct send failed", e); }
      }
  }

  connectToMeshPeers(peerIds: string[]) {
      if (!this.peer) return;
      peerIds.forEach(id => {
          if (id === this.myPeerId) return;
          if (this.meshConnections.has(id)) return;
          
          const conn = this.peer.connect(id, { reliable: true });
          this.meshConnections.set(id, conn);
          
          conn.on('open', () => {});
          conn.on('data', (data: PeerData) => {
              if (this.onDataReceived) this.onDataReceived(data, id);
          });
      });
  }

  async startMedia(video: boolean, audio: boolean): Promise<MediaStream> {
      try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ video, audio });
          const targets = this.isHost 
                ? this.connections.map(c => c.peer) 
                : [this.hostConnection?.peer, ...Array.from(this.meshConnections.keys())].filter(Boolean);
          
          targets.forEach(peerId => {
              if (!peerId || !this.peer) return;
              const call = this.peer.call(peerId, this.localStream);
              this.handleMediaCall(call);
          });
          
          return this.localStream;
      } catch (e) {
          console.error("Failed to get local media", e);
          throw e;
      }
  }

  stopMedia() {
      if (this.localStream) {
          this.localStream.getTracks().forEach(t => t.stop());
          this.localStream = null;
      }
      this.activeCalls.forEach(call => call.close());
      this.activeCalls.clear();
  }

  private handleIncomingCall(call: any) {
      call.answer(this.localStream); 
      this.handleMediaCall(call);
  }

  private handleMediaCall(call: any) {
      this.activeCalls.set(call.peer, call);
      
      call.on('stream', (remoteStream: MediaStream) => {
          if (this.onStreamFound) this.onStreamFound(call.peer, remoteStream);
      });

      call.on('close', () => {
          this.activeCalls.delete(call.peer);
          if (this.onStreamLost) this.onStreamLost(call.peer);
      });
      
      call.on('error', (e: any) => console.error("Call error", e));
  }

  destroy() {
    this.stopHeartbeat();
    this.stopMedia();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.connections = [];
    this.hostConnection = null;
    this.meshConnections.clear();
  }
}

export const peerService = new PeerService();
