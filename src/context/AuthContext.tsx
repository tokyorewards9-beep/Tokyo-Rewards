import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, signOut as firebaseSignOut } from 'firebase/auth';
import { 
  observeAuthState, 
  getFirebaseAuth, 
  setLocalFirebaseConfig, 
  clearLocalFirebaseConfig, 
  resetFirebaseInstances,
  FirebaseClientConfig 
} from '../services/firebase';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  status: AuthStatus;
  user: User | null;
  isFirebaseConfigured: boolean;
  errorMessage: string | null;
  retryInitialization: () => void;
  signOut: () => Promise<void>;
  previewShellMode: boolean;
  setPreviewShellMode: (preview: boolean) => void;
  connectFirebaseConfig: (config: FirebaseClientConfig) => void;
  disconnectFirebaseConfig: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<User | null>(null);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewShellMode, setPreviewShellMode] = useState(false);

  const initializeAuth = useCallback(() => {
    setStatus('initializing');
    setErrorMessage(null);

    const unsubscribe = observeAuthState(
      (currentUser, configured) => {
        setUser(currentUser);
        setIsFirebaseConfigured(configured);

        if (currentUser) {
          setStatus('authenticated');
        } else {
          setStatus('unauthenticated');
        }
      },
      (error) => {
        console.error('Authentication initialization error:', error);
        setErrorMessage(error.message || 'Failed to initialize authentication service');
        setStatus('error');
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => {
      unsubscribe();
    };
  }, [initializeAuth]);

  const retryInitialization = () => {
    initializeAuth();
  };

  const handleSignOut = async () => {
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await firebaseSignOut(auth);
      }
      setUser(null);
      setPreviewShellMode(false);
      setStatus('unauthenticated');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const handleConnectFirebase = (config: FirebaseClientConfig) => {
    setLocalFirebaseConfig(config);
    resetFirebaseInstances();
    initializeAuth();
  };

  const handleDisconnectFirebase = () => {
    clearLocalFirebaseConfig();
    resetFirebaseInstances();
    setUser(null);
    initializeAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        isFirebaseConfigured,
        errorMessage,
        retryInitialization,
        signOut: handleSignOut,
        previewShellMode,
        setPreviewShellMode,
        connectFirebaseConfig: handleConnectFirebase,
        disconnectFirebaseConfig: handleDisconnectFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
