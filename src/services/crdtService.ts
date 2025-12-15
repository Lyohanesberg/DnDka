
import * as Y from 'yjs';
import { peerService } from './peerService';
import { MapToken, Note, Quest, TokenPosition, Message } from '../types';

class CRDTService {
    public doc: Y.Doc;
    
    // Shared Types
    public tokens: Y.Map<MapToken>;
    public notes: Y.Array<Note>;
    public quests: Y.Array<Quest>;
    public messages: Y.Array<Message>; // Added Chat History to CRDT
    
    private observers: Array<() => void> = [];

    constructor() {
        this.doc = new Y.Doc();
        
        // Define Shared Types
        this.tokens = this.doc.getMap('tokens');
        this.notes = this.doc.getArray('notes');
        this.quests = this.doc.getArray('quests');
        this.messages = this.doc.getArray('messages');

        // Listen for local updates and broadcast them
        this.doc.on('update', (update: Uint8Array, origin: any) => {
            // 'origin' is passed when we applyUpdate. 
            // If origin !== 'remote', it means the change happened LOCALLY (user action), so we broadcast.
            if (origin !== 'remote') {
                if (peerService.isHost) {
                    peerService.broadcast({ type: 'CRDT_UPDATE', payload: { updateData: update } });
                } else {
                    peerService.sendToHost({ type: 'CRDT_UPDATE', payload: { updateData: update } });
                }
            }
            
            // Notify local listeners (Zustand) to re-render UI
            this.notifyObservers();
        });
    }

    // Subscribe to changes (used by useGameController to update Zustand)
    subscribe(callback: () => void) {
        this.observers.push(callback);
        return () => {
            this.observers = this.observers.filter(cb => cb !== callback);
        };
    }

    private notifyObservers() {
        this.observers.forEach(cb => cb());
    }

    // Apply an update received from the network
    applyUpdate(updateData: Uint8Array) {
        try {
            // We tag this update as 'remote' so the 'update' listener (lines 26-36)
            // knows NOT to re-broadcast it, preventing infinite loops.
            Y.applyUpdate(this.doc, updateData, 'remote'); 
        } catch (e) {
            console.error("Failed to apply CRDT update", e);
        }
    }

    // Get Full State as Update (for new clients syncing)
    getEncodedState(): Uint8Array {
        return Y.encodeStateAsUpdate(this.doc);
    }

    // --- Data Mutators (UI Calls These) ---

    // TOKENS
    moveToken(id: string, pos: TokenPosition, cost: number) {
        this.doc.transact(() => {
            const token = this.tokens.get(id);
            if (token) {
                const updatedToken = { ...token, position: pos };
                this.tokens.set(id, updatedToken);
            }
        });
    }

    addToken(token: MapToken) {
        this.doc.transact(() => {
            this.tokens.set(token.id, token);
        });
    }

    removeToken(id: string) {
        this.doc.transact(() => {
            this.tokens.delete(id);
        });
    }

    setTokens(tokens: MapToken[]) {
        this.doc.transact(() => {
            this.tokens.clear();
            tokens.forEach(t => this.tokens.set(t.id, t));
        });
    }

    // NOTES
    addNote(note: Note) {
        this.doc.transact(() => {
            this.notes.push([note]);
        });
    }

    // QUESTS
    addQuest(quest: Quest) {
        this.doc.transact(() => {
            this.quests.push([quest]);
        });
    }

    updateQuest(id: string, updates: Partial<Quest>) {
        this.doc.transact(() => {
            let index = -1;
            const currentQuests = this.quests.toArray();
            for (let i = 0; i < currentQuests.length; i++) {
                if (currentQuests[i].id === id || currentQuests[i].title === id) {
                    index = i;
                    break;
                }
            }

            if (index !== -1) {
                const oldQuest = this.quests.get(index);
                const newQuest = { ...oldQuest, ...updates };
                this.quests.delete(index, 1);
                this.quests.insert(index, [newQuest]);
            }
        });
    }

    // CHAT
    addMessage(message: Message) {
        this.doc.transact(() => {
            this.messages.push([message]);
            // Limit history size to prevent performance issues (e.g., keep last 200)
            if (this.messages.length > 200) {
                this.messages.delete(0, this.messages.length - 200);
            }
        });
    }

    setMessages(messages: Message[]) {
        this.doc.transact(() => {
            this.messages.delete(0, this.messages.length);
            this.messages.insert(0, messages);
        });
    }

    // --- Data Accessors (for Zustand Sync) ---
    
    getTokensArray(): MapToken[] {
        return Array.from(this.tokens.values());
    }

    getNotesArray(): Note[] {
        return this.notes.toArray();
    }

    getQuestsArray(): Quest[] {
        return this.quests.toArray();
    }

    getMessagesArray(): Message[] {
        return this.messages.toArray();
    }
}

export const crdtService = new CRDTService();