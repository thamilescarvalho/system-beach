import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

const BEACH_SCENES = [
  {
    id: 'gestao-acesso',
    step: '01',
    shortLabel: 'Gestão de Acesso',
    title: 'Gestão de Equipe e Permissões de Acesso',
    description:
      'Cadastre garçons, barmans e administradores com avatares e permissões individuais em segundos.',
    image: '/gestao-acesso-barraca.jpg',
    focalClass: 'object-left sm:object-center',
  },
  {
    id: 'barman-luva',
    step: '02',
    shortLabel: 'Bar e Cozinha',
    title: 'Fila do Bar & Cozinha Interativa em Tempo Real',
    description:
      '1º toque coloca o drink em preparo e o 2º toque avisa o celular do garçom que já está pronto para servir.',
    image: '/barman-luva-caipirinha.png',
    focalClass: 'object-center',
  },
  {
    id: 'peixe-coco-5d',
    step: '03',
    shortLabel: 'Painel Financeiro',
    title: 'Painel Financeiro e Extrato de Comandas',
    description:
      'Acompanhe o faturamento ao vivo, formas de pagamento, métricas, vales e histórico detalhado de cada mesa.',
    image: '/peixe-coco-5d.png',
    focalClass: 'object-center',
  },
  {
    id: 'guarda-sois',
    step: '04',
    shortLabel: 'Mapa de Guarda-sóis',
    title: 'Controle de Guarda-sóis e Alertas na Areia',
    description:
      'Visualize todas as mesas livres, ocupadas ou piscando em amarelo quando há pedido pronto para entrega.',
    image: '/guarda-sois-mar-azul.png',
    focalClass: 'object-center',
  },
];

const TYPEWRITER_WORDS = ['intuitiva', 'eficiente', 'prática', 'em poucos toques'];

const MODULOS_SOLUCOES_ORDEM: ('garcom' | 'cardapio' | 'pdv' | 'qrcode')[] = [
  'garcom',
  'cardapio',
  'pdv',
  'qrcode',
];

const PILARES_ENGENHARIA = [
  {
    id: 'implantacao',
    titulo: 'Implantação Assistida',
    detalhe: 'Cardápio e mesas prontos em poucas horas',
    Icon: LucideIcons.Zap,
  },
  {
    id: 'suporte',
    titulo: 'Suporte Humano',
    detalhe: 'Atendimento ágil via WhatsApp',
    Icon: LucideIcons.MessageCircle,
  },
  {
    id: 'fidelidade',
    titulo: 'Ativação Sem Fidelidade',
    detalhe: 'Sem multa contratual e com teste guiado',
    Icon: LucideIcons.CheckCircle2,
  },
  {
    id: 'evolucao',
    titulo: 'Evolução Contínua',
    detalhe: 'Atualizações automáticas sem custo extra',
    Icon: LucideIcons.RefreshCw,
  },
];

type CategoriaStack = 'todas' | 'interface' | 'dados' | 'operacao';

interface ItemStackEngenharia {
  id: string;
  label: string;
  categoria: Exclude<CategoriaStack, 'todas'>;
  camadaLabel: string;
  resumo: string;
  Icon: LucideIcons.LucideIcon;
}

const CATEGORIAS_STACK: { id: CategoriaStack; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'interface', label: 'UI' },
  { id: 'dados', label: 'Cloud' },
  { id: 'operacao', label: 'PDV' },
];

const STACK_ENGENHARIA: ItemStackEngenharia[] = [
  {
    id: 'react',
    label: 'React 19',
    categoria: 'interface',
    camadaLabel: 'Interface',
    resumo: 'Renderização concorrente e interface responsiva instantânea para operação contínua.',
    Icon: LucideIcons.Code2,
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    categoria: 'interface',
    camadaLabel: 'Interface',
    resumo: 'Tipagem estrita ponta a ponta para máxima confiabilidade em produção.',
    Icon: LucideIcons.FileCode,
  },
  {
    id: 'tailwind',
    label: 'Tailwind CSS v4',
    categoria: 'interface',
    camadaLabel: 'Interface',
    resumo: 'Sistema visual nativo, leve e consistente do celular ao desktop.',
    Icon: LucideIcons.Layers,
  },
  {
    id: 'vite',
    label: 'Vite',
    categoria: 'interface',
    camadaLabel: 'Interface',
    resumo: 'Empacotamento otimizado para carregamento rápido mesmo no 4G da praia.',
    Icon: LucideIcons.Zap,
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    categoria: 'dados',
    camadaLabel: 'Cloud & Dados',
    resumo: 'Banco relacional transacional com integridade financeira rigorosa.',
    Icon: LucideIcons.Database,
  },
  {
    id: 'realtime',
    label: 'Supabase Realtime',
    categoria: 'dados',
    camadaLabel: 'Cloud & Dados',
    resumo: 'Sincronização em tempo real via WebSocket entre areia, bar e caixa.',
    Icon: LucideIcons.Activity,
  },
  {
    id: 'rls',
    label: 'Row-Level Security (RLS)',
    categoria: 'dados',
    camadaLabel: 'Cloud & Dados',
    resumo: 'Isolamento estrito de dados por empresa garantido direto no banco.',
    Icon: LucideIcons.ShieldCheck,
  },
  {
    id: 'cloud',
    label: 'Cloud SaaS Multi-tenant',
    categoria: 'dados',
    camadaLabel: 'Cloud & Dados',
    resumo: 'Arquitetura escalável preparada para picos de feriados e alta temporada.',
    Icon: LucideIcons.Cloud,
  },
  {
    id: 'pwa',
    label: 'PWA Mobile-First',
    categoria: 'operacao',
    camadaLabel: 'Campo & PDV',
    resumo: 'Experiência de aplicativo instalável direto no celular do garçom.',
    Icon: LucideIcons.Smartphone,
  },
  {
    id: 'escpos',
    label: 'Impressão ESC/POS',
    categoria: 'operacao',
    camadaLabel: 'Campo & PDV',
    resumo: 'Impressão direta de comandas e pedidos para bobinas térmicas de 80mm e 58mm.',
    Icon: LucideIcons.Printer,
  },
];

const WHATSAPP_NUMERO_OFICIAL = '5585920008349';

