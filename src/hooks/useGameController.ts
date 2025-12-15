import { useEffect } from 'react';
import { useGameStore } from '../store';
import { peerService } from '../services/peerService';
import { crdtService } from '../services/crdtService';

export const useGameController = () => {
    const { 
        processIncomingData, 
        addJoinRequest, 
        addPlayer, 
        removePlayer, 
        updatePeerStatus, 
        mpMode
    } = useGameStore();
    
    // 1. CRDT Subscriptions
    useEffect(() => {
        // Subscribe store to CRDT updates
        const unsubscribe = crdtService.subscribe(() => {
            // Bulk update store from CRDT source of truth
            useGameStore.setState({
                mapTokens: crdtService.getTokensArray(),
                notes: crdtService.getNotesArray(),
                quests: crdtService.getQuestsArray(),
                messages: crdtService.getMessagesArray()
            });
        });
        return unsubscribe;
    }, []);

    // 2. PeerJS Network Listeners
    useEffect(() => {
        peerService.onDataReceived = (data, connId) => {
            // Handle CRDT Messages specifically
            if (data.type === 'CRDT_UPDATE') {
                crdtService.applyUpdate(data.payload.updateData);
                if (mpMode === 'host') {
                    // Host acts as a relay for CRDT updates in star topology
                    peerService.broadcast(data, connId);
                }
            } else if (data.type === 'CRDT_SYNC') {
                crdtService.applyUpdate(data.payload.syncData);
            } else {
                // Normal flow (Chat triggers for AI, Rolls, etc)
                processIncomingData(data, connId);
            }
        };
        
        peerService.onConnectionRequest = (connId, meta) => {
            addJoinRequest({ connId, char: meta.character, connObj: meta.conn });
        };

        peerService.onPeerConnected = (id) => {
            addPlayer(id);
            
            // If Host, trigger sync for the new player
            if (mpMode === 'host') {
                 const state = useGameStore.getState();
                 // Sync non-CRDT state
                 const syncData = {
                    location: state.location,
                    combatState: state.combatState,
                    mapObjects: state.mapObjects,
                    mapTemplates: state.mapTemplates,
                    storySummary: state.storySummary,
                    isGamePaused: state.isGamePaused,
                    gameSettings: state.gameSettings
                 };
                 peerService.sendDirect(id, { type: 'STATE_SYNC', payload: syncData });
                 
                 // Send CRDT Initial State (Full Doc)
                 const crdtSync = crdtService.getEncodedState();
                 peerService.sendDirect(id, { type: 'CRDT_SYNC', payload: { syncData: crdtSync } });
            }
        };

        peerService.onPeerDisconnected = (id) => {
            removePlayer(id);
        };

        peerService.onPeerStatusChange = (id, status) => {
            updatePeerStatus(id, status);
        };

    }, [mpMode]); // Re-bind if role changes

    return null;
};