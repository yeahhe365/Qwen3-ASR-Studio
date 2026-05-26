import { useCallback, useEffect, useRef, useState } from 'react';
import type { BeforeInstallPromptEvent, Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;

export function usePwaInstall(notify: Notify) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      if (isMountedRef.current) {
        setInstallPrompt(event);
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    let isDisposed = false;
    let hasNotifiedUpdate = false;

    const notifyUpdateReady = () => {
      if (!isDisposed && !hasNotifiedUpdate && isMountedRef.current && navigator.serviceWorker.controller) {
        hasNotifiedUpdate = true;
        notify('新版本已准备好，刷新页面后生效。', 'success');
      }
    };

    const watchRegistrationUpdates = (registration: ServiceWorkerRegistration) => {
      if (registration.waiting) {
        notifyUpdateReady();
      }

      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (!installingWorker) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            notifyUpdateReady();
          }
        });
      });
    };

    const registerServiceWorker = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          watchRegistrationUpdates(registration);
          return registration.update();
        })
        .catch((error) => {
          console.warn('Service worker registration failed:', error);
        });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
    } else {
      window.addEventListener('load', registerServiceWorker, { once: true });
    }

    return () => {
      isDisposed = true;
      window.removeEventListener('load', registerServiceWorker);
    };
  }, [notify]);

  const installApp = useCallback(async () => {
    if (!installPrompt) {
      notify('安装失败，无法找到安装提示。', 'error');
      return;
    }

    try {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      if (!isMountedRef.current) {
        return;
      }
      notify(choiceResult.outcome === 'accepted' ? '应用安装成功！' : '应用安装已取消。', 'success');
      setInstallPrompt(null);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      console.error('Failed to install app:', error);
      notify('安装失败，请稍后重试。', 'error');
      setInstallPrompt(null);
    }
  }, [installPrompt, notify]);

  return {
    canInstall: Boolean(installPrompt),
    installApp,
  };
}
