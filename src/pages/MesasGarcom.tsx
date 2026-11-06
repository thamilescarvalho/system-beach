// src/pages/MesasGarcom.tsx
import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import type { Mesa } from '../types';
import * as LucideIcons from 'lucide-react';
import { ModalConfirmacao } from '../components/ModalConfirmacao';

export function MesasGarcom() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();

  const mesas: Mesa[] = contexto?.mesas || [];
  const garcomLogado = contexto?.garcomLogado;
  const isAdmin = garcomLogado?.cargo === 'admin' || garcomLogado?.cargo === 'super_admin';

  const [alerta, setAlerta] = useState<string | null>(null);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);
  const [numeroMesaInput, setNumeroMesaInput] = useState('');
  const [modalConfirmacao, setModalConfirmacao] = useState<{
    aberto: boolean;
    titulo: string;
    descricao: string;
    textoConfirmar?: string;
    textoCancelar?: string;
    tipo?: 'perigo' | 'aviso' | 'primario';
    onConfirmar: () => void | Promise<void>;
  }>({
    aberto: false,
    titulo: '',
    descricao: '',
    onConfirmar: () => {}
  });

  const fecharConfirmacao = () => {
    setModalConfirmacao((prev) => ({ ...prev, aberto: false }));
  };

  const dispararAlerta = (mensagem: string) => {
    if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    setAlerta(mensagem);
  };

  useEffect(() => {
    if (alerta) {
      const timer = setTimeout(() => setAlerta(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [alerta]);

  const handleMesaClick = (numeroMesa: number, donoDaMesaId?: string) => {
    if (!donoDaMesaId || isAdmin || garcomLogado?.id === donoDaMesaId) {
      navigate(`/comanda/${numeroMesa}`);
      return;
    }

    dispararAlerta('Este guarda-sol está sendo atendido por outro garçom.');
  };

  const abrirModalCriar = () => {
    setMesaEditando(null);
    setNumeroMesaInput('');
    setModalAdminAberto(true);
  };

  const abrirModalEditar = (mesa: Mesa, e: React.MouseEvent) => {
    e.stopPropagation();
    setMesaEditando(mesa);
    setNumeroMesaInput(mesa.numero.toString());
    setModalAdminAberto(true);
  };

  const salvarMesa = async () => {
    const numero = parseInt(numeroMesaInput, 10);
    if (isNaN(numero) || numero <= 0) {
      dispararAlerta('Digite um número válido maior que zero.');
      return;
    }

    if (!contexto) return;

    try {
      if (mesaEditando) {
        const idMesa = Number(mesaEditando.id);
        if (!Number.isFinite(idMesa)) {
          dispararAlerta('Mesa inválida para edição.');
          return;
        }
        await contexto.editarMesa(idMesa, { numero });
      } else {
        await contexto.adicionarMesa(numero);
      }
      setModalAdminAberto(false);
    } catch (error) {
      console.error('Erro ao salvar a mesa:', error);
      dispararAlerta('Ocorreu um erro ao salvar o guarda-sol.');
    }
  };

  const excluirMesa = () => {
    if (!mesaEditando) return;
    const num = mesaEditando.numero;

    setModalConfirmacao({
      aberto: true,
      titulo: 'Excluir Guarda-Sol?',
      descricao: `Tem certeza que deseja excluir o guarda-sol ${num}? Esta ação removerá a mesa do mapa.`,
      textoConfirmar: 'Excluir Guarda-Sol',
      tipo: 'perigo',
      onConfirmar: async () => {
        fecharConfirmacao();
        if (!contexto) return;
        try {
          await contexto.removerMesa(num);
          setModalAdminAberto(false);
        } catch (error) {
          console.error('Erro ao excluir a mesa:', error);
          dispararAlerta('Ocorreu um erro ao excluir o guarda-sol.');
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-200/50 font-sans text-slate-900 relative">
      <Header />

      {/* Modal de Alerta / Acesso Negado */}
      {alerta && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setAlerta(null)} />
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-80 relative z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500 shadow-inner">
              <LucideIcons.Lock size={24} strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5 uppercase tracking-tight">Atenção</h4>
            <p className="text-sm font-medium text-slate-500 mb-6">{alerta}</p>
            <button
              type="button"
              onClick={() => setAlerta(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-widest uppercase py-3.5 rounded-4xl text-xs transition-all active:scale-95 shadow-lg shadow-slate-900/20"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal Admin */}
      {modalAdminAberto && isAdmin && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalAdminAberto(false)} />
          <div className="bg-white p-6 rounded-4xl shadow-2xl border border-slate-200 w-full max-w-72 relative z-10 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold uppercase text-slate-900 tracking-wider">
                {mesaEditando ? 'Editar Guarda-Sol' : 'Novo Guarda-Sol'}
              </h4>
              <button
                type="button"
                onClick={() => setModalAdminAberto(false)}
                className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors active:scale-90"
              >
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <label className="text-xs scale-90 origin-center font-bold text-slate-400 uppercase tracking-widest mb-2 block text-center">
              Número da Mesa / Guarda-Sol
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={numeroMesaInput}
              onChange={(e) => setNumeroMesaInput(e.target.value)}
              className="w-full bg-slate-100 h-12 rounded-3xl outline-none focus:border-slate-500 focus:bg-white focus:ring-4 focus:ring-slate-100 font-bold text-xl text-center text-slate-800 border border-slate-200 transition-all placeholder:text-slate-400 mb-6"
              autoFocus
            />

            <div className="flex gap-3">
              {mesaEditando && (
                <button
                  type="button"
                  onClick={excluirMesa}
                  className="w-12 h-11 bg-white border border-rose-200 text-rose-500 rounded-4xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-95 shrink-0"
                  title="Excluir"
                >
                  <LucideIcons.Trash2 size={18} strokeWidth={2.5} />
                </button>
              )}
              <button
                type="button"
                onClick={salvarMesa}
                className="flex-1 h-11 bg-linear-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 shadow-lg shadow-slate-500/20 text-white font-bold rounded-4xl text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <LucideIcons.Check size={16} strokeWidth={3} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal Alinhado para Mobile (4 Colunas Compactas) e Desktop */}
      <div className="pt-20 md:pt-22 pb-24 md:pb-10 md:pl-18 flex flex-col items-center w-full">
        <main className="w-full max-w-5xl mx-auto px-3 sm:px-6">
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3 md:gap-3.5 w-full">
            {mesas.map((mesa) => {
              const isOcupada = mesa.status === 'ocupada';
              const isBloqueada = isOcupada && mesa.garcomId !== garcomLogado?.id && !isAdmin;
              const temAlerta = mesa.itens.some(item => item.statusCozinha === 'pronto');

              const baseBtnClass = 'relative aspect-square rounded-2xl p-1.5 sm:p-2 flex flex-col items-center justify-between transition-all duration-300 ease-out hover:-translate-y-1 active:scale-95 active:translate-y-0 overflow-hidden border w-full shadow-xs';

              let corBtn = 'bg-white border-slate-300 hover:border-slate-400 hover:shadow-md hover:shadow-slate-200/60';
              let corTextoNum = 'text-slate-800';
              let corTextoStatus = 'text-slate-400';

              if (temAlerta) {
                corBtn = 'bg-linear-to-br from-yellow-400 to-amber-500 border-yellow-500 shadow-md shadow-yellow-500/30 hover:shadow-xl hover:shadow-yellow-500/40 animate-pulse';
                corTextoNum = 'text-white';
                corTextoStatus = 'text-yellow-50';
              } else if (isBloqueada) {
                corBtn = 'bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed hover:translate-y-0 active:scale-100';
                corTextoNum = 'text-slate-400';
                corTextoStatus = 'text-slate-400';
              } else if (isOcupada) {
                corBtn = 'bg-linear-to-br from-green-500 to-green-700 border-green-600 shadow-md shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/40';
                corTextoNum = 'text-white';
                corTextoStatus = 'text-green-50';
              }

              return (
                <div key={mesa.id} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleMesaClick(mesa.numero, mesa.garcomId)}
                    className={`${baseBtnClass} ${corBtn}`}
                  >
                    {/* Reflexo 3D sutil */}
                    <div className="absolute inset-x-0 top-0 h-1/2 bg-linear-to-b from-white/15 to-transparent pointer-events-none" />

                    {/* Topo do Card: Indicador de Alerta ou Bloqueio */}
                    <div className="w-full flex justify-between items-center h-3.5 px-0.5 relative z-10">
                      {temAlerta ? (
                        <span className="w-2 h-2 bg-white rounded-full shadow-xs animate-ping" />
                      ) : isBloqueada ? (
                        <LucideIcons.Lock size={11} className="opacity-40" />
                      ) : (
                        <span />
                      )}
                    </div>

                    {/* Número Central do Guarda-Sol */}
                    <div className="flex-1 flex items-center justify-center w-full relative z-10">
                      <span className={`text-lg sm:text-2xl font-bold tracking-tight drop-shadow-xs leading-none tabular-nums ${corTextoNum}`}>
                        {mesa.numero}
                      </span>
                    </div>

                    {/* Rodapé: Nome do Cliente ou Livre (Sem quebra de linha) */}
                    <div className="h-4 w-full flex items-center justify-center min-w-0 relative z-10">
                      {isOcupada ? (
                        <span className={`text-xs scale-75 origin-center font-bold uppercase w-full flex items-center justify-center gap-1 min-w-0 whitespace-nowrap ${corTextoStatus}`}>
                          <LucideIcons.User size={11} strokeWidth={2.5} className="shrink-0" />
                          <span className="truncate">{mesa.nomeCliente || 'S/N'}</span>
                        </span>
                      ) : (
                        <span className="text-xs scale-75 origin-center font-bold uppercase tracking-wider opacity-60 text-center truncate whitespace-nowrap">
                          Livre
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Quick Action: Editar Guarda-Sol */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={(e) => abrirModalEditar(mesa, e)}
                      aria-label={`Editar mesa ${mesa.numero}`}
                      className={`absolute top-1.5 right-1.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all duration-200 z-20 hover:scale-110 active:scale-90 ${
                        isOcupada ? 'bg-black/20 hover:bg-black/30 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                      }`}
                    >
                      <LucideIcons.Pencil size={10} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Quick Action Flutuante 3D: + Novo Guarda-Sol */}
      {isAdmin && (
        <button
          type="button"
          onClick={abrirModalCriar}
          className="fixed bottom-20 md:bottom-6 right-4 md:right-8 w-12 h-12 bg-linear-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center text-white shadow-xl shadow-slate-900/25 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-2xl active:scale-90 z-40 border border-white/20"
          title="Novo Guarda-Sol"
          aria-label="Novo Guarda-Sol"
        >
          <LucideIcons.Plus size={22} strokeWidth={2.5} />
        </button>
      )}
      <ModalConfirmacao {...modalConfirmacao} onCancelar={fecharConfirmacao} />
    </div>
  );
}
