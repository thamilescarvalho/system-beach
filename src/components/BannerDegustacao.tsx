// src/components/BannerDegustacao.tsx
import { useContext } from 'react';
import * as LucideIcons from 'lucide-react';
import { AppContext } from '../context/AppContext';

export function BannerDegustacao() {
  const contexto = useContext(AppContext);
  const empresa = contexto?.dadosEmpresa;

  if (empresa?.status_assinatura !== 'degustacao') return null;

  const dataVenc = empresa.data_vencimento ? new Date(empresa.data_vencimento) : new Date();
  const hoje = new Date();
  const diferencaDias = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
  const diasRestantes = diferencaDias > 0 ? diferencaDias : 0;

  const mpCheckoutUrl = import.meta.env.VITE_MERCADOPAGO_CHECKOUT_URL as string | undefined;
  const whatsappSuporte = (import.meta.env.VITE_WHATSAPP_SUPORTE as string | undefined) || '5585999999999';

  const linkAssinatura = mpCheckoutUrl
    ? `${mpCheckoutUrl}${mpCheckoutUrl.includes('?') ? '&' : '?'}external_reference=${encodeURIComponent(empresa.id)}`
    : `https://wa.me/${whatsappSuporte}?text=${encodeURIComponent(`Olá! Quero ativar o plano definitivo para ${empresa.nome_fantasia} (ID: ${empresa.id}).`)}`;

  return (
    <div className="w-full h-9 sm:h-10 bg-amber-50 border-b border-amber-200/80 px-3 sm:px-6 text-amber-900 text-xs font-medium flex items-center justify-between gap-2 shrink-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <LucideIcons.Sparkles size={14} className="text-amber-600 shrink-0" />
        <span className="truncate whitespace-nowrap">
          <strong className="font-bold">Teste Gratuito:</strong> restam{' '}
          <strong className="font-bold">
            {diasRestantes} {diasRestantes === 1 ? 'dia' : 'dias'}
          </strong>
        </span>
      </div>
      <a
        href={linkAssinatura}
        target="_blank"
        rel="noopener noreferrer"
        className="px-2.5 sm:px-3 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-full text-xs scale-90 origin-right uppercase tracking-wider transition-all shrink-0 shadow-xs whitespace-nowrap"
      >
        Assinar com PIX / Cartão
      </a>
    </div>
  );
}
