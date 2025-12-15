
import { DriveFile } from '../types';

// Global type definitions
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

// Safely access process.env or import.meta.env
const getEnvVar = (key: string) => {
  // Try Vite way first
  if (import.meta.env && import.meta.env[key]) return import.meta.env[key];
  // Try Node way shim
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return '';
};

let currentClientId = getEnvVar('VITE_GOOGLE_CLIENT_ID') || getEnvVar('GOOGLE_CLIENT_ID');
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/drive.file";

let tokenClient: any;
let isGapiInitialized = false;

export const isDriveConfigured = () => !!currentClientId;

export const setClientId = (id: string) => {
  currentClientId = id;
  // Reset clients to force re-init with new ID
  tokenClient = null;
};

export const initGoogleServices = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject("Window not defined");
      return;
    }

    if (isGapiInitialized) {
       if (currentClientId && window.google && !tokenClient) {
            try {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, 
              });
            } catch (e) {
                console.error("Error re-initializing token client", e);
            }
       }
       resolve();
       return;
    }

    let attempts = 0;
    const checkScripts = setInterval(() => {
      attempts++;
      if (window.gapi && window.google) {
        clearInterval(checkScripts);
        
        window.gapi.load("client", async () => {
          try {
            await window.gapi.client.init({
              discoveryDocs: DISCOVERY_DOCS,
            });
            
            isGapiInitialized = true;

            if (currentClientId) {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, 
              });
            }
            
            resolve();
          } catch (e) {
            console.error("GAPI init error", e);
            reject(e);
          }
        });
      }
      
      if (attempts > 100) {
          clearInterval(checkScripts);
          reject("Google API scripts failed to load. Check your internet connection.");
      }
    }, 100);
  });
};

export const signInToGoogle = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
       if (currentClientId && window.google) {
          try {
              tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: currentClientId,
                scope: SCOPES,
                callback: (resp: any) => {}, 
              });
          } catch (e) {
              reject(e);
              return;
          }
       } else {
          reject("Google Services not initialized or Client ID missing. Configure it in settings.");
          return;
       }
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve(resp.access_token);
    };

    tokenClient.requestAccessToken({ prompt: '' });
  });
};

export const signOutFromGoogle = () => {
  const token = window.gapi?.client?.getToken();
  if (token !== null && window.google) {
    window.google.accounts.oauth2.revoke(token.access_token);
    window.gapi.client.setToken(null);
  }
};

export const listSaveFiles = async (): Promise<DriveFile[]> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: "mimeType='application/json' and name contains 'dnd_ai_save_' and trashed=false",
      fields: "files(id, name, createdTime, modifiedTime)",
      spaces: "drive",
    });
    return response.result.files || [];
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};

export const saveGameToDrive = async (gameState: any, fileName?: string): Promise<DriveFile> => {
  const name = fileName || `dnd_ai_save_${gameState.character.name.replace(/\s+/g, '_')}_${Date.now()}.json`;
  const content = JSON.stringify(gameState, null, 2);
  
  const fileMetadata = {
    name: name,
    mimeType: 'application/json',
  };

  const multipartRequestBody =
    `\r\n--foo_bar_baz\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(fileMetadata) +
    `\r\n--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n` +
    content +
    `\r\n--foo_bar_baz--`;

  try {
    const response = await window.gapi.client.request({
      path: '/upload/drive/v3/files',
      method: 'POST',
      params: {
        uploadType: 'multipart',
      },
      headers: {
        'Content-Type': 'multipart/related; boundary=foo_bar_baz',
      },
      body: multipartRequestBody,
    });
    return response.result;
  } catch (err) {
    console.error("Error saving file", err);
    throw err;
  }
};

export const loadGameFromDrive = async (fileId: string): Promise<any> => {
  try {
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      alt: 'media',
    });
    return response.result;
  } catch (err) {
    console.error("Error loading file", err);
    throw err;
  }
};

export const deleteGameFromDrive = async (fileId: string): Promise<void> => {
  try {
    await window.gapi.client.drive.files.delete({
      fileId: fileId,
    });
  } catch (err) {
    console.error("Error deleting file", err);
    throw err;
  }
};
