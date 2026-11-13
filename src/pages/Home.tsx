// src/pages/Home.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { AvatarUsuario } from '../components/AvatarUsuario';
import { useAppContext } from '../context/AppContext';

interface PedidoProntoResumo {
  numeroMesa: number;
  nomeCliente: string;
  quantidadeItensProntos: number;
  descricaoCurta: string;
}

export function Home() {
  const navigate = useNavigate();
  const { garcomLogado, mesas, historicoVendas } = useAppContext();

  const primeiroNome = useMemo(() => {
    const raw = garcomLogado?.nome ? garcomLogado.nome.trim().split(/\s+/)[0] : '';
    if (!raw) return 'Colaborador';
    return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }, [garcomLogado]);

  // Métricas de Guarda-sóis
  const mesasOcupadas = useMemo(
    () => mesas.filter((m) => m.status === 'ocupada'),
    [mesas]
  );

  const mesasLivres = useMemo(
    () => mesas.filter((m) => m.status === 'livre'),
    [mesas]
  );

  // Métricas
  const {
    totalPedidosProntos,
    listaMesasComPedidosProntos
  } = useMemo(() => {
    let emPreparo = 0;
    let prontos = 0;
    const resumoProntos: PedidoProntoResumo[] = [];

    mesasOcupadas.forEach((mesa) => {
      if (!Array.isArray(mesa.itens)) return;

      const itensPendentes = mesa.itens.filter(
        (i) => i.statusCozinha === 'pendente' || i.statusCozinha === 'preparo'
      );
      const itensProntos = mesa.itens.filter((i) => i.statusCozinha === 'pronto');

      if (itensPendentes.length > 0) {
        emPreparo += itensPendentes.reduce((acc, item) => acc + item.quantidade, 0);
      }

      if (itensProntos.length > 0) {
        const qtdProntaMesa = itensProntos.reduce((acc, item) => acc + item.quantidade, 0);
        prontos += qtdProntaMesa;
        const primeiroItem = itensProntos[0];
        resumoProntos.push({
          numeroMesa: mesa.numero,
          nomeCliente: mesa.nomeCliente || '',
          quantidadeItensProntos: qtdProntaMesa,
          descricaoCurta: `${primeiroItem.quantidade}x ${primeiroItem.produto.nome}${
            itensProntos.length > 1 ? ` e +${itensProntos.length - 1}` : ''
          }`
        });
      }
    });

    return {
      totalPedidosEmPreparo: emPreparo,
      totalPedidosProntos: prontos,
      listaMesasComPedidosProntos: resumoProntos
    };
  }, [mesasOcupadas]);

  // Vendas concluídas hoje (Caixa)
  const resumoCaixaHoje = useMemo(() => {
    const hojeIso = new Date().toISOString().split('T')[0];
    const vendasHoje = historicoVendas.filter(
      (v) => v.status !== 'cancelada' && v.dataFechamento.startsWith(hojeIso)
    );
    const totalFaturado = vendasHoje.reduce((acc, v) => acc + v.total, 0);
    return {
      quantidade: vendasHoje.length,
      total: totalFaturado
    };
  }, [historicoVendas]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleClickPedidosProntos = () => {
    if (listaMesasComPedidosProntos.length === 1) {
      navigate(`/comanda/${listaMesasComPedidosProntos[0].numeroMesa}`);
      return;
    }
    navigate('/cozinha');
  };

  return (
    <div className="min-h-dvh bg-slate-100/80 font-sans flex flex-col justify-between relative antialiased text-slate-800 overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64"
        style={{ background: 'radial-gradient(ellipse at top, rgba(226, 232, 240, 0.55) 0%, rgba(226, 232, 240, 0) 70%)' }}
      />

      {/* HEADER */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 w-full pt-22 pb-8 md:pt-24 md:pl-18 relative z-10">
        <main className="w-full max-w-6xl px-4 sm:px-6 md:px-8 lg:px-10">
          {/* CARD DE BOAS-VINDAS  */}
          <section className="w-full max-w-4xl bg-white border border-slate-200/90 rounded-4xl p-3 sm:p-5 mb-6 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <AvatarUsuario
                    avatar={garcomLogado?.avatar || '👋'}
                    nome={garcomLogado?.nome}
                    className="w-11 h-11 rounded-full bg-slate-100 border border-slate-200/90 shadow-inner"
                    emojiClassName="text-xl"
                    fallbackEmoji="👋"
                  />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                </div>

                <div className="min-w-0">
                  <h1 className="text-base uppercase sm:text-lg font-medium text-slate-600 tracking-tight truncate">
                    Olá, {primeiroNome}!
                  </h1>
                  <p className="text-xs text-slate-400 truncate">
                    {mesasOcupadas.length === 0
                      ? 'Todas as mesas estão livres agora'
                      : mesasOcupadas.length === 1
                        ? '1 em atendimento'
                        : `${mesasOcupadas.length} em atendimento`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/mesas')}
                className="h-7 px-3 rounded-full bg-yellow-600 uppercase hover:bg-yellow-800 tracking-wider text-xs font-medium text-white shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <LucideIcons.Umbrella size={14} strokeWidth={2} className="text-amber-100" />
                <span>Mesas</span>
              </button>
            </div>
          </section>

          {/* GRID LADO A LADO NO DESKTOP: RESUMO DA OPERAÇÃO AGORA + ÀS COMANDAS ABERTAS */}
          <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* COLUNA ESQUERDA: RESUMO DA OPERAÇÃO AGORA */}
            <div className="w-full">
              <div className="flex items-center justify-between px-2 mb-2.5">
                <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Resumo da operação agora
                </h2>
              </div>

              <section className="bg-slate-200/60 border border-slate-200/90 rounded-4xl p-2 space-y-1.5 shadow-inner">
                {/* 1. Mesas Ocupadas */}
                <button
                  type="button"
                  onClick={() => navigate('/mesas')}
                  className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white hover:bg-white border border-slate-200/60 hover:border-slate-300/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 shadow-2xs flex items-center justify-center shrink-0">
                      <LucideIcons.Umbrella size={17} strokeWidth={1.9} />
                    </div>
                    <p className="text-[14px] tracking-wider font-sans text-slate-800 truncate uppercase">
                      {mesasOcupadas.length === 1
                        ? '1 mesa ocupada'
                        : `${mesasOcupadas.length} ocupados`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">Ver mapa</span>
                    <LucideIcons.ChevronRight
                      size={16}
                      strokeWidth={1.8}
                      className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </button>

                {/* 2. Mesas Livres */}
                <button
                  type="button"
                  onClick={() => navigate('/mesas')}
                  className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white hover:bg-white border border-slate-200/60 hover:border-slate-300/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-600 shadow-2xs flex items-center justify-center shrink-0">
                      <LucideIcons.CheckCircle2 size={17} strokeWidth={1.9} />
                    </div>
                    <p className="text-[14px] tracking-wider font-sans text-slate-800 truncate uppercase">
                      {mesasLivres.length === 1
                        ? '1 mesa livre'
                        : `${mesasLivres.length} livres`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="text-xs text-slate-400 hidden sm:inline">Guarda-sóis</span>
                    <LucideIcons.ChevronRight
                      size={16}
                      strokeWidth={1.8}
                      className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </button>

                {/* 3. Pedidos Prontos */}
                <button
                  type="button"
                  onClick={handleClickPedidosProntos}
                  className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl border shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer ${
                    totalPedidosProntos > 0
                      ? 'bg-white hover:bg-green-100 border-green-300/90'
                      : 'bg-white hover:bg-white border-slate-200/60 hover:border-slate-300/80'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                        totalPedidosProntos > 0
                          ? 'bg-green-50 text-green-400 border border-green-400'
                          : 'bg-slate-50 border border-slate-200/70 text-slate-600'
                      }`}
                    >
                      <LucideIcons.BellRing
                        size={17}
                        strokeWidth={1.9}
                        className={totalPedidosProntos > 0 ? 'animate-bounce' : ''}
                      />
                    </div>
                    <p className="text-[14px] tracking-wider font-sans text-slate-800 truncate uppercase">
                      {totalPedidosProntos === 1
                        ? '1 pedido pronto'
                        : `${totalPedidosProntos} pedidos prontos`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    {totalPedidosProntos > 0 ? (
                      <span className="px-2.5 py-0.5 uppercase tracking-wider rounded-full bg-green-500 text-white text-[10px] font-sans">
                        Servir
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 hidden sm:inline">Retirar</span>
                    )}
                    <LucideIcons.ChevronRight
                      size={16}
                      strokeWidth={1.8}
                      className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </button>

                {/* 5. Resumo do Caixa do Dia */}
                <button
                  type="button"
                  onClick={() => navigate('/painel')}
                  className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white hover:bg-white border border-slate-200/60 hover:border-slate-300/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/80 text-slate-700 shadow-2xs flex items-center justify-center shrink-0">
                      <LucideIcons.Wallet size={17} strokeWidth={1.9} />
                    </div>
                    <p className="text-[14px] tracking-wider font-sans text-slate-800 truncate uppercase">
                      {resumoCaixaHoje.quantidade === 1
                        ? '1  fechada hoje'
                        : `${resumoCaixaHoje.quantidade} fechadas hoje`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 pl-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-50 border border-slate-200/70 text-slate-700 text-xs font-sans tabular-nums">
                      {formatarMoeda(resumoCaixaHoje.total)}
                    </span>
                    <LucideIcons.ChevronRight
                      size={16}
                      strokeWidth={1.8}
                      className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                    />
                  </div>
                </button>
              </section>
            </div>

            {/* COMANDAS ABERTAS */}
            <div className="w-full">
              <div className="flex items-center justify-between px-2 mb-2.5">
                <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Comandas abertas
                </h3>
                <button
                  type="button"
                  onClick={() => navigate('/mesas')}
                  className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Ver todas
                </button>
              </div>

              <section className="bg-slate-200/60 border border-slate-200/90 rounded-4xl p-2 space-y-1.5 shadow-inner">
                {mesasOcupadas.length === 0 ? (
                  <div className="px-4 py-8 rounded-4xl bg-white/85 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200/80 text-slate-400 flex items-center justify-center">
                      <LucideIcons.Umbrella size={17} strokeWidth={1.8} />
                    </div>
                    <p className="text-xs text-slate-400">Nenhuma comanda aberta agora</p>
                  </div>
                ) : (
                  mesasOcupadas.slice(0, 5).map((mesa) => {
                    const totalParcial = (mesa.itens || []).reduce(
                      (acc, item) => acc + item.produto.preco * item.quantidade,
                      0
                    );
                    const qtdProntos = (mesa.itens || []).filter(
                      (i) => i.statusCozinha === 'pronto'
                    ).length;

                    return (
                      <button
                        key={mesa.id}
                        type="button"
                        onClick={() => navigate(`/comanda/${mesa.numero}`)}
                        className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white hover:bg-white border border-slate-200/60 hover:border-slate-300/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Bolinha preta com o número da mesa  */}
                          <span className="w-9 h-9 rounded-full bg-slate-500 text-white text-[14px] font-medium flex items-center justify-center shrink-0 tabular-nums shadow-2xs">
                            {String(mesa.numero).padStart(2)}
                          </span>
                          <p className="text-[13px] uppercase font-medium text-slate-700 truncate">
                            {mesa.nomeCliente?.trim() || 'Sem Nome'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pl-2">
                          {qtdProntos > 0 && (
                            <span className="px-2 py-0.5 uppercase rounded-full tracking-wider bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-medium">
                              Pronto
                            </span>
                          )}
                          <span className="text-xs font-medium text-slate-700 tabular-nums">
                            {formatarMoeda(totalParcial)}
                          </span>
                          <LucideIcons.ChevronRight
                            size={15}
                            strokeWidth={1.8}
                            className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                      </button>
                    );
                  })
                )}
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* RODAPÉ */}
      <footer className="w-full pb-24 md:pb-6 pt-2 md:pl-18 flex flex-col items-center justify-center relative z-10 shrink-0">
        <div className="flex flex-col items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-slate-600">
            <LucideIcons.ShieldCheck size={13} className="text-emerald-500" strokeWidth={2.2} />
            <span>Ambiente Seguro</span>
          </div>
          <div className="flex flex-col items-center text-[9px] font-normal uppercase tracking-widest text-slate-400 text-center gap-0.5">
            <span className="flex items-center gap-1">
              <LucideIcons.Code size={10} strokeWidth={2.5} />
              Desenvolvido pela Empresa{' '}
              <strong className="font-medium text-slate-500">Âncora Dev.</strong>
            </span>
            <span>Eng. de Software Thamiles</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
