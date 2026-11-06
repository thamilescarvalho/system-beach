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
  }, [garcomLogado?.nome]);

  // Métricas reais de Mesas (Guarda-sóis)
  const mesasOcupadas = useMemo(
    () => mesas.filter((m) => m.status === 'ocupada'),
    [mesas]
  );

  const mesasLivres = useMemo(
    () => mesas.filter((m) => m.status === 'livre'),
    [mesas]
  );

  // Métricas reais de Pedidos em Preparo e Pedidos Prontos no Bar/Cozinha
  const {
    totalPedidosEmPreparo,
    totalPedidosProntos,
    listaMesasComPedidosProntos
  } = useMemo(() => {
    let emPreparo = 0;
    let prontos = 0;
    const resumoProntos: PedidoProntoResumo[] = [];

    mesasOcupadas.forEach((mesa) => {
      if (!Array.isArray(mesa.itens)) return;

      const itensPendentes = mesa.itens.filter((i) => i.statusCozinha === 'pendente' || i.statusCozinha === 'preparo');
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
    <div className="min-h-screen bg-white font-sans flex flex-col justify-between relative antialiased text-slate-800">
      {/* HEADER GLOBAL */}
      <Header />

      {/* CONTEÚDO PRINCIPAL */}
      <div className="flex-1 w-full pt-22 pb-8 md:pt-24 md:pl-18">
        <main className="w-full max-w-6xl px-4 sm:px-6 md:px-8 lg:px-10">
          {/* CARD SUPERIOR: OLÁ, [NOME DO USUÁRIO]! */}
          <section className="w-full max-w-4xl bg-slate-100/80 border border-slate-200/70 rounded-4xl p-4 sm:p-5 mb-6 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <AvatarUsuario
                avatar={garcomLogado?.avatar || '👋'}
                nome={garcomLogado?.nome}
                className="w-11 h-11 rounded-4xl bg-white border border-slate-200/90 shadow-xs"
                emojiClassName="text-xl"
                fallbackEmoji="👋"
              />
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight truncate">
                  Olá, {primeiroNome}!
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/mesas')}
              className="h-9 px-4 rounded-4xl bg-white hover:bg-yellow-50/70 border border-slate-200/90 hover:border-yellow-200 text-xs font-medium text-slate-700 hover:text-yellow-700 shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <LucideIcons.Umbrella size={14} strokeWidth={2} className="text-yellow-600" />
              <span>Mesas</span>
            </button>
          </div>
        </section>

        {/* GRID LADO A LADO NO DESKTOP: RESUMO DA OPERAÇÃO AGORA + ACESSO RÁPIDO ÀS COMANDAS ABERTAS */}
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
          {/* COLUNA ESQUERDA: RESUMO DA OPERAÇÃO AGORA */}
          <div className="w-full">
            <div className="flex items-center justify-between px-2 mb-2.5">
              <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Resumo da operação agora
              </h2>
              <span className="text-[11px] text-slate-400">
                Toque para acessar
              </span>
            </div>

            <section className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-2 space-y-1.5 shadow-xs">
              {/* 1. Mesas Ocupadas */}
              <button
                type="button"
                onClick={() => navigate('/mesas')}
                className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white/80 hover:bg-white border border-transparent hover:border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-4xl bg-yellow-50 border border-yellow-200/70 text-yellow-600 shadow-2xs flex items-center justify-center shrink-0">
                    <LucideIcons.Umbrella size={17} strokeWidth={1.9} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {mesasOcupadas.length === 1
                      ? '1 mesa ocupada'
                      : `${mesasOcupadas.length} mesas ocupadas`}
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
                className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white/80 hover:bg-white border border-transparent hover:border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-4xl bg-slate-100 border border-slate-200/80 text-slate-600 shadow-2xs flex items-center justify-center shrink-0">
                    <LucideIcons.CheckCircle2 size={17} strokeWidth={1.9} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {mesasLivres.length === 1
                      ? '1 mesa livre'
                      : `${mesasLivres.length} mesas livres`}
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

              {/* 3. Pedidos em Preparo */}
              <button
                type="button"
                onClick={() => navigate('/cozinha')}
                className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white/80 hover:bg-white border border-transparent hover:border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-4xl bg-slate-100 border border-slate-200/80 text-slate-600 shadow-2xs flex items-center justify-center shrink-0">
                    <LucideIcons.UtensilsCrossed size={17} strokeWidth={1.9} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {totalPedidosEmPreparo === 1
                      ? '1 pedido em preparo'
                      : `${totalPedidosEmPreparo} pedidos em preparo`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xs text-slate-400 hidden sm:inline">Bar e Cozinha</span>
                  <LucideIcons.ChevronRight
                    size={16}
                    strokeWidth={1.8}
                    className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
                  />
                </div>
              </button>

              {/* 4. Pedidos Prontos */}
              <button
                type="button"
                onClick={handleClickPedidosProntos}
                className={`group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl border shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer ${
                  totalPedidosProntos > 0
                    ? 'bg-white hover:bg-yellow-50/40 border-yellow-200/90'
                    : 'bg-white/80 hover:bg-white border-transparent hover:border-slate-200/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-4xl flex items-center justify-center shrink-0 shadow-2xs ${
                      totalPedidosProntos > 0
                        ? 'bg-yellow-400 text-slate-900 border border-yellow-400'
                        : 'bg-slate-100 border border-slate-200/80 text-slate-500'
                    }`}
                  >
                    <LucideIcons.BellRing
                      size={17}
                      strokeWidth={1.9}
                      className={totalPedidosProntos > 0 ? 'animate-bounce' : ''}
                    />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {totalPedidosProntos === 1
                      ? '1 pedido pronto'
                      : `${totalPedidosProntos} pedidos prontos`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  {totalPedidosProntos > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-4xl bg-slate-900 text-white text-[10px] font-medium">
                      Servir agora
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
                className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white/80 hover:bg-white border border-transparent hover:border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-4xl bg-slate-100 border border-slate-200/80 text-slate-600 shadow-2xs flex items-center justify-center shrink-0">
                    <LucideIcons.Wallet size={17} strokeWidth={1.9} />
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {resumoCaixaHoje.quantidade === 1
                      ? '1 conta fechada hoje'
                      : `${resumoCaixaHoje.quantidade} contas fechadas hoje`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="text-xs font-medium text-slate-500 tabular-nums">
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

          {/* COLUNA DIREITA: ACESSO RÁPIDO ÀS COMANDAS ABERTAS */}
          <div className="w-full">
            <div className="flex items-center justify-between px-2 mb-2.5">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Acesso rápido às comandas abertas
              </h3>
              <button
                type="button"
                onClick={() => navigate('/mesas')}
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <section className="bg-slate-100/75 border border-slate-200/60 rounded-4xl p-2 space-y-1.5 shadow-xs">
              {mesasOcupadas.length === 0 ? (
                <div className="px-4 py-8 rounded-4xl bg-white/70 border border-dashed border-slate-200 flex flex-col items-center justify-center text-center gap-2">
                  <div className="w-9 h-9 rounded-4xl bg-slate-100 border border-slate-200/80 text-slate-400 flex items-center justify-center">
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
                      className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-4xl bg-white/80 hover:bg-white border border-transparent hover:border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-200 text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-9 h-9 rounded-4xl bg-slate-900 text-white text-xs font-medium flex items-center justify-center shrink-0 tabular-nums shadow-2xs">
                          {String(mesa.numero).padStart(2, '0')}
                        </span>
                        <p className="text-sm font-medium text-slate-800 truncate">
                          Mesa {mesa.numero}
                          {mesa.nomeCliente ? ` • ${mesa.nomeCliente}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pl-2">
                        {qtdProntos > 0 && (
                          <span className="px-2 py-0.5 rounded-4xl bg-yellow-100 border border-yellow-300 text-yellow-800 text-[10px] font-medium">
                            Pronto
                          </span>
                        )}
                        <span className="text-xs font-medium text-slate-600 tabular-nums">
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
        <div className="flex flex-col items-center gap-1.5 opacity-55 hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-slate-600">
            <LucideIcons.ShieldCheck size={13} className="text-emerald-500" strokeWidth={2.2} />
            <span>Ambiente Seguro</span>
          </div>
          <div className="flex flex-col items-center text-[9px] font-normal uppercase tracking-widest text-slate-400 text-center gap-0.5">
            <span className="flex items-center gap-1">
              <LucideIcons.Code size={10} strokeWidth={2.5} />
              Desenvolvido pela Empresa <strong className="font-medium text-slate-500">Âncora Dev.</strong>
            </span>
            <span>Eng. de Software Thamiles</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
