// src/components/BotaoWhatsappFlutuante.tsx
import { useState, useEffect } from 'react';
import { obterConfiguracaoGlobalLocal } from '../utils/configuracoesSaaS';

// Número oficial do WhatsApp de atendimento/comercial (pode ser configurado no painel /master ou via VITE_WHATSAPP_SUPORTE)
const WHATSAPP_SUPORTE_FALLBACK =
  (import.meta.env.VITE_WHATSAPP_SUPORTE as string | undefined) || '5585999999999';

interface BotaoWhatsappFlutuanteProps {
  mensagem?: string;
}

export function BotaoWhatsappFlutuante({
  mensagem = 'Olá! Preciso de ajuda com o T-System Beach.'
}: BotaoWhatsappFlutuanteProps) {
  const [pulinhoAtivo, setPulinhoAtivo] = useState<boolean>(false);
  const configLocal = obterConfiguracaoGlobalLocal();
  const numeroWhatsapp = (configLocal.whatsappSuporte || WHATSAPP_SUPORTE_FALLBACK).replace(/\D/g, '');

  // A cada 5 segundos a bolinha verde dá um "pulinho" por 1.2s
  useEffect(() => {
    const intervalo = setInterval(() => {
      setPulinhoAtivo(true);
      const timerDescanso = setTimeout(() => {
        setPulinhoAtivo(false);
      }, 1200);
      return () => clearTimeout(timerDescanso);
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  const linkWhatsapp = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagem)}`;

  return (
    <a
      href={linkWhatsapp}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar conosco pelo WhatsApp"
      title="Falar conosco pelo WhatsApp"
      className={`fixed bottom-5 right-5 z-50 w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 hover:shadow-xl hover:shadow-emerald-600/35 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border border-white/30 ${
        pulinhoAtivo ? 'animate-bounce' : ''
      }`}
    >
      <span className="absolute -inset-1 rounded-full bg-emerald-400/20 animate-ping pointer-events-none" />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative z-10"
      >
        <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21" />
        <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1" />
      </svg>
    </a>
  );
}
