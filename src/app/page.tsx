'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [notification, setNotification] = useState<string>('');

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setNotification('App succesvol geïnstalleerd!');
    }
  };

  const handleNotification = async () => {
    const permission = Notification.permission;

    if (permission === 'denied') {
      setNotification('Notificatiepermissies zijn geweigerd');
      return;
    }

    if (permission === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      if (registration.pushManager) {
        setNotification('✅ Push-notificaties zijn ingeschakeld');
      }
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">PWA App</h1>
            <p className="text-gray-600 mb-4">Progressive Web App</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className={`p-4 rounded-lg flex items-center justify-between ${isOnline ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <span className={`font-medium ${isOnline ? 'text-green-700' : 'text-red-700'}`}>
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {isInstallable && (
              <button
                onClick={handleInstall}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                📲 App Installeren
              </button>
            )}

            <button
              onClick={handleNotification}
              className="w-full bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg hover:bg-blue-600 transition-all duration-200"
            >
              🔔 Notificaties Inschakelen
            </button>

            <button
              onClick={() => setNotification('')}
              className="w-full bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition-all duration-200"
            >
              ❌ Meldingen Wissen
            </button>
          </div>

          {notification && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 font-medium text-sm">{notification}</p>
            </div>
          )}

          <div className="mt-8 text-gray-600 text-sm space-y-1">
            <p>✅ Installeerbaar op homescreen</p>
            <p>✅ Offline-modus</p>
            <p>✅ Push-notificaties</p>
          </div>
        </div>
      </div>
    </main>
  );
}
