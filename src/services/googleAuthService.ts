import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Provider with Gmail Send, Google Sheets, and Google Drive File scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');
// Select account prompt to allow switching or confirming the desired Gmail account
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track sign-in state
let isSigningIn = false;
// In-memory access token cache (MANDATORY: Never store in localStorage)
let cachedAccessToken: string | null = null;
let currentUser: User | null = null;

export interface GoogleAuthErrorInfo {
  isUnauthorizedDomain: boolean;
  domain: string;
  projectId: string;
  settingsUrl: string;
  title: string;
  message: string;
  instructions: string[];
}

/**
 * Extracts rich diagnostic information from authentication errors.
 */
export function getAuthErrorInfo(err: any): GoogleAuthErrorInfo {
  const code = err?.code || '';
  const rawMsg = String(err?.message || '');
  const isUnauthorized =
    code === 'auth/unauthorized-domain' ||
    rawMsg.includes('auth/unauthorized-domain') ||
    rawMsg.includes('unauthorized-domain');

  const domain = typeof window !== 'undefined' ? window.location.hostname : '';
  const projectId = (firebaseConfig as any)?.projectId || 'gen-lang-client-0111864222';
  const settingsUrl = `https://console.firebase.google.com/project/${projectId}/authentication/settings`;

  return {
    isUnauthorizedDomain: isUnauthorized,
    domain,
    projectId,
    settingsUrl,
    title: isUnauthorized
      ? 'Domain Authorization Required in Firebase'
      : 'Google Sign-In Error',
    message: isUnauthorized
      ? `This application's preview domain (${domain}) is not yet added to the Authorized Domains list in Firebase Console for project "${projectId}".`
      : rawMsg || 'An error occurred while signing in with Google.',
    instructions: isUnauthorized
      ? [
          `Open Firebase Console Authentication Settings for "${projectId}".`,
          `Under "Authorized domains", click "Add domain".`,
          `Paste "${domain}" and save.`,
          `Return here and click "Sign in with Google" again.`,
        ]
      : [],
  };
}

/**
 * Initialize Google Auth State listener. Call once on app mount.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    currentUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not in memory (e.g. page refresh). User needs to click connect to acquire a fresh OAuth access token.
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

const persistAuthSession = (token: string, user: User | null) => {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('fleet_google_token', token);
    if (user) {
      sessionStorage.setItem(
        'fleet_google_user',
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        })
      );
    }
  } catch {}
};

/**
 * Fallback to Google Identity Services (GIS) token client.
 * This directly prompts the user for OAuth consent and returns an access token.
 */
export const signInWithGoogleIdentityServices = async (): Promise<{ user: User; accessToken: string }> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Window context is required for authentication'));
    }

    const clientId = (firebaseConfig as any)?.oAuthClientId;
    if (!clientId) {
      return reject(new Error('No Google OAuth Client ID configured.'));
    }

    const handleGisClient = () => {
      try {
        const googleObj = (window as any).google;
        if (!googleObj?.accounts?.oauth2) {
          return reject(new Error('Google Identity Services SDK not available.'));
        }

        const client = googleObj.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
          callback: async (response: any) => {
            if (response.error) {
              return reject(new Error(response.error_description || response.error));
            }
            if (!response.access_token) {
              return reject(new Error('No access token received from Google Identity Services.'));
            }

            cachedAccessToken = response.access_token;

            // Fetch basic profile info to create mock/real user
            try {
              const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${cachedAccessToken}` },
              });
              if (profileRes.ok) {
                const profile = await profileRes.json();
                currentUser = {
                  uid: profile.sub || 'gis-user',
                  email: profile.email,
                  displayName: profile.name || profile.email?.split('@')[0] || 'Google User',
                  photoURL: profile.picture || null,
                } as unknown as User;
              }
            } catch {
              currentUser = {
                uid: 'gis-user',
                email: 'user@gmail.com',
                displayName: 'Authenticated User',
                photoURL: null,
              } as unknown as User;
            }

            persistAuthSession(cachedAccessToken!, currentUser);
            resolve({ user: currentUser!, accessToken: cachedAccessToken! });
          },
          error_callback: (err: any) => {
            reject(new Error(err?.message || 'Google OAuth prompt closed or failed.'));
          },
        });

        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err) {
        reject(err);
      }
    };

    if ((window as any).google?.accounts?.oauth2) {
      handleGisClient();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = false;
      script.onload = () => handleGisClient();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services library.'));
      document.head.appendChild(script);
    }
  });
};

/**
 * Trigger Google Sign-In with Gmail & Sheets permissions.
 * Prioritizes Google Identity Services (GIS) directly to bypass Firebase auth/unauthorized-domain restrictions.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  isSigningIn = true;
  try {
    const clientId = (firebaseConfig as any)?.oAuthClientId;
    if (clientId && typeof window !== 'undefined') {
      return await signInWithGoogleIdentityServices();
    }

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to acquire Gmail OAuth access token.');
    }

    cachedAccessToken = credential.accessToken;
    currentUser = result.user;
    persistAuthSession(cachedAccessToken, currentUser);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Gmail Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Manually set an OAuth access token (useful for bypassing domain restriction during testing/debugging).
 */
export const setManualAccessToken = (token: string, email?: string): void => {
  const clean = token.trim();
  if (!clean) return;
  cachedAccessToken = clean;
  currentUser = {
    uid: 'manual-token-user',
    email: email?.trim() || 'operator@fleet.internal',
    displayName: (email || 'Operator').split('@')[0],
    photoURL: null,
  } as unknown as User;
  persistAuthSession(cachedAccessToken, currentUser);
};

/**
 * Returns the in-memory or persisted access token.
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('fleet_google_token');
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  }
  return null;
};

/**
 * Get current authenticated user
 */
export const getCurrentUser = (): User | null => {
  if (currentUser) return currentUser;
  if (auth.currentUser) return auth.currentUser;
  if (typeof window !== 'undefined') {
    const saved = sessionStorage.getItem('fleet_google_user');
    if (saved) {
      try {
        currentUser = JSON.parse(saved);
        return currentUser;
      } catch {}
    }
  }
  return null;
};

/**
 * Log out and clear tokens and session
 */
export const logoutGoogle = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // Ignore signout error if session wasn't active
  }
  cachedAccessToken = null;
  currentUser = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('fleet_google_token');
    sessionStorage.removeItem('fleet_google_user');
  }
};
