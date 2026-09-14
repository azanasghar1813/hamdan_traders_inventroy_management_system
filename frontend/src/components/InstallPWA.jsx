import React, { useState, useEffect } from 'react';

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if the user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if app is already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Update UI notify the user they can install the PWA
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      // Hide the app-provided install promotion
      setIsInstallable(false);
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      // Optionally, send analytics event to indicate successful install
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (isStandalone) {
    return null; // Don't show anything if already installed
  }

  return (
    <>
      {isInstallable && (
        <div className="fixed bottom-4 right-4 z-[9999] bg-white p-4 rounded-lg shadow-xl border border-gray-200 flex flex-col sm:flex-row items-center gap-4 animate-bounce">
          <div>
            <p className="font-semibold text-gray-800">Install Hamdan Traders</p>
            <p className="text-sm text-gray-600">Install our app for a better experience</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            Install App
          </button>
        </div>
      )}
      
      {isIOS && !isStandalone && (
        <div className="fixed bottom-0 left-0 w-full bg-indigo-50 p-4 border-t border-indigo-200 text-indigo-800 text-sm flex justify-between items-center z-[9999]">
          <span>
            To install this app on your iOS device, tap the <strong>Share</strong> button and then <strong>"Add to Home Screen"</strong>.
          </span>
          <button 
            className="ml-4 text-indigo-600 hover:text-indigo-800 font-bold p-2"
            onClick={() => setIsIOS(false)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
};

export default InstallPWA;
