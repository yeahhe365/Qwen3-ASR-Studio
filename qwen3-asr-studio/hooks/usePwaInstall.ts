import { useCallback, useEffect, useState } from 'react';
import type { BeforeInstallPromptEvent, Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;

export function usePwaInstall(notify: Notify) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleInstallPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = () => {
      navigator.serviceWorker.register('/sw.js').catch(error => {
        console.warn('Service worker registration failed:', error);
      });
    };

    if (document.readyState === 'complete') {
      registerServiceWorker();
      return;
    }

    window.addEventListener('load', registerServiceWorker, { once: true });
    return () => window.removeEventListener('load', registerServiceWorker);
  }, []);

  const installApp = useCallback(() => {
    if (!installPrompt) {
      notify('安装失败，无法找到安装提示。', 'error');
      return;
    }

    installPrompt
      .prompt()
      .then(() => installPrompt.userChoice)
      .then(choiceResult => {
        notify(
          choiceResult.outcome === 'accepted' ? '应用安装成功！' : '应用安装已取消。',
          'success'
        );
        setInstallPrompt(null);
      })
      .catch(error => {
        console.error('Failed to install app:', error);
        notify('安装失败，请稍后重试。', 'error');
        setInstallPrompt(null);
      });
  }, [installPrompt, notify]);

  return {
    canInstall: Boolean(installPrompt),
    installApp,
  };
}
