import { db, auth } from '../firebaseConfig';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Message, CombatState, LocationState, MapToken, Quest, Note } from '../types';

export const SESSION_COLLECTION = 'sessions';

export interface GameSessionData {
  hostId: string;
  createdAt: any;
  location: LocationState;
  combatState: CombatState;
  mapTokens: MapToken[];
  quests: Quest[];
  notes: Note[];
  storySummary: string;
  messages: Message[];
}

export const ensureAuth = async () => {
  if (!auth.currentUser) {
    await auth.signInAnonymously();
  }
  return auth.currentUser?.uid;
};

export const createSession = async (initialState: Partial<GameSessionData>): Promise<string> => {
  const uid = await ensureAuth();
  const sessionId = Math.random().toString(36).substring(2, 9).toUpperCase();
  
  const sessionRef = db.collection(SESSION_COLLECTION).doc(sessionId);
  
  await sessionRef.set({
    hostId: uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    messages: [],
    mapTokens: [],
    quests: [],
    notes: [],
    storySummary: "",
    combatState: { isActive: false, combatants: [] },
    location: { name: "Start", description: "", isGenerating: false },
    ...initialState
  });

  return sessionId;
};

export const joinSession = async (sessionId: string): Promise<boolean> => {
  await ensureAuth();
  const docRef = db.collection(SESSION_COLLECTION).doc(sessionId);
  const docSnap = await docRef.get();
  return docSnap.exists;
};

export const subscribeToSession = (sessionId: string, callback: (data: GameSessionData) => void) => {
  const docRef = db.collection(SESSION_COLLECTION).doc(sessionId);
  
  return docRef.onSnapshot((doc) => {
    if (doc.exists) {
      callback(doc.data() as GameSessionData);
    }
  });
};

export const sendMessageToSession = async (sessionId: string, message: Message) => {
  const docRef = db.collection(SESSION_COLLECTION).doc(sessionId);
  await docRef.update({
    messages: firebase.firestore.FieldValue.arrayUnion(message)
  });
};

export const updateSessionState = async (sessionId: string, updates: Partial<GameSessionData>) => {
  const docRef = db.collection(SESSION_COLLECTION).doc(sessionId);
  await docRef.update(updates);
};
