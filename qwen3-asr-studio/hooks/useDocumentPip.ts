import { useCallback, useState } from 'react';
import { PIP_WINDOW_OPTIONS } from '../constants';
import type { Notification } from '../types';

type Notify = (message: string, type: Notification['type']) => void;

export function useDocumentPip(notify: Notify) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);

  const closePip = useCallback(() => {
    pipWindow?.close();
  }, [pipWindow]);

  const openPip = useCallback(async () => {
    if (!('documentPictureInPicture' in window)) {
      notify('您的浏览器不支持此功能。请使用最新版本的 Chrome 或 Edge 浏览器。', 'error');
      return;
    }

    if (pipWindow) {
      return;
    }

    try {
      const pipWin = await window.documentPictureInPicture!.requestWindow({
        width: PIP_WINDOW_OPTIONS.width,
        height: PIP_WINDOW_OPTIONS.height,
      });

      Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach(node => {
        pipWin.document.head.appendChild(node.cloneNode(true));
      });

      Array.from(document.head.querySelectorAll('script')).forEach(script => {
        const newScript = pipWin.document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        }
        newScript.textContent = script.textContent;
        pipWin.document.head.appendChild(newScript);
      });

      pipWin.document.title = '输入法模式 - ASR Studio';
      pipWin.document.documentElement.className = document.documentElement.className;
      pipWin.document.body.style.margin = '0';
      pipWin.document.body.style.overflow = 'hidden';

      const container = pipWin.document.createElement('div');
      container.id = 'pip-root';
      container.style.height = '100vh';
      pipWin.document.body.appendChild(container);

      pipWin.addEventListener(
        'pagehide',
        () => {
          setPipWindow(null);
          setPipContainer(null);
        },
        { once: true }
      );

      setPipWindow(pipWin);
      setPipContainer(container);
    } catch (error) {
      console.error('Failed to open document PiP window:', error);
      notify('打开画中画窗口失败。用户可能已拒绝请求。', 'error');
    }
  }, [notify, pipWindow]);

  const togglePip = useCallback(() => {
    if (pipWindow) {
      closePip();
    } else {
      void openPip();
    }
  }, [closePip, openPip, pipWindow]);

  return {
    isPipActive: Boolean(pipWindow),
    pipContainer,
    openPip,
    closePip,
    togglePip,
  };
}
