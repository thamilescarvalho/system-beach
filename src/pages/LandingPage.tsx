import { useState, useEffect, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';

interface UmbrellaItem {
  id: string;
  number: string;
  status: 'occupied' | 'ready' | 'free';
  client: string;
  waiter: string;
  total: string;
  time: string;
  items: {
    name: string;
    qty: number;
    unitPrice: string;
    totalPrice: string;
    category: string;
    status: string;
  }[];
}

const UMBRELLAS_DATA: UmbrellaItem[] = [
  {
    id: '01',
    number: '01',
    status: 'free',
    client: 'Livre',
    waiter: 'Disponível',
    total: 'R$ 0,00',
    time: 'Livre agora',
    items: [],
  },
  {
    id: '02',
    number: '02',
    status: 'occupied',
    client: 'André',
    waiter: 'Garçom Lucas',
    total: 'R$ 246,00',
    time: '42 min',
    items: [
      { name: 'COMBO CORONA (6 UN)', qty: 1, unitPrice: 'R$ 114,00', totalPrice: 'R$ 114,00', category: 'Bar', status: 'Entregue' },
      { name: 'CAMARÃO EMPANADO CROCANTE', qty: 1, unitPrice: 'R$ 108,00', totalPrice: 'R$ 108,00', category: 'Cozinha', status: 'Preparando' },
      { name: 'ÁGUA DE COCO VERDE', qty: 2, unitPrice: 'R$ 12,00', totalPrice: 'R$ 24,00', category: 'Bar', status: 'Entregue' },
    ],
  },
  {
    id: '03',
    number: '03',
    status: 'free',
    client: 'Livre',
    waiter: 'Disponível',
    total: 'R$ 0,00',
    time: 'Livre agora',
    items: [],
  },
  {
    id: '04',
    number: '04',
    status: 'occupied',
    client: 'Thamiles',
    waiter: 'Garçom Mateus',
    total: 'R$ 138,00',
    time: '18 min',
    items: [
      { name: 'COMBO CORONA (6 UN)', qty: 1, unitPrice: 'R$ 114,00', totalPrice: 'R$ 114,00', category: 'Bar', status: 'Entregue' },
      { name: 'ÁGUA DE COCO VERDE GELADA', qty: 2, unitPrice: 'R$ 12,00', totalPrice: 'R$ 24,00', category: 'Bar', status: 'Entregue' },
    ],
  },
  {
    id: '05',
    number: '05',
    status: 'ready',
    client: 'Lucas',
    waiter: 'Garçom Lucas',
    total: 'R$ 194,00',
    time: 'Pedido Pronto 🔔',
    items: [
      { name: 'CAIPIRINHA DE LIMÃO', qty: 2, unitPrice: 'R$ 28,00', totalPrice: 'R$ 56,00', category: 'Barman', status: 'Pronto 🔔' },
      { name: 'COMBO CORONA (6 UN)', qty: 1, unitPrice: 'R$ 114,00', totalPrice: 'R$ 114,00', category: 'Bar', status: 'Pronto 🔔' },
      { name: 'ÁGUA DE COCO VERDE', qty: 2, unitPrice: 'R$ 12,00', totalPrice: 'R$ 24,00', category: 'Bar', status: 'Entregue' },
    ],
  },
  {
    id: '06',
    number: '06',
    status: 'free',
    client: 'Livre',
    waiter: 'Disponível',
    total: 'R$ 0,00',
    time: 'Livre agora',
    items: [],
  },
  {
    id: '07',
    number: '07',
    status: 'occupied',
    client: 'Carlos',
    waiter: 'Garçom Mateus',
    total: 'R$ 310,00',
    time: '55 min',
    items: [
      { name: 'PEIXE FRITO + CAMARÃO NO COCO', qty: 1, unitPrice: 'R$ 160,00', totalPrice: 'R$ 160,00', category: 'Cozinha', status: 'Entregue' },
      { name: 'COMBO CORONA (6 UN)', qty: 1, unitPrice: 'R$ 114,00', totalPrice: 'R$ 114,00', category: 'Bar', status: 'Entregue' },
      { name: 'ÁGUA DE COCO VERDE', qty: 3, unitPrice: 'R$ 12,00', totalPrice: 'R$ 36,00', category: 'Bar', status: 'Entregue' },
    ],
  },
  {
    id: '08',
    number: '08',
    status: 'ready',
    client: 'Fernanda',
    waiter: 'Garçom Lucas',
    total: 'R$ 166,00',
    time: 'Pedido Pronto 🔔',
    items: [
      { name: 'CAMARÃO EMPANADO + DRINKS', qty: 1, unitPrice: 'R$ 86,00', totalPrice: 'R$ 86,00', category: 'Cozinha', status: 'Pronto 🔔' },
      { name: 'DRINK TROPICAL MORANGO', qty: 2, unitPrice: 'R$ 28,00', totalPrice: 'R$ 56,00', category: 'Barman', status: 'Entregue' },
      { name: 'ÁGUA DE COCO VERDE', qty: 2, unitPrice: 'R$ 12,00', totalPrice: 'R$ 24,00', category: 'Bar', status: 'Entregue' },
    ],
  },
];

const BEACH_SCENES = [
  {
    id: 'gestao-acesso',
    step: '01',
    shortLabel: 'Gestão de Acesso',
    title: 'Gestão de Equipe e Permissões de Acesso',
    description:
      'Cadastre garçons, barmans e administradores com avatares e permissões individuais em segundos.',
    image: '/drinks-camarao-5d.png',
  },
  {
    id: 'barman-luva',
    step: '02',
    shortLabel: 'Bar e Cozinha',
    title: 'Fila do Bar & Cozinha Interativa em Tempo Real',
    description:
      '1º toque coloca o drink em preparo e o 2º toque avisa o celular do garçom que já está pronto para servir.',
    image: '/barman-luva-caipirinha.png',
  },
  {
    id: 'peixe-coco-5d',
    step: '03',
    shortLabel: 'Painel Financeiro',
    title: 'Painel Financeiro e Extrato de Comandas',
    description:
      'Acompanhe o faturamento ao vivo, formas de pagamento, metas, vales e histórico detalhado de cada mesa.',
    image: '/peixe-coco-5d.png',
  },
  {
    id: 'guarda-sois',
    step: '04',
    shortLabel: 'Mapa de Guarda-sóis',
    title: 'Controle de Guarda-sóis e Alertas na Areia',
    description:
      'Visualize todas as mesas livres, ocupadas ou piscando em amarelo quando há pedido pronto para entrega.',
    image: '/guarda-sois-mar-azul.png',
  },
];

const TYPEWRITER_WORDS = ['intuitiva', 'eficiente', 'prática', 'em poucos toques'];

export function LandingPage() {
  const [heroStep, setHeroStep] = useState<0 | 1>(0);
  const [logoSpin, setLogoSpin] = useState<boolean>(false);
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);
  const [captionPinned, setCaptionPinned] = useState<boolean>(false);
  const [selectedUmbrellaId, setSelectedUmbrellaId] = useState<string>('04');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [heroCoronaQty, setHeroCoronaQty] = useState<number>(1);
  const [heroCocoQty, setHeroCocoQty] = useState<number>(2);
  const [deliveryToast, setDeliveryToast] = useState<string | null>(null);
  const [activeDevice, setActiveDevice] = useState<'iphone' | 'notebook' | 'tablet'>('notebook');

  // Efeito de digitação ("intuitiva" sendo digitado no Hero)
  const [wordIndex, setWordIndex] = useState<number>(0);
  const [typedText, setTypedText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Aba ativa do bloco de módulos (App de Garçom, Cardápio Digital, QR Code de Mesas, Frente de Caixa PDV)
  const [activeModule, setActiveModule] = useState<'garcom' | 'cardapio' | 'qrcode' | 'pdv'>('garcom');

  // Estados da simulação interativa no canto direito do bloco #ambiente
  const [simTick, setSimTick] = useState<number>(0);
  const [barItem1Stage, setBarItem1Stage] = useState<0 | 1 | 2>(1);
  const [barItem2Stage, setBarItem2Stage] = useState<0 | 1 | 2>(0);
  const [userRoleSim, setUserRoleSim] = useState<'garcom' | 'admin'>('garcom');
  const [showFinanceValues, setShowFinanceValues] = useState<boolean>(true);

  // Estado do carrossel de pequenas telas do Card 1 (Gestão Financeira)
  const [financeSlide, setFinanceSlide] = useState<number>(0);

  // Efeito 3D no Hero
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });

  const selectedUmbrella =
    UMBRELLAS_DATA.find((u) => u.id === selectedUmbrellaId) || UMBRELLAS_DATA[3];

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
    const finTimer = setInterval(() => {
      setFinanceSlide((prev) => (prev + 1) % 4);
    }, 3800);
    return () => clearInterval(finTimer);
  }, []);

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

  const whatsappUrl =
    'https://wa.me/5585920008349?text=Ol%C3%A1!%20Quero%20conhecer%20o%20sistema%20para%20o%20meu%20quiosque%20ou%20barraca%20de%20praia.';

  const heroTotal = heroCoronaQty * 114 + heroCocoQty * 12;

  const handleNotifyDelivery = (itemName: string) => {
    setDeliveryToast(`${itemName} enviado para a Mesa 04!`);
    setTimeout(() => {
      setDeliveryToast(null);
    }, 2800);
  };

  const activeScene = BEACH_SCENES[activeSceneIndex];

  return (
    <div className="min-h-dvh bg-slate-50/50 text-slate-700 font-sans selection:bg-slate-200 selection:text-slate-800 overflow-x-clip">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-50 pt-safe bg-white/85 backdrop-blur-xl border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Logo  */}
          <button
            type="button"
            onClick={() => setLogoSpin((prev) => !prev)}
            className="group flex items-center gap-3 text-left focus:outline-none cursor-pointer shrink-0"
            title="Clique ou passe o mouse para girar a logo"
          >
            <div
              className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center text-amber-500 transition-all duration-500 group-hover:border-slate-700 group-hover:text-slate-700 group-hover:scale-110 group-hover:rotate-45 ${
                logoSpin ? 'rotate-180 scale-105 border-slate-500 text-slate-500' : ''
              }`}
            >
              <LucideIcons.Umbrella className="w-8 h-8 transition-transform duration-500 group-hover:-rotate-12" />
            </div>

            {/* Nome */}
            <div className="flex items-baseline gap-1">
              <span className="text-[16px] uppercase font-semibold tracking-normal text-slate-500">
                T-System
              </span>
              <span className="px-1.5 py-0.5 rounded-4xl bg-slate-200 border-slate-200/20 text-[15px] font-semibold tracking-normal uppercase text-slate-600 transition-colors">
                Beach
              </span>
            </div>
          </button>

          {/* Navegação Rápida Slim no Padrão Admin.tsx (slate-500) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-full border border-slate-200/70">
            <a
              href="#inicio"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Início
            </a>
            <a
              href="#solucoes"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Soluções
            </a>
            <a
              href="#ambiente"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Ambiente
            </a>
            <a
              href="#dispositivos"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Dispositivos
            </a>
            <a
              href="#simulador"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Simulador
            </a>
            <a
              href="#gestao-financeira"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Financeiro
            </a>
            <a
              href="#seguranca"
              className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white transition-all whitespace-nowrap"
            >
              Segurança
            </a>
          </nav>

          {/* Ação à Direita (Somente Entrar) */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <Link
              to="/login"
              className="px-4 py-1.5 rounded-full text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100/80 hover:bg-slate-200/70 border border-slate-200/70 transition-colors whitespace-nowrap"
            >
              Entrar
            </Link>
          </div>

          {/* Botão Menu Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <LucideIcons.X className="w-5 h-5" />
            ) : (
              <LucideIcons.Menu className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Dropdown Mobile Clean */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-4 space-y-2 shadow-lg">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="#inicio"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Início
              </a>
              <a
                href="#solucoes"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Soluções
              </a>
              <a
                href="#ambiente"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Ambiente
              </a>
              <a
                href="#dispositivos"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Dispositivos
              </a>
              <a
                href="#simulador"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Simulador
              </a>
              <a
                href="#gestao-financeira"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center"
              >
                Financeiro
              </a>
              <a
                href="#seguranca"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 bg-slate-50 text-center col-span-2"
              >
                Segurança
              </a>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="block w-full py-2.5 text-center rounded-xl text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200"
              >
                Entrar no Sistema
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION: PRIMEIRO CARD EM FORMATO IPHONE MODERNO */}
      <section id="inicio" className="relative py-12 lg:py-20 overflow-hidden bg-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-1/4 w-96 h-96 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(241, 245, 249, 0.85) 0%, rgba(241, 245, 249, 0) 70%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-10 w-80 h-80 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(254, 243, 199, 0.5) 0%, rgba(254, 243, 199, 0) 70%)' }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Coluna Esquerda */}
            <div className="lg:col-span-5 space-y-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200/80 text-slate-600 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Operação pé na areia em tempo real
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight leading-tight text-slate-800">
                Gestão simples, fácil e{' '}
                <span className="text-amber-500 inline-flex items-baseline">
                  <span>{typedText}</span>
                  <span
                    aria-hidden="true"
                    className="ml-0.5 inline-block w-0.5 sm:w-0.75 h-7 sm:h-9 lg:h-11 bg-amber-500 animate-pulse rounded-full translate-y-0.5"
                  />
                </span>{' '}
                do guarda-sol ao bar.
              </h1>

              <p className="text-base text-slate-500 leading-relaxed font-normal">
                O garçom abre a comanda no celular, lança o  pedido, chega ao bar/cozinha em segundos.
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
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 hover:bg-amber-50/80 border border-slate-200/80 hover:border-amber-300 text-xs font-medium text-slate-600 hover:text-slate-800 transition-all"
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
                  className="inline-flex items-center justify-center gap-1 px-4 py-2.5 rounded-full text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-all shadow-sm"
                >
                  <LucideIcons.MessageCircle className="w-3 h-3" />
                  Solicitar Demonstração
                </a>
                <a
                  href="#simulador"
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-800 transition-all"
                >
                  <LucideIcons.MousePointerClick className="w-3 h-3 text-slate-500" />
                  Simulador
                </a>
              </div>
            </div>

            {/* Coluna Direita: CELULAR IPHONE + CENA DE PRAIA */}
            <div
              onMouseMove={handleHeroMouseMove}
              onMouseLeave={handleHeroMouseLeave}
              className="lg:col-span-7 flex flex-col md:flex-row items-center justify-center gap-5"
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

                {/* Tela Interna do iPhone */}
                <div className="bg-white rounded-3xl p-3 pt-2 flex flex-col justify-between min-h-110 overflow-hidden">
                  {/* Barra de Status iOS */}
                  <div className="flex items-center justify-between px-1 mb-2.5">
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
                    <div className="space-y-2.5 flex-1 flex flex-col justify-between">
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
                    <div className="space-y-2 flex-1 flex flex-col justify-between">
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
                              🔔 Entregar
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
                  <div className="mt-2.5 bg-slate-800 rounded-full p-1 flex items-center justify-between">
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

              {/* IMAGEM REAL DE PRAIA AO LADO */}
              <div className="group relative z-10 w-full max-w-xs sm:max-w-sm rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 aspect-4/5">
                <img
                  src="/praia-coco-corona.png"
                  alt="Garçom entregando água de coco gelada e balde de cerveja Corona na areia"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-3 bottom-3 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200 shadow-md opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  <span className="text-xs font-semibold text-slate-800 block">
                    Pedido Sincronizado na Areia
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Balde de Corona e água de coco verde entregues direto no guarda-sol.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* #SOLUCOES */}
      <section id="solucoes" className="py-14 lg:py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h2 className="text-[17px] sm:text-[28px] font-semibold tracking-tight text-slate-800">
                  Agilidade na areia.{' '}
                  <span className="text-amber-500">Controle total da operação.</span>
                </h2>
                <p className="text-[13px] text-slate-500 mt-1.5 max-w-4xl leading-relaxed">
                  O garçom registra o pedido direto no guarda-sol e o pedido chega ao bar/cozinha em segundos, totalmente integrado ao frente de caixa (PDV).
                </p>
              </div>
            </div>

            {/* Grade de 4 Selecionáveis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-7">
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
                    onClick={() => setActiveModule(item.id)}
                    className={`text-left p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-800 shadow-lg -translate-y-0.5'
                        : 'bg-slate-50/80 hover:bg-white text-slate-700 border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${
                          isSelected
                            ? 'bg-amber-500 text-white border-amber-400'
                            : 'bg-white text-amber-500 border-slate-200'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span
                        className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-white/15 text-amber-300'
                            : 'bg-slate-200/70 text-slate-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </div>
                    <div>
                      <h3
                        className={`text-sm font-semibold ${
                          isSelected ? 'text-white' : 'text-slate-800'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p
                        className={`text-xs mt-1 leading-relaxed ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel Principal: Benefícios Operacionais à Esquerda + Demonstração Ao Vivo do Módulo Selecionado à Direita */}
          <div className="bg-slate-50/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Coluna Esquerda: Benefícios de Operação Integrada */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  <LucideIcons.Zap className="w-3.5 h-3.5 text-emerald-600" />
                  Fluxo sincronizado de ponta a ponta
                </div>

                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-800 leading-snug">
                  Da mesa para a cozinha em segundos, sem papel e sem desencontro de informações
                </h3>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                  Seja pelo lançamento rápido no <strong>App de Garçom</strong> ou pelo{' '}
                  <strong>QR Code da Mesa</strong>, cada item entra automaticamente na fila do bar e
                  da cozinha e já fica contabilizado no <strong>Frente de Caixa (PDV)</strong>.
                </p>

                {/* Os 3 Benefícios Chave Solicitados */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <LucideIcons.CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                        Atendimento mais rápido e sem erros
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Pedidos padronizados chegam na hora à cozinha e ao bar, eliminando letra
                        ilegível e esquecimentos no salão ou na areia.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                      <LucideIcons.TrendingDown className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                        Redução de retrabalho e custos operacionais
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Menos deslocamento desnecessário da equipe, maior giro por mesa e controle
                        automático de estoque a cada venda.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                      <LucideIcons.ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-800">
                        Fechamento de contas seguro no PDV
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Conferência transparente de todos os itens consumidos, divisão por pessoa,
                        múltiplos pagamentos e emissão de cupom térmico.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coluna Direita: Simulador */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md bg-white rounded-3xl p-5 border border-slate-200/90 shadow-lg min-h-88 flex flex-col justify-between">
                  {/* Cabeçalho do Simulador de Módulo */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-emerald-600 animate-ping" />
                      <span className="text-xs font-semibold text-slate-800">
                        {activeModule === 'garcom' && 'App de Garçom'}
                        {activeModule === 'cardapio' && 'Cardápio Digital'}
                        {activeModule === 'pdv' && 'Frente de Caixa (PDV) Integrado'}
                        {activeModule === 'qrcode' && 'QR Code Exclusivo por Mesa'}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      Online
                    </span>
                  </div>

                  {/* MÓDULO 1: APP DE GARÇOM */}
                  {activeModule === 'garcom' && (
                    <div className="space-y-3 my-auto">
                      <div className="p-3.5 rounded-2xl bg-slate-800 text-white flex items-center justify-between">
                        <div>
                          <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider block">
                            Registro Direto na areia
                          </span>
                          <span className="text-[11px] text-slate-400 font-semibold tracking-wider">
                            Garçom Lucas lançou 2 itens
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-amber-600/70 text-white font-sans flex items-center justify-center">
                              1x
                            </span>
                            <div>
                              <p className="font-semibold text-[9px] text-slate-800">CAMARÃO CROCANTE</p>
                              <span className="text-[10px] text-slate-400">
                                Enviado para Cozinha • Sem cebola
                              </span>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full uppercase bg-slate-200 border border-slate-200 text-slate-600 text-[9px] font-medium">
                            Em preparo
                          </span>
                        </div>

                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-xl bg-slate-800/80 text-white font-sans flex items-center justify-center">
                              2x
                            </span>
                            <div>
                              <p className="font-semibold text-[9px] text-slate-800">CAIPIRINHA DE LIMÃO</p>
                              <span className="text-[10px] text-slate-400">
                                Enviado para Fila do Bar • Pouco gelo
                              </span>
                            </div>
                          </div>
                          <span className="px-1.5 py-0.5 rounded-full uppercase bg-emerald-50 border border-emerald-300 text-emerald-800 text-[9px] font-medium">
                            Pronto
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MÓDULO 2: CARDÁPIO DIGITAL */}
                  {activeModule === 'cardapio' && (
                    <div className="space-y-2.5 my-auto">
                      <div className="flex items-center gap-1.5 pb-1">
                        <span className="px-3 py-1 rounded-full bg-slate-800 text-white text-[11px] font-medium">
                          🍹 Drinks & Cervejas
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                          🍤 Petiscos da Praia
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-medium">
                          🥥 Naturais
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src="/drinks-camarao-5d.png"
                            alt="Camarão Empanado"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] uppercase font-semibold text-slate-800 truncate">
                              Porção de camarão empanado
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Acompanha molho especial da casa e limão
                            </p>
                            <span className="text-xs font-bold text-amber-600">R$ 108,00</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-xl bg-slate-600 text-white text-[11px] font-semibold shrink-0">
                          + Pedir
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src="/barman-luva-caipirinha.png"
                            alt="Caipirinha"
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase text-slate-800 truncate">
                              Caipirinha artesanal de limão Taiti
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Preparada na hora com fruta fresca selecionada
                            </p>
                            <span className="text-xs font-bold text-amber-600">R$ 28,00</span>
                          </div>
                        </div>
                        <span className="px-2 py-1 rounded-xl bg-slate-600 text-white text-[11px] font-semibold shrink-0">
                          + Pedir
                        </span>
                      </div>
                    </div>
                  )}

                  {/* MÓDULO 3: FRENTE DE CAIXA (PDV) */}
                  {activeModule === 'pdv' && (
                    <div className="space-y-5 my-auto">
                      <div className="p-3.5 rounded-2xl bg-slate-800 text-white flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-300 uppercase tracking-wider block">
                            Mesa 04
                          </span>
                          <span className="text-xl font-bold tabular-nums">R$ 246,00</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-emerald-500 block">Divisão (3 pessoas)</span>
                          <span className="text-xs font-semibold">R$ 82,00 / pessoa</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                          <LucideIcons.QrCode className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                          <span className="text-[11px] font-semibold text-emerald-800">
                            PIX QR
                          </span>
                        </div>
                        <div className="p-2 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                          <LucideIcons.CreditCard className="w-4 h-4 text-slate-700 mx-auto mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">
                            Cartão
                          </span>
                        </div>
                        <div className="p-2 rounded-2xl bg-slate-100 border border-slate-200 text-center">
                          <LucideIcons.Printer className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                          <span className="text-[11px] font-semibold text-slate-700">
                            Imprimir
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MÓDULO 4: QR CODE DE MESAS */}
                  {activeModule === 'qrcode' && (
                    <div className="space-y-3 my-auto">
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white border-2 border-slate-800 p-2 flex flex-col items-center justify-center shrink-0 shadow-xs">
                          <LucideIcons.QrCode className="w-12 h-12 text-slate-800" />
                          <span className="text-[9px] font-extrabold tracking-widest text-amber-600 mt-0.5">
                            MESA 04
                          </span>
                        </div>
                        <div className="space-y-2">
                          <span className="px-3 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-semibold">
                            Autoatendimento
                          </span>
                          <h4 className="text-sm font-semibold text-slate-700">
                            Aponte a câmera e peça na hora
                          </h4>
                          <p className="text-xs text-slate-500 leading-relaxed">
                            O cliente abre o cardápio digital pelo QR Code do guarda-sol e o
                            pedido já cai identificado na comanda dele.
                          </p>
                        </div>
                      </div>

                      <div className="p-2 rounded-4xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
                        <span className="text-emerald-800 font-sans">
                          ✓ Sem precisar baixar aplicativo
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 3 */}
      <section id="ambiente" className="py-12 lg:py-16 bg-slate-50/70 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-slate-800">
                Feito para o ritmo do sol, da areia e do mar.
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Interaja com o card do sistema à direita para testar cada setor na prática.
              </p>
            </div>

            {/* Botões Seletores */}
            <div className="inline-flex flex-wrap items-center gap-1 bg-slate-100/90 border border-slate-200/70 p-1 rounded-full self-start md:self-auto">
              {BEACH_SCENES.map((scene, index) => {
                const isActive = activeSceneIndex === index;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onMouseEnter={() => setActiveSceneIndex(index)}
                    onClick={() => {
                      setActiveSceneIndex(index);
                      setCaptionPinned(true);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
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

          {/* INTERAÇÃO  NO MINI CARD À DIREITA */}
          <div
            onClick={() => setCaptionPinned((prev) => !prev)}
            className="group relative w-full min-h-112 sm:min-h-124 lg:min-h-136 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xl select-none flex items-center justify-end p-4 sm:p-6 lg:p-8"
          >
            {BEACH_SCENES.map((scene, index) => (
              <img
                key={scene.id}
                src={scene.image}
                alt={scene.title}
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 pointer-events-none ${
                  activeSceneIndex === index ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}

            {/* MINI CARD DIREITO */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative z-20 w-full max-w-xs sm:max-w-sm bg-white/95 backdrop-blur-xl rounded-3xl p-4 sm:p-5 border border-white shadow-2xl cursor-default transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    {activeSceneIndex === 0 && 'Gestão de Usuários'}
                    {activeSceneIndex === 1 && 'Fila do Bar & Cozinha'}
                    {activeSceneIndex === 2 && 'Painel Financeiro'}
                    {activeSceneIndex === 3 && 'Mapa de Guarda-sóis'}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  Interativo
                </span>
              </div>

              {/* CENA 01 */}
              {activeSceneIndex === 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                      <LucideIcons.UserPlus className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Novo Usuário
                      </p>
                      <p className="text-[11px] text-slate-400">Permissões por cargo</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="bg-slate-50 px-3 py-2 rounded-full border border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <LucideIcons.User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700">MATEUS SILVA</span>
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold">Ativo</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider block mb-1 pl-1">
                        Permissão (Toque para alternar)
                      </span>
                      <div className="flex gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setUserRoleSim('garcom')}
                          className={`relative flex-1 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            userRoleSim === 'garcom'
                              ? 'bg-white text-slate-800 shadow-xs border border-slate-200'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Garçom
                          {userRoleSim === 'garcom' && (
                            <LucideIcons.MousePointerClick className="w-3.5 h-3.5 text-amber-500 absolute right-2 top-1.5 animate-bounce" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setUserRoleSim('admin')}
                          className={`relative flex-1 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            userRoleSim === 'admin'
                              ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-200'
                              : 'text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          Admin
                          {userRoleSim === 'admin' && (
                            <LucideIcons.MousePointerClick className="w-3.5 h-3.5 text-indigo-600 absolute right-2 top-1.5 animate-bounce" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1 space-y-1.5">
                    <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">🏖️ Lucas (Garçom)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Online
                      </span>
                    </div>
                    <div className="p-2 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">🍹 Rafael (Barman)</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
                        Online
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* CENA 02: FILA DO BAR / COZINHA INTERATIVA (Cozinha.tsx) */}
              {activeSceneIndex === 1 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        MESA 05 • LUCAS
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Clique na bolinha para avançar o preparo
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold">
                      Fila Ao Vivo
                    </span>
                  </div>

                  <div
                    onClick={() => setBarItem1Stage((s) => ((s + 1) % 3) as 0 | 1 | 2)}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                        2x
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate uppercase ${
                            barItem1Stage === 2 ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          CAIPIRINHA DE LIMÃO
                        </p>
                        <span className="text-[10px] font-medium flex items-center gap-1 mt-0.5">
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
                            <span className="text-emerald-600 font-semibold">
                              Pronto para servir 🔔
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Alternar status do preparo"
                      className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        barItem1Stage === 2
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : barItem1Stage === 1
                            ? 'bg-amber-400 text-slate-900 border-2 border-amber-500 shadow-xs'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {barItem1Stage === 2 && <LucideIcons.Check className="w-4 h-4" />}
                      {barItem1Stage === 1 && <LucideIcons.Flame className="w-4 h-4" />}
                      {barItem1Stage === 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      )}
                      <LucideIcons.MousePointerClick className="w-3.5 h-3.5 text-slate-700 absolute -bottom-1 -right-1 animate-bounce" />
                    </button>
                  </div>

                  <div
                    onClick={() => setBarItem2Stage((s) => ((s + 1) % 3) as 0 | 1 | 2)}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-white border border-slate-200 font-bold text-xs text-slate-700 flex items-center justify-center shrink-0">
                        1x
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate uppercase ${
                            barItem2Stage === 2 ? 'line-through text-slate-400' : 'text-slate-800'
                          }`}
                        >
                          BALDE CERVEJA CORONA
                        </p>
                        <span className="text-[10px] font-medium block mt-0.5">
                          {barItem2Stage === 0 && (
                            <span className="text-slate-400">Aguardando toque</span>
                          )}
                          {barItem2Stage === 1 && (
                            <span className="text-amber-600 font-semibold">Em preparo</span>
                          )}
                          {barItem2Stage === 2 && (
                            <span className="text-emerald-600 font-semibold">
                              Pronto para servir 🔔
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      aria-label="Alternar status"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                        barItem2Stage === 2
                          ? 'bg-emerald-500 text-white'
                          : barItem2Stage === 1
                            ? 'bg-amber-400 text-slate-900 border-2 border-amber-500'
                            : 'bg-white border-2 border-slate-300 text-slate-400'
                      }`}
                    >
                      {barItem2Stage === 2 && <LucideIcons.Check className="w-4 h-4" />}
                      {barItem2Stage === 1 && <LucideIcons.Flame className="w-4 h-4" />}
                      {barItem2Stage === 0 && (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CENA 03: PAINEL FINANCEIRO (AdminFinanceiro.tsx) */}
              {activeSceneIndex === 2 && (
                <div className="space-y-3">
                  <div className="bg-linear-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 shadow-md">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-300 text-[10px] font-semibold uppercase tracking-widest">
                            Faturamento
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowFinanceValues((v) => !v)}
                            className="text-emerald-200 hover:text-white cursor-pointer"
                            title="Mostrar/Ocultar valor"
                          >
                            {showFinanceValues ? (
                              <LucideIcons.EyeOff className="w-3.5 h-3.5" />
                            ) : (
                              <LucideIcons.Eye className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <p className="text-2xl font-semibold tracking-tight tabular-nums mt-0.5">
                          {showFinanceValues ? 'R$ 8.490,00' : 'R$ •••••'}
                        </p>
                      </div>
                      <span className="bg-white/10 border border-white/15 px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1">
                        <LucideIcons.PieChart className="w-3 h-3" />
                        Pagtos.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 pt-0.5">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-purple-600">
                        <LucideIcons.Umbrella className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-500">Mesas</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-amber-500">
                        <LucideIcons.Clock className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-500">Abertas</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-green-700">
                        <LucideIcons.Banknote className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-500">Vales</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-blue-700">
                        <LucideIcons.Target className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-slate-500">Metas</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Extrato de Comandas
                    </span>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">MESA 04 • THAMILES</span>
                      <span className="font-bold text-emerald-700">R$ 138,00 (PIX)</span>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">MESA 07 • CARLOS</span>
                      <span className="font-bold text-emerald-700">R$ 310,00 (Cartão)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* CENA 04: MAPA DE GUARDA-SÓIS EM TEMPO REAL */}
              {activeSceneIndex === 3 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center p-2">
                      <span className="text-base font-bold text-slate-700">01</span>
                      <span className="text-[10px] font-semibold text-slate-400">LIVRE</span>
                    </div>
                    <div className="aspect-square rounded-2xl bg-linear-to-br from-green-500 to-green-600 text-white flex flex-col items-center justify-center p-2">
                      <span className="text-base font-bold">04</span>
                      <span className="text-[10px] font-semibold">MARINA</span>
                    </div>
                    <div
                      className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-2 transition-all ${
                        simTick % 2 === 0
                          ? 'bg-linear-to-br from-yellow-400 to-amber-500 text-white scale-105 shadow-md'
                          : 'bg-linear-to-br from-green-500 to-green-600 text-white'
                      }`}
                    >
                      <span className="text-base font-bold">05</span>
                      <span className="text-[10px] font-semibold">
                        {simTick % 2 === 0 ? 'PRONTO 🔔' : 'ENTREGUE'}
                      </span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                    <span>Sincronização na areia</span>
                    <span className="font-semibold text-slate-800">Instantânea</span>
                  </div>
                </div>
              )}
            </div>

            {/* Setas Laterais Discretas */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveSceneIndex(
                  (prev) => (prev - 1 + BEACH_SCENES.length) % BEACH_SCENES.length
                );
              }}
              aria-label="Cena anterior"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 border border-slate-200/80 shadow-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <LucideIcons.ChevronLeft className="w-4 h-4" />
            </button>

            {/* LEGENDA CLEAN NO CANTO INFERIOR ESQUERDO */}
            <div
              className={`absolute left-4 bottom-4 sm:left-6 sm:bottom-6 max-w-md z-20 bg-white/95 backdrop-blur-xl px-5 py-4 rounded-2xl border border-slate-200/80 shadow-lg transition-all duration-300 ${
                captionPinned
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-3 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-slate-800">{activeScene.title}</h3>
                <span className="text-xs text-slate-400 shrink-0">{activeScene.step} / 04</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {activeScene.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO MULTI-PLATAFORMA SINCRONIZADA: IPHONE COM MENU DE CONFIGURAÇÕES (Admin.tsx) + NOTEBOOK + TABLET */}
      <section id="dispositivos" className="py-14 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-12">
            <div>
              <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-slate-800">
                Funciona no Celular, no Notebook e no Tablet
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Menu administrativo responsivo no celular, painel de caixa no notebook e fila KDS no tablet.
              </p>
            </div>

            {/* Seletor de Aparelhos Clean no Padrão Admin.tsx (slate-500) */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100/90 border border-slate-200/70 self-start md:self-auto">
              <button
                type="button"
                onMouseEnter={() => setActiveDevice('iphone')}
                onClick={() => setActiveDevice('iphone')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDevice === 'iphone'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Smartphone className="w-3.5 h-3.5" />
                iPhone (Configurações)
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveDevice('notebook')}
                onClick={() => setActiveDevice('notebook')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDevice === 'notebook'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Laptop className="w-3.5 h-3.5" />
                Notebook (Caixa)
              </button>
              <button
                type="button"
                onMouseEnter={() => setActiveDevice('tablet')}
                onClick={() => setActiveDevice('tablet')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeDevice === 'tablet'
                    ? 'bg-white text-slate-800 shadow-2xs border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <LucideIcons.Tablet className="w-3.5 h-3.5" />
                Tablet (Cozinha)
              </button>
            </div>
          </div>

          {/* VITRINE DOS 3 DISPOSITIVOS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* 1. DESENHO REAL DE IPHONE MOSTRANDO A PÁGINA DE MENU DE CONFIGURAÇÕES (Admin.tsx) */}
            <div
              onMouseEnter={() => setActiveDevice('iphone')}
              className={`lg:col-span-3 flex flex-col items-center transition-all duration-500 ${
                activeDevice === 'iphone' ? 'scale-105 z-20' : 'opacity-90 hover:opacity-100'
              }`}
            >
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

                  {/* Tela Responsiva de Menu de Configurações (100% Fiel ao Admin.tsx) */}
                  <div className="space-y-2.5 flex-1">
                    <div className="px-1">
                      <h4 className="text-sm font-medium text-slate-900 tracking-tight leading-tight">
                        Configurações
                      </h4>
                      <p className="text-[10px] text-slate-400">Quiosque Beira-Mar</p>
                    </div>

                    {/* Grupo 1 de Configurações Fiel ao Admin.tsx */}
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

                    {/* Grupo 2: Notificações e Impressora Fiel ao Admin.tsx */}
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

              <div className="mt-4 text-center">
                <h3 className="text-sm font-medium text-slate-800">Menu Admin no Celular</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurações, financeiro, estoque e impressora na palma da mão
                </p>
              </div>
            </div>

            {/* 2. DESENHO REALISTA DE NOTEBOOK */}
            <div
              onMouseEnter={() => setActiveDevice('notebook')}
              className={`lg:col-span-6 flex flex-col items-center transition-all duration-500 ${
                activeDevice === 'notebook' ? 'md:scale-105 z-20' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div className="w-full max-w-xl bg-slate-700 rounded-t-2xl p-2.5 pb-2 border-2 border-b-0 border-slate-600 shadow-2xl relative">
                <div className="w-16 h-2.5 bg-slate-800 rounded-b-lg mx-auto -mt-2.5 mb-1.5 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                </div>

                <div className="bg-white rounded-lg overflow-hidden border border-slate-600">
                  <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      <span className="text-xs font-semibold text-slate-500 ml-2">
                        Painel Financeiro
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                      Online
                    </span>
                  </div>

                  <div className="grid grid-cols-12 min-h-56">
                    <div className="col-span-3 bg-slate-50 border-r border-slate-100 p-2.5 space-y-1 hidden sm:block">
                      <div className="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 shadow-2xs border border-slate-200/60 text-xs font-medium flex items-center gap-1.5">
                        <LucideIcons.LayoutDashboard className="w-3.5 h-3.5 text-amber-500" />
                        Visão Geral
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg text-slate-500 text-xs font-normal flex items-center gap-1.5">
                        <LucideIcons.Umbrella className="w-3.5 h-3.5" />
                        Guarda-sóis
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg text-slate-500 text-xs font-normal flex items-center gap-1.5">
                        <LucideIcons.Wallet className="w-3.5 h-3.5" />
                        Caixa
                      </div>
                      <div className="px-2.5 py-1.5 rounded-lg text-slate-500 text-xs font-normal flex items-center gap-1.5">
                        <LucideIcons.Printer className="w-3.5 h-3.5" />
                        Impressora
                      </div>
                    </div>

                    <div className="col-span-12 sm:col-span-9 p-3.5 space-y-3">
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-xs text-slate-400 block">Faturamento</span>
                          <span className="text-[12px] font-semibold text-slate-800">
                            R$ 8.490,00
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-xs text-slate-400 block">Mesas Ativas</span>
                          <span className="text-[12px] font-semibold text-slate-800">
                            18 Ocupadas
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70">
                          <span className="text-xs text-slate-400 block">Ticket Médio</span>
                          <span className="text-[12px] font-semibold text-slate-600">
                            R$ 192,00
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200/80 overflow-hidden text-xs">
                        <div className="bg-slate-50 px-3 py-1.5 font-medium text-slate-400 flex justify-between border-b border-slate-200/70">
                          <span>Guarda-sol</span>
                          <span>Consumo</span>
                          <span>Total</span>
                        </div>
                        <div className="px-3 py-2 flex justify-between items-center border-b border-slate-100">
                          <span className="font-medium text-slate-700">04 • Thamiles</span>
                          <span className="text-slate-500">Balde Corona + 2x Coco</span>
                          <span className="font-semibold text-slate-800">R$ 138,00</span>
                        </div>
                        <div className="px-3 py-2 flex justify-between items-center">
                          <span className="font-medium text-slate-700">05 • João</span>
                          <span className="text-slate-500">2x Caipirinha + Camarão</span>
                          <span className="font-semibold text-slate-800">R$ 194,00</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-2xl flex flex-col items-center">
                <div className="w-32 h-1.5 bg-slate-800" />
                <div className="w-full h-4 bg-linear-to-b from-slate-200 via-slate-300 to-slate-400 rounded-b-2xl border-t border-white shadow-xl flex items-start justify-center">
                  <div className="w-24 h-1.5 bg-slate-400/90 rounded-b-md border-x border-b border-slate-300" />
                </div>
                <div className="w-11/12 h-1.5 bg-slate-200/80 rounded-full blur-xs mt-1" />
              </div>

              <div className="mt-3 text-center">
                <h3 className="text-sm font-medium text-slate-800">Computador</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Versão desktop completa para fechamento de conta, PIX e administração
                </p>
              </div>
            </div>

            {/* 3. TABLET / IPAD REALISTA */}
            <div
              onMouseEnter={() => setActiveDevice('tablet')}
              className={`lg:col-span-3 flex flex-col items-center transition-all duration-500 ${
                activeDevice === 'tablet' ? 'scale-105 z-20' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div className="w-full max-w-xs bg-slate-700 rounded-3xl p-2 shadow-2xl border-2 border-slate-500">
                <div className="bg-white rounded-2xl p-3 flex flex-col justify-between min-h-64">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 text-xs">
                    <span className="font-semibold text-slate-700">KDS • Bar & Cozinha</span>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <LucideIcons.Wifi className="w-3 h-3" />
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  </div>

                  <div className="space-y-2 my-auto">
                    <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-amber-700 mb-1">
                        <span>MESA 04 • BAR</span>
                        <span>AGORA</span>
                      </div>
                      <p className="text-[10px] text-slate-700">1x Balde Cerveja Corona</p>
                      <p className="text-[10px] text-slate-700">2x Água de Coco Gelada</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700 mb-1">
                        <span>MESA 05 • COZINHA</span>
                        <span className="text-teal-600">PRONTO</span>
                      </div>
                      <p className="text-[10px] text-slate-600">1x Camarão Empanado Crocante</p>
                    </div>
                  </div>

                  <div className="w-16 h-1 bg-slate-200 rounded-full mx-auto mt-2.5" />
                </div>
              </div>

              <div className="mt-4 text-center">
                <h3 className="text-sm font-medium text-slate-800">Tablet</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Versão tablet da aba de KDS, acompanhamento de etapas até a entrega na mesa.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SIMULADOR DE GUARDA-SÓIS */}
      <section id="simulador" className="py-14 lg:py-20 bg-slate-50/70 border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h2 className="text-lg sm:text-2xl font-medium tracking-tight text-slate-800">
              Mapa da Guarda-Sóis em Tempo Real
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Passe o mouse ou clique sobre as mesas para interagir em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                <span className="text-sm font-medium text-slate-700">Mapa da Areia</span>
                <div className="flex items-center gap-3 text-xs font-normal text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300" />
                    Livre
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-600" />
                    Ocupada
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Pronto 🔔
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                {UMBRELLAS_DATA.map((umbrella) => {
                  const isSelected = umbrella.id === selectedUmbrellaId;
                  const isOccupied = umbrella.status === 'occupied';
                  const isReady = umbrella.status === 'ready';

                  return (
                    <button
                      key={umbrella.id}
                      type="button"
                      onMouseEnter={() => setSelectedUmbrellaId(umbrella.id)}
                      onClick={() => setSelectedUmbrellaId(umbrella.id)}
                      className={`group relative aspect-square rounded-2xl p-3.5 flex flex-col items-center justify-between cursor-pointer border transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-105 hover:rotate-1 hover:shadow-xl active:scale-95 ${
                        isReady
                          ? 'bg-linear-to-br from-yellow-400 to-amber-500 border-amber-500 text-white'
                          : isOccupied
                            ? 'bg-linear-to-br from-green-500 to-green-600 border-green-600 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-400'
                      } ${isSelected ? 'ring-4 ring-slate-300/80 -translate-y-1.5 scale-105 z-10 shadow-lg' : ''}`}
                    >
                      <div className="w-full flex justify-between items-center">
                        <span
                          className={`text-xs font-medium transition-transform duration-300 group-hover:translate-x-0.5 ${
                            isOccupied || isReady ? 'text-white/90' : 'text-slate-400'
                          }`}
                        >
                          MESA
                        </span>
                        {isReady ? (
                          <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                        ) : (
                          <LucideIcons.Umbrella
                            className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:rotate-12 ${
                              isOccupied ? 'text-white/80' : 'text-amber-500'
                            }`}
                          />
                        )}
                      </div>

                      <span
                        className={`text-2xl sm:text-3xl font-bold transition-transform duration-300 group-hover:scale-110 ${
                          isOccupied || isReady ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {umbrella.number}
                      </span>

                      <span
                        className={`text-xs font-semibold uppercase truncate max-w-full transition-transform duration-300 group-hover:-translate-y-0.5 ${
                          isOccupied || isReady ? 'text-white' : 'text-slate-400'
                        }`}
                      >
                        {umbrella.client}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-normal text-slate-400 block">
                    Detalhes da Mesa
                  </span>
                  <h3 className="text-base font-medium text-slate-800">
                    Guarda-sol {selectedUmbrella.number} • {selectedUmbrella.client}
                  </h3>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  {selectedUmbrella.time}
                </span>
              </div>

              <div className="rounded-2xl p-4 bg-slate-700 text-white flex items-center justify-between mb-4">
                <div>
                  <span className="text-xs text-slate-300 block">Total da Comanda</span>
                  <span className="text-2xl font-bold tabular-nums">{selectedUmbrella.total}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-medium">
                  {selectedUmbrella.items.length} Itens
                </span>
              </div>

              {selectedUmbrella.items.length > 0 ? (
                <div className="space-y-2">
                  {selectedUmbrella.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 transition-all hover:bg-white hover:shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          {item.qty}x {item.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.category} • {item.status}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 shrink-0">
                        {item.totalPrice}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 px-4 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <p className="text-sm font-medium text-slate-600">
                    Guarda-sol {selectedUmbrella.number} disponível
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Pronto para abrir nova comanda pelo celular.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* NOVO CARD 1: GESTÃO FINANCEIRA COM PEQUENAS TELAS PASSANDO EM TEMPO REAL */}
      <section id="gestao-financeira" className="py-14 lg:py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-3xl p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Coluna Esquerda: Explicação para Proprietário e Gerente */}
              <div className="lg:col-span-6 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-medium">
                  <LucideIcons.Wallet className="w-3.5 h-3.5 text-amber-500" />
                  Controle Financeiro para Proprietários e Gerentes
                </div>

                <h2 className="text-xl sm:text-3xl font-medium tracking-tight text-slate-800 leading-snug">
                  Visão completa do caixa, comandas, vales e metas na palma da mão
                </h2>

                <p className="text-sm text-slate-500 leading-relaxed">
                  Acompanhe cada real que entra no estabelecimento em tempo real, mesmo à distância.
                  Saiba exatamente quanto entrou em PIX, cartão ou dinheiro, quanto ainda está em
                  aberto nas mesas da areia e gerencie adiantamentos da equipe sem planilhas de papel.
                </p>

                {/* Botões Seletores das 4 Pequenas Telas Financeiras */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { id: 0, label: '1. Faturamento', icon: LucideIcons.TrendingUp },
                    { id: 1, label: '2. Pagamentos', icon: LucideIcons.PieChart },
                    { id: 2, label: '3. Na Areia', icon: LucideIcons.Clock },
                    { id: 3, label: '4. Vales & Metas', icon: LucideIcons.Target },
                  ].map((tab) => {
                    const IconComp = tab.icon;
                    const isActive = financeSlide === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onMouseEnter={() => setFinanceSlide(tab.id)}
                        onClick={() => setFinanceSlide(tab.id)}
                        className={`px-3 py-2.5 rounded-2xl text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                          isActive
                            ? 'bg-white text-slate-800 border-slate-300 shadow-xs'
                            : 'bg-slate-100/70 text-slate-500 border-slate-200/60 hover:bg-white'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coluna Direita: Carrossel Automático de Pequenas Telas Fiéis ao AdminFinanceiro.tsx */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-md bg-white rounded-3xl p-5 border border-slate-200/90 shadow-lg min-h-80 flex flex-col justify-between">
                  {/* Topo do Mini Painel Financeiro */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-medium text-slate-700">
                        {financeSlide === 0 && 'Visão Geral de Faturamento'}
                        {financeSlide === 1 && 'Receitas por Forma de Pagamento'}
                        {financeSlide === 2 && 'Saldo em Atendimento & Guarda-sóis'}
                        {financeSlide === 3 && 'Controle de Vales & Meta do Dia'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((dot) => (
                        <button
                          key={dot}
                          type="button"
                          onClick={() => setFinanceSlide(dot)}
                          aria-label={`Ver tela financeira ${dot + 1}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            financeSlide === dot ? 'w-5 bg-slate-700' : 'w-1.5 bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* TELA FINANCEIRA 1: FATURAMENTO & EXTRATO */}
                  {financeSlide === 0 && (
                    <div className="space-y-3 my-auto">
                      <div className="bg-linear-to-br from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-300 block">
                            Saldo Líquido do Dia
                          </span>
                          <span className="text-2xl font-semibold tabular-nums">
                            R$ 8.490,00
                          </span>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-medium">
                          44 Comandas Fechadas
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">MESA 04 • THAMILES</p>
                            <span className="text-[10px] text-slate-400">Fechada às 15:40 • PIX</span>
                          </div>
                          <span className="font-semibold text-emerald-700">+ R$ 138,00</span>
                        </div>
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-slate-800">MESA 07 • CARLOS</p>
                            <span className="text-[10px] text-slate-400">
                              Fechada às 16:12 • Crédito
                            </span>
                          </div>
                          <span className="font-semibold text-emerald-700">+ R$ 310,00</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TELA FINANCEIRA 2: FORMAS DE PAGAMENTO (Fiel ao Modal Pagamentos) */}
                  {financeSlide === 1 && (
                    <div className="space-y-2.5 my-auto">
                      {[
                        { metodo: 'PIX Instantâneo', valor: 'R$ 5.120,00', pct: '60%' },
                        { metodo: 'Cartão de Crédito', valor: 'R$ 2.180,00', pct: '26%' },
                        { metodo: 'Cartão de Débito', valor: 'R$ 890,00', pct: '10%' },
                        { metodo: 'Dinheiro no Caixa', valor: 'R$ 300,00', pct: '4%' },
                      ].map((item) => (
                        <div
                          key={item.metodo}
                          className="bg-slate-50 px-3.5 py-2.5 rounded-full border border-slate-200/80 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-700">
                              {item.pct}
                            </span>
                            <span className="font-medium text-slate-700">{item.metodo}</span>
                          </div>
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {item.valor}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* TELA FINANCEIRA 3: MESAS ABERTAS NA AREIA & GUARDA-SÓIS */}
                  {financeSlide === 2 && (
                    <div className="space-y-3 my-auto">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 block">
                            Valor em Aberto
                          </span>
                          <span className="text-xl font-semibold text-amber-600 tabular-nums mt-0.5 block">
                            R$ 1.840,00
                          </span>
                          <span className="text-[10px] text-slate-500">18 Mesas Ocupadas</span>
                        </div>
                        <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-700 block">
                            Taxa Guarda-sol
                          </span>
                          <span className="text-xl font-semibold text-purple-700 tabular-nums mt-0.5 block">
                            R$ 640,00
                          </span>
                          <span className="text-[10px] text-slate-500">32 Locações Hoje</span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                        <span className="text-slate-600">Previsão Total de Fechamento</span>
                        <span className="font-bold text-slate-800">R$ 10.330,00</span>
                      </div>
                    </div>
                  )}

                  {/* TELA FINANCEIRA 4: VALES DE COLABORADORES E METAS */}
                  {financeSlide === 3 && (
                    <div className="space-y-3 my-auto">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">Meta Diária Estipulada</span>
                          <span className="font-semibold text-emerald-700">
                            106% Atingida (R$ 8.000)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="w-full h-full bg-emerald-500 rounded-full" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                          Vales e Diárias Registradas
                        </span>
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            Garçom Mateus • Adiantamento
                          </span>
                          <span className="font-semibold text-slate-700">R$ 80,00 (Pago)</span>
                        </div>
                        <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700">
                            Barman Rafael • Diária Extra
                          </span>
                          <span className="font-semibold text-slate-700">R$ 150,00 (Pago)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Auditoria completa de cancelamentos e estornos</span>
                    <span className="font-medium text-slate-600">Tempo Real</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO 3: SOBRE A EMPRESA CRIADORA*/}
      <section id="ancora-dev" className="py-14 lg:py-20 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-slate-100/75 border border-slate-200/70 rounded-3xl p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Identidade Âncora Dev */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-medium">
                  <LucideIcons.Anchor className="w-3.5 h-3.5 text-emerald-400" />
                  Engenharia de software de última geração
                </div>

                <h2 className="text-[16px] sm:text-2xl font-sans tracking-normal text-slate-800">
                  Desenvolvido pela Empresa: <span className="text-[20px] font-bold tracking-normal uppercase">Âncora-dev</span>
                </h2>

                <p className="text-sm text-slate-500 leading-relaxed">
                  É uma empresa de desenvolvimento de software focada
                  na construção de plataformas comerciais de alta performance, combinando código
                  limpo, estabilidade em nuvem e design intuitivo para operações reais.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600">
                    Arquitetura Cloud SaaS
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600">
                    Alta Disponibilidade
                  </span>
                  <span className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600">
                    UI/UX Mobile-First
                  </span>
                </div>
              </div>

              {/* Card da Fundadora e CEO */}
              <div className="lg:col-span-5">
                <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-4xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                      <LucideIcons.Code2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
                        Fundadora & CEO
                      </span>
                      <h3 className="text-lg font-semibold text-slate-800">Thamiles</h3>
                      <p className="text-xs text-slate-500">
                        Engenheira de Software Especialista em SaaS Modernos
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3.5">
                    Liderando a engenharia da Âncora Dev, Thamiles projeta sistemas SaaS modernos de
                    última geração com padrões rigorosos de segurança, velocidade em tempo real e
                    experiência de uso pensada para gerar resultado imediato ao empreendedor.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RODAPÉ */}
      <footer className="bg-white border-t border-slate-200/80 py-8 pb-safe-8">
        <div className="max-w-7xl mx-auto px-4 tracking-normal sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
          <span>Desenvolvido por Âncora Dev • Plataforma Digital de Atendimento e Gestão na Praia</span>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
            <a href="#inicio" className="hover:text-slate-800 transition-colors">
              Início
            </a>
            <a href="#gestao-financeira" className="hover:text-slate-800 transition-colors">
              Financeiro
            </a>
            <a href="#seguranca" className="hover:text-slate-800 transition-colors">
              Segurança
            </a>
            <a href="#ancora-dev" className="hover:text-slate-800 transition-colors">
              Âncora Dev
            </a>
            <Link to="/login" className="hover:text-slate-800 transition-colors">
              Entrar no Painel
            </Link>
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
