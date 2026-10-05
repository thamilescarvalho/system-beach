// src/pages/MesasGarcom.tsx
import { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import * as LucideIcons from 'lucide-react';

interface ItemComanda {
  id: string;
  statusCozinha?: string;
  [key: string]: unknown;
}

interface Mesa {
  id: number | string;
  numero: number;
  status: string;
  garcomId?: string;
  nomeCliente?: string;
  itens: ItemComanda[];
}

export function MesasGarcom() {
  const contexto = useContext(AppContext);
  const navigate = useNavigate();

  const mesas = Array.isArray(contexto?.mesas)
    ? (contexto.mesas as unknown as Mesa[])
    : [];
  const garcomLogado = contexto?.garcomLogado;

  const [alerta, setAlerta] = useState<string | null>(null);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);
  const [mesaEditando, setMesaEditando] = useState<Mesa | null>(null);
  const [numeroMesaInput, setNumeroMesaInput] = useState('');

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
    if (!donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.cargo === 'admin') { navigate(`/comanda/${numeroMesa}`); return; }
    if (garcomLogado?.id === donoDaMesaId) { navigate(`/comanda/${numeroMesa}`); return; }

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
      alert('Digite um número válido.');
      return;
    }

    if (!contexto) return;

    try {
      if (mesaEditando) {
        const idMesa = Number(mesaEditando.id);
        if (!Number.isFinite(idMesa)) {
          alert('Mesa inválida para edição.');
          return;
        }
        await contexto.editarMesa(idMesa, { numero });
      } else {
        await contexto.adicionarMesa(numero);
      }
      setModalAdminAberto(false);
    } catch (error) {
      console.error("Erro ao salvar a mesa:", error);
      alert("Ocorreu um erro ao salvar o guarda-sol.");
    }
  };

  const excluirMesa = async () => {
    if (mesaEditando && window.confirm(`Tem certeza que deseja excluir o guarda-sol ${mesaEditando.numero}?`)) {
      if (!contexto) return;

      try {
        await contexto.removerMesa(mesaEditando.numero);
        setModalAdminAberto(false);
      } catch (error) {
        console.error("Erro ao excluir a mesa:", error);
        alert("Ocorreu um erro ao excluir o guarda-sol.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/50 font-sans text-slate-900 relative">

      <Header />

      {/* Modal de Acesso Negado */}
      {alerta && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setAlerta(null)}></div>
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-[320px] relative z-10 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mb-4 text-rose-500">
              <LucideIcons.Lock size={24} strokeWidth={2.5} />
            </div>
            <h4 className="text-base font-black text-slate-900 mb-1.5 uppercase tracking-tight">Acesso Negado</h4>
            <p className="text-sm font-medium text-slate-500 mb-6">{alerta}</p>
            <button onClick={() => setAlerta(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold tracking-widest uppercase py-3.5 rounded-xl text-xs transition-all active:scale-[0.98] shadow-lg shadow-slate-900/20">
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Modal Admin */}
      {modalAdminAberto && garcomLogado?.cargo === 'admin' && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-2 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setModalAdminAberto(false)}></div>
          <div className="bg-white p-5 rounded-4xl shadow-2xl border border-slate-200 w-full max-w-60 relative z-10 flex flex-col animate-in zoom-in-95 duration-200">

            <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-1">
              <h4 className="text-[13px] font-sans uppercase text-slate-900 tracking-wider">
                {mesaEditando ? 'Editar Guarda-Sol' : 'Novo Guarda-Sol'}
              </h4>
              <button onClick={() => setModalAdminAberto(false)} className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors">
                <LucideIcons.X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <label className="text-[10px] font-sans text-slate-400 uppercase tracking-widest mb-3 block">Número</label>
            <input 
              type="number" 
              value={numeroMesaInput} 
              onChange={(e) => setNumeroMesaInput(e.target.value)}
              className="w-full bg-slate-100 p-1 rounded-4xl outline-none focus:border-slate-500 focus:bg-white/20 focus:ring-4 focus:ring-slate-100 font-sans text-xl text-center text-slate-800 border border-slate-200 transition-all placeholder:text-slate-500 mb-7"
              autoFocus
            />

            <div className="flex gap-3">
              {mesaEditando && (
                <button onClick={excluirMesa} className="w-14 bg-white border border-rose-200 text-rose-500 rounded-4xl flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-colors active:scale-95 shrink-0" title="Excluir">
                  <LucideIcons.Trash2 size={20} strokeWidth={2.5} />
                </button>
              )}
              <button onClick={salvarMesa} className="flex-1 bg-linear-to-r from-slate-600 to-slate-500 hover:from-slate-600 hover:to-slate-700 shadow-lg shadow-slate-500/30 text-white font-sans py-2 rounded-4xl text-xs uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                <LucideIcons.Check size={16} strokeWidth={3} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteudo Principal */}
      <div className="pt-18 md:pt-24 pb-28 md:pb-8 md:pl-18 flex flex-col items-center w-full">
        <main className="w-full max-w-5xl mx-auto px-6 md:px-6">

          <div className="flex items-center justify-end mb-1 min-h-8">
          </div>

          <div className="grid grid-cols-3 min-[400px]:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 md:gap-4 w-full">
            {mesas.map((mesa) => {
              const isOcupada = mesa.status === 'ocupada';
              const isBloqueada = isOcupada && mesa.garcomId !== garcomLogado?.id && garcomLogado?.cargo !== 'admin';
              const temAlerta = mesa.itens.some(item => item.statusCozinha === 'pronto');

              const baseBtnClass = "relative aspect-square rounded-2xl p-1 flex flex-col items-center justify-center transition-all duration-300 ease-out hover:-translate-y-2 active:scale-95 overflow-hidden border";

              let corBtn = "bg-white border-slate-300 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50";
              let corTextoNum = "text-slate-800";
              let corTextoStatus = "text-slate-400";

              if (temAlerta) {
                corBtn = "bg-linear-to-br from-fuchsia-600 to-fuchsia-700 border-fuchsia-600 hover:shadow-xl hover:shadow-fuchsia-600/40 animate-pulse";
                corTextoNum = "text-white";
                corTextoStatus = "text-fuchsia-100";
              } else if (isBloqueada) {
                corBtn = "bg-slate-100 border-slate-300 opacity-60 cursor-not-allowed hover:-translate-y-0 active:scale-100";
                corTextoNum = "text-slate-400";
                corTextoStatus = "text-slate-400";
              } else if (isOcupada) {
                corBtn = "bg-linear-to-br from-green-500 to-green-700 border-green-600 hover:shadow-xl hover:shadow-green-600/40";
                corTextoNum = "text-white";
                corTextoStatus = "text-green-50";
              }

              return (
                <button
                  key={mesa.id}
                  onClick={() => handleMesaClick(mesa.numero, mesa.garcomId)}
                  className={`${baseBtnClass} ${corBtn}`}
                >
                  {garcomLogado?.cargo === 'admin' && (
                    <div 
                      onClick={(e) => abrirModalEditar(mesa, e)}
                      className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all z-20 hover:scale-110 active:scale-90 ${isOcupada ? 'bg-black/10 hover:bg-black/20 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                    >
                      <LucideIcons.Pencil size={10} strokeWidth={2.5} />
                    </div>
                  )}

                  {temAlerta && (
                    <span className="absolute top-2 left-2 w-2.5 h-2.5 bg-white rounded-full shadow-sm animate-ping"></span>
                  )}

                  {isBloqueada && !temAlerta && (
                    <LucideIcons.Lock size={12} className="absolute top-2 left-2 opacity-40" />
                  )}

                  <span className={`text-3xl md:text-4xl font-medium tracking-tighter drop-shadow-sm leading-none mt-1 ${corTextoNum}`}>
                    {mesa.numero}
                  </span>

                  {isOcupada ? (
                    <div className="flex flex-col items-center justify-end h-8 w-full mt-1">
                      <span className={`text-[9px] md:text-[10px] font-bold uppercase truncate w-full px-1 text-center ${corTextoStatus}`}>
                        Cliente: {mesa.nomeCliente || 'S/N'}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-end h-8 w-full mt-1">
                      <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider opacity-60 text-center">
                        Livre
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

        </main>
      </div>

      {/* Botão Flutuante + Nova Mesa */}
      {garcomLogado?.cargo === 'admin' && (
        <button
          onClick={abrirModalCriar}
          className="fixed bottom-22 md:bottom-6 right-4 md:right-8 w-10 h-10 bg-linear-to-r from-slate-400 to-slate-400 rounded-full flex items-center justify-center text-white shadow-lg shadow-slate-200 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-300 active:scale-90 z-40 border-2 border-white/10"
          title="Novo Guarda-Sol"
        >
          <LucideIcons.Plus size={28} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}