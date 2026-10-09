// src/pages/Home.tsx
import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../context/AppContext';
import { Header } from '../components/Header'; 
import * as LucideIcons from 'lucide-react'; // Importação do Lucide adicionada para o rodapé

export function Home() {
  const navigate = useNavigate();
  const contexto = useContext(AppContext);
  const usuario = contexto?.garcomLogado;
  
  const isAdmin = usuario?.cargo === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col relative overflow-hidden">
      
      {/* HEADER GLOBAL */}
      <Header />

      {/* FUNDO */}
      <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-fuchsia-400/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] max-w-lg max-h-lg bg-amber-400/10 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000" />

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 md:pl-[96px] relative z-10">
        
        {/* TAMANHO DOS BOTÕES */}
        <div className={`w-full relative z-10 animate-in zoom-in-95 duration-500 mx-auto ${isAdmin ? 'max-w-[320px] md:max-w-[750px]' : 'max-w-[300px] md:max-w-[520px]'}`}>
          
          <div className={`grid grid-cols-2 gap-4 md:gap-5 ${isAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
    
            {/* MESAS */}
            <button 
              onClick={() => navigate('/mesas')} 
              className="group relative w-full aspect-square rounded-3xl bg-linear-to-br from-fuchsia-500 to-fuchsia-700 border border-fuchsia-400/50 
                         shadow-xl shadow-fuchsia-500/30 
                         hover:-translate-y-1 hover:shadow-2xl hover:shadow-fuchsia-500/50
                         active:scale-95 active:translate-y-0
                         transition-all duration-300 ease-out flex flex-col items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-white/20 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M12.5 11.134 18.196 21"/><path d="M20.425 5.299a10 10 0 0 0-16.941 9.78c.183.563.843.774 1.355.478L20.16 6.711c.512-.296.66-.973.264-1.413"/><path d="M21 21H3"/></svg>
              </div>
              <span className="font-bold text-white text-[11px] md:text-[12px] tracking-widest uppercase relative z-10">Mesas</span>
            </button>

            {/* BAR / COZINHA */}
            <button 
              onClick={() => navigate('/cozinha')} 
              className="group relative w-full aspect-square rounded-3xl bg-linear-to-br from-amber-400 to-amber-600 border border-amber-300/50 
                         shadow-xl shadow-amber-500/30 
                         hover:-translate-y-1 hover:shadow-2xl hover:shadow-amber-500/50
                         active:scale-95 active:translate-y-0
                         transition-all duration-300 ease-out flex flex-col items-center justify-center gap-3 overflow-hidden"
            >
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-white/30 backdrop-blur-md shadow-inner border border-white/50 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M10 3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a6 6 0 0 0 1.2 3.6l.6.8A6 6 0 0 1 17 13v8a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-8a6 6 0 0 1 1.2-3.6l.6-.8A6 6 0 0 0 10 5z"/><path d="M17 13h-4a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h4"/></svg>
              </div>
              <span className="font-bold text-white text-[11px] md:text-[12px] tracking-widest uppercase relative z-10">Bar</span>
            </button>

            {/* CAIXA */}
            <button 
              onClick={() => navigate('/painel')} 
              className={`group relative w-full rounded-3xl bg-linear-to-br from-teal-700 to-teal-600 border border-teal-600 
                         shadow-xl shadow-teal-500/30 
                         hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/50
                         active:scale-95 active:translate-y-0
                         transition-all duration-300 ease-out overflow-hidden
                         ${!isAdmin ? 'col-span-2 md:col-span-1 flex-row md:flex-col h-16 md:h-auto md:aspect-square px-5 md:px-0 justify-start md:justify-center items-center gap-4' 
                                    : 'aspect-square flex-col justify-center items-center gap-3'} flex`}
            >
               <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               
               <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-3xl bg-white/20 backdrop-blur-md shadow-inner border border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10 shrink-0">
                 <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
               </div>

               {/* condição */}
               {!isAdmin ? (
                  <>
                     <div className="text-left flex-1 relative z-10 md:text-center md:flex-none">
                       <span className="block font-bold text-white text-[13px] md:text-[12px] uppercase tracking-widest md:leading-tight">
                         <span className="hidden md:inline">Caixa</span>
                         <span className="md:hidden">Caixa</span>
                       </span>
                     </div>
                     <div className="w-7 h-7 md:hidden rounded-full bg-white/20 flex items-center justify-center text-white relative z-10 group-hover:translate-x-1 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                     </div>
                  </>
               ) : (
                  <span className="font-bold text-white text-[11px] md:text-[12px] tracking-widest uppercase relative z-10 text-center leading-tight">Caixa</span>
               )}
            </button>

            {/* GESTÃO (Admins) */}
            {isAdmin && (
              <button  
                onClick={() => navigate('/admin')} 
                className="group relative w-full aspect-square rounded-3xl bg-linear-to-br from-gray-800 to-gray-900 border border-gray-700/50 
                           shadow-xl shadow-slate-900/30 
                           hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/50
                           active:scale-95 active:translate-y-0
                           transition-all duration-300 ease-out flex flex-col items-center justify-center gap-3 overflow-hidden"
              >
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                 
                 <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-white/10 backdrop-blur-md shadow-inner border border-white/30 flex items-center justify-center group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300 relative z-10">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
                 </div>
                 <span className="font-bold text-white text-[11px] md:text-[12px] tracking-widest uppercase relative z-10 text-center leading-tight">Admin</span>
              </button>
            )}

          </div>
        </div>
      </main>

      {/* RODAPÉ */}
      <footer className="w-full pb-6 pt-2 md:pl-[96px] flex flex-col items-center justify-center relative z-10">
        <div className="flex flex-col items-center gap-2 opacity-50 hover:opacity-100 transition-opacity duration-300">
          
          {/* Selo de Segurança */}
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
            <LucideIcons.ShieldCheck size={14} className="text-emerald-500" strokeWidth={2.5} />
            <span>Ambiente Seguro</span>
          </div>

          {/* Assinatura da Empresa / Dev */}
          <div className="flex flex-col items-center text-[9px] font-medium uppercase tracking-widest text-slate-400 text-center gap-0.5">
            <span className="flex items-center gap-1">
              <LucideIcons.Code size={10} strokeWidth={3} />
              Desenvolvido pela Empresa <strong className="font-bold text-slate-500">Âncora Dev.</strong>
            </span>
            <span>Eng. de Software Thamiles</span>
          </div>
          
        </div>
      </footer>
    </div>
  );
}