function criarLinkWhatsapp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO_OFICIAL}?text=${encodeURIComponent(mensagem)}`;
}

const REDES_SOCIAIS_RODAPE = [
  {
    id: 'instagram',
    nome: 'Instagram',
    url: '',
    aviso: '📸 Instagram oficial da Âncora-Dev em breve! Fale conosco pelo WhatsApp.',
  },
  {
    id: 'youtube',
    nome: 'YouTube (Videoaulas)',
    url: '',
    aviso: '🎬 Canal de Videoaulas no YouTube em criação — em breve tutoriais completos!',
  },
  {
    id: 'linkedin',
    nome: 'LinkedIn',
    url: '',
    aviso: '💼 LinkedIn institucional da Âncora-Dev em atualização.',
  },
] as const;

const LINKS_NEGOCIOS_RODAPE = [
  {
    label: 'Seja Nosso Parceiro',
    mensagem: 'Olá! Tenho interesse em ser parceiro comercial da Âncora-Dev / T-System Beach.',
  },
  {
    label: 'Trabalhe Conosco',
    mensagem: 'Olá! Gostaria de enviar meu contato para trabalhar na Âncora-Dev.',
  },
];

const LINKS_ATENDIMENTO_RODAPE = [
  {
    label: 'Fale Conosco',
    mensagem: 'Olá! Gostaria de falar com a equipe do T-System Beach / Âncora-Dev.',
  },
  {
    label: 'Suporte',
    mensagem: 'Olá! Preciso de suporte técnico no sistema T-System Beach.',
  },
  {
    label: 'SAC',
    mensagem: 'Olá! Gostaria de atendimento pelo SAC da Âncora-Dev.',
  },
];

const SELOS_CERTIFICACAO_RODAPE = [
  { emoji: '🔐', texto: 'Criptografia TLS/HTTPS 256-bit' },
  { emoji: '🛡️', texto: 'Isolamento PostgreSQL RLS' },
  { emoji: '✅', texto: 'Conformidade LGPD' },
  { emoji: '💳', texto: 'Checkout Homologado Mercado Pago' },
];

function IconeRedeSocial({ id }: { id: 'instagram' | 'linkedin' | 'youtube' }) {
  if (id === 'instagram') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
      </svg>
    );
  }
  if (id === 'linkedin') {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4 shrink-0"
        aria-hidden="true"
      >
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect width="4" height="12" x="2" y="9" />
        <circle cx="4" cy="4" r="2" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4 shrink-0"
      aria-hidden="true"
    >
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

export function LandingPage() {
  const [heroStep, setHeroStep] = useState<0 | 1>(0);
  const [logoSpin, setLogoSpin] = useState<boolean>(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClickFora = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickFora);
    document.addEventListener('touchstart', handleClickFora);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickFora);
      document.removeEventListener('touchstart', handleClickFora);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);
  const [heroCoronaQty, setHeroCoronaQty] = useState<number>(1);
  const [heroCocoQty, setHeroCocoQty] = useState<number>(2);
  const [deliveryToast, setDeliveryToast] = useState<string | null>(null);
  const [activeDevice, setActiveDevice] = useState<'iphone' | 'notebook' | 'tablet'>('iphone');
  const [notebookTela, setNotebookTela] = useState<'financeiro' | 'metricas'>('financeiro');
  const touchStartXRef = useRef<number | null>(null);

  // Efeito de digitação ("intuitiva" sendo digitado no Hero)
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [typedText, setTypedText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Aba ativa do bloco de módulos (App de Garçom, Cardápio Digital, QR Code de Mesas, Frente de Caixa PDV)
  const [activeModule, setActiveModule] = useState<'garcom' | 'cardapio' | 'qrcode' | 'pdv'>('garcom');
  const [solucoesPausado, setSolucoesPausado] = useState<boolean>(false);

  // Estados da simulação interativa no canto direito do bloco #ambiente
  const [simTick, setSimTick] = useState<number>(0);
  const [barItem1Stage, setBarItem1Stage] = useState<0 | 1 | 2>(1);
  const [barItem2Stage, setBarItem2Stage] = useState<0 | 1 | 2>(0);
  const [userRoleSim, setUserRoleSim] = useState<'garcom' | 'admin'>('garcom');
  const [showFinanceValues, setShowFinanceValues] = useState<boolean>(true);

  // Estado do carrossel de pequenas telas do Card 1 (Gestão Financeira)
  const [financeSlide, setFinanceSlide] = useState<number>(0);
  const [financePausado, setFinancePausado] = useState<boolean>(false);

  // Estado da vitrine 5D e seletor espacial de stack (#ancora-dev)
  const [pilarEngenhariaIdx, setPilarEngenhariaIdx] = useState<number>(0);
  const [engenhariaPausado, setEngenhariaPausado] = useState<boolean>(false);
  const [stackMenuAberto, setStackMenuAberto] = useState<boolean>(false);
  const [stackMenuFixado, setStackMenuFixado] = useState<boolean>(false);
  const [stackAbrirParaCima, setStackAbrirParaCima] = useState<boolean>(false);
  const [categoriaStack, setCategoriaStack] = useState<CategoriaStack>('todas');
  const [stackAtivaId, setStackAtivaId] = useState<string>('react');
  const [certificadosAbertos, setCertificadosAbertos] = useState<boolean>(false);
  const [redeAviso, setRedeAviso] = useState<string | null>(null);
  const [pilarTilt, setPilarTilt] = useState<{ rx: number; ry: number; ativo: boolean }>({
    rx: 0,
    ry: 0,
    ativo: false,
  });
  const pilarTouchStartXRef = useRef<number | null>(null);
  const stackDockRef = useRef<HTMLDivElement>(null);
  const certificadosRef = useRef<HTMLDivElement>(null);

  const mostrarAvisoRede = (mensagem: string) => {
    setRedeAviso(mensagem);
    setTimeout(() => {
      setRedeAviso((atual) => (atual === mensagem ? null : atual));
    }, 2800);
  };

  useEffect(() => {
    if (!certificadosAbertos) return;

    const fecharAoClicarFora = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (certificadosRef.current && !certificadosRef.current.contains(event.target as Node)) {
        setCertificadosAbertos(false);
      }
    };

    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCertificadosAbertos(false);
      }
    };

    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('touchstart', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('touchstart', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
    };
  }, [certificadosAbertos]);

  const calcularDirecaoStack = () => {
    if (!stackDockRef.current || typeof window === 'undefined') return;
    const rect = stackDockRef.current.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - rect.bottom;
    const espacoAcima = rect.top - 72;
    setStackAbrirParaCima(espacoAbaixo < 380 && espacoAcima > espacoAbaixo);
  };

  useEffect(() => {
    if (!stackMenuAberto) return;

    const fecharAoClicarFora = (event: globalThis.MouseEvent | globalThis.TouchEvent) => {
      if (stackDockRef.current && !stackDockRef.current.contains(event.target as Node)) {
        setStackMenuAberto(false);
        setStackMenuFixado(false);
      }
    };

    const fecharComEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setStackMenuAberto(false);
        setStackMenuFixado(false);
      }
    };

    document.addEventListener('mousedown', fecharAoClicarFora);
    document.addEventListener('touchstart', fecharAoClicarFora);
    document.addEventListener('keydown', fecharComEsc);
    window.addEventListener('resize', calcularDirecaoStack);
    return () => {
      document.removeEventListener('mousedown', fecharAoClicarFora);
      document.removeEventListener('touchstart', fecharAoClicarFora);
      document.removeEventListener('keydown', fecharComEsc);
      window.removeEventListener('resize', calcularDirecaoStack);
    };
  }, [stackMenuAberto]);

  // Efeito 3D no Hero
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  // Loop de digitação estilo máquina de escrever ("intuitiva", "eficiente", "prática"...)
  useEffect(() => {
    const currentFullWord = TYPEWRITER_WORDS[wordIndex];
    const typingSpeed = isDeleting ? 55 : 95;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        const nextText = currentFullWord.slice(0, typedText.length + 1);
        setTypedText(nextText);
        if (nextText === currentFullWord) {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        const nextText = currentFullWord.slice(0, typedText.length - 1);
        setTypedText(nextText);
        if (nextText === '') {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % TYPEWRITER_WORDS.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timer);
  }, [typedText, isDeleting, wordIndex]);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setHeroStep((prev) => (prev === 0 ? 1 : 0));
    }, 5200);
    return () => clearInterval(stepTimer);
  }, []);

  // Loop de animação automática para os mini cards interativos
  useEffect(() => {
    const simInterval = setInterval(() => {
      setSimTick((prev) => (prev + 1) % 3);
      setBarItem1Stage((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
      setBarItem2Stage((prev) => ((prev + 1) % 3) as 0 | 1 | 2);
      setUserRoleSim((prev) => (prev === 'garcom' ? 'admin' : 'garcom'));
    }, 2400);
    return () => clearInterval(simInterval);
  }, []);

  // Transição automática das pequenas telas de Gestão Financeira (Card 1)
  useEffect(() => {
    if (financePausado) return;
    const finTimer = setInterval(() => {
      setFinanceSlide((prev) => (prev + 1) % 4);
    }, 3800);
    return () => clearInterval(finTimer);
  }, [financePausado]);

  // Alternância automática entre Financeiro e Métricas dentro do Notebook (#dispositivos)
  useEffect(() => {
    const nbTimer = setInterval(() => {
      setNotebookTela((prev) => (prev === 'financeiro' ? 'metricas' : 'financeiro'));
    }, 4200);
    return () => clearInterval(nbTimer);
  }, []);

  // Transição automática minimalista entre os cards do bloco panorâmico (#solucoes)
  useEffect(() => {
    if (solucoesPausado) return;
    const solucoesTimer = setInterval(() => {
      setActiveModule((prev) => {
        const atualIdx = MODULOS_SOLUCOES_ORDEM.indexOf(prev);
        return MODULOS_SOLUCOES_ORDEM[(atualIdx + 1) % MODULOS_SOLUCOES_ORDEM.length];
      });
    }, 3800);
    return () => clearInterval(solucoesTimer);
  }, [solucoesPausado]);

  // Transição 5D futurista dos pilares técnicos (#ancora-dev)
  useEffect(() => {
    if (engenhariaPausado) return;
    const engTimer = setInterval(() => {
      setPilarEngenhariaIdx((prev) => (prev + 1) % PILARES_ENGENHARIA.length);
    }, 3400);
    return () => clearInterval(engTimer);
  }, [engenhariaPausado]);

  const dispositivosOrdem: ('iphone' | 'notebook' | 'tablet')[] = ['iphone', 'notebook', 'tablet'];
  const descricaoDispositivos: Record<
    'iphone' | 'notebook' | 'tablet',
    { titulo: string; subtitulo: string }
  > = {
    iphone: {
      titulo: 'Menu Admin no Celular',
      subtitulo: 'Configurações, financeiro, estoque e impressora na palma da mão.'
    },
    notebook: {
      titulo: 'Computador (Financeiro & Métricas)',
      subtitulo: 'Painel completo de caixa ao vivo, lucro por produto e métricas financeiras.'
    },
    tablet: {
      titulo: 'Tablet (KDS Bar & Cozinha)',
      subtitulo: 'Fila de pedidos em tempo real: do recebimento ao preparo e aviso de pronto para o garçom.'
    }
  };
  const indiceDispositivoAtivo = dispositivosOrdem.indexOf(activeDevice);
  const irParaDispositivoAnterior = () => {
    const anterior = (indiceDispositivoAtivo - 1 + dispositivosOrdem.length) % dispositivosOrdem.length;
    setActiveDevice(dispositivosOrdem[anterior]);
  };
  const irParaProximoDispositivo = () => {
    const proximo = (indiceDispositivoAtivo + 1) % dispositivosOrdem.length;
    setActiveDevice(dispositivosOrdem[proximo]);
  };

  const handleHeroMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({
      rx: Number((-y * 8).toFixed(2)),
      ry: Number((x * 8).toFixed(2)),
    });
  };

  const handleHeroMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  const irParaPilarAnterior = () => {
    setPilarEngenhariaIdx(
      (prev) => (prev - 1 + PILARES_ENGENHARIA.length) % PILARES_ENGENHARIA.length
    );
  };

  const irParaProximoPilar = () => {
    setPilarEngenhariaIdx((prev) => (prev + 1) % PILARES_ENGENHARIA.length);
  };

  const podeInclinarPilar =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handlePilarMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!podeInclinarPilar) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setPilarTilt({
      rx: Number((-y * 5).toFixed(2)),
      ry: Number((x * 6).toFixed(2)),
      ativo: true,
    });
  };

  const handlePilarMouseLeave = () => {
    if (!pilarTilt.ativo) return;
    setPilarTilt({ rx: 0, ry: 0, ativo: false });
  };

  const stackSelecionada =
    STACK_ENGENHARIA.find((item) => item.id === stackAtivaId) ?? STACK_ENGENHARIA[0];
  const stacksFiltradas =
    categoriaStack === 'todas'
      ? STACK_ENGENHARIA
      : STACK_ENGENHARIA.filter((item) => item.categoria === categoriaStack);

  const whatsappUrl = criarLinkWhatsapp(
    'Olá! Quero conhecer o sistema para o meu quiosque ou barraca de praia.'
  );

  const heroTotal = heroCoronaQty * 114 + heroCocoQty * 12;

  const handleNotifyDelivery = (itemName: string) => {
    setDeliveryToast(`${itemName} enviado para a Mesa 04!`);
    setTimeout(() => {
      setDeliveryToast(null);
    }, 2800);
  };

  const activeScene = BEACH_SCENES[activeSceneIndex];

  const renderizarAparelho = (disp: 'iphone' | 'notebook' | 'tablet') => {
    if (disp === 'iphone') {
      return (
        <div className="relative w-64 bg-slate-700 rounded-4xl p-2 shadow-2xl border-2 border-slate-500">
          <div className="absolute -left-1 top-14 w-1 h-4 bg-slate-500 rounded-l-sm" />
          <div className="absolute -left-1 top-22 w-1 h-8 bg-slate-500 rounded-l-sm" />
          <div className="absolute -left-1 top-32 w-1 h-8 bg-slate-500 rounded-l-sm" />
          <div className="absolute -right-1 top-24 w-1 h-11 bg-slate-500 rounded-r-sm" />

          <div className="bg-white rounded-3xl p-3 pt-2 flex flex-col justify-between min-h-96 overflow-hidden">
            {/* Barra de Status iOS */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-xs font-bold text-slate-800 tracking-tight">9:41</span>
              <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-end px-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
              </div>
              <div className="flex items-center gap-1 text-slate-800">
                <LucideIcons.Signal className="w-3 h-3" />
                <LucideIcons.Wifi className="w-3 h-3" />
                <LucideIcons.BatteryFull className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Tela Responsiva de Menu de Configurações (Admin.tsx) */}
            <div className="space-y-2.5 flex-1">
              <div className="px-1">
                <h4 className="text-sm font-medium text-slate-900 tracking-tight leading-tight">
                  Configurações
                </h4>
                <p className="text-[10px] text-slate-400">Quiosque Beira-Mar</p>
              </div>

              <div className="bg-slate-100/80 border border-slate-200/70 rounded-2xl p-1 space-y-0.5">
                {[
                  { icon: LucideIcons.UserRound, label: 'Meu Perfil', sub: 'Dados' },
                  { icon: LucideIcons.Wallet, label: 'Financeiro', sub: 'Caixa' },
                  { icon: LucideIcons.Package, label: 'Estoque', sub: 'Cardápio' },
                  { icon: LucideIcons.Users, label: 'Usuários', sub: 'Equipe' },
                  { icon: LucideIcons.Store, label: 'Minha Empresa', sub: 'Editar' },
                  { icon: LucideIcons.CreditCard, label: 'Assinatura', sub: 'Ativa' },
                ].map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <IconComponent className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                        <span className="text-[11px] font-normal text-slate-800 truncate">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400">{item.sub}</span>
                        <LucideIcons.ChevronRight className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-slate-100/80 border border-slate-200/70 rounded-2xl p-1 space-y-0.5">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white transition-colors">
                  <div className="flex items-center gap-2">
                    <LucideIcons.Bell className="w-3.5 h-3.5 text-slate-700" />
                    <span className="text-[11px] font-normal text-slate-800">
                      Notificações
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Som ativo</span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white transition-colors">
                  <div className="flex items-center gap-2">
                    <LucideIcons.Printer className="w-3.5 h-3.5 text-slate-700" />
                    <span className="text-[11px] font-normal text-slate-800">
                      Impressora
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">Bobina 80mm</span>
                </div>
              </div>
            </div>

            {/* Barra de Navegação Inferior Estilo iPhone */}
            <div className="mt-2 bg-slate-800 rounded-full p-1 flex items-center justify-between">
              <div className="w-6 h-6 rounded-full text-slate-400 flex items-center justify-center">
                <LucideIcons.Home className="w-3 h-3" />
              </div>
              <div className="w-6 h-6 rounded-full text-slate-400 flex items-center justify-center">
                <LucideIcons.LayoutGrid className="w-3 h-3" />
              </div>
              <div className="w-6 h-6 rounded-full text-slate-400 flex items-center justify-center">
                <LucideIcons.Receipt className="w-3 h-3" />
              </div>
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <LucideIcons.Settings className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (disp === 'notebook') {
      return (
        <div className="w-76 max-w-full sm:w-full sm:max-w-2xl flex flex-col items-center mx-auto">
          {/* Tampa Metálica Fina + Moldura Escura da Tela */}
          <div className="w-fit sm:w-11/12 mx-auto bg-linear-to-b from-slate-300 via-slate-400 to-slate-500 p-px rounded-t-2xl shadow-2xl">
            <div className="bg-slate-950 rounded-t-2xl p-1.5 sm:p-2.5 pb-2.5 sm:pb-3.5 relative">
              {/* Notch Realista da Câmera */}
              <div className="w-14 sm:w-20 h-2 sm:h-2.5 bg-slate-950 rounded-b-md mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center gap-1">
                <span className="w-1 h-1 rounded-full bg-slate-700 ring-1 ring-slate-600" />
              </div>

              {/* Tela Widescreen 16:10 (Escala proporcional 1:2 no mobile para manter formato paisagem de Notebook) */}
              <div className="w-68 h-42 sm:w-full sm:h-auto overflow-hidden rounded-lg sm:rounded-xl border border-slate-800 bg-slate-100">
                <div className="w-136 h-84 scale-50 origin-top-left sm:w-full sm:h-auto sm:scale-100 bg-slate-100 flex flex-col">
                  {/* Barra Superior */}
                  <div className="bg-white px-3 py-1.5 border-b border-slate-200 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      <span className="text-[11px] font-medium text-slate-600 ml-1 truncate">
                        {notebookTela === 'financeiro' ? 'Financeiro • Extrato' : 'Métricas Financeiras'}
                      </span>
                    </div>

                    {/* Indicador interativo das 2 telas reais */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-full border border-slate-200/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => setNotebookTela('financeiro')}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all cursor-pointer ${
                          notebookTela === 'financeiro'
                            ? 'bg-emerald-900 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Financeiro
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotebookTela('metricas')}
                        className={`px-2 py-0.5 rounded-full text-[9px] font-medium transition-all cursor-pointer ${
                          notebookTela === 'metricas'
                            ? 'bg-emerald-900 text-white shadow-2xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Métricas
                      </button>
                    </div>
                  </div>

                  {/* Corpo com Sidebar Desktop Fina + Conteúdo Dinâmico */}
                  <div className="flex flex-1 min-h-0 sm:min-h-80">
                    {/* Sidebar Fina Fiel ao Header.tsx */}
                    <div className="flex w-10 shrink-0 bg-white border-r border-slate-200 flex-col items-center py-2.5 gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-amber-50/80 text-yellow-600 flex items-center justify-center border-b border-slate-100">
                        <LucideIcons.Umbrella className="w-3.5 h-3.5" strokeWidth={2} />
                      </div>
                      <div className="w-6 h-6 rounded-lg text-slate-400 flex items-center justify-center">
                        <LucideIcons.Home className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
                        <LucideIcons.Wallet className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div className="w-6 h-6 rounded-lg text-slate-400 flex items-center justify-center">
                        <LucideIcons.BarChart3 className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                      <div className="w-6 h-6 rounded-lg text-slate-400 flex items-center justify-center">
                        <LucideIcons.Settings className="w-3.5 h-3.5" strokeWidth={1.8} />
                      </div>
                    </div>

                    {/* Área Principal que alterna automaticamente entre Financeiro e Métricas */}
                    <div className="flex-1 min-w-0 bg-slate-100/90 overflow-hidden">
                      {notebookTela === 'financeiro' ? (
                        <div key="nb-fin" className="animate-in fade-in duration-500 space-y-2 pb-2.5">
                          {/* Hero Esmeralda Fiel a AdminFinanceiro.tsx */}
                          <div className="bg-linear-to-br from-emerald-900 to-emerald-950 text-white rounded-b-2xl p-3 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
                            <div className="relative z-10 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[9px] font-medium">
                                    Hoje
                                  </span>
                                  <span className="p-1 rounded-full bg-black/20 border border-white/10 text-emerald-200">
                                    <LucideIcons.CalendarDays className="w-2.5 h-2.5" />
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[9px] font-medium inline-flex items-center gap-1">
                                  <LucideIcons.Landmark className="w-2.5 h-2.5" />
                                  <span>Todas as contas</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                  <span className="text-[9px] text-emerald-300/90 font-medium block">
                                    Saldo em contas
                                  </span>
                                  <span className="text-lg font-bold tracking-tight tabular-nums text-white">
                                    R$ 8.490,00
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/50 text-white text-[9px] font-medium">
                                    Saldo
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-200 text-[9px]">
                                    Entradas
                                  </span>
                                  <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/20 text-rose-200 text-[9px]">
                                    Saídas
                                  </span>
                                </div>
                              </div>

                              {/* Mini Gráfico */}
                              <svg viewBox="0 0 280 24" className="w-full h-5 overflow-visible">
                                <path
                                  d="M 0 20 Q 40 18 75 13 T 150 10 T 215 5 T 280 3"
                                  fill="none"
                                  stroke="#34d399"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                                <circle cx="280" cy="3" r="3" fill="#6ee7b7" />
                              </svg>
                            </div>
                          </div>

                          {/* Ações Rápidas + Extrato */}
                          <div className="px-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 flex items-center justify-center shrink-0">
                                <LucideIcons.ArrowDownLeft className="w-3 h-3" />
                              </span>
                              <span className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200/70 text-rose-600 flex items-center justify-center shrink-0">
                                <LucideIcons.ArrowUpRight className="w-3 h-3" />
                              </span>
                              <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                                <LucideIcons.Plus className="w-3 h-3" />
                              </span>
                              <span className="w-6 h-6 rounded-full bg-white border border-slate-200/80 text-amber-600 flex items-center justify-center shrink-0">
                                <LucideIcons.Umbrella className="w-3 h-3" />
                              </span>
                              <span className="w-6 h-6 rounded-full bg-white border border-slate-200/80 text-emerald-600 flex items-center justify-center shrink-0">
                                <LucideIcons.Banknote className="w-3 h-3" />
                              </span>
                              <span className="ml-auto px-2 py-1 rounded-full bg-slate-900 text-white text-[9px] font-medium inline-flex items-center gap-1 shrink-0">
                                <LucideIcons.BarChart3 className="w-2.5 h-2.5 text-emerald-400" />
                                <span>Métricas</span>
                              </span>
                            </div>

                            <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
                              <div className="px-2.5 py-2 flex items-center justify-between gap-2 text-[10px]">
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-700 truncate">
                                    Mesa 04 • Thamiles
                                  </p>
                                  <span className="text-[9px] text-slate-400">
                                    PIX • Balde Corona + 2x Coco
                                  </span>
                                </div>
                                <span className="font-semibold text-emerald-600 tabular-nums shrink-0">
                                  + R$ 138,00
                                </span>
                              </div>
                              <div className="px-2.5 py-2 flex items-center justify-between gap-2 text-[10px]">
                                <div className="min-w-0">
                                  <p className="font-medium text-slate-700 truncate">
                                    Mesa 05 • João
                                  </p>
                                  <span className="text-[9px] text-slate-400">
                                    Crédito • Camarão + Caipirinha
                                  </span>
                                </div>
                                <span className="font-semibold text-emerald-600 tabular-nums shrink-0">
                                  + R$ 194,00
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div key="nb-met" className="animate-in fade-in duration-500 p-3 space-y-2">
                          {/* Barra Global de Filtros Fiel a AdminFinanceiroMetricas.tsx */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-[9px] font-medium text-slate-600 inline-flex items-center gap-1">
                                <LucideIcons.Landmark className="w-2.5 h-2.5 text-slate-400" />
                                Todas as contas
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200/80 text-[9px] font-medium text-slate-600 inline-flex items-center gap-1">
                                <LucideIcons.CalendarDays className="w-2.5 h-2.5 text-slate-400" />
                                Hoje
                              </span>
                            </div>
                            <span className="p-1 rounded-full bg-white border border-slate-200/80 text-slate-400">
                              <LucideIcons.RefreshCw className="w-2.5 h-2.5" />
                            </span>
                          </div>

                          {/* 4 Cards KPI Principais (Sempre em linha Desktop 4 colunas) */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              {
                                label: 'Vendas',
                                valor: '24',
                                bg: 'bg-sky-50 border-sky-100 text-sky-500',
                                Icon: LucideIcons.ShoppingBag,
                              },
                              {
                                label: 'Recebido',
                                valor: 'R$ 4.280',
                                bg: 'bg-emerald-50 border-emerald-100 text-emerald-500',
                                Icon: LucideIcons.Wallet,
                              },
                              {
                                label: 'Lucro',
                                valor: 'R$ 2.190',
                                bg: 'bg-emerald-50 border-emerald-100 text-emerald-500',
                                Icon: LucideIcons.BadgeDollarSign,
                              },
                              {
                                label: 'Guarda-Sol',
                                valor: 'R$ 640',
                                bg: 'bg-amber-50 border-amber-100 text-amber-500',
                                Icon: LucideIcons.Umbrella,
                              },
                            ].map((kpi) => {
                              const KpiIcon = kpi.Icon;
                              return (
                                <div
                                  key={kpi.label}
                                  className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-2xs flex flex-col justify-between gap-1.5"
                                >
                                  <span className="text-[9px] font-medium text-slate-400 truncate">
                                    {kpi.label}
                                  </span>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-xs font-medium text-slate-500 tabular-nums truncate">
                                      {kpi.valor}
                                    </span>
                                    <span
                                      className={`w-6 h-6 rounded-xl border flex items-center justify-center shrink-0 ${kpi.bg}`}
                                    >
                                      <KpiIcon className="w-3 h-3" strokeWidth={1.4} />
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Linha 2: Fluxo de Receita */}
                          <div className="grid grid-cols-12 gap-1.5">
                            <div className="col-span-5 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-2xs flex flex-col items-center justify-between text-center">
                              <span className="text-[9px] font-medium text-slate-600 self-start truncate">
                                Vendas Concluídas
                              </span>
                              <div className="relative w-12 h-12 my-1 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    fill="none"
                                    stroke="#f1f5f9"
                                    strokeWidth="3.5"
                                  />
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="3.5"
                                    strokeDasharray="88 100"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute text-[10px] font-medium text-slate-600 tabular-nums">
                                  100%
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                                R$ 4.280,00
                              </span>
                            </div>

                            <div className="col-span-7 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-2xs flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[9px] font-medium text-slate-600 truncate">
                                  Fluxo de Receita
                                </span>
                                <div className="flex items-center gap-1.5 text-[8px] text-slate-500 shrink-0">
                                  <span className="inline-flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Entradas
                                  </span>
                                  <span className="inline-flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                    Saídas
                                  </span>
                                </div>
                              </div>

                              <svg viewBox="0 0 180 56" className="w-full h-14 mt-1">
                                <path
                                  d="M 5 44 L 38 38 L 72 28 L 106 32 L 140 16 L 175 10"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M 5 50 L 38 48 L 72 49 L 106 46 L 140 48 L 175 45"
                                  fill="none"
                                  stroke="#facc15"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="140" cy="16" r="2.5" fill="#10b981" />
                                <circle cx="175" cy="10" r="3" fill="#059669" />
                              </svg>

                              <div className="flex items-center justify-between text-[8px] text-slate-400 pt-0.5 border-t border-slate-100">
                                <span>09h</span>
                                <span>12h</span>
                                <span>15h</span>
                                <span>18h</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Base Unibody Metálica com Teclado em Perspectiva e Recorte Frontal */}
          <div className="w-full flex flex-col items-center">
            <div className="w-9/12 sm:w-4/5 h-1.5 sm:h-2 bg-linear-to-b from-slate-950 via-slate-800 to-slate-950" />
            <div className="w-full px-6 sm:px-12 py-1 sm:py-1.5 bg-linear-to-b from-slate-200 via-slate-300 to-slate-200 border-x border-t border-white rounded-t-xs flex flex-col items-center gap-0.5">
              <div className="w-full h-1 sm:h-1.5 bg-slate-800/85 rounded-xs border-b border-slate-500/40" />
              <div className="w-16 sm:w-28 h-0.5 sm:h-1 bg-slate-400/60 rounded-xs" />
            </div>
            <div className="w-full h-2 sm:h-2.5 bg-linear-to-b from-slate-100 via-slate-300 to-slate-400 rounded-b-2xl border-t border-white shadow-xl flex items-start justify-center">
              <div className="w-16 sm:w-24 h-1 sm:h-1.5 bg-slate-400 rounded-b-md border-x border-b border-slate-500/40" />
            </div>
            <div className="w-11/12 h-1.5 bg-slate-400/35 rounded-full blur-xs mt-1" />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-lg sm:max-w-xl bg-slate-800 rounded-3xl p-2 sm:p-2.5 shadow-2xl border-2 border-slate-600">
        {/* Câmera frontal discreta do Tablet */}
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 mx-auto mb-1.5" />

        <div className="bg-slate-100 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between min-h-72 sm:min-h-80">
          {/* Barra Superior Fiel a Cozinha.tsx */}
          <div className="flex items-center justify-center mb-3">
            <div className="inline-flex items-center gap-2 bg-white/90 border border-slate-300 rounded-full px-3.5 py-1 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-sans text-slate-800 uppercase tracking-wider">
                Fila de Pedidos
              </span>
            </div>
          </div>

          {/* Cards de Mesas Fiel a Cozinha.tsx */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-start flex-1">
            {/* CARD MESA 04: Em Preparo + Item Pronto */}
            <div className="bg-amber-50/40 rounded-2xl p-1 flex flex-col shadow-xs border border-amber-300/90">
              <div className="bg-slate-400 rounded-xl px-2.5 py-2 mb-1.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                    04
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight truncate">
                      Thamiles
                    </p>
                    <p className="text-[9px] font-semibold uppercase text-slate-700 truncate">
                      Atendente: <span className="text-white font-bold">Lucas</span>
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 shrink-0">
                  <LucideIcons.Flame className="w-2.5 h-2.5 text-amber-600" />
                  Preparo
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="px-2.5 py-1.5 rounded-2xl border bg-amber-50/90 border-amber-300/90 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold w-6 h-6 rounded-xl bg-amber-200/80 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 tabular-nums">
                      1x
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-800 truncate uppercase">
                        Camarão Empanado
                      </p>
                      <div className="flex items-center gap-1 text-[9px] text-amber-700 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Em preparo</span>
                      </div>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-amber-400 border-2 border-amber-500 text-slate-700 flex items-center justify-center shrink-0">
                    <LucideIcons.Flame className="w-3 h-3" strokeWidth={2.2} />
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-2xl border bg-white border-slate-200/70 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold w-6 h-6 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-800 flex items-center justify-center shrink-0 tabular-nums">
                      2x
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-800 truncate uppercase">
                        Caipirinha Limão 500ml
                      </p>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <LucideIcons.Clock className="w-2.5 h-2.5" />
                        Aguardando
                      </span>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shrink-0">
                    <span className="w-2 h-2 rounded-full bg-slate-200" />
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-2xl border bg-white/75 border-slate-200/60 flex items-center justify-between gap-2 opacity-80 sm:hidden">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold w-6 h-6 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-400 flex items-center justify-center shrink-0 tabular-nums">
                      1x
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-400 line-through truncate uppercase">
                        Água de Coco Gelada
                      </p>
                      <span className="text-[9px] text-slate-600 font-medium">
                        Pronto para servir
                      </span>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <LucideIcons.Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                  </span>
                </div>
              </div>
            </div>

            {/* CARD MESA 05: Totalmente Pronto (Em 2 colunas no tablet/desktop) */}
            <div className="hidden sm:flex flex-col bg-emerald-50/40 rounded-2xl p-1 shadow-xs border border-emerald-400/80">
              <div className="bg-slate-400 rounded-xl px-2.5 py-2 mb-1.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-600 text-white text-[11px] font-semibold flex items-center justify-center shrink-0 tabular-nums">
                    05
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-slate-100 uppercase tracking-tight truncate">
                      Lucas
                    </p>
                    <p className="text-[9px] font-semibold uppercase text-slate-700 truncate">
                      Atendente: <span className="text-white font-bold">Mateus</span>
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-0.5 shrink-0">
                  <LucideIcons.Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                  Pronto
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="px-2.5 py-1.5 rounded-2xl border bg-white/75 border-slate-200/60 flex items-center justify-between gap-2 opacity-85">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold w-6 h-6 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-400 flex items-center justify-center shrink-0 tabular-nums">
                      1x
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-400 line-through truncate uppercase">
                        Balde Corona (6 un)
                      </p>
                      <span className="text-[9px] text-slate-600 font-medium">
                        Pronto para servir
                      </span>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <LucideIcons.Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                  </span>
                </div>

                <div className="px-2.5 py-1.5 rounded-2xl border bg-white/75 border-slate-200/60 flex items-center justify-between gap-2 opacity-85">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[10px] font-semibold w-6 h-6 rounded-xl bg-slate-100 border border-slate-200/70 text-slate-400 flex items-center justify-center shrink-0 tabular-nums">
                      2x
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-slate-400 line-through truncate uppercase">
                        Água de Coco Verde
                      </p>
                      <span className="text-[9px] text-slate-600 font-medium">
                        Pronto para servir
                      </span>
                    </div>
                  </div>
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <LucideIcons.Check className="w-3.5 h-3.5" strokeWidth={2.8} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-16 h-1 bg-slate-300 rounded-full mx-auto mt-3" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50/50 text-slate-700 font-sans selection:bg-slate-200 selection:text-slate-800 overflow-x-clip">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-50 pt-safe bg-linear-to-r from-emerald-950 via-emerald-900/95 to-emerald-950 backdrop-blur-xl border-b border-emerald-800/60 shadow-sm shadow-emerald-950/10 transition-all">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => setLogoSpin((prev) => !prev)}
            className="group flex items-center gap-2.5 sm:gap-3 text-left focus:outline-none cursor-pointer shrink-0"
            title="Clique ou passe o mouse para girar a logo"
          >
            <div
              className={`w-9 h-9 rounded-4xl bg-white/10 border border-white/5 flex items-center justify-center text-amber-400 transition-all duration-500 group-hover:bg-white/15 group-hover:border-white/25 group-hover:scale-110 group-hover:rotate-45 ${
                logoSpin ? 'rotate-180 scale-105 bg-white/15 border-amber-300/40' : ''
              }`}
            >
              <LucideIcons.Umbrella className="w-5 h-5 transition-transform duration-500 group-hover:-rotate-12" />
            </div>

            {/* Nome */}
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] sm:text-base uppercase font-semibold tracking-wider text-white">
                T-System
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-600/20 border border-amber-400/25 text-[11px] sm:text-xs font-medium tracking-wide uppercase text-amber-200 transition-colors">
                Beach
              </span>
            </div>
          </button>

          {/* Ações à Direita (Desktop) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="h-9 px-4 rounded-full text-xs font-medium text-amber-100 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 inline-flex items-center gap-1.5 transition-all whitespace-nowrap"
            >
              <LucideIcons.LogIn size={13} strokeWidth={1.8} className="text-slate-300" />
              <span>Login</span>
            </Link>
            <Link
              to="/cadastro"
              className="h-9 px-4 rounded-full text-xs font-semibold text-white bg-amber-500 hover:bg-amber-400 shadow-xs inline-flex items-center gap-1.5 transition-all active:scale-95 whitespace-nowrap"
            >
              <LucideIcons.UserPlus size={13} strokeWidth={2} />
              <span>Cadastro</span>
            </Link>
          </div>

          {/* Botão Menu Mobile + Dropdown */}
          <div ref={mobileMenuRef} className="relative md:hidden shrink-0">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menu de acesso"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                mobileMenuOpen
                  ? 'bg-white text-emerald-950 border-white shadow-xs'
                  : 'bg-white/10 hover:bg-white/15 border-white/20 text-white'
              }`}
            >
              {mobileMenuOpen ? (
                <LucideIcons.X className="w-4 h-4" strokeWidth={2} />
              ) : (
                <LucideIcons.Menu className="w-4 h-4" strokeWidth={2} />
              )}
            </button>

            {mobileMenuOpen && (
              <div
                role="menu"
                aria-label="Acesso ao Sistema"
                className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl border border-slate-200/90 shadow-xl ring-1 ring-slate-900/5 overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50 font-sans"
              >
                <div className="px-3.5 py-2 border-b border-slate-100 bg-slate-50/70">
                </div>
                <div className="p-1.5 space-y-0.5">
                  <Link
                    to="/login"
                    role="menuitem"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center tracking-wider justify-between gap-2 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LucideIcons.LogIn size={14} strokeWidth={1.8} className="text-slate-400" />
                      <span>Login</span>
                    </span>
                    <LucideIcons.ChevronRight size={13} className="text-slate-300" />
                  </Link>
                  <Link
                    to="/cadastro"
                    role="menuitem"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[12px] font-medium text-slate-800 bg-slate-50/70 hover:bg-slate-50 flex items-center tracking-wider justify-between gap-2 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <LucideIcons.UserPlus size={14} strokeWidth={1.9} className="text-slate-600" />
                      <span>Cadastro</span>
                    </span>
                    <LucideIcons.ChevronRight size={13} className="text-slate-300" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION: PRIMEIRO CARD EM FORMATO IPHONE + FUNDO 5D WIREFRAME */}
      <section id="inicio" className="relative py-12 lg:py-20 overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <img
            src="/praia-wireframe-hero.jpg"
            alt=""
            className="w-full h-full object-cover object-bottom-right opacity-65 sm:opacity-90 mix-blend-multiply"
          />
          <div className="absolute inset-0 bg-linear-to-r from-white/95 via-white/60 sm:via-white/35 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-white/85 via-transparent to-white/75" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Coluna Esquerda */}
            <div className="lg:col-span-6 space-y-5">
              <div className="grid">
                {TYPEWRITER_WORDS.map((word) => (
                  <p
                    key={word}
                    aria-hidden="true"
                    className="invisible pointer-events-none select-none col-start-1 row-start-1 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight"
                  >
                    Gestão simples, fácil e{' '}
                    <span>
                      {word}
                      <span className="ml-0.5 inline-block w-0.5 sm:w-0.75 h-7 sm:h-9 lg:h-11 rounded-full translate-y-0.5" />
                    </span>{' '}
                    do guarda-sol ao Financeiro.
                  </p>
                ))}

                <h1 className="col-start-1 row-start-1 self-start text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-slate-800">
                  Gestão simples, fácil e{' '}
                  <span className="text-amber-500">
                    {typedText}
                    <span
                      aria-hidden="true"
                      className="ml-0.5 inline-block w-0.5 sm:w-0.75 h-7 sm:h-9 lg:h-11 bg-amber-500 animate-pulse rounded-full translate-y-0.5"
                    />
                  </span>{' '}
                  do guarda-sol ao Financeiro.
                </h1>
              </div>

              <p className="text-base text-slate-500 leading-relaxed font-normal max-w-xl">
                Operação pé na areia em tempo real. 
              </p>

              {/* 4 Módulos Principais */}
              <div className="flex flex-wrap items-center gap-3 pt-0.5">
                {[
                  { id: 'cardapio' as const, label: 'Cardápio Digital', icon: LucideIcons.UtensilsCrossed },
                  { id: 'pdv' as const, label: 'Frente de Caixa (PDV)', icon: LucideIcons.MonitorCheck },
                  { id: 'garcom' as const, label: 'App de Garçom', icon: LucideIcons.Smartphone },
                  { id: 'qrcode' as const, label: 'QR Code de Mesas', icon: LucideIcons.QrCode },
                ].map((mod) => {
                  const ModIcon = mod.icon;
                  return (
                    <a
                      key={mod.id}
                      href="#solucoes"
                      onClick={() => setActiveModule(mod.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 hover:bg-amber-50/90 backdrop-blur-xs border border-slate-200/80 hover:border-amber-300 text-xs font-medium text-slate-600 hover:text-slate-800 transition-all"
                    >
                      <ModIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>{mod.label}</span>
                    </a>
                  );
                })}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 pt-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-sm"
                >
                  <LucideIcons.MessageCircle className="w-3 h-3" />
                  Solicitar Demonstração
                </a>
              </div>
            </div>

            {/* Coluna Direita: CELULAR */}
            <div
              onMouseMove={handleHeroMouseMove}
              onMouseLeave={handleHeroMouseLeave}
              className="lg:col-span-6 flex items-center justify-center lg:justify-end lg:pr-8"
            >
              {/* APARELHO NO HERO */}
              <div
                style={{
                  transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
                }}
                className="relative z-20 w-72 bg-slate-700 rounded-4xl p-2 shadow-2xl border-2 border-slate-500 transition-transform duration-200 ease-out"
              >
                {/* Botões Físicos Laterais do iPhone */}
                <div className="absolute -left-1 top-14 w-1 h-4 bg-slate-500 rounded-l-sm" />
                <div className="absolute -left-1 top-22 w-1 h-8 bg-slate-500 rounded-l-sm" />
                <div className="absolute -left-1 top-32 w-1 h-8 bg-slate-500 rounded-l-sm" />
                <div className="absolute -right-1 top-24 w-1 h-11 bg-slate-500 rounded-r-sm" />

                {/* Tela Interna do iPhone (Altura fixa para evitar oscilação de layout ao alternar telas) */}
                <div className="bg-white rounded-3xl p-3 pt-2 flex flex-col justify-between h-126 overflow-hidden">
                  {/* Barra de Status iOS */}
                  <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                    <span className="text-xs font-bold text-slate-800 tracking-tight">9:41</span>
                    <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-end px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <div className="flex items-center gap-1 text-slate-800">
                      <LucideIcons.Signal className="w-3 h-3" />
                      <LucideIcons.Wifi className="w-3 h-3" />
                      <LucideIcons.BatteryFull className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Corpo que alterna entre Mapa e Comanda */}
                  {heroStep === 0 ? (
                    <div className="space-y-2.5 flex-1 min-h-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <span className="text-[11px] text-slate-400 block leading-none">
                            Setor Beira-Mar
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            Mapa de Guarda-sóis
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHeroStep(1)}
                          className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 cursor-pointer"
                          title="Ver Comanda 04"
                        >
                          <LucideIcons.Umbrella className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-white border border-slate-300" />
                          Livre
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                          Ocupada
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Pronto
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { num: '01', status: 'free', client: '' },
                          { num: '02', status: 'occupied', client: 'JOÃO' },
                          { num: '03', status: 'free', client: '' },
                          { num: '04', status: 'occupied', client: 'MARIA', highlight: true },
                          { num: '05', status: 'ready', client: 'LUCAS' },
                          { num: '06', status: 'free', client: '' },
                          { num: '07', status: 'occupied', client: 'CARLOS' },
                          { num: '08', status: 'ready', client: 'FERNANDA' },
                          { num: '09', status: 'free', client: '' },
                          { num: '10', status: 'occupied', client: 'FAMÍLIA' },
                          { num: '11', status: 'free', client: '' },
                          { num: '12', status: 'free', client: '' },
                        ].map((mesa) => {
                          const isOccupied = mesa.status === 'occupied';
                          const isReady = mesa.status === 'ready';

                          return (
                            <button
                              key={mesa.num}
                              type="button"
                              onClick={() => setHeroStep(1)}
                              className={`relative aspect-square rounded-xl p-2 flex flex-col items-center justify-between transition-all cursor-pointer border ${
                                isReady
                                  ? 'bg-linear-to-br from-yellow-400 to-amber-500 border-amber-500 text-white'
                                  : isOccupied
                                    ? 'bg-linear-to-br from-emerald-500 to-emerald-600 border-emerald-600 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400'
                              } ${mesa.highlight ? 'ring-2 ring-amber-400 scale-105 z-10 shadow-sm' : ''}`}
                            >
                              <div className="w-full flex justify-end h-1">
                                {isReady && (
                                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                )}
                              </div>

                              <span
                                className={`text-sm font-bold leading-none ${
                                  isOccupied || isReady ? 'text-white' : 'text-slate-700'
                                }`}
                              >
                                {mesa.num}
                              </span>

                              <span
                                className={`text-[10px] font-semibold truncate max-w-full leading-none ${
                                  isOccupied || isReady ? 'text-white/95' : 'text-slate-400'
                                }`}
                              >
                                {isOccupied || isReady ? mesa.client : 'LIVRE'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 min-h-0 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => setHeroStep(0)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 cursor-pointer"
                        >
                          <LucideIcons.ArrowLeft className="w-2 h-2" />
                          Voltar
                        </button>
                        <span className="text-[10px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                          MESA 04
                        </span>
                      </div>

                      <div className="rounded-xl p-2.5 bg-emerald-900 text-white flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-200 block">Valor Total</span>
                          <span className="text-base font-bold tabular-nums">
                            R$ {heroTotal.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-white/15 text-[10px] font-sans">
                          {heroCoronaQty + heroCocoQty} Itens
                        </span>
                      </div>

                      {deliveryToast && (
                        <div className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium px-2.5 py-1 rounded-xl flex items-center gap-1.5">
                          <LucideIcons.CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{deliveryToast}</span>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="bg-slate-100 rounded-xl p-2 border border-slate-200/80 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-sans text-slate-800 text-[9px] truncate">
                              COMBO CERVEJA CORONA
                            </p>
                            <p className="text-xs text-[10px] text-slate-500">
                              R$ {(heroCoronaQty * 114).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center bg-white rounded-full border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setHeroCoronaQty((q) => Math.max(1, q - 1))}
                                className="w-6 h-5 flex items-center justify-center text-slate-600 text-xs font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-4 text-center text-xs font-bold text-slate-700">
                                {heroCoronaQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setHeroCoronaQty((q) => q + 1)}
                                className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-600 text-white text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNotifyDelivery('Combo Corona')}
                              className="text-[10px] font-sans text-amber-700 hover:text-teal-700 cursor-pointer"
                            >
                              🔔 Entregar
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-100 rounded-xl p-2 border border-slate-200/80 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-600 text-[9px] truncate">
                              ÁGUA DE COCO VERDE
                            </p>
                            <p className="text-xs text-[10px] text-slate-500">
                              R$ {(heroCocoQty * 12).toFixed(2).replace('.', ',')}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="flex items-center bg-white rounded-full border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setHeroCocoQty((q) => Math.max(1, q - 1))}
                                className="w-6 h-5 flex items-center justify-center text-slate-600 text-xs font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-4 text-center text-xs font-bold text-slate-700">
                                {heroCocoQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => setHeroCocoQty((q) => q + 1)}
                                className="w-4 h-4 flex items-center justify-center rounded-full bg-slate-600 text-white text-xs font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleNotifyDelivery('Água de Coco')}
                              className="text-[10px] font-medium text-amber-700 hover:text-teal-700 cursor-pointer"
                            >
                              Entregar
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setHeroStep(0)}
                          className="py-1.5 rounded-xl font-medium text-xs bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 cursor-pointer"
                        >
                          Fechar Conta
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNotifyDelivery('Comanda Salva')}
                          className="py-1.5 rounded-xl font-medium text-xs bg-slate-800 hover:bg-slate-700 text-white cursor-pointer"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Barra de Navegação Inferior Estilo iPhone */}
                  <div className="mt-2.5 bg-slate-800 rounded-full p-1 flex items-center justify-between shrink-0">
                    <button
                      type="button"
                      onClick={() => setHeroStep(0)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        heroStep === 0 ? 'bg-amber-500 text-white' : 'text-slate-400'
                      }`}
                      title="Mapa de Guarda-sóis"
                    >
                      <LucideIcons.Home className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroStep(0)}
                      className="w-7 h-7 rounded-full text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                      title="Mesas"
                    >
                      <LucideIcons.LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroStep(1)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                        heroStep === 1 ? 'bg-amber-500 text-white' : 'text-slate-400'
                      }`}
                      title="Comanda"
                    >
                      <LucideIcons.Receipt className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-7 h-7 rounded-full text-slate-400 flex items-center justify-center">
                      <LucideIcons.User className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* #SOLUCOES: CENÁRIO PANORÂMICO FULL HD COM TEXTOS E CARDS SPOTLIGHT DESFOCADOS */}
      <section
        id="solucoes"
        onMouseEnter={() => setSolucoesPausado(true)}
        onMouseLeave={() => setSolucoesPausado(false)}
        className="relative w-full overflow-hidden border-t border-slate-200/60 bg-slate-900"
      >
        {/* Foto Panorâmica de Praia (Fortaleza-CE) */}
        <img
          src="/praia-fundo.jpg"
          alt="Atendimento na praia com garçom servindo água de coco, balde de cerveja, guarda-sóis brancos e Ponte dos Ingleses em Fortaleza"
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-1000 ease-out"
        />

        {/* Gradientes localizados: leitura nítida sem escurecer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-950/55 via-slate-950/20 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/50 via-transparent to-transparent"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 min-h-128 sm:min-h-136 lg:min-h-144 flex flex-col justify-between gap-10 lg:gap-16">
          {/* Título e Descrição */}
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
              Agilidade na areia.{' '}
              <span className="text-amber-400">Controle total da operação.</span>
            </h2>
            <p className="text-xs sm:text-sm text-white/95 mt-2 max-w-xl leading-relaxed drop-shadow-xs">
              O garçom registra o pedido direto no guarda-sol e o pedido chega ao bar/cozinha em segundos, totalmente integrado ao frente de caixa (PDV).
            </p>
          </div>

          {/* Grade de 4 Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {[
              {
                id: 'garcom' as const,
                title: 'App de Garçom',
                badge: 'Online',
                desc: 'Lançamento de pedidos direto no guarda-sol em poucos toques com aviso de prato pronto.',
                icon: LucideIcons.Smartphone,
              },
              {
                id: 'cardapio' as const,
                title: 'Cardápio Digital',
                badge: 'Online',
                desc: 'Cardápio interativo com fotos, categorias e atualização instantânea.',
                icon: LucideIcons.UtensilsCrossed,
              },
              {
                id: 'pdv' as const,
                title: 'Frente de Caixa (PDV)',
                badge: 'Online',
                desc: 'Gestão financeira com abertura e fechamento de caixa e configuração de impressão.',
                icon: LucideIcons.MonitorCheck,
              },
              {
                id: 'qrcode' as const,
                title: 'QR Code de Mesas',
                badge: 'Online',
                desc: 'O cliente escaneia o QR Code no guarda-sol e pede direto pelo celular.',
                icon: LucideIcons.QrCode,
              },
            ].map((item) => {
              const IconComp = item.icon;
              const isSelected = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setActiveModule(item.id)}
                  onFocus={() => setActiveModule(item.id)}
                  onClick={() => setActiveModule(item.id)}
                  className={`text-left p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border backdrop-blur-xl transition-all duration-700 ease-out cursor-pointer flex flex-col justify-between gap-2.5 sm:gap-3 ${
                    isSelected
                      ? 'bg-slate-950/75 text-white border-white/45 ring-1 ring-amber-400/50 shadow-2xl scale-100 -translate-y-1.5 opacity-100 blur-none z-20'
                      : 'bg-slate-950/25 hover:bg-slate-950/50 text-white/90 border-white/25 hover:border-white/40 scale-95 hover:scale-100 opacity-65 hover:opacity-95 blur-xs hover:blur-none z-10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-colors duration-500 ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-300/70'
                          : 'bg-white/10 text-amber-300 border-white/20'
                      }`}
                    >
                      <IconComp className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.8} />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full border transition-colors ${
                        isSelected
                          ? 'bg-white/15 border-white/25 text-amber-200'
                          : 'bg-white/10 border-white/10 text-white/70'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-emerald-400' : 'bg-white/50'
                        }`}
                      />
                      <span>{item.badge}</span>
                    </span>
                  </div>
                  <div>
                    <h3
                      className={`text-xs sm:text-sm font-semibold tracking-tight ${
                        isSelected ? 'text-white' : 'text-white/90'
                      }`}
                    >
                      {item.title}
                    </h3>
                    <p
                      className={`text-[11px] sm:text-xs mt-1 leading-relaxed transition-colors ${
                        isSelected ? 'text-slate-200' : 'text-slate-300/80'
                      }`}
                    >
                      {item.desc}
                    </p>
                  </div>
                  <div
                    className={`h-0.5 rounded-full transition-all duration-500 ${
                      isSelected ? 'w-10 bg-amber-400' : 'w-4 bg-white/20'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* SEÇÃO MULTI-PLATAFORMA */}
      <section id="dispositivos" className="py-14 lg:py-20 bg-linear-to-b from-slate-50/75 via-slate-50/40 to-white border-t border-slate-200/60 overflow-x-clip">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-slate-800">
                Funciona em qualquer dispositivo, em qualquer lugar.
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Passe pelas setas ou clique nos modelos ao fundo para alternar entre celular, computador e tablet KDS.
              </p>
            </div>

            {/* Seletor de Aparelhos (Centralizado no mobile) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100/90 border border-slate-200/70 self-center md:self-auto mx-auto md:mx-0 overflow-x-auto max-w-full scrollbar-none">
              <button
                type="button"
                onClick={() => setActiveDevice('iphone')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeDevice === 'iphone'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Smartphone className="w-3.5 h-3.5 shrink-0" />
                <span>Celular</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('notebook')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeDevice === 'notebook'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Laptop className="w-3.5 h-3.5 shrink-0" />
                <span>Computador</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveDevice('tablet')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeDevice === 'tablet'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Tablet className="w-3.5 h-3.5 shrink-0" />
                <span>Tablet</span>
              </button>
            </div>
          </div>

          {/* VITRINE DESKTOP */}
          <div className="hidden md:block relative w-full mx-auto">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-160 h-96 rounded-full bg-radial from-emerald-100/50 via-slate-200/35 to-transparent blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 bottom-10 -translate-x-1/2 w-96 h-4 rounded-full bg-radial from-slate-300/45 to-transparent blur-md"
            />

            {/* Seta Esquerda */}
            <button
              type="button"
              onClick={irParaDispositivoAnterior}
              aria-label="Dispositivo anterior"
              className="absolute left-2 lg:left-6 top-1/2 -translate-y-1/2 z-40 w-9 h-9 lg:w-10 lg:h-10 rounded-full border bg-white/55 hover:bg-white/95 backdrop-blur-md border-slate-200/70 text-slate-500/80 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <LucideIcons.ChevronLeft className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={1.8} />
            </button>

            {/* Seta Direita */}
            <button
              type="button"
              onClick={irParaProximoDispositivo}
              aria-label="Próximo dispositivo"
              className="absolute right-2 lg:right-6 top-1/2 -translate-y-1/2 z-40 w-9 h-9 lg:w-10 lg:h-10 rounded-full border bg-white/55 hover:bg-white/95 backdrop-blur-md border-slate-200/70 text-slate-500/80 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
            >
              <LucideIcons.ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" strokeWidth={1.8} />
            </button>

            {/* Fundo */}
            <div className="relative h-116 lg:h-124 flex items-center justify-center perspective-distant">
              {dispositivosOrdem.map((disp, idx) => {
                const diff = (idx - indiceDispositivoAtivo + 3) % 3;
                const estaNoCentro = diff === 0;
                const estaNaEsquerda = diff === 2;
                const larguraSlot =
                  disp === 'iphone'
                    ? 'w-64'
                    : disp === 'notebook'
                      ? 'w-full max-w-xl lg:max-w-2xl'
                      : 'w-full max-w-lg lg:max-w-xl';
                const escalaFundo =
                  disp === 'iphone' ? 'scale-65' : 'scale-45 lg:scale-50';

                return (
                  <div
                    key={disp}
                    role={estaNoCentro ? undefined : 'button'}
                    tabIndex={estaNoCentro ? undefined : 0}
                    aria-label={
                      estaNoCentro ? undefined : `Visualizar ${descricaoDispositivos[disp].titulo}`
                    }
                    onClick={!estaNoCentro ? () => setActiveDevice(disp) : undefined}
                    onKeyDown={
                      !estaNoCentro
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setActiveDevice(disp);
                            }
                          }
                        : undefined
                    }
                    className={`absolute flex items-center justify-center transition-all duration-700 ease-out will-change-transform ${larguraSlot} ${
                      estaNoCentro
                        ? 'translate-x-0 scale-100 rotate-y-0 opacity-100 blur-none z-30'
                        : estaNaEsquerda
                          ? `-translate-x-56 lg:-translate-x-80 xl:-translate-x-96 ${escalaFundo} rotate-y-12 opacity-45 blur-xs hover:opacity-75 z-10 cursor-pointer`
                          : `translate-x-56 lg:translate-x-80 xl:translate-x-96 ${escalaFundo} -rotate-y-12 opacity-45 blur-xs hover:opacity-75 z-10 cursor-pointer`
                    }`}
                  >
                    <div
                      className={`w-full flex justify-center ${
                        estaNoCentro ? 'pointer-events-auto' : 'pointer-events-none select-none'
                      }`}
                    >
                      {renderizarAparelho(disp)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legenda centralizada do aparelho em destaque */}
            <div
              key={activeDevice}
              className="mt-3 text-center max-w-md mx-auto animate-in fade-in duration-300"
            >
              <h3 className="text-sm font-medium text-slate-800">
                {descricaoDispositivos[activeDevice].titulo}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {descricaoDispositivos[activeDevice].subtitulo}
              </p>
            </div>
          </div>

          {/* CARROSSEL MOBILE: 1 POR VEZ COM E SETAS */}
          <div
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              if (touchStartXRef.current === null) return;
              const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
              touchStartXRef.current = null;
              if (deltaX > 45) irParaDispositivoAnterior();
              else if (deltaX < -45) irParaProximoDispositivo();
            }}
            className="relative max-w-xl mx-auto md:hidden"
          >
            <button
              type="button"
              onClick={irParaDispositivoAnterior}
              aria-label="Dispositivo anterior"
              className="absolute left-0 top-1/2 -translate-y-8 z-30 w-8 h-8 rounded-full border bg-white/60 hover:bg-white/95 backdrop-blur-md border-slate-200/70 text-slate-500/80 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <LucideIcons.ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
            </button>

            <button
              type="button"
              onClick={irParaProximoDispositivo}
              aria-label="Próximo dispositivo"
              className="absolute right-0 top-1/2 -translate-y-8 z-30 w-8 h-8 rounded-full border bg-white/60 hover:bg-white/95 backdrop-blur-md border-slate-200/70 text-slate-500/80 hover:text-slate-800 shadow-sm flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
            >
              <LucideIcons.ChevronRight className="w-4 h-4" strokeWidth={1.8} />
            </button>

            <div className="overflow-hidden py-2">
              <div
                style={{ transform: `translateX(-${indiceDispositivoAtivo * 100}%)` }}
                className="flex items-center transition-transform duration-500 ease-out"
              >
                {dispositivosOrdem.map((disp) => (
                  <div
                    key={disp}
                    className={`w-full shrink-0 px-3 sm:px-9 flex flex-col items-center transition-all duration-500 ${
                      activeDevice === disp ? 'opacity-100 scale-100' : 'opacity-40 scale-95'
                    }`}
                  >
                    {renderizarAparelho(disp)}
                    <div className="mt-4 text-center max-w-sm px-4">
                      <h3 className="text-sm font-medium text-slate-800">
                        {descricaoDispositivos[disp].titulo}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {descricaoDispositivos[disp].subtitulo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Indicadores */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {dispositivosOrdem.map((disp) => {
              const ativo = activeDevice === disp;
              return (
                <button
                  key={disp}
                  type="button"
                  onClick={() => setActiveDevice(disp)}
                  aria-label={`Mostrar ${disp}`}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    ativo
                      ? 'w-7 bg-emerald-800'
                      : 'w-2 bg-slate-200 hover:bg-slate-300'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </section>



      {/* BLOCO 3: AMBIENTE */}
      <section id="ambiente" className="bg-slate-50/70 border-y border-slate-200/60">
        {/* Cabeçalho e Seletores de Setor */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 lg:pt-14 pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-slate-800">
                Feito para o ritmo do sol, da areia e do mar.
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Interaja com a tela do iPhone para testar cada setor da operação na prática.
              </p>
            </div>

            {/* Botões Seletores */}
            <div className="grid grid-cols-2 sm:inline-flex items-center gap-1 bg-slate-100/90 border border-slate-200/70 p-1 rounded-2xl sm:rounded-full self-stretch md:self-auto">
              {BEACH_SCENES.map((scene, index) => {
                const isActive = activeSceneIndex === index;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onMouseEnter={() => setActiveSceneIndex(index)}
                    onClick={() => setActiveSceneIndex(index)}
                    className={`px-3 sm:px-3.5 py-1.5 rounded-xl sm:rounded-full text-xs font-medium flex items-center justify-center sm:justify-start gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="text-slate-400 font-normal">{scene.step}</span>
                    <span>{scene.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* fundo Panorâmico */}
        <div className="group relative w-full overflow-hidden bg-slate-900 min-h-136 lg:min-h-148 flex items-stretch">
          {/* Fotos de Fundo com Transição */}
          {BEACH_SCENES.map((scene, index) => (
            <img
              key={scene.id}
              src={scene.image}
              alt={scene.title}
              className={`absolute inset-0 w-full h-full object-cover ${scene.focalClass} transition-all duration-700 ease-out pointer-events-none ${
                activeSceneIndex === index ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            />
          ))}

          {/* Véus */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-950/65 via-slate-950/20 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/85 via-slate-950/25 to-slate-950/15"
          />

          {/* Setas Laterais */}
          <button
            type="button"
            onClick={() =>
              setActiveSceneIndex((prev) => (prev - 1 + BEACH_SCENES.length) % BEACH_SCENES.length)
            }
            aria-label="Cena anterior"
            className="absolute left-1.5 sm:left-4 lg:left-6 top-56 sm:top-1/2 sm:-translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/35 hover:bg-slate-950/65 backdrop-blur-md border border-white/20 text-white/90 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <LucideIcons.ChevronLeft className="w-4 h-4" strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={() => setActiveSceneIndex((prev) => (prev + 1) % BEACH_SCENES.length)}
            aria-label="Próxima cena"
            className="absolute right-1.5 sm:right-4 lg:right-6 top-56 sm:top-1/2 sm:-translate-y-1/2 z-30 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-950/35 hover:bg-slate-950/65 backdrop-blur-md border border-white/20 text-white/90 hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            <LucideIcons.ChevronRight className="w-4 h-4" strokeWidth={1.8} />
          </button>

          <div className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12 flex flex-col lg:grid lg:grid-cols-12 items-center lg:items-end justify-between gap-7 lg:gap-10">
            {/* LEGENDA FOTO */}
            <div
              key={activeScene.id}
              className="w-full max-w-md lg:col-span-6 lg:pb-2 order-2 lg:order-1 text-center lg:text-left animate-in fade-in slide-in-from-bottom-2 duration-500"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/35 backdrop-blur-md border border-white/20 mb-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span className="text-[11px] font-medium tracking-wider uppercase text-amber-200">
                  {activeScene.step} / 04 • {activeScene.shortLabel}
                </span>
              </div>
              <h3 className="text-base sm:text-xl font-semibold tracking-tight text-white drop-shadow-sm">
                {activeScene.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200/95 mt-1.5 leading-relaxed">
                {activeScene.description}
              </p>
              <div className="h-0.5 w-10 rounded-full bg-amber-400/90 mt-3 mx-auto lg:mx-0" />
            </div>

            {/* APARELHO IPHONE UNIFICADO À DIREITA */}
            <div className="w-full lg:col-span-6 flex justify-center lg:justify-end order-1 lg:order-2">
              <div className="relative z-20 w-68 sm:w-72 bg-slate-700 rounded-4xl p-2 shadow-2xl border-2 border-slate-500 transition-transform duration-300 hover:-translate-y-1">
                {/* Botões Físicos Laterais do iPhone */}
                <div className="absolute -left-1 top-14 w-1 h-4 bg-slate-500 rounded-l-sm" />
                <div className="absolute -left-1 top-22 w-1 h-8 bg-slate-500 rounded-l-sm" />
                <div className="absolute -left-1 top-32 w-1 h-8 bg-slate-500 rounded-l-sm" />
                <div className="absolute -right-1 top-24 w-1 h-11 bg-slate-500 rounded-r-sm" />

                {/* Tela Interna do iPhone */}
                <div className="bg-white rounded-3xl p-2.5 sm:p-3 pt-2 flex flex-col justify-between h-112 overflow-hidden">
                  {/* Barra de Status iOS */}
                  <div className="flex items-center justify-between px-1 mb-2 shrink-0">
                    <span className="text-xs font-bold text-slate-800 tracking-tight">9:41</span>
                    <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-end px-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    </div>
                    <div className="flex items-center gap-1 text-slate-800">
                      <LucideIcons.Signal className="w-3 h-3" />
                      <LucideIcons.Wifi className="w-3 h-3" />
                      <LucideIcons.BatteryFull className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Cabeçalho Interno do App */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 truncate">
                        {activeSceneIndex === 0 && 'Gestão de Usuários'}
                        {activeSceneIndex === 1 && 'Fila do Bar & Cozinha'}
                        {activeSceneIndex === 2 && 'Painel Financeiro'}
                        {activeSceneIndex === 3 && 'Mapa de Guarda-sóis'}
                      </span>
                    </div>
                    <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      Interativo
                    </span>
                  </div>

                  {/* Corpo Dinâmico das 4 Cenas */}
                  <div
                    key={activeScene.id}
                    className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    {/* CENA 01: GESTÃO DE ACESSO */}
                    {activeSceneIndex === 0 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                            <LucideIcons.UserPlus className="w-4 h-4" strokeWidth={1.8} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 uppercase tracking-wider leading-tight">
                              Novo Usuário
                            </p>
                            <p className="text-[10px] text-slate-400">Permissões por cargo</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <LucideIcons.User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[11px] font-semibold text-slate-700 truncate">
                                MATEUS SILVA
                              </span>
                            </div>
                            <span className="text-[10px] text-emerald-600 font-semibold shrink-0">
                              Ativo
                            </span>
                          </div>

                          <div>
                            <span className="text-[9px] font-medium text-slate-400 uppercase tracking-wider block mb-1 pl-1">
                              Permissão (Toque para alternar)
                            </span>
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => setUserRoleSim('garcom')}
                                className={`relative flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  userRoleSim === 'garcom'
                                    ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                Garçom
                                {userRoleSim === 'garcom' && (
                                  <LucideIcons.MousePointerClick className="w-3 h-3 text-amber-500 absolute right-1.5 top-1.5 animate-bounce" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setUserRoleSim('admin')}
                                className={`relative flex-1 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                  userRoleSim === 'admin'
                                    ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
                                    : 'text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                Admin
                                {userRoleSim === 'admin' && (
                                  <LucideIcons.MousePointerClick className="w-3 h-3 text-indigo-600 absolute right-1.5 top-1.5 animate-bounce" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-0.5">
                          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 truncate">
                              <LucideIcons.Umbrella className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.8} />
                              <span className="truncate">Lucas (Garçom)</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold shrink-0">
                              Online
                            </span>
                          </div>
                          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 truncate">
                              <LucideIcons.Martini className="w-3.5 h-3.5 text-slate-500 shrink-0" strokeWidth={1.8} />
                              <span className="truncate">Rafael (Barman)</span>
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-semibold shrink-0">
                              Online
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CENA 02: FILA DO BAR / COZINHA  */}
                    {activeSceneIndex === 1 && (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 block truncate">
                              MESA 05 • LUCAS
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              Toque no botão para avançar
                            </span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-semibold shrink-0">
                            Fila Ao Vivo
                          </span>
                        </div>

                        <div
                          onClick={() => setBarItem1Stage((s) => ((s + 1) % 3) as 0 | 1 | 2)}
                          className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/70 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-bold text-[11px] text-slate-700 flex items-center justify-center shrink-0">
                              2x
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`text-[11px] font-semibold truncate uppercase ${
                                  barItem1Stage === 2 ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                CAIPIRINHA DE LIMÃO
                              </p>
                              <span className="text-[9px] font-medium flex items-center gap-1 mt-0.5">
                                {barItem1Stage === 0 && (
                                  <span className="text-slate-400">Aguardando toque</span>
                                )}
                                {barItem1Stage === 1 && (
                                  <span className="text-amber-600 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Em preparo no bar
                                  </span>
                                )}
                                {barItem1Stage === 2 && (
                                  <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                                    <span>Pronto para servir</span>
                                    <LucideIcons.Bell className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label="Alternar status do preparo"
                            className={`relative w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              barItem1Stage === 2
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : barItem1Stage === 1
                                  ? 'bg-amber-400 text-slate-900 border-2 border-amber-500 shadow-xs'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                            }`}
                          >
                            {barItem1Stage === 2 && <LucideIcons.Check className="w-3.5 h-3.5" />}
                            {barItem1Stage === 1 && <LucideIcons.Flame className="w-3.5 h-3.5" />}
                            {barItem1Stage === 0 && (
                              <span className="w-2 h-2 rounded-full bg-slate-200" />
                            )}
                            <LucideIcons.MousePointerClick className="w-3 h-3 text-slate-700 absolute -bottom-1 -right-1 animate-bounce" />
                          </button>
                        </div>

                        <div
                          onClick={() => setBarItem2Stage((s) => ((s + 1) % 3) as 0 | 1 | 2)}
                          className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-100/70 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-xl bg-white border border-slate-200 font-bold text-[11px] text-slate-700 flex items-center justify-center shrink-0">
                              1x
                            </span>
                            <div className="min-w-0">
                              <p
                                className={`text-[11px] font-semibold truncate uppercase ${
                                  barItem2Stage === 2 ? 'line-through text-slate-400' : 'text-slate-800'
                                }`}
                              >
                                BALDE CERVEJA CORONA
                              </p>
                              <span className="text-[9px] font-medium block mt-0.5">
                                {barItem2Stage === 0 && (
                                  <span className="text-slate-400">Aguardando toque</span>
                                )}
                                {barItem2Stage === 1 && (
                                  <span className="text-amber-600 font-semibold">Em preparo</span>
                                )}
                                {barItem2Stage === 2 && (
                                  <span className="text-emerald-600 font-semibold inline-flex items-center gap-1">
                                    <span>Pronto para servir</span>
                                    <LucideIcons.Bell className="w-3 h-3" />
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            aria-label="Alternar status"
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              barItem2Stage === 2
                                ? 'bg-emerald-500 text-white'
                                : barItem2Stage === 1
                                  ? 'bg-amber-400 text-slate-900 border-2 border-amber-500'
                                  : 'bg-white border-2 border-slate-300 text-slate-400'
                            }`}
                          >
                            {barItem2Stage === 2 && <LucideIcons.Check className="w-3.5 h-3.5" />}
                            {barItem2Stage === 1 && <LucideIcons.Flame className="w-3.5 h-3.5" />}
                            {barItem2Stage === 0 && (
                              <span className="w-2 h-2 rounded-full bg-slate-200" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CENA 03: PAINEL FINANCEIRO */}
                    {activeSceneIndex === 2 && (
                      <div className="space-y-2.5">
                        <div className="bg-linear-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-3.5 shadow-md">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-300 text-[9px] font-semibold uppercase tracking-widest">
                                  Faturamento
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setShowFinanceValues((v) => !v)}
                                  className="text-emerald-200 hover:text-white cursor-pointer"
                                  title="Mostrar/Ocultar valor"
                                >
                                  {showFinanceValues ? (
                                    <LucideIcons.EyeOff className="w-3 h-3" />
                                  ) : (
                                    <LucideIcons.Eye className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                              <p className="text-xl font-semibold tracking-tight tabular-nums mt-0.5">
                                {showFinanceValues ? 'R$ 8.490,00' : 'R$ •••••'}
                              </p>
                            </div>
                            <span className="bg-white/10 border border-white/15 px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1 shrink-0">
                              <LucideIcons.PieChart className="w-2.5 h-2.5" />
                              Pagtos.
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1.5">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-purple-600">
                              <LucideIcons.Umbrella className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] text-slate-500">Mesas</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-amber-500">
                              <LucideIcons.Clock className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] text-slate-500">Abertas</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-green-700">
                              <LucideIcons.Banknote className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] text-slate-500">Vales</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-emerald-400">
                              <LucideIcons.BarChart3 className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-[9px] text-slate-500">Métricas</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                            Extrato de Comandas
                          </span>
                          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-700 truncate">
                              MESA 04 • THAMILES
                            </span>
                            <span className="font-bold text-emerald-700 shrink-0">
                              R$ 138,00 (PIX)
                            </span>
                          </div>
                          <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-slate-700 truncate">
                              MESA 07 • CARLOS
                            </span>
                            <span className="font-bold text-emerald-700 shrink-0">
                              R$ 310,00 (Cartão)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CENA 04: MAPA DE GUARDA-SÓIS */}
                    {activeSceneIndex === 3 && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="aspect-square rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-2">
                            <span className="text-sm font-bold text-slate-700">01</span>
                            <span className="text-[9px] font-semibold text-slate-400">LIVRE</span>
                          </div>
                          <div className="aspect-square rounded-2xl bg-linear-to-br from-green-500 to-green-600 text-white flex flex-col items-center justify-center p-2">
                            <span className="text-sm font-bold">04</span>
                            <span className="text-[9px] font-semibold">MARINA</span>
                          </div>
                          <div
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all ${
                              simTick % 2 === 0
                                ? 'bg-linear-to-br from-yellow-400 to-amber-500 text-white scale-105 shadow-md'
                                : 'bg-linear-to-br from-green-500 to-green-600 text-white'
                            }`}
                          >
                            <span className="text-sm font-bold">05</span>
                            <span className="text-[9px] font-semibold inline-flex items-center gap-0.5">
                              {simTick % 2 === 0 ? (
                                <>
                                  <span>PRONTO</span>
                                  <LucideIcons.Bell className="w-2.5 h-2.5" />
                                </>
                              ) : (
                                'ENTREGUE'
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>Sincronização na areia</span>
                          <span className="font-semibold text-slate-800">Instantânea</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barra de Navegação Inferior */}
                  <div className="mt-2 bg-slate-800 rounded-full p-1 flex items-center justify-between shrink-0">
                    {[
                      { idx: 0, label: 'Gestão de Acesso', Icon: LucideIcons.Users },
                      { idx: 1, label: 'Bar e Cozinha', Icon: LucideIcons.Flame },
                      { idx: 2, label: 'Painel Financeiro', Icon: LucideIcons.Wallet },
                      { idx: 3, label: 'Mapa de Guarda-sóis', Icon: LucideIcons.Umbrella },
                    ].map((tab) => {
                      const TabIcon = tab.Icon;
                      const tabAtivo = activeSceneIndex === tab.idx;
                      return (
                        <button
                          key={tab.idx}
                          type="button"
                          onClick={() => setActiveSceneIndex(tab.idx)}
                          aria-label={tab.label}
                          title={tab.label}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                            tabAtivo
                              ? 'bg-amber-500 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          <TabIcon className="w-3.5 h-3.5" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GESTÃO FINANCEIRA */}
      <section
        id="gestao-financeira"
        onMouseEnter={() => setFinancePausado(true)}
        onMouseLeave={() => setFinancePausado(false)}
        className="relative w-full overflow-hidden py-14 sm:py-16 lg:py-24 bg-linear-to-b from-white via-emerald-50/35 to-slate-50/75 border-t border-slate-200/60"
      >
        {/* Brilhos */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-md h-112 rounded-full bg-radial from-emerald-100/55 via-transparent to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-0 w-96 h-96 rounded-full bg-radial from-amber-100/40 via-transparent to-transparent blur-3xl"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Coluna Esquerda */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 text-slate-600 text-xs font-medium shadow-2xs">
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-800 leading-tight">
                  Zero furos no caixa.{' '}
                  <span className="text-emerald-800">Lucro real na palma da mão.</span>
                </h2>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                  Acompanhe entradas, lucro líquido, vales e cancelamentos em tempo real à distância sem depender de caderninhos ou planilhas no fim do turno.
                </p>
              </div>

              {/* 4 Seletores */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 pt-1">
                {[
                  {
                    id: 0,
                    title: 'Caixa & Auditoria',
                    pain: 'Todo estorno ou cancelamento fica registrado com autor e horário.',
                    icon: LucideIcons.ShieldCheck,
                  },
                  {
                    id: 1,
                    title: 'Conferência em 1 Toque',
                    pain: 'PIX, crédito, débito e dinheiro separados sem fechar conta na mão.',
                    icon: LucideIcons.PieChart,
                  },
                  {
                    id: 2,
                    title: 'Lucro Líquido por Item',
                    pain: 'Veja o ganho real descontando custo do estoque, taxas e descontos.',
                    icon: LucideIcons.BadgeDollarSign,
                  },
                  {
                    id: 3,
                    title: 'Acompanhamento Financeiro',
                    pain: 'Controle mesas abertas, guarda-sóis e adiantamentos da equipe.',
                    icon: LucideIcons.HandCoins,
                  },
                ].map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = financeSlide === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onMouseEnter={() => setFinanceSlide(tab.id)}
                      onClick={() => setFinanceSlide(tab.id)}
                      className={`text-left px-3.5 py-3 rounded-2xl border transition-all duration-300 cursor-pointer flex items-start gap-3 ${
                        isActive
                          ? 'bg-white text-slate-800 border-emerald-200 shadow-md -translate-y-0.5 ring-1 ring-emerald-500/15'
                          : 'bg-white/60 hover:bg-white text-slate-500 border-slate-200/70'
                      }`}
                    >
                      <span
                        className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                          isActive
                            ? 'bg-emerald-900 text-white border-emerald-900'
                            : 'bg-slate-50 text-emerald-700 border-slate-200/80'
                        }`}
                      >
                        <IconComp className="w-4 h-4" strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-semibold block truncate ${
                            isActive ? 'text-slate-800' : 'text-slate-600'
                          }`}
                        >
                          {tab.title}
                        </span>
                        <span className="hidden sm:block text-[11px] text-slate-400 mt-0.5 leading-snug">
                          {tab.pain}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Coluna Direita: Vitrine 3D Interativa Fiel a AdminFinanceiro e Métricas */}
            <div className="lg:col-span-7 perspective-distant">
              <div className="group relative w-full max-w-xl mx-auto lg:ml-auto">
                {/* Camada 3D Flutuante Superior (Auditoria) */}
                <div className="hidden sm:flex items-center gap-2.5 absolute -top-4 -right-3 lg:-right-5 z-30 bg-white/95 backdrop-blur-xl border border-emerald-200/80 rounded-2xl px-3.5 py-2 shadow-xl transition-transform duration-500 ease-out group-hover:-translate-y-1.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                    <LucideIcons.Lock className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="text-[10px] font-semibold text-slate-800 block leading-tight">
                      Auditoria
                    </span>
                    <span className="text-[9px] text-emerald-700 font-medium">
                      Cancelamentos rastreados
                    </span>
                  </div>
                </div>

                {/* Camada Inferior (Lucro) */}
                <div className="hidden sm:flex items-center gap-2.5 absolute -bottom-4 -left-3 lg:-left-5 z-30 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 text-white rounded-2xl px-3.5 py-2.5 shadow-2xl transition-transform duration-500 ease-out group-hover:translate-y-1.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
                    <LucideIcons.TrendingUp className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="text-[9px] text-slate-400 block leading-tight">
                      Lucro Líquido Hoje
                    </span>
                    <span className="text-xs font-bold text-emerald-400 tabular-nums">
                      + R$ 2.190,00
                    </span>
                  </div>
                </div>

                {/* Cartão Principal */}
                <div className="relative z-20 bg-white rounded-4xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all duration-700 ease-out lg:rotate-y-3 lg:group-hover:rotate-y-0">
                  <div className="bg-linear-to-br from-emerald-900 to-emerald-950 text-white p-4 sm:p-5 relative overflow-hidden">
                    <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />
                    <div className="relative z-10 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-100 text-[10px] font-medium">
                            Hoje
                          </span>
                          <span className="p-1 rounded-full bg-black/20 border border-white/10 text-emerald-200">
                            <LucideIcons.CalendarDays className="w-3 h-3" />
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-emerald-100 text-[10px] font-medium inline-flex items-center gap-1">
                            <LucideIcons.Landmark className="w-3 h-3" />
                            <span>Todas as contas</span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-300/90 text-[11px] font-medium">
                              Saldo em contas
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowFinanceValues((v) => !v)}
                              aria-label={showFinanceValues ? 'Ocultar valores' : 'Mostrar valores'}
                              className="text-emerald-200 hover:text-white transition-colors cursor-pointer"
                            >
                              {showFinanceValues ? (
                                <LucideIcons.EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <LucideIcons.Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <p className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-white mt-0.5">
                            {showFinanceValues ? 'R$ 8.490,00' : 'R$ •••••'}
                          </p>
                        </div>

                        {/* Navegador 4 telas */}
                        <div className="flex items-center gap-1.5 bg-black/20 border border-white/10 px-2.5 py-1.5 rounded-full">
                          {[0, 1, 2, 3].map((dot) => (
                            <button
                              key={dot}
                              type="button"
                              onClick={() => setFinanceSlide(dot)}
                              aria-label={`Ver painel financeiro ${dot + 1}`}
                              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                financeSlide === dot ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/60'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-50/75 min-h-72 flex flex-col justify-between">
                    <div
                      key={financeSlide}
                      className="flex-1 flex flex-col justify-center animate-in fade-in slide-in-from-bottom-2 duration-500"
                    >
                      {/* SLIDE 0: EXTRATO & AUDITORIA */}
                      {financeSlide === 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5">
                            <span className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0">
                              <LucideIcons.ArrowDownLeft className="w-3.5 h-3.5" />
                            </span>
                            <span className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0">
                              <LucideIcons.ArrowUpRight className="w-3.5 h-3.5" />
                            </span>
                            <span className="w-7 h-7 rounded-full bg-white border border-slate-200 text-amber-600 flex items-center justify-center shrink-0">
                              <LucideIcons.Umbrella className="w-3.5 h-3.5" />
                            </span>
                            <span className="w-7 h-7 rounded-full bg-white border border-slate-200 text-emerald-600 flex items-center justify-center shrink-0">
                              <LucideIcons.Banknote className="w-3.5 h-3.5" />
                            </span>
                            <span className="ml-auto px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-medium inline-flex items-center gap-1.5 shrink-0">
                              <LucideIcons.BarChart3 className="w-3 h-3 text-emerald-400" />
                              <span>44 Comandas</span>
                            </span>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">
                                  MESA 04 • THAMILES
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  15:40 • PIX • Balde Corona + 2x Coco
                                </span>
                              </div>
                              <span className="font-semibold text-emerald-600 tabular-nums shrink-0">
                                {showFinanceValues ? '+ R$ 138,00' : '••••'}
                              </span>
                            </div>
                            <div className="px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 truncate">
                                  MESA 07 • CARLOS
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  16:12 • Crédito • Camarão + Drinks
                                </span>
                              </div>
                              <span className="font-semibold text-emerald-600 tabular-nums shrink-0">
                                {showFinanceValues ? '+ R$ 310,00' : '••••'}
                              </span>
                            </div>
                          </div>

                          <div className="px-3.5 py-2 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-center justify-between text-[11px]">
                            <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                              <LucideIcons.ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>0 cancelamentos sem justificativa</span>
                            </span>
                            <span className="text-emerald-700 font-semibold">Auditado</span>
                          </div>
                        </div>
                      )}

                      {/* SLIDE 1: CONFERÊNCIA POR FORMA DE PAGAMENTO */}
                      {financeSlide === 1 && (
                        <div className="space-y-2.5">
                          {[
                            {
                              metodo: 'PIX Instantâneo',
                              valor: 'R$ 5.120,00',
                              pct: '60%',
                              barra: 'w-3/5 bg-emerald-500',
                            },
                            {
                              metodo: 'Cartão de Crédito',
                              valor: 'R$ 2.180,00',
                              pct: '26%',
                              barra: 'w-1/4 bg-slate-700',
                            },
                            {
                              metodo: 'Cartão de Débito',
                              valor: 'R$ 890,00',
                              pct: '10%',
                              barra: 'w-1/12 bg-sky-500',
                            },
                            {
                              metodo: 'Dinheiro no Caixa',
                              valor: 'R$ 300,00',
                              pct: '4%',
                              barra: 'w-4 bg-amber-500',
                            },
                          ].map((item) => (
                            <div
                              key={item.metodo}
                              className="bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-700 tabular-nums">
                                    {item.pct}
                                  </span>
                                  <span className="font-medium text-slate-700">{item.metodo}</span>
                                </div>
                                <span className="font-semibold text-slate-800 tabular-nums">
                                  {showFinanceValues ? item.valor : 'R$ •••••'}
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div className={`h-full rounded-full ${item.barra}`} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* SLIDE 2: LUCRO LÍQUIDO & MÉTRICAS (Fiel a AdminFinanceiroMetricas.tsx) */}
                      {financeSlide === 2 && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs">
                              <span className="text-[10px] text-slate-400 block">Vendas</span>
                              <div className="flex items-center justify-between gap-1 mt-1">
                                <span className="text-sm sm:text-base font-medium text-slate-600 tabular-nums">
                                  24
                                </span>
                                <span className="w-7 h-7 rounded-xl bg-sky-50 border border-sky-100 text-sky-500 flex items-center justify-center shrink-0">
                                  <LucideIcons.ShoppingBag className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs">
                              <span className="text-[10px] text-slate-400 block">Lucro</span>
                              <div className="flex items-center justify-between gap-1 mt-1">
                                <span className="text-sm sm:text-base font-medium text-emerald-700 tabular-nums truncate">
                                  {showFinanceValues ? 'R$ 2.190' : '••••'}
                                </span>
                                <span className="w-7 h-7 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center shrink-0">
                                  <LucideIcons.BadgeDollarSign className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs">
                              <span className="text-[10px] text-slate-400 block">Guarda-Sol</span>
                              <div className="flex items-center justify-between gap-1 mt-1">
                                <span className="text-sm sm:text-base font-medium text-slate-600 tabular-nums truncate">
                                  {showFinanceValues ? 'R$ 640' : '••••'}
                                </span>
                                <span className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shrink-0">
                                  <LucideIcons.Umbrella className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-12 gap-2.5">
                            <div className="col-span-5 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col items-center justify-between text-center">
                              <span className="text-[10px] font-medium text-slate-600 self-start">
                                Concluídas
                              </span>
                              <div className="relative w-14 h-14 my-1 flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    fill="none"
                                    stroke="#f1f5f9"
                                    strokeWidth="3.5"
                                  />
                                  <circle
                                    cx="18"
                                    cy="18"
                                    r="14"
                                    fill="none"
                                    stroke="#10b981"
                                    strokeWidth="3.5"
                                    strokeDasharray="88 100"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute text-[11px] font-semibold text-slate-700 tabular-nums">
                                  100%
                                </span>
                              </div>
                              <span className="text-[10px] font-medium text-slate-500 tabular-nums">
                                {showFinanceValues ? 'R$ 4.280,00' : 'R$ •••••'}
                              </span>
                            </div>

                            <div className="col-span-7 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-2xs flex flex-col justify-between">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-medium text-slate-600">
                                  Fluxo de Receita
                                </span>
                                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-medium">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Em alta
                                </span>
                              </div>
                              <svg viewBox="0 0 180 54" className="w-full h-14 mt-1">
                                <path
                                  d="M 5 44 L 38 36 L 72 28 L 106 31 L 140 16 L 175 9"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="2.4"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M 5 50 L 38 48 L 72 49 L 106 46 L 140 47 L 175 44"
                                  fill="none"
                                  stroke="#facc15"
                                  strokeWidth="1.8"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="175" cy="9" r="3" fill="#059669" />
                              </svg>
                              <div className="flex items-center justify-between text-[9px] text-slate-400 border-t border-slate-100 pt-1">
                                <span>09h</span>
                                <span>12h</span>
                                <span>15h</span>
                                <span>18h</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SLIDE 3: CONSUMO NA AREIA & VALES DA EQUIPE */}
                      {financeSlide === 3 && (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 block">
                                Em Aberto na Areia
                              </span>
                              <span className="text-lg sm:text-xl font-semibold text-amber-600 tabular-nums mt-0.5 block">
                                {showFinanceValues ? 'R$ 1.840,00' : 'R$ •••••'}
                              </span>
                              <span className="text-[10px] text-slate-500">18 Mesas Ocupadas</span>
                            </div>
                            <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 block">
                                Taxa Guarda-sol
                              </span>
                              <span className="text-lg sm:text-xl font-semibold text-indigo-700 tabular-nums mt-0.5 block">
                                {showFinanceValues ? 'R$ 640,00' : 'R$ •••••'}
                              </span>
                              <span className="text-[10px] text-slate-500">32 Locações Hoje</span>
                            </div>
                          </div>

                          <div className="bg-white rounded-2xl border border-slate-200/80 divide-y divide-slate-100 shadow-2xs">
                            <div className="px-3.5 py-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">
                                Garçom Mateus • Adiantamento
                              </span>
                              <span className="font-semibold text-slate-700 tabular-nums">
                                R$ 80,00 (Pago)
                              </span>
                            </div>
                            <div className="px-3.5 py-2 flex items-center justify-between text-xs">
                              <span className="font-medium text-slate-700">
                                Barman Rafael • Diária Extra
                              </span>
                              <span className="font-semibold text-slate-700 tabular-nums">
                                R$ 150,00 (Pago)
                              </span>
                            </div>
                          </div>

                          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between text-xs">
                            <span className="text-slate-500">Previsão Total de Fechamento</span>
                            <span className="font-bold text-emerald-700 tabular-nums">
                              {showFinanceValues ? 'R$ 10.330,00' : 'R$ •••••'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO DE CREDIBILIDADE E ENGENHARIA: ÂNCORA-DEV & THAMILES (WIREFRAME 5D VERDE MODERNO + VIDRO TRANSLÚCIDO) */}
      <section
        id="ancora-dev"
        className="scroll-mt-16 relative z-30 w-full overflow-x-clip py-16 sm:py-20 lg:py-28 bg-linear-to-br from-slate-50 via-emerald-50/55 to-teal-50/50 text-slate-800 border-t border-emerald-200/50"
      >
        {/* Atmosfera Suave na Paleta do Sistema */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 w-md h-112 rounded-full bg-radial from-emerald-200/35 via-transparent to-transparent blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-0 w-96 h-96 rounded-full bg-radial from-amber-100/30 via-transparent to-transparent blur-3xl"
        />

        {/* Fundo Ilustração Monocromática 5D Wireframe / RV com Linhas em Verde Moderno */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="relative w-full h-full isolate mix-blend-multiply opacity-75 sm:opacity-90">
            <img
              src="/wireframe-ancora-5d.jpg"
              alt=""
              className="w-full h-full object-cover object-bottom-right contrast-110 brightness-105"
            />
            <div className="absolute inset-0 bg-emerald-600 mix-blend-screen" />
          </div>
          <div className="absolute inset-0 bg-linear-to-r from-slate-50/90 via-emerald-50/45 sm:via-emerald-50/25 to-transparent" />
          <div className="absolute inset-0 bg-linear-to-t from-white/75 via-transparent to-slate-50/70" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Coluna Esquerda: Identidade Âncora-Dev + Seletor Espacial Imóvel */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-slate-900 leading-tight">
                  Desenvolvido pela{' '}
                  <span className="text-emerald-800">Âncora-Dev</span>
                </h2>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                  Empresa de Software especializada em plataformas SaaS críticas e operação em tempo real, unindo arquitetura em nuvem, segurança de dados bancários e design fluido para operações comerciais de alto volume.
                </p>
              </div>

              {/* Seletor Espacial Interativo de Stack (Altura Fixa e 100% Imóvel) */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-900/65 block">
                  Stack & Referências de Engenharia
                </span>

                <div
                  ref={stackDockRef}
                  onPointerEnter={(e) => {
                    if (e.pointerType === 'mouse') {
                      calcularDirecaoStack();
                      setStackMenuAberto(true);
                    }
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === 'mouse' && !stackMenuFixado) {
                      setStackMenuAberto(false);
                    }
                  }}
                  className="relative w-full max-w-lg"
                >
                  {/* Botão Gatilho Estável (Nunca Muda de Tamanho) */}
                  <button
                    type="button"
                    aria-expanded={stackMenuAberto}
                    aria-controls="painel-stack-espacial"
                    onClick={() => {
                      if (stackMenuFixado) {
                        setStackMenuFixado(false);
                        setStackMenuAberto(false);
                      } else {
                        calcularDirecaoStack();
                        setStackMenuFixado(true);
                        setStackMenuAberto(true);
                      }
                    }}
                    className={`w-full h-15 rounded-4xl px-3.5 border backdrop-blur-xl flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer ${
                      stackMenuAberto
                        ? 'bg-white/90 border-emerald-300/90 shadow-lg shadow-emerald-950/10'
                        : 'bg-white/70 hover:bg-white/90 border-emerald-200/80 hover:border-emerald-300 shadow-sm shadow-emerald-950/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-2xl bg-emerald-950 text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
                        <LucideIcons.Sparkles className="w-4 h-4" strokeWidth={1.8} />
                      </span>

                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                            Tecnologias em produção
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-semibold text-emerald-800 shrink-0">
                            {STACK_ENGENHARIA.length}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/80 text-[10px] font-sans text-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Explorar</span>
                      </span>
                      <span
                        className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          stackMenuAberto
                            ? 'rotate-180 bg-emerald-950 border-emerald-950 text-white'
                            : 'bg-white/80 border-emerald-200/80 text-emerald-800'
                        }`}
                      >
                        <LucideIcons.ChevronDown className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </button>

                  {/* Painel Flutuante Responsivo (Direção Inteligente + Encolhe ao Filtrar Sem Mover a Página) */}
                  {stackMenuAberto && (
                    <div
                      id="painel-stack-espacial"
                      role="region"
                      aria-label="Explorador de Tecnologias"
                      className={`absolute left-0 right-0 z-50 transition-all duration-300 ease-out ${
                        stackAbrirParaCima
                          ? 'bottom-full pb-2 origin-bottom'
                          : 'top-full pt-2 origin-top'
                      }`}
                    >
                      <div className="rounded-3xl bg-white/95 backdrop-blur-2xl border border-emerald-200/80 shadow-2xl shadow-emerald-950/15 overflow-hidden max-h-96 overflow-y-auto scrollbar-none transition-all duration-300 ease-out">
                        {/* Barra Superior com Filtros por Camada */}
                        <div className="px-3.5 py-2.5 bg-emerald-50/70 border-b border-emerald-100 flex items-center justify-between gap-2">
                          <div
                            role="group"
                            aria-label="Filtrar tecnologias por camada"
                            className="inline-flex items-center gap-1 bg-white/90 p-0.5 rounded-full border border-emerald-200/70"
                          >
                            {CATEGORIAS_STACK.map((cat) => {
                              const ativa = categoriaStack === cat.id;
                              return (
                                <button
                                  key={cat.id}
                                  type="button"
                                  onClick={() => {
                                    setCategoriaStack(cat.id);
                                    const primeiraDaCamada =
                                      cat.id === 'todas'
                                        ? STACK_ENGENHARIA[0]
                                        : STACK_ENGENHARIA.find((item) => item.categoria === cat.id);
                                    if (primeiraDaCamada) setStackAtivaId(primeiraDaCamada.id);
                                  }}
                                  aria-pressed={ativa}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                                    ativa
                                      ? 'bg-emerald-900 text-white shadow-2xs'
                                      : 'text-slate-500 hover:text-emerald-900'
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setStackMenuAberto(false);
                              setStackMenuFixado(false);
                            }}
                            aria-label="Fechar explorador de tecnologias"
                            className="w-6 h-6 rounded-full bg-white border border-emerald-200/80 text-slate-500 hover:text-emerald-900 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          >
                            <LucideIcons.X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Grade Filtrável com Transição Suave (Encolhe Conforme o Filtro) */}
                        <div
                          key={categoriaStack}
                          className="p-2.5 grid grid-cols-2 gap-1.5 animate-in fade-in duration-200"
                        >
                          {stacksFiltradas.map((tech) => {
                            const TechIcon = tech.Icon;
                            const selecionada = stackSelecionada.id === tech.id;

                            return (
                              <button
                                key={tech.id}
                                type="button"
                                onMouseEnter={() => setStackAtivaId(tech.id)}
                                onFocus={() => setStackAtivaId(tech.id)}
                                onClick={() => setStackAtivaId(tech.id)}
                                aria-pressed={selecionada}
                                className={`min-h-10 py-1.5 px-2.5 rounded-2xl border text-left flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                                  selecionada
                                    ? 'bg-emerald-950 border-emerald-950 text-white shadow-sm'
                                    : 'bg-white/95 hover:bg-emerald-50/70 border-slate-200/80 hover:border-emerald-300 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                                    selecionada
                                      ? 'bg-emerald-400/20 text-emerald-300'
                                      : 'bg-emerald-50 text-emerald-700'
                                  }`}
                                >
                                  <TechIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
                                </span>
                                <span className="text-[11px] font-medium leading-tight">
                                  {tech.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Painel IA de Detalhe Instantâneo */}
                        <div className="mx-2.5 mb-2.5 px-3 py-2.5 min-h-18 rounded-2xl bg-emerald-50/75 border border-emerald-200/70 flex flex-col justify-center">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {stackSelecionada.label}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white border border-emerald-200/80 text-[10px] font-medium text-emerald-800 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {stackSelecionada.camadaLabel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-snug mt-1">
                            {stackSelecionada.resumo}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita: Card Translúcido da Fundadora + Garantias de Conversão 5D */}
            <div className="lg:col-span-6">
              <div className="w-full max-w-lg mx-auto lg:ml-auto space-y-5">
                {/* Card da Fundadora & CEO em Vidro Fosco Translúcido */}
                <div className="w-full rounded-3xl bg-white/65 backdrop-blur-xl border border-emerald-200/75 text-slate-800 p-5 sm:p-6 shadow-lg shadow-emerald-950/5 space-y-3.5 transition-transform duration-500 hover:-translate-y-1">
                  <div className="flex items-center gap-3.5">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-emerald-200/80 bg-white shadow-xs">
                        <img
                          src="/thamiles-avatar.jpg"
                          alt="Avatar cartoon de Thamiles, Fundadora e CEO da Âncora-Dev"
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white"
                      />
                    </div>

                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-[10px] font-semibold uppercase tracking-wider text-emerald-800">
                        Fundadora & CEO
                      </span>
                      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 mt-1 truncate">
                        Thamiles
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Engenheira de Software
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-emerald-100/80 pt-3">
                    No comando da Âncora-Dev, une visão estratégica e tecnologia ágil para entregar resultados reais sem complicação.
                  </p>

                  <div className="pt-2 border-t border-emerald-100/80 flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-emerald-800 font-medium">
                      <LucideIcons.CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Assinatura Âncora-Dev</span>
                    </span>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-600 transition-colors"
                    >
                      <span>Falar com especialista</span>
                      <LucideIcons.ArrowRight className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Vitrine 5D Translúcida de Garantias e Conversão (Zero Redundância) */}
                <div
                  onMouseEnter={() => setEngenhariaPausado(true)}
                  onMouseLeave={() => {
                    setEngenhariaPausado(false);
                    handlePilarMouseLeave();
                  }}
                  onTouchStart={(e) => {
                    pilarTouchStartXRef.current = e.touches[0].clientX;
                  }}
                  onTouchEnd={(e) => {
                    if (pilarTouchStartXRef.current === null) return;
                    const deltaX = e.changedTouches[0].clientX - pilarTouchStartXRef.current;
                    pilarTouchStartXRef.current = null;
                    if (deltaX > 40) irParaPilarAnterior();
                    else if (deltaX < -40) irParaProximoPilar();
                  }}
                  className="w-full"
                >
                  <div className="relative">
                    {/* Setas Fora da Máscara Lateral para Permanecerem Sempre Nítidas */}
                    <button
                      type="button"
                      onClick={irParaPilarAnterior}
                      aria-label="Benefício anterior"
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-white/75 hover:bg-white backdrop-blur-md border border-emerald-200/80 hover:border-emerald-300 text-emerald-900 shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    >
                      <LucideIcons.ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={irParaProximoPilar}
                      aria-label="Próximo benefício"
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-40 w-8 h-8 rounded-full bg-white/75 hover:bg-white backdrop-blur-md border border-emerald-200/80 hover:border-emerald-300 text-emerald-900 shadow-sm flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                    >
                      <LucideIcons.ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Palco 5D com Dissolução Lateral Suave (Zero Corte Seco "|") */}
                    <div className="relative h-28 sm:h-30 flex items-center justify-center perspective-distant overflow-hidden fade-edges-stage">
                      {PILARES_ENGENHARIA.map((pilar, idx) => {
                        const total = PILARES_ENGENHARIA.length;
                        const diff = (idx - pilarEngenhariaIdx + total) % total;
                        const estaNoCentro = diff === 0;
                        const estaNaEsquerda = diff === total - 1;
                        const estaNaDireita = diff === 1;
                        const PilarIcon = pilar.Icon;

                        const estiloTiltCentro =
                          estaNoCentro && podeInclinarPilar
                            ? {
                                transform: `perspective(1000px) rotateX(${pilarTilt.rx}deg) rotateY(${pilarTilt.ry}deg) translateZ(0)`,
                                transition: pilarTilt.ativo
                                  ? 'transform 120ms ease-out'
                                  : 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
                              }
                            : undefined;

                        return (
                          <div
                            key={pilar.id}
                            role={estaNoCentro ? undefined : 'button'}
                            tabIndex={estaNoCentro ? undefined : 0}
                            aria-label={estaNoCentro ? undefined : `Focar em ${pilar.titulo}`}
                            onClick={!estaNoCentro ? () => setPilarEngenhariaIdx(idx) : undefined}
                            onMouseMove={estaNoCentro ? handlePilarMouseMove : undefined}
                            onMouseLeave={estaNoCentro ? handlePilarMouseLeave : undefined}
                            onKeyDown={
                              !estaNoCentro
                                ? (e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setPilarEngenhariaIdx(idx);
                                    }
                                  }
                                : undefined
                            }
                            className={`absolute w-60 sm:w-76 transition-all duration-700 ease-out will-change-transform ${
                              estaNoCentro
                                ? 'translate-x-0 scale-100 rotate-y-0 opacity-100 z-30'
                                : estaNaEsquerda
                                  ? '-translate-x-28 sm:-translate-x-44 scale-80 sm:scale-85 rotate-y-12 opacity-75 hover:opacity-100 z-10 cursor-pointer'
                                  : estaNaDireita
                                    ? 'translate-x-28 sm:translate-x-44 scale-80 sm:scale-85 -rotate-y-12 opacity-75 hover:opacity-100 z-10 cursor-pointer'
                                    : 'translate-x-0 scale-75 opacity-0 pointer-events-none z-0'
                            }`}
                          >
                            <div
                              style={estiloTiltCentro}
                              className={`relative overflow-hidden rounded-2xl px-4 py-3.5 border backdrop-blur-xl flex items-center gap-3.5 transition-colors ${
                                estaNoCentro
                                  ? 'bg-emerald-950/75 border-emerald-400/35 ring-1 ring-white/15 text-white shadow-xl shadow-emerald-950/15'
                                  : 'bg-emerald-950/15 border-emerald-700/20 text-slate-800'
                              }`}
                            >
                              {estaNoCentro && (
                                <div
                                  aria-hidden="true"
                                  className="pointer-events-none absolute inset-x-4 top-0 h-px bg-linear-to-r from-transparent via-emerald-300/60 to-transparent"
                                />
                              )}

                              <span
                                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                                  estaNoCentro
                                    ? 'bg-emerald-400/15 border-emerald-300/30 text-amber-300'
                                    : 'bg-white/60 border-emerald-700/20 text-emerald-800'
                                }`}
                              >
                                <PilarIcon className="w-4 h-4" strokeWidth={1.8} />
                              </span>

                              <div className="min-w-0 flex-1">
                                <span
                                  className={`text-xs sm:text-sm font-semibold tracking-tight block leading-snug ${
                                    estaNoCentro ? 'text-white' : 'text-slate-800'
                                  }`}
                                >
                                  {pilar.titulo}
                                </span>
                                <span
                                  className={`text-[11px] block leading-snug mt-0.5 ${
                                    estaNoCentro ? 'text-emerald-100/85' : 'text-slate-600'
                                  }`}
                                >
                                  {pilar.detalhe}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Indicadores Discretos */}
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    {PILARES_ENGENHARIA.map((pilar, idx) => (
                      <button
                        key={pilar.id}
                        type="button"
                        onClick={() => setPilarEngenhariaIdx(idx)}
                        aria-label={`Selecionar ${pilar.titulo}`}
                        className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                          pilarEngenhariaIdx === idx
                            ? 'w-6 bg-emerald-800'
                            : 'w-1.5 bg-emerald-900/25 hover:bg-emerald-900/45'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ MINIMALISTA PADRÃO T-SYSTEM BEACH (ENCOSTADO NO FUNDO + EFEITO 5D) */}
      <footer className="mt-auto relative z-10 overflow-x-clip bg-linear-to-br from-emerald-950 via-emerald-900 to-slate-950 text-white font-sans">
        {/* Camada 5D Wireframe Sutil + Ondas Luminosas na Paleta do Sistema */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <img
            src="/wireframe-ancora-5d.jpg"
            alt=""
            className="w-full h-full object-cover object-bottom-right opacity-10 invert mix-blend-screen"
          />
          <div className="absolute -top-24 -right-24 w-md h-112 rounded-full bg-radial from-emerald-400/15 via-transparent to-transparent blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 w-96 h-96 rounded-full bg-radial from-teal-400/15 via-transparent to-transparent blur-3xl" />
        </div>

        {/* Faixa Superior do Rodapé */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          {/* Barra Discreta com Voltar ao Topo */}
          <div className="flex items-center justify-between pb-6 border-b border-white/15">
            <a
              href="#inicio"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-100/80 hover:text-white transition-colors"
            >
              <span>Voltar ao topo</span>
              <LucideIcons.ChevronUp className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Grade Limpa de 5 Áreas */}
          <div className="pt-8 pb-8 grid grid-cols-2 lg:grid-cols-12 gap-x-6 gap-y-8 items-start">
            {/* Marca & Endereço */}
            <div className="col-span-2 lg:col-span-3 space-y-3">
              <div className="inline-flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-2xl bg-white/10 border border-white/15 text-amber-400 flex items-center justify-center shrink-0">
                  <LucideIcons.Umbrella className="w-4 h-4" strokeWidth={2} />
                </span>
                <div className="leading-none">
                  <span className="text-sm font-light tracking-wide text-emerald-100 block">
                    t-system
                  </span>
                  <span className="text-lg font-bold tracking-tight text-white">
                    beach<span className="text-amber-400">.</span>
                  </span>
                </div>
              </div>

              <p className="flex items-center gap-1.5 text-xs text-emerald-100/70">
                <LucideIcons.MapPin className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Fortaleza, CE — Brasil</span>
              </p>
            </div>

            {/* Coluna: Negócios & Videoaulas */}
            <div className="col-span-1 lg:col-span-2 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Negócios
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] text-emerald-100/80">
                {LINKS_NEGOCIOS_RODAPE.map((item) => (
                  <li key={item.label}>
                    <a
                      href={criarLinkWhatsapp(item.mensagem)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors inline-flex items-center gap-1"
                    >
                      <span>{item.label}</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a
                    href={criarLinkWhatsapp(
                      'Olá! Gostaria de receber o link das videoaulas e tutoriais do T-System Beach.'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>Videoaulas</span>
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna: Atendimento */}
            <div className="col-span-1 lg:col-span-2 space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Atendimento
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] text-emerald-100/80">
                {LINKS_ATENDIMENTO_RODAPE.map((item) => (
                  <li key={item.label}>
                    <a
                      href={criarLinkWhatsapp(item.mensagem)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna: Segurança & Certificados */}
            <div ref={certificadosRef} className="col-span-1 lg:col-span-2 space-y-3 relative">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Segurança
              </h3>
              <ul className="space-y-2 text-xs sm:text-[13px] text-emerald-100/80">
                <li className="flex items-center gap-1.5 text-emerald-100/90">
                  <LucideIcons.Lock className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Sistema Seguro</span>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setCertificadosAbertos((prev) => !prev)}
                    aria-expanded={certificadosAbertos}
                    className="hover:text-white transition-colors inline-flex items-center gap-1.5 cursor-pointer text-left"
                  >
                    <LucideIcons.Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Certificados</span>
                  </button>
                </li>
                <li className="text-emerald-100/75">🛡️ Proteção LGPD</li>
              </ul>

              {certificadosAbertos && (
                <div className="absolute bottom-full left-0 mb-2 z-30 w-64 rounded-2xl bg-emerald-950/95 backdrop-blur-xl border border-emerald-400/25 p-3 shadow-2xl space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-300 pb-1 border-b border-white/10">
                    <span>Selos & Conformidade</span>
                    <button
                      type="button"
                      onClick={() => setCertificadosAbertos(false)}
                      aria-label="Fechar certificados"
                      className="text-emerald-200 hover:text-white cursor-pointer"
                    >
                      <LucideIcons.X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {SELOS_CERTIFICACAO_RODAPE.map((selo) => (
                    <div
                      key={selo.texto}
                      className="text-[11px] text-emerald-100/90 flex items-center gap-1.5"
                    >
                      <span aria-hidden="true">{selo.emoji}</span>
                      <span>{selo.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coluna: Siga-nos (Ícones Circulares Minimalistas) */}
            <div className="col-span-1 lg:col-span-3 lg:justify-self-end space-y-3 relative">
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                Siga-nos
              </h3>
              <div className="flex items-center gap-2.5">
                {REDES_SOCIAIS_RODAPE.map((rede) => {
                  const circleClass =
                    'w-8 h-8 rounded-full bg-white/15 hover:bg-amber-400 text-white hover:text-emerald-950 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 cursor-pointer';

                  if (rede.url) {
                    return (
                      <a
                        key={rede.id}
                        href={rede.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={rede.nome}
                        title={rede.nome}
                        className={circleClass}
                      >
                        <IconeRedeSocial id={rede.id} />
                      </a>
                    );
                  }

                  return (
                    <button
                      key={rede.id}
                      type="button"
                      onClick={() => mostrarAvisoRede(rede.aviso)}
                      aria-label={rede.nome}
                      title={rede.nome}
                      className={circleClass}
                    >
                      <IconeRedeSocial id={rede.id} />
                    </button>
                  );
                })}
              </div>

              {redeAviso && (
                <div className="absolute bottom-full right-0 mb-2 z-30 w-60 rounded-2xl bg-emerald-950/95 backdrop-blur-xl border border-emerald-400/25 px-3 py-2 text-[11px] text-emerald-100 shadow-xl">
                  {redeAviso}
                </div>
              )}
            </div>
          </div>

          {/* Linha de Copyright */}
          <div className="border-t border-white/10 pt-5 text-[11px] tracking-wide text-emerald-100/70">
            <span>© 2022–2026 • Âncora-Dev • Todos os direitos reservados.</span>
          </div>
        </div>


      </footer>

      {/* BOTÃO DO WHATSAPP */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Conversar no WhatsApp"
        className="fixed bottom-safe-5 right-5 z-50 w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
      >
        <LucideIcons.MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}

export default LandingPage;
