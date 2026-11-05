// src/pages/Home.tsx
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';

interface PedidoProntoResumo {
  numeroMesa: number;
  nomeCliente: string;
  quantidadeItensProntos: number;
  descricaoCurta: string;
}

export function Home() {
  const navigate = useNavigate();
  const { garcomLogado, dadosEmpresa, mesas, historicoVendas } = useAppContext();

  const primeiroNome = garcomLogado?.nome
    ? garcomLogado.nome.trim().split(/\s+/)[0]
    : 'Colaborador';

  const saudacaoHorario = useMemo(() => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

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
    mesasComPreparo,
    totalPedidosProntos,
    listaMesasComPedidosProntos
  } = useMemo(() => {
    let emPreparo = 0;
    let prontos = 0;
    const numerosPreparo: number[] = [];
    const resumoProntos: PedidoProntoResumo[] = [];

    mesasOcupadas.forEach((mesa) => {
      if (!Array.isArray(mesa.itens)) return;

      const itensPendentes = mesa.itens.filter((i) => i.statusCozinha === 'pendente');
      const itensProntos = mesa.itens.filter((i) => i.statusCozinha === 'pronto');

      if (itensPendentes.length > 0) {
        emPreparo += itensPendentes.reduce((acc, item) => acc + item.quantidade, 0);
        numerosPreparo.push(mesa.numero);
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
      mesasComPreparo: numerosPreparo,
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
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 pt-22 pb-8 md:pt-24 md:pl-24">
        {/* CARD SUPERIOR: OLÁ, [NOME DO USUÁRIO]! */}
        <section className="bg-slate-100/80 border border-slate-200/70 rounded-3xl p-4 sm:p-5 mb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-2xl shrink-0">
                {garcomLogado?.avatar || '👋'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-normal text-slate-400">
                    {saudacaoHorario}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-50 border border-yellow-200/80 text-[10px] font-medium text-yellow-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                    Ao vivo
                  </span>
                </div>
                <h1 className="text-lg sm:text-xl font-medium text-slate-900 tracking-tight truncate mt-0.5">
                  Olá, {primeiroNome}!
                </h1>
                <p className="text-xs text-slate-400 truncate">
                  {dadosEmpresa?.nome_fantasia || NOME_PADRAO_SISTEMA}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/mesas')}
              className="h-9 px-3.5 rounded-xl bg-white hover:bg-yellow-50 border border-slate-200/80 hover:border-yellow-200 text-xs font-medium text-slate-700 hover:text-yellow-700 shadow-2xs transition-all active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <LucideIcons.Umbrella size={14} strokeWidth={2} className="text-yellow-600" />
              <span>Abrir Mesas</span>
            </button>
          </div>
        </section>

        {/* TÍTULO DE SEÇÃO: RESUMO EM TEMPO REAL */}
        <div className="flex items-center justify-between px-1 mb-2.5">
          <h2 className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Resumo da operação agora
          </h2>
          <span className="text-[11px] text-slate-400">
            Toque para acessar
          </span>
        </div>

        {/* CARDS HORIZONTAIS DE RESUMO (CLICÁVEIS) */}
        <section className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-1.5 space-y-1">
          {/* 1. Mesas Ocupadas */}
          <button
            type="button"
            onClick={() => navigate('/mesas')}
            className="group w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-yellow-50 border border-yellow-200/70 text-yellow-600 flex items-center justify-center shrink-0">
                <LucideIcons.Umbrella size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {mesasOcupadas.length === 1
                    ? '1 mesa ocupada'
                    : `${mesasOcupadas.length} mesas ocupadas`}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {mesasOcupadas.length > 0
                    ? `Em atendimento: ${mesasOcupadas.map((m) => `Mesa ${m.numero}`).slice(0, 4).join(', ')}${
                        mesasOcupadas.length > 4 ? ` +${mesasOcupadas.length - 4}` : ''
                      }`
                    : 'Nenhuma mesa aberta no momento'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-2">
              <span className="text-xs font-medium text-slate-500 tabular-nums hidden sm:inline">
                Ver mapa
              </span>
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
            className="group w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-600 flex items-center justify-center shrink-0">
                <LucideIcons.CheckCircle2 size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {mesasLivres.length === 1
                    ? '1 mesa livre'
                    : `${mesasLivres.length} mesas livres`}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {mesasLivres.length > 0
                    ? `Disponíveis: ${mesasLivres.map((m) => m.numero).slice(0, 6).join(', ')}${
                        mesasLivres.length > 6 ? '...' : ''
                      }`
                    : 'Todas as mesas estão ocupadas'}
                </p>
              </div>
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
            className="group w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center shrink-0">
                <LucideIcons.UtensilsCrossed size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {totalPedidosEmPreparo === 1
                    ? '1 pedido em preparo'
                    : `${totalPedidosEmPreparo} pedidos em preparo`}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {mesasComPreparo.length > 0
                    ? `Bar/Cozinha preparando: Mesa ${mesasComPreparo.join(', Mesa ')}`
                    : 'Nenhum pedido aguardando preparo no bar'}
                </p>
              </div>
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
            className={`group w-full flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-150 text-left cursor-pointer active:scale-[0.99] ${
              totalPedidosProntos > 0
                ? 'bg-emerald-50/90 hover:bg-emerald-50 border border-emerald-200/80 shadow-2xs'
                : 'bg-white/60 hover:bg-white hover:shadow-2xs'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  totalPedidosProntos > 0
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'bg-slate-100 border border-slate-200/80 text-slate-500'
                }`}
              >
                <LucideIcons.BellRing
                  size={18}
                  strokeWidth={1.9}
                  className={totalPedidosProntos > 0 ? 'animate-bounce' : ''}
                />
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-medium truncate ${
                    totalPedidosProntos > 0 ? 'text-emerald-950' : 'text-slate-800'
                  }`}
                >
                  {totalPedidosProntos === 1
                    ? '1 pedido pronto'
                    : `${totalPedidosProntos} pedidos prontos`}
                </p>
                <p
                  className={`text-xs truncate mt-0.5 ${
                    totalPedidosProntos > 0 ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {listaMesasComPedidosProntos.length > 0
                    ? `Retirar no bar: ${listaMesasComPedidosProntos
                        .map((p) => `Mesa ${p.numeroMesa}`)
                        .join(', ')}`
                    : 'Nenhum pedido aguardando retirada'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-2">
              {totalPedidosProntos > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-medium">
                  Servir agora
                </span>
              )}
              <LucideIcons.ChevronRight
                size={16}
                strokeWidth={1.8}
                className={
                  totalPedidosProntos > 0
                    ? 'text-emerald-700 group-hover:translate-x-0.5 transition-all'
                    : 'text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all'
                }
              />
            </div>
          </button>

          {/* 5. Resumo do Caixa do Dia */}
          <button
            type="button"
            onClick={() => navigate('/painel')}
            className="group w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-white/60 hover:bg-white hover:shadow-2xs transition-all duration-150 text-left cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                <LucideIcons.Wallet size={18} strokeWidth={1.9} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {resumoCaixaHoje.quantidade === 1
                    ? '1 conta fechada hoje'
                    : `${resumoCaixaHoje.quantidade} contas fechadas hoje`}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  Total recebido hoje: {formatarMoeda(resumoCaixaHoje.total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 pl-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Caixa</span>
              <LucideIcons.ChevronRight
                size={16}
                strokeWidth={1.8}
                className="text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all"
              />
            </div>
          </button>
        </section>

        {/* ATALHO DIRETO PARA MESAS COM PEDIDOS PRONTOS OU OCUPADAS */}
        {mesasOcupadas.length > 0 && (
          <section className="mt-5">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Acesso rápido às comandas abertas
              </h3>
              <button
                type="button"
                onClick={() => navigate('/mesas')}
                className="text-xs text-yellow-700 hover:underline cursor-pointer"
              >
                Ver todas
              </button>
            </div>

            <div className="bg-slate-100/75 border border-slate-200/60 rounded-2xl p-1.5 space-y-1">
              {mesasOcupadas.slice(0, 5).map((mesa) => {
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
                    className="group w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/70 hover:bg-white hover:shadow-2xs transition-all text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-900 text-white text-xs font-medium flex items-center justify-center shrink-0 tabular-nums">
                        {String(mesa.numero).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">
                          Mesa {mesa.numero}
                          {mesa.nomeCliente ? ` • ${mesa.nomeCliente}` : ''}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {mesa.garcomNome ? `Atendente: ${mesa.garcomNome}` : 'Comanda aberta'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {qtdProntos > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
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
              })}
            </div>
          </section>
        )}
      </main>

      {/* RODAPÉ */}
      <footer className="w-full pb-24 md:pb-6 pt-2 md:pl-24 flex flex-col items-center justify-center relative z-10 shrink-0">
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
