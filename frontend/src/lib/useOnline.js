import { useEffect, useState } from 'react';
import { syncQueue, queueCount } from './offline.js';

// Suit l'état de connexion et déclenche la synchronisation au retour en ligne.
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refresh = () => queueCount().then(setPending).catch(() => {});
    refresh();

    const goOnline = async () => {
      setOnline(true);
      await syncQueue();
      refresh();
    };
    const goOffline = () => setOnline(false);
    const onSynced = () => refresh();

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener('queue:synced', onSynced);
    window.addEventListener('queue:changed', onSynced);

    // Tentative périodique de synchronisation.
    const timer = setInterval(() => { if (navigator.onLine) syncQueue().then(refresh); }, 15000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('queue:synced', onSynced);
      window.removeEventListener('queue:changed', onSynced);
      clearInterval(timer);
    };
  }, []);

  return { online, pending };
}
