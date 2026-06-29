'use client';

import { useEffect, useState } from 'react';

const KEY_MODAL_SHOWN = 'famapp_modal_shown';
const KEY_BANNER_DISMISSED = 'famapp_banner_dismissed';

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useIOSInstallPrompt() {
  const [showModal, setShowModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Alleen tonen op iOS Safari buiten standalone-modus.
    if (!isIOSSafari() || isStandalone()) return;

    const modalShown = localStorage.getItem(KEY_MODAL_SHOWN) === 'true';
    const bannerDismissed = localStorage.getItem(KEY_BANNER_DISMISSED) === 'true';

    if (!modalShown) {
      setShowModal(true);
    } else if (!bannerDismissed) {
      setShowBanner(true);
    }
  }, []);

  const dismissModal = () => {
    localStorage.setItem(KEY_MODAL_SHOWN, 'true');
    setShowModal(false);
    // Na modal tonen we de banner als fallback.
    const bannerDismissed = localStorage.getItem(KEY_BANNER_DISMISSED) === 'true';
    if (!bannerDismissed) setShowBanner(true);
  };

  const dismissBanner = () => {
    localStorage.setItem(KEY_BANNER_DISMISSED, 'true');
    setShowBanner(false);
  };

  return { showModal, showBanner, dismissModal, dismissBanner };
}
