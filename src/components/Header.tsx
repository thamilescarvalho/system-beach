// src/components/Header.tsx
import { useState, useContext, useRef, useEffect, useMemo, Fragment } from 'react';
import type { ElementType } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import { BannerDegustacao } from './BannerDegustacao';
import * as LucideIcons from 'lucide-react';

interface NavItemConfig {
  to: string;
  icon: ElementType;
  activePaths: string[];
  label: string;
}

type CategoriaAlerta = 'bar' | 'financeiro' | 'meta' | 'estoque';

interface AlertaSistema {
  id: string;
  categoria: CategoriaAlerta;
  titulo: string;
  descricao: string;
  detalheTempo: string;
  ordemTimestamp: number;
  rotaDestino: string;
  prioridadeAlta?: boolean;
}

export function Header() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  const garcom = contexto?.garcomLogado;
  const emPeriodoDeTeste = contexto?.dadosEmpresa?.status_assinatura === 'degustacao';

  const [menuAberto, setMenuAberto] = useState(false);
  const [alertasAberto, setAlertasAberto] = useState(false);
  const [idsLidos, setIdsLidos] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const salvo = localStorage.getItem('tsystem_alertas_lidos');
      return salvo ? (JSON.parse(salvo) as string[]) : [];
    } catch {
      return [];
    }
  });

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickFora = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuAberto(false);
        setAlertasAberto(false);
      }
    };
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Aba do navegador com a identidade do estabelecimento
  const nomeExibicaoEmpresa = contexto?.dadosEmpresa?.nome_exibicao?.trim();
  useEffect(() => {
    document.title = nomeExibicaoEmpresa
      ? `${nomeExibicaoEmpresa} · ${NOME_PADRAO_SISTEMA}`
      : `T-${NOME_PADRAO_SISTEMA}`;
  }, [nomeExibicaoEmpresa]);

  const isAdmin = garcom?.cargo === 'admin' || garcom?.cargo === 'super_admin';

  // Motor de Alertas
  const alertasSistema = useMemo<AlertaSistema[]>(() => {
    if (!contexto || !garcom) return [];
    const lista: AlertaSistema[] = [];
    const agoraMs = new Date().setHours(23, 59, 59, 999);

    const converterHoraPedidoMs = (horaPedido?: string, offsetExtra = 0): number => {
      if (!horaPedido) return agoraMs + offsetExtra;
      if (horaPedido.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(horaPedido)) {
        const parsed = new Date(horaPedido).getTime();
        if (!Number.isNaN(parsed)) return parsed + offsetExtra;
      }
      if (/^\d{1,2}:\d{2}/.test(horaPedido)) {
        const [h, m] = horaPedido.split(':').map(Number);
        const d = new Date();
        d.setHours(h || 0, m || 0, 0, 0);
        return d.getTime() + offsetExtra;
      }
      return agoraMs + offsetExtra;
    };

    const formatarDiaMesHora = (valor?: string): string => {
      const agora = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const diaHoje = `${pad(agora.getDate())}/${pad(agora.getMonth() + 1)}`;

      if (!valor) {
        return `${diaHoje} ${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
      }

      // Caso seja apenas horário "HH:mm"
      if (/^\d{1,2}:\d{2}/.test(valor)) {
        const [h, m] = valor.split(':');
        return `${diaHoje} ${pad(Number(h))}:${pad(Number(m))}`;
      }

      // Caso seja apenas data "YYYY-MM-DD"
      if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [, mes, dia] = valor.split('-');
        return `${dia}/${mes} 00:00`;
      }

      // Caso seja ISO timestamp (ex: "2026-10-30T16:05:26.083Z")
      const dataObj = new Date(valor);
      if (!Number.isNaN(dataObj.getTime())) {
        return `${pad(dataObj.getDate())}/${pad(dataObj.getMonth() + 1)} ${pad(
          dataObj.getHours()
        )}:${pad(dataObj.getMinutes())}`;
      }

      return `${diaHoje} 00:00`;
    };

    const formatarMoeda = (valor: number) =>
      valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 1. PEDIDOS PRONTOS NO BAR
    contexto.mesas.forEach((mesa) => {
      if (mesa.status !== 'ocupada' || !Array.isArray(mesa.itens)) return;
      mesa.itens.forEach((item, idx) => {
        if (item.statusCozinha === 'pronto') {
          lista.push({
            id: `bar_pronto_${mesa.numero}_${item.id}`,
            categoria: 'bar',
            titulo: `Pedido pronto • Mesa ${mesa.numero}`,
            descricao: `${item.quantidade}x ${item.produto.nome}${
              mesa.nomeCliente ? ` (${mesa.nomeCliente})` : ''
            }`,
            detalheTempo: formatarDiaMesHora(item.horaPedido),
            ordemTimestamp: converterHoraPedidoMs(item.horaPedido, 100000 + idx),
            rotaDestino: `/comanda/${mesa.numero}`,
            prioridadeAlta: true
          });
        } else if (item.statusCozinha === 'pendente') {
          lista.push({
            id: `bar_pendente_${mesa.numero}_${item.id}`,
            categoria: 'bar',
            titulo: `Em preparo • Mesa ${mesa.numero}`,
            descricao: `${item.quantidade}x ${item.produto.nome}`,
            detalheTempo: formatarDiaMesHora(item.horaPedido),
            ordemTimestamp: converterHoraPedidoMs(item.horaPedido, idx),
            rotaDestino: '/cozinha'
          });
        }
      });
    });

    // 2. AVISO DE META FINANCEIRA ATIVA
    if (contexto.metaAtiva && contexto.metaAtiva.valorAlvo > 0) {
      const meta = contexto.metaAtiva;
      const inicio = meta.dataInicio.split('T')[0];
      const fim = meta.dataFim.split('T')[0];

      const faturamentoPeriodo = contexto.historicoVendas
        .filter((v) => {
          if (v.status === 'cancelada') return false;
          const dataVenda = v.dataFechamento.split('T')[0];
          return dataVenda >= inicio && dataVenda <= fim;
        })
        .reduce((acc, v) => acc + v.total, 0);

      const percentual = Math.min(100, Math.round((faturamentoPeriodo / meta.valorAlvo) * 100));
      const metaBatida = faturamentoPeriodo >= meta.valorAlvo;

      lista.push({
        id: `meta_${meta.id}_${metaBatida ? 'batida' : Math.floor(percentual / 10)}`,
        categoria: 'meta',
        titulo: metaBatida
          ? `Meta batida (${percentual}%)`
          : `Meta financeira • ${percentual}%`,
        descricao: `${formatarMoeda(faturamentoPeriodo)} de ${formatarMoeda(meta.valorAlvo)}`,
        detalheTempo: formatarDiaMesHora(fim),
        ordemTimestamp: metaBatida ? agoraMs + 50000 : agoraMs - 1800000,
        rotaDestino: isAdmin ? '/admin/financeiro' : '/painel',
        prioridadeAlta: metaBatida
      });
    }

    // 3. LANÇAMENTOS DE VALORES DO GERENTE (SALÁRIO, COMISSÃO, BÔNUS, VALE)
    const pagamentosVisiveis = contexto.historicoPagamentos
      .filter((p) => {
        if (p.status === 'cancelado') return false;
        if (isAdmin) return true;
        return (
          p.garcomId === garcom.id ||
          p.garcomNome.trim().toLowerCase() === garcom.nome.trim().toLowerCase()
        );
      })
      .slice(0, 6);

    pagamentosVisiveis.forEach((p, idx) => {
      const statusFormatado =
        p.status === 'pago'
          ? 'Pago'
          : p.status === 'agendado'
            ? 'Agendado'
            : 'Pendente';

      const dataMs = p.data ? new Date(`${p.data}T12:00:00`).getTime() - idx * 1000 : agoraMs - 3600000;

      lista.push({
        id: `fin_${p.id}_${p.status}`,
        categoria: 'financeiro',
        titulo: `${p.categoria} • ${formatarMoeda(p.valor)}`,
        descricao: isAdmin
          ? `${p.garcomNome} (${statusFormatado})${p.descricao ? ` · ${p.descricao}` : ''}`
          : `${statusFormatado}${p.descricao ? ` · ${p.descricao}` : ''}`,
        detalheTempo: formatarDiaMesHora(p.data),
        ordemTimestamp: dataMs,
        rotaDestino: isAdmin ? '/admin/financeiro' : '/painel'
      });
    });

    // 4. ALERTA DE ESTOQUE BAIXO (Para Admin / Super Admin)
    if (isAdmin) {
      const produtosCriticos = contexto.produtos.filter(
        (prod) => prod.ativo !== false && typeof prod.estoque === 'number' && prod.estoque <= 5
      );
      if (produtosCriticos.length > 0) {
        const nomes = produtosCriticos
          .slice(0, 2)
          .map((p) => `${p.nome} (${p.estoque} un.)`)
          .join(', ');
        lista.push({
          id: `estoque_critico_${produtosCriticos.map((p) => `${p.id}_${p.estoque}`).join('_')}`,
          categoria: 'estoque',
          titulo: `Estoque baixo (${produtosCriticos.length})`,
          descricao: `${nomes}${
            produtosCriticos.length > 2 ? ` e +${produtosCriticos.length - 2}` : ''
          }`,
          detalheTempo: formatarDiaMesHora(),
          ordemTimestamp: agoraMs - 7200000,
          rotaDestino: '/admin/estoque'
        });
      }
    }

    return lista.sort((a, b) => b.ordemTimestamp - a.ordemTimestamp);
  }, [contexto, garcom, isAdmin]);

  const alertasNaoLidos = useMemo(
    () => alertasSistema.filter((a) => !idsLidos.includes(a.id)),
    [alertasSistema, idsLidos]
  );

  const temPedidoProntoNaoLido = useMemo(
    () => alertasNaoLidos.some((a) => a.categoria === 'bar' && a.prioridadeAlta),
    [alertasNaoLidos]
  );

  const marcarAlertaComoLido = (idAlerta: string) => {
    setIdsLidos((prev) => {
      if (prev.includes(idAlerta)) return prev;
      const atualizado = [...prev, idAlerta].slice(-120);
      localStorage.setItem('tsystem_alertas_lidos', JSON.stringify(atualizado));
      return atualizado;
    });
  };

  const marcarTodosComoLidos = () => {
    const todosIds = alertasSistema.map((a) => a.id);
    setIdsLidos((prev) => {
      const unicos = Array.from(new Set([...prev, ...todosIds])).slice(-120);
      localStorage.setItem('tsystem_alertas_lidos', JSON.stringify(unicos));
      return unicos;
    });
  };

  // Preferências de Alerta Sonoro e Notificações Nativas do Navegador
  const [alertaSonoroAtivo, setAlertaSonoroAtivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const salvo = localStorage.getItem('tsystem_alerta_som');
      return salvo !== null ? salvo === 'true' : true;
    } catch {
      return true;
    }
  });

  const [permissaoNavegador, setPermissaoNavegador] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  const [notificacoesNavegadorAtivo, setNotificacoesNavegadorAtivo] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const salvo = localStorage.getItem('tsystem_notificacoes_navegador');
      if (salvo !== null) return salvo === 'true';
      return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
    } catch {
      return false;
    }
  });

  // Sincronização em tempo real caso o usuário altere nas Configurações (Admin.tsx)
  useEffect(() => {
    const sincronizarPreferencias = () => {
      try {
        const somSalvo = localStorage.getItem('tsystem_alerta_som');
        if (somSalvo !== null) setAlertaSonoroAtivo(somSalvo === 'true');
        const navSalvo = localStorage.getItem('tsystem_notificacoes_navegador');
        if (navSalvo !== null) setNotificacoesNavegadorAtivo(navSalvo === 'true');
        if (typeof window !== 'undefined' && 'Notification' in window) {
          setPermissaoNavegador(Notification.permission);
        }
      } catch {
        // Ignora
      }
    };
    window.addEventListener('tsystem:notificacoes-sync', sincronizarPreferencias);
    return () => window.removeEventListener('tsystem:notificacoes-sync', sincronizarPreferencias);
  }, []);

  const alertasAnterioresRef = useRef<string[] | null>(null);

  // Sintetizador de sino via Web Audio API (D5: 587.33Hz -> A5: 880Hz)
  const tocarSomNotificacao = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const agora = ctx.currentTime;

      // Primeiro tom (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, agora);
      gain1.gain.setValueAtTime(0, agora);
      gain1.gain.linearRampToValueAtTime(0.18, agora + 0.02);
      gain1.gain.exponentialRampToValueAtTime(0.001, agora + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(agora);
      osc1.stop(agora + 0.27);

      // Segundo tom (880 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, agora + 0.1);
      gain2.gain.setValueAtTime(0, agora + 0.1);
      gain2.gain.linearRampToValueAtTime(0.22, agora + 0.13);
      gain2.gain.exponentialRampToValueAtTime(0.001, agora + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(agora + 0.1);
      osc2.stop(agora + 0.52);
    } catch (e) {
      console.warn('Alerta sonoro indisponível:', e);
    }
  };

  const alternarAlertaSonoro = () => {
    const novo = !alertaSonoroAtivo;
    setAlertaSonoroAtivo(novo);
    try {
      localStorage.setItem('tsystem_alerta_som', novo ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
    } catch {
      // Ignora erro de storage
    }
    if (novo) {
      tocarSomNotificacao();
    }
  };

  const alternarNotificacoesNavegador = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Seu navegador não oferece suporte a notificações nativas.');
      return;
    }

    if (Notification.permission === 'denied') {
      alert('As notificações foram bloqueadas no navegador. Para reativar, clique no cadeado da barra de navegação e permita notificações para este site.');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const resultado = await Notification.requestPermission();
        setPermissaoNavegador(resultado);
        if (resultado === 'granted') {
          setNotificacoesNavegadorAtivo(true);
          localStorage.setItem('tsystem_notificacoes_navegador', 'true');
          window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
          try {
            new Notification('Notificações Ativadas! 🔔', {
              body: 'Você receberá avisos em tempo real de pedidos prontos no bar e metas.',
              icon: '/favicon.ico'
            });
          } catch {
            // Ignora
          }
        } else {
          setNotificacoesNavegadorAtivo(false);
          localStorage.setItem('tsystem_notificacoes_navegador', 'false');
          window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
        }
      } catch {
        // Ignora
      }
      return;
    }

    const novo = !notificacoesNavegadorAtivo;
    setNotificacoesNavegadorAtivo(novo);
    try {
      localStorage.setItem('tsystem_notificacoes_navegador', novo ? 'true' : 'false');
      window.dispatchEvent(new CustomEvent('tsystem:notificacoes-sync'));
    } catch {
      // Ignora
    }
  };

  // Alerta sonoro e notificação
  useEffect(() => {
    const idsAtuais = alertasSistema.map((a) => a.id);

    // Na primeira execução após carregar a página, não toca som
    if (alertasAnterioresRef.current === null) {
      alertasAnterioresRef.current = idsAtuais;
      return;
    }

    const idsAnteriores = new Set(alertasAnterioresRef.current);
    const novosNaoLidos = alertasSistema.filter(
      (a) => !idsAnteriores.has(a.id) && !idsLidos.includes(a.id)
    );

    if (novosNaoLidos.length > 0) {
      if (alertaSonoroAtivo) {
        tocarSomNotificacao();
      }

      if (
        notificacoesNavegadorAtivo &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const maisRecente = novosNaoLidos[0];
        try {
          const notif = new Notification(maisRecente.titulo, {
            body: maisRecente.descricao,
            icon: '/favicon.ico',
            tag: maisRecente.id
          });
          notif.onclick = () => {
            window.focus();
            marcarAlertaComoLido(maisRecente.id);
            navigate(maisRecente.rotaDestino);
          };
        } catch {
          // Ignora
        }
      }
    }

    alertasAnterioresRef.current = idsAtuais;
  }, [alertasSistema, alertaSonoroAtivo, notificacoesNavegadorAtivo, idsLidos, navigate]);

  const handleLogout = () => {
    contexto?.setGarcomLogado(null);
    navigate('/login');
  };

  const path = location.pathname;
  const isComanda = path.startsWith('/comanda/');
  const isHome = path === '/';

  const showBottomNav = !isComanda && path !== '/login' && path !== '/master';

  const nomeMarca = contexto?.dadosEmpresa?.nome_exibicao?.trim() || NOME_PADRAO_SISTEMA;
  const marcaPersonalizada = nomeMarca !== NOME_PADRAO_SISTEMA;

  const navItems: NavItemConfig[] = useMemo(() => [
    { to: '/', icon: LucideIcons.Home, label: 'Início', activePaths: ['/'] },
    { to: '/mesas', icon: LucideIcons.Umbrella, label: 'Mesas', activePaths: ['/mesas', '/comanda'] },
    { to: '/cozinha', icon: LucideIcons.UtensilsCrossed, label: 'Bar', activePaths: ['/cozinha'] },
    { to: '/painel', icon: LucideIcons.Wallet, label: 'Caixa', activePaths: ['/painel'] },
    ...(isAdmin ? [{ to: '/admin', icon: LucideIcons.ShieldCheck, label: 'Gestão', activePaths: ['/admin'] }] : [])
  ], [isAdmin]);

  // Menu Inferior
  const [dockHoverIndex, setDockHoverIndex] = useState<number | null>(null);
  const [dockScrubIndex, setDockScrubIndex] = useState<number | null>(null);
  const activeDockIndex = dockScrubIndex ?? dockHoverIndex;

  const dockNavRef = useRef<HTMLElement>(null);
  const dockItemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isTouchScrubbingRef = useRef<boolean>(false);

  const getClosestDockIndex = (clientX: number, clientY: number): number | null => {
    if (!dockNavRef.current) return null;
    const navRect = dockNavRef.current.getBoundingClientRect();
    if (clientY < navRect.top - 60 || clientY > navRect.bottom + 40) {
      return null;
    }

    let closest: number | null = null;
    let minDiff = Infinity;

    dockItemRefs.current.forEach((el, idx) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const centerX = r.left + r.width / 2;
      const diff = Math.abs(clientX - centerX);
      if (diff < minDiff && diff < r.width * 1.35) {
        minDiff = diff;
        closest = idx;
      }
    });

    return closest;
  };

  const handleDockTouchStart = (e: React.TouchEvent) => {
    isTouchScrubbingRef.current = false;
    const touch = e.touches[0];
    const idx = getClosestDockIndex(touch.clientX, touch.clientY);
    setDockScrubIndex(idx);
  };

  const handleDockTouchMove = (e: React.TouchEvent) => {
    isTouchScrubbingRef.current = true;
    const touch = e.touches[0];
    const idx = getClosestDockIndex(touch.clientX, touch.clientY);
    setDockScrubIndex(idx);
  };

  const handleDockTouchEnd = () => {
    if (dockScrubIndex !== null && navItems[dockScrubIndex]) {
      navigate(navItems[dockScrubIndex].to);
    }
    setDockScrubIndex(null);
    isTouchScrubbingRef.current = false;
  };

  const handleDockTouchCancel = () => {
    setDockScrubIndex(null);
    isTouchScrubbingRef.current = false;
  };

  const handleDockItemClick = (destino: string) => {
    navigate(destino);
  };

  const handleVoltar = () => {
    if (path.startsWith('/admin/') && path !== '/admin') {
      navigate('/admin');
      return;
    }
    if (path.startsWith('/comanda/')) {
      navigate('/mesas');
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const getPageTitle = () => {
    if (isHome) return nomeMarca;
    if (path === '/mesas') return 'Guarda-Sóis';
    if (isComanda) return `Mesa ${path.split('/').pop()}`;
    if (path === '/cozinha') return 'Bar e Cozinha';
    if (path === '/painel') return 'Painel de Vendas';
    if (path === '/admin/estoque') return 'Estoque';
    if (path === '/admin/financeiro') return 'Financeiro';
    if (path === '/admin/equipe') return 'Usuários';
    if (path === '/admin/impressora') return 'Impressora';
    if (path === '/admin/assinatura') return 'Assinatura';
    if (path === '/admin') return 'Administrativo';
    return nomeMarca;
  };

  if (!garcom) return null;

  const primeiroNome = garcom.nome.split(' ')[0];

  return (
    <Fragment>
      {/* Barra lateral Desktop */}
      <aside className="fixed left-0 top-0 bottom-0 w-18 bg-white border-r border-slate-200 hidden md:flex flex-col z-50">
        <div className="h-16 flex items-center justify-center border-b border-slate-50 shrink-0">
          <Link to="/" className="text-yellow-600 hover:scale-110 transition-transform duration-300" aria-label="Início">
            <LucideIcons.Umbrella size={22} strokeWidth={2} />
          </Link>
        </div>
        <nav className="flex-1 flex flex-col items-center gap-6 py-10">
          {navItems.map((item) => {
            const isCurrentActive = item.activePaths.some(p => path === p || (p !== '/' && path.startsWith(`${p}/`)));
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                title={item.label}
                aria-label={item.label}
                className={`group relative w-11 h-11 rounded-4xl flex items-center justify-center transition-all duration-300 ease-out hover:scale-120 hover:translate-x-5 hover:shadow-3xl hover:shadow-slate-500/40 active:scale-95 ${
                  isCurrentActive
                    ? 'bg-yellow-50 text-yellow-500 border border-yellow-200/80 shadow-md shadow-yellow-500/30'
                    : 'text-slate-400 hover:bg-yellow-50 hover:text-yellow-500 hover:border hover:border-yellow-200'
                }`}
              >
                <ItemIcon size={22} strokeWidth={2} className="transition-transform duration-300 group-hover:scale-110" />
                {isCurrentActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 bg-yellow-500 rounded-r-full shadow-sm shadow-yellow-500/50" />
                )}
                {/* Tooltip flutuante */}
                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-4xl bg-slate-800 text-white text-[10px] font-sans whitespace-nowrap opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-200 pointer-events-none shadow-lg shadow-slate-900/20 z-50">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Header Superior Fixo (com BannerDegustacao integrado quando ativo) */}
      <header className="fixed top-0 right-0 left-0 md:left-18 bg-white/80 backdrop-blur-md border-b border-slate-300 flex flex-col z-40">
        <BannerDegustacao />
        <div className="h-16 flex items-center justify-between px-4 lg:px-6 w-full relative">
          <div className="flex items-center gap-2.5 sm:gap-3 z-10 min-w-0">
            {/* BOTÃO VOLTAR (MOBILE E DESKTOP) / LOGO MOBILE NA HOME */}
            {!isHome ? (
              <button
                type="button"
                onClick={handleVoltar}
                title="Voltar"
                aria-label="Voltar"
                className="group w-9 h-9 rounded-full flex items-center justify-center text-slate-400 bg-white/90 border border-slate-200/80 shadow-xs hover:bg-yellow-50 hover:text-yellow-500 hover:border-yellow-200 hover:scale-110 hover:-translate-y-0.5 hover:shadow-md hover:shadow-yellow-500/20 active:scale-95 active:translate-y-0 transition-all duration-300 ease-out cursor-pointer shrink-0"
              >
                <LucideIcons.ArrowLeft size={18} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
              </button>
            ) : (
              <div className="md:hidden flex items-center shrink-0 text-yellow-600 pl-1">
                <LucideIcons.Umbrella size={22} strokeWidth={2} />
              </div>
            )}

            {/* TÍTULO DA PÁGINA */}
            <div className="flex flex-col justify-center gap-1 min-w-0">
              <h1 className="font-sans text-[12px] md:text-[12px] font-normal uppercase text-slate-500 tracking-wide leading-none truncate">
                {getPageTitle()}
              </h1>
              {isHome && marcaPersonalizada && (
                <span className="font-sans text-[8px] font-normal uppercase text-yellow-900 tracking-wide leading-none truncate">
                  {NOME_PADRAO_SISTEMA}
                </span>
              )}
            </div>
          </div>

          {/* Notificações e Perfil */}
          <div className="flex items-center gap-2 md:gap-4 z-10 shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setAlertasAberto((prev) => !prev);
                setMenuAberto(false);
              }}
              aria-label="Notificações e Alertas"
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all relative cursor-pointer ${
                alertasAberto
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <LucideIcons.Bell
                size={20}
                strokeWidth={2}
                className={temPedidoProntoNaoLido ? 'animate-bounce text-yellow-600' : ''}
              />
              {alertasNaoLidos.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white text-xs scale-75 font-medium rounded-full border-2 border-white flex items-center justify-center leading-none">
                  {alertasNaoLidos.length > 9 ? '9+' : alertasNaoLidos.length}
                </span>
              )}
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

            <button
              type="button"
              onClick={() => {
                setMenuAberto((prev) => !prev);
                setAlertasAberto(false);
              }}
              className="group flex items-center gap-2 hover:bg-slate-50 p-1 md:pr-3 rounded-full md:rounded-2xl border border-transparent hover:border-slate-200 transition-all text-left cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full md:rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-lg shadow-inner shrink-0">
                {garcom.avatar}
              </div>

              <div className="hidden md:flex items-center gap-1.5">
                <h2 className="text-sm font-medium text-slate-700 leading-none truncate max-w-28">{primeiroNome}</h2>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" />
                <LucideIcons.ChevronDown size={14} className={`text-slate-400 transition-transform ${menuAberto ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown de Alertas */}
            {alertasAberto && (
              <div className="absolute top-14 right-3 md:right-12 w-72 sm:w-80 bg-white border border-slate-200/90 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2 flex flex-col z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 font-sans antialiased">
                {/* Cabeçalho */}
                <div className="px-3 py-2.5 mb-1 border-b border-slate-100 bg-slate-50/50 rounded-xl flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">Notificações</p>
                    <p className="text-xs scale-90 origin-left font-normal text-slate-400 mt-0.5">
                      {alertasNaoLidos.length > 0
                        ? `${alertasNaoLidos.length} ${
                            alertasNaoLidos.length === 1 ? 'nova notificação' : 'novas notificações'
                          }`
                        : 'Sem novas notificações'}
                    </p>
                  </div>

                  {alertasNaoLidos.length > 0 && (
                    <button
                      type="button"
                      onClick={marcarTodosComoLidos}
                      className="text-xs scale-90 origin-right font-sans text-slate-400 hover:text-yellow-700 hover:bg-yellow-100 px-2 py-1 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                {/* Alerta e Notificações de Navegador */}
                <div className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 mb-1.5 bg-slate-50/80 rounded-xl border border-slate-100 text-[11px]">
                  <button
                    type="button"
                    onClick={alternarAlertaSonoro}
                    title={alertaSonoroAtivo ? 'Silenciar alerta sonoro' : 'Ativar alerta sonoro'}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer font-medium ${
                      alertaSonoroAtivo
                        ? 'bg-white text-yellow-600 shadow-xs border border-yellow-200/70'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {alertaSonoroAtivo ? (
                      <LucideIcons.Volume2 size={13} strokeWidth={2.2} className="text-yellow-600" />
                    ) : (
                      <LucideIcons.VolumeX size={13} strokeWidth={2.2} className="text-slate-400" />
                    )}
                    <span>{alertaSonoroAtivo ? 'Som ligado' : 'Mudo'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={alternarNotificacoesNavegador}
                    title={
                      permissaoNavegador === 'denied'
                        ? 'Notificações bloqueadas pelo navegador'
                        : notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                          ? 'Avisos no navegador estão ativados'
                          : 'Clique para ativar avisos na tela'
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg transition-all cursor-pointer font-medium ${
                      notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                        ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/70'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    {notificacoesNavegadorAtivo && permissaoNavegador === 'granted' ? (
                      <LucideIcons.BellRing size={13} strokeWidth={2.2} className="text-emerald-500 animate-pulse" />
                    ) : (
                      <LucideIcons.BellOff size={13} strokeWidth={2.2} className="text-slate-400" />
                    )}
                    <span className="truncate">
                      {notificacoesNavegadorAtivo && permissaoNavegador === 'granted'
                        ? 'Avisos ativos'
                        : 'No navegador'}
                    </span>
                  </button>
                </div>

                {/* Lista Cronológica de Notificações */}
                <div className="max-h-72 overflow-y-auto flex flex-col gap-0.5">
                  {alertasSistema.length === 0 ? (
                    <div className="py-6 px-3 text-center flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center">
                        <LucideIcons.Bell size={15} strokeWidth={1.8} />
                      </div>
                      <p className="text-xs font-sans text-slate-600">Sem notificações</p>
                    </div>
                  ) : (
                    alertasSistema.map((alerta) => {
                      const lido = idsLidos.includes(alerta.id);
                      const iconeConfig =
                        alerta.categoria === 'bar'
                          ? {
                              Icone: LucideIcons.UtensilsCrossed,
                              cor: alerta.prioridadeAlta
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-yellow-50 text-yellow-600'
                            }
                          : alerta.categoria === 'financeiro'
                            ? {
                                Icone: LucideIcons.Wallet,
                                cor: 'bg-green-50 text-green-600'
                              }
                            : alerta.categoria === 'meta'
                              ? {
                                  Icone: LucideIcons.Target,
                                  cor: 'bg-yellow-50 text-yellow-600'
                                }
                              : {
                                  Icone: LucideIcons.PackageSearch,
                                  cor: 'bg-rose-50 text-rose-600'
                                };

                      const IconeAlerta = iconeConfig.Icone;

                      return (
                        <button
                          key={alerta.id}
                          type="button"
                          onClick={() => {
                            marcarAlertaComoLido(alerta.id);
                            setAlertasAberto(false);
                            navigate(alerta.rotaDestino);
                          }}
                          className={`w-full px-3 py-2.5 rounded-xl transition-colors flex items-start gap-2.5 text-left cursor-pointer ${
                            !lido
                              ? 'bg-slate-50/70 hover:bg-slate-100/80'
                              : 'bg-white hover:bg-slate-50 opacity-75'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${iconeConfig.cor}`}
                          >
                            <IconeAlerta size={14} strokeWidth={1.8} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-xs truncate ${
                                  !lido ? 'font-medium text-slate-800' : 'font-normal text-slate-600'
                                }`}
                              >
                                {alerta.titulo}
                              </p>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs scale-90 origin-right font-sans text-slate-400">
                                  {alerta.detalheTempo}
                                </span>
                                {!lido && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                )}
                              </div>
                            </div>
                            <p className="text-xs scale-95 origin-left font-sans text-slate-500 leading-snug mt-0.5 truncate">
                              {alerta.descricao}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Menu Dropdown */}
            {menuAberto && (
              <div className="absolute top-14 right-4 md:right-6 w-56 bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2 flex flex-col z-50 animate-in fade-in zoom-in-95 origin-top-right duration-200 font-sans">
                <div className="px-3 py-3 mb-1 border-b border-slate-100 bg-slate-50/50 rounded-xl">
                  <p className="text-xs font-bold text-slate-800 truncate">{garcom.nome}</p>
                  <p className="text-xs scale-90 origin-left font-sans text-slate-400 uppercase tracking-widest mt-0.5">
                    {garcom.cargo === 'super_admin' ? 'Super Admin' : garcom.cargo === 'admin' ? 'Administrador' : 'Garçom'}
                  </p>
                </div>

                <div className="flex flex-col gap-1 mt-1">
                  {garcom.cargo === 'super_admin' && (
                    <button
                      type="button"
                      onClick={() => { navigate('/master'); setMenuAberto(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-green-700 hover:bg-indigo-50 transition-colors text-left"
                    >
                      <LucideIcons.ShieldCheck size={16} /> Command Center
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => { navigate('/admin'); setMenuAberto(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors text-left"
                    >
                      <LucideIcons.Settings size={16} /> Administrativo
                    </button>
                  )}

                  <div className="h-px bg-slate-100 my-1 mx-2" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-yellow-700 hover:bg-rose-50 transition-colors text-left"
                  >
                    <LucideIcons.LogOut size={16} strokeWidth={2.5} /> Sair
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Espaçador automático da página quando o BannerDegustacao está visível */}
      {emPeriodoDeTeste && <div className="h-9 sm:h-10 w-full shrink-0" aria-hidden="true" />}

      {/* Header Inferior Mobile  */}
      {showBottomNav && (
        <nav
          ref={dockNavRef}
          onTouchStart={handleDockTouchStart}
          onTouchMove={handleDockTouchMove}
          onTouchEnd={handleDockTouchEnd}
          onTouchCancel={handleDockTouchCancel}
          onMouseLeave={() => setDockHoverIndex(null)}
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 flex md:hidden items-center justify-around h-16 pb-safe z-50 shadow-2xl shadow-slate-900/15 select-none px-2"
        >
          {navItems.map((item, index) => {
            const isSelected = activeDockIndex === index;
            const isAdjacent = activeDockIndex !== null && Math.abs(activeDockIndex - index) === 1;
            const isCurrentActive = item.activePaths.some(p => path === p || (p !== '/' && path.startsWith(`${p}/`)));
            const ItemIcon = item.icon;

            return (
              <button
                key={item.to}
                ref={el => { dockItemRefs.current[index] = el; }}
                type="button"
                onClick={() => handleDockItemClick(item.to)}
                onMouseEnter={() => setDockHoverIndex(index)}
                onMouseLeave={() => setDockHoverIndex(null)}
                aria-label={item.label}
                className={`relative flex-1 flex flex-col items-center justify-center py-1 transition-all duration-300 ease-out cursor-pointer select-none touch-none ${
                  isSelected
                    ? '-translate-y-4 z-30 scale-115'
                    : isAdjacent
                      ? '-translate-y-1.5 z-20 scale-105'
                      : 'translate-y-0 z-10 scale-100'
                }`}
              >
                {/* Ícone */}
                <div
                  className={`w-10 h-10 rounded-4xl flex items-center justify-center transition-all duration-300 ease-out relative ${
                    isSelected
                      ? 'bg-linear-to-b from-white to-yellow-50 text-yellow-500 border border-yellow-200 shadow-xl shadow-yellow-500/30 ring-1 ring-yellow-400/20'
                      : isAdjacent
                        ? 'bg-white/95 text-slate-700 border border-slate-200/80 shadow-md shadow-slate-300/40'
                        : isCurrentActive
                          ? 'bg-yellow-100 text-yellow-500 border border-yellow-200/50 shadow-xs'
                          : 'bg-transparent text-slate-400 hover:text-slate-500'
                  }`}
                >
                  <ItemIcon
                    size={isSelected ? 22 : 20}
                    strokeWidth={2}
                    className={`transition-transform duration-300 ${isSelected ? 'scale-110 animate-pulse' : ''}`}
                  />
                  {item.to === '/cozinha' && temPedidoProntoNaoLido && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                  )}
                </div>

                {/* Label */}
                <span
                  className={`text-[10px] tracking-wide leading-none truncate max-w-full px-1 mt-1 font-sans transition-all duration-300 ${
                    isSelected
                      ? 'font-bold text-yellow-600 scale-105'
                      : isAdjacent
                        ? 'font-normal text-slate-800'
                        : isCurrentActive
                          ? 'font-normal tracking-wider text-slate-600'
                          : 'font-normal text-slate-400'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </Fragment>
  );
}
