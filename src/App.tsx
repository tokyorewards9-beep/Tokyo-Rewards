/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CallProvider } from './context/CallContext';
import { AppShell } from './components/layout/AppShell';
import { SplashScreen } from './components/splash/SplashScreen';
import { AuthEntryPage } from './pages/AuthEntryPage';

const RootAppRouter: React.FC = () => {
  const { status, errorMessage, retryInitialization, previewShellMode } = useAuth();
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (status !== 'initializing') {
      // Smooth, restrained transition out
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setIsFadingOut(false);
      setShowSplash(true);
    }
  }, [status]);

  // If initialization failed with error
  if (status === 'error') {
    return (
      <SplashScreen 
        error={errorMessage || 'Failed to initialize application services'} 
        onRetry={retryInitialization} 
      />
    );
  }

  // Display the splash screen immediately while the app initializes
  if (showSplash || status === 'initializing') {
    return <SplashScreen isFadingOut={isFadingOut} />;
  }

  // If user is authenticated or reviewing application shell in preview mode
  if (status === 'authenticated' || previewShellMode) {
    return <AppShell />;
  }

  // If no user is signed in, proceed to the registration/login entry screen
  return <AuthEntryPage />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <RootAppRouter />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
