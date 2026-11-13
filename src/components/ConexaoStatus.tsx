// src/components/ConexaoStatus.tsx
import { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export function ConexaoStatus() {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [mostrarReconectado, setMostrarReconectado] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const aoFicarOffline = () => {
      if (timer) clearTimeout(timer);
      setMostrarReconectado(false);
      setOnline(false);
    };

    const aoFicarOnline = () => {
      setOnline(true);
      setMostrarReconectado(true);
      timer = setTimeout(() => {
        setMostrarReconectado(false);
      }, 3000);
    };

    window.addEventListener('offline', aoFicarOffline);
    window.addEventListener('online', aoFicarOnline);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('offline', aoFicarOffline);
      window.removeEventListener('online', aoFicarOnline);
    };
  }, []);

  if (online && !mostrarReconectado) {
    return null;
  }

  return (
    <div className="fixed top-safe-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm flex justify-center">
      {!online ? (
        <div className="bg-amber-600 text-white px-4 py-2 rounded-full shadow-lg border border-amber-500 flex items-center gap-2 text-xs font-medium">
          <WifiOff size={14} className="shrink-0" />
          <span>Sem conexão com a internet — aguardando sinal</span>
        </div>
      ) : (
        <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg border border-emerald-500 flex items-center gap-2 text-xs font-medium">
          <Wifi size={14} className="shrink-0" />
          <span>Conexão restabelecida</span>
        </div>
      )}
    </div>
  );
}
