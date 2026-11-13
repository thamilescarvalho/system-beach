// src/pages/AdminImpressora.tsx
import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import * as LucideIcons from 'lucide-react';
import { Header } from '../components/Header';
import { useAppContext, NOME_PADRAO_SISTEMA } from '../context/AppContext';
import {
  obterConfiguracaoImpressora,
  salvarConfiguracaoImpressora,
  verificarSuporteHardwareImpressao,
  parearImpressoraBluetooth,
  parearImpressoraUSB,
  imprimirCupomTermico,
  type ConfiguracaoImpressora,
  type TipoConexaoImpressora
} from '../utils/impressoraTermica';

export function AdminImpressora() {
  const { dadosEmpresa, garcomLogado } = useAppContext();

  const [config, setConfig] = useState<ConfiguracaoImpressora>(() => obterConfiguracaoImpressora());
  const [pareando, setPareando] = useState<boolean>(false);
  const [imprimindoTeste, setImprimindoTeste] = useState<boolean>(false);
  const [toast, setToast] = useState<{ msg: string; tipo: 'sucesso' | 'erro' } | null>(null);

  const suporteHardware = useMemo(() => verificarSuporteHardwareImpressao(), []);

  const dispararToast = (msg: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSalvar = (e: FormEvent) => {
    e.preventDefault();
    salvarConfiguracaoImpressora(config);
    dispararToast('Configurações de impressora salvas com sucesso!');
  };

  const handleConectarBluetooth = async () => {
    setPareando(true);
    try {
      const res = await parearImpressoraBluetooth();
      if (res.sucesso && res.nomeDispositivo) {
        const nova: ConfiguracaoImpressora = {
          ...config,
          tipoConexao: 'bluetooth',
          dispositivoPareadoNome: res.nomeDispositivo,
          nomeImpressora: res.nomeDispositivo
        };
        setConfig(nova);
        salvarConfiguracaoImpressora(nova);
        dispararToast(`Conectado a "${res.nomeDispositivo}" via Bluetooth!`);
      } else if (res.erro) {
        dispararToast(res.erro, 'erro');
      }
    } finally {
      setPareando(false);
    }
  };

  const handleConectarUSB = async () => {
    setPareando(true);
    try {
      const res = await parearImpressoraUSB();
      if (res.sucesso && res.nomeDispositivo) {
        const nova: ConfiguracaoImpressora = {
          ...config,
          tipoConexao: 'usb',
          dispositivoPareadoNome: res.nomeDispositivo,
          nomeImpressora: res.nomeDispositivo
        };
        setConfig(nova);
        salvarConfiguracaoImpressora(nova);
        dispararToast(`Impressora USB "${res.nomeDispositivo}" vinculada!`);
      } else if (res.erro) {
        dispararToast(res.erro, 'erro');
      }
    } finally {
      setPareando(false);
    }
  };

  const handleImprimirTeste = async () => {
    setImprimindoTeste(true);
    try {
      salvarConfiguracaoImpressora(config);
      const nomeEstab =
        dadosEmpresa?.nome_exibicao?.trim() ||
        dadosEmpresa?.nome_fantasia?.trim() ||
        NOME_PADRAO_SISTEMA;

      const resultado = await imprimirCupomTermico(
        {
          nomeEstabelecimento: nomeEstab,
          documentoEstabelecimento: dadosEmpresa?.documento || undefined,
          telefoneEstabelecimento: dadosEmpresa?.telefone || undefined,
          numeroMesa: 12,
          nomeCliente: 'Cliente Demonstração',
          garcomNome: garcomLogado?.nome || 'Administrador',
          itens: [
            {
              id: 'teste-1',
              produto: { id: 1, nome: 'Cerveja Gelada 600ml', preco: 18.0, categoria: 'Bebidas' },
              quantidade: 2
            },
            {
              id: 'teste-2',
              produto: { id: 2, nome: 'Porção Camarão Praia', preco: 65.0, categoria: 'Petiscos' },
              quantidade: 1
            }
          ],
          subtotal: 101.0,
          taxaGuardaSol: 20.0,
          desconto: 11.0,
          totalFinal: 110.0,
          pagamentos: [{ metodo: 'PIX', valor: 110.0 }],
          troco: 0
        },
        config
      );

      if (resultado.enviado) {
        dispararToast(`Cupom de teste enviado (${resultado.metodoUsado})!`);
      } else {
        dispararToast('Não foi possível iniciar a impressão.', 'erro');
      }
    } finally {
      setImprimindoTeste(false);
    }
  };

  const modosConexao: Array<{
    id: TipoConexaoImpressora;
    titulo: string;
    subtitulo: string;
    compatibilidade: string;
    icone: typeof LucideIcons.Printer;
  }> = [
    {
      id: 'sistema',
      titulo: 'Sistema / AirPrint / Spooler',
      subtitulo: 'Impressão nativa universal sem configuração extra',
      compatibilidade: 'iOS (iPhone/iPad) • Android • Windows • Mac',
      icone: LucideIcons.Smartphone
    },
    {
      id: 'bluetooth',
      titulo: 'Bluetooth Térmica (ESC/POS)',
      subtitulo: 'Conexão direta com maquininhas e impressoras portáteis',
      compatibilidade: 'Android • Windows • Chrome/Edge • App Nativo',
      icone: LucideIcons.Bluetooth
    },
    {
      id: 'usb',
      titulo: 'Cabo USB Direto (PDV)',
      subtitulo: 'Alta velocidade para caixa fixo e computador de balcão',
      compatibilidade: 'Windows • Mac • Linux • Android OTG',
      icone: LucideIcons.Usb
    },
    {
      id: 'rede',
      titulo: 'Rede Local Wi-Fi (IP / Porta 9100)',
      subtitulo: 'Impressoras térmicas de cozinha e bar conectadas no roteador',
      compatibilidade: 'Android • iOS • Computadores na mesma rede',
      icone: LucideIcons.Wifi
    }
  ];

  const nomeEmpresaPreview =
    dadosEmpresa?.nome_exibicao?.trim() ||
    dadosEmpresa?.nome_fantasia?.trim() ||
    NOME_PADRAO_SISTEMA;

  return (
    <div className="min-h-dvh bg-slate-50 font-sans pt-20 pb-28 md:pt-22 md:pb-12 md:pl-22 px-4 sm:px-6 relative select-none">
      <Header />

      {/* TOAST DE FEEDBACK */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-lg border flex items-center gap-2.5 text-xs font-medium ${
              toast.tipo === 'sucesso'
                ? 'bg-slate-900 text-white border-slate-800'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toast.tipo === 'sucesso' ? (
              <LucideIcons.CheckCircle2 size={15} className="text-yellow-400 shrink-0" />
            ) : (
              <LucideIcons.AlertCircle size={15} className="text-white shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto space-y-6">
        {/* Cabeçalho da Página */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-yellow-50 border border-yellow-200/80 text-yellow-600 flex items-center justify-center shrink-0 shadow-xs">
              <LucideIcons.Printer size={21} strokeWidth={1.9} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-medium text-slate-900 tracking-tight">
                  Configuração de Impressora
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    config.ativa
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.ativa ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {config.ativa ? 'Impressão Ativa' : 'Pausada'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Compatível com Android, iOS (iPhone/iPad) e Computadores (USB, Bluetooth, Rede e Spooler).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleImprimirTeste}
              disabled={imprimindoTeste}
              className="flex-1 sm:flex-initial h-10 px-4 rounded-4xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 text-xs font-medium shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LucideIcons.Receipt size={15} className="text-yellow-600" />
              <span>{imprimindoTeste ? 'Enviando...' : 'Testar Cupom'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const nova = { ...config, ativa: !config.ativa };
                setConfig(nova);
                salvarConfiguracaoImpressora(nova);
                dispararToast(nova.ativa ? 'Impressora ativada!' : 'Impressora pausada.');
              }}
              className={`h-10 px-4 rounded-4xl text-xs font-medium transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                config.ativa
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <LucideIcons.Power size={14} />
              <span>{config.ativa ? 'Ativada' : 'Ativar'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSalvar} className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
          {/* COLUNA ESQUERDA: PARÂMETROS */}
          <div className="space-y-5">
            {/* 1. MODO DE CONEXÃO */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-medium text-slate-900">1. Tecnologia de Conexão</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escolha como seu celular, tablet ou computador se comunica com a impressora térmica.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modosConexao.map((modo) => {
                  const IconeModo = modo.icone;
                  const selecionado = config.tipoConexao === modo.id;
                  return (
                    <button
                      key={modo.id}
                      type="button"
                      onClick={() => setConfig((prev) => ({ ...prev, tipoConexao: modo.id }))}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2.5 cursor-pointer active:scale-[0.98] ${
                        selecionado
                          ? 'bg-yellow-50/60 border-yellow-400 ring-2 ring-yellow-400/20 shadow-xs'
                          : 'bg-slate-50/60 border-slate-200/80 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            selecionado
                              ? 'bg-yellow-400 text-slate-900 border-yellow-400 shadow-xs'
                              : 'bg-white text-slate-500 border-slate-200/80'
                          }`}
                        >
                          <IconeModo size={17} strokeWidth={2} />
                        </div>
                        {selecionado && (
                          <span className="text-[10px] font-medium bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                            Selecionado
                          </span>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-slate-900">{modo.titulo}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{modo.subtitulo}</p>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 flex items-center gap-1 text-[10px] text-slate-400">
                        <LucideIcons.Check size={11} className="text-emerald-600 shrink-0" />
                        <span className="truncate">{modo.compatibilidade}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Ações específicas do modo selecionado */}
              {config.tipoConexao === 'bluetooth' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                      <LucideIcons.Bluetooth size={14} className="text-blue-600" />
                      <span>
                        Dispositivo Bluetooth:{' '}
                        <strong>{config.dispositivoPareadoNome || 'Nenhum pareado ainda'}</strong>
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {suporteHardware.bluetooth
                        ? 'Ligue a impressora térmica Bluetooth e clique ao lado para buscar.'
                        : 'Em dispositivos iOS (Safari), recomendamos o modo "Sistema / AirPrint" para pareamento nativo.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConectarBluetooth}
                    disabled={pareando}
                    className="h-9 px-4 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LucideIcons.Search size={13} />
                    <span>{pareando ? 'Buscando...' : 'Parear Bluetooth'}</span>
                  </button>
                </div>
              )}

              {config.tipoConexao === 'usb' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-slate-800 flex items-center gap-1.5">
                      <LucideIcons.Usb size={14} className="text-slate-700" />
                      <span>
                        Porta USB: <strong>{config.dispositivoPareadoNome || 'Padrão do Sistema'}</strong>
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Conecte o cabo USB da impressora térmica no computador ou adaptador OTG.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConectarUSB}
                    disabled={pareando}
                    className="h-9 px-4 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LucideIcons.PlugZap size={13} />
                    <span>{pareando ? 'Detectando...' : 'Localizar USB'}</span>
                  </button>
                </div>
              )}

              {config.tipoConexao === 'rede' && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 pl-0.5">
                      Endereço IP da Impressora na Rede Wi-Fi
                    </label>
                    <input
                      type="text"
                      value={config.ipRede}
                      onChange={(e) => setConfig((prev) => ({ ...prev, ipRede: e.target.value }))}
                      placeholder="Ex: 192.168.1.100"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 tabular-nums outline-none focus:border-slate-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-600 pl-0.5">Porta</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={config.portaRede}
                      onChange={(e) => setConfig((prev) => ({ ...prev, portaRede: e.target.value }))}
                      placeholder="9100"
                      className="w-full h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 tabular-nums outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* 2. FORMATO DE PAPEL E BOBINA */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-medium text-slate-900">2. Formato da Bobina & Cupom</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ajuste a largura do papel térmico e textos exibidos no cabeçalho e rodapé.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Largura */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Largura da Bobina</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {(['58mm', '80mm'] as const).map((larg) => (
                      <button
                        key={larg}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, larguraPapel: larg }))}
                        className={`h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          config.larguraPapel === larg
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {larg}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fonte */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Tamanho da Letra</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {(['normal', 'grande'] as const).map((tam) => (
                      <button
                        key={tam}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, tamanhoFonte: tam }))}
                        className={`h-8 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer ${
                          config.tamanhoFonte === tam
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tam}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Vias */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Vias por Impressão</label>
                  <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                    {([1, 2] as const).map((via) => (
                      <button
                        key={via}
                        type="button"
                        onClick={() => setConfig((prev) => ({ ...prev, copiasPadrao: via }))}
                        className={`h-8 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          config.copiasPadrao === via
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {via} {via === 1 ? 'Via' : 'Vias'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 pl-0.5">
                    Subtítulo do Cabeçalho
                  </label>
                  <input
                    type="text"
                    value={config.cabecalhoPersonalizado}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, cabecalhoPersonalizado: e.target.value }))
                    }
                    placeholder="Ex: Comprovante de Consumo"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600 pl-0.5">
                    Mensagem de Rodapé
                  </label>
                  <input
                    type="text"
                    value={config.rodapePersonalizado}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, rodapePersonalizado: e.target.value }))
                    }
                    placeholder="Ex: Obrigado pela preferência!"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:bg-white focus:border-slate-400 outline-none"
                  />
                </div>
              </div>
            </section>

            {/* 3. AUTOMAÇÕES DE FLUXO */}
            <section className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-3">
              <h2 className="text-sm font-medium text-slate-900">3. Automações no Atendimento</h2>

              <div className="divide-y divide-slate-100">
                <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-slate-800">
                      Imprimir automaticamente ao fechar comanda
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Dispara o cupom assim que o pagamento da mesa é concluído.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.imprimirAoFecharConta}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, imprimirAoFecharConta: e.target.checked }))
                    }
                    className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                  />
                </label>

                <label className="py-3 flex items-center justify-between gap-4 cursor-pointer">
                  <div>
                    <p className="text-xs font-medium text-slate-800">
                      Cortar papel automaticamente (Guilhotina ESC/POS)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Envia comando de corte automático ao final do comprovante em impressoras 80mm.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={config.cortarPapelAutomatico}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, cortarPapelAutomatico: e.target.checked }))
                    }
                    className="w-4 h-4 accent-yellow-500 rounded cursor-pointer"
                  />
                </label>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto h-11 px-6 rounded-4xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm hover:shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LucideIcons.Check size={15} className="text-yellow-400" />
                  <span>Salvar Preferências de Impressão</span>
                </button>
              </div>
            </section>
          </div>

          {/* COLUNA DIREITA: PRÉ-VISUALIZAÇÃO REAL DA BOBINA TÉRMICA */}
          <div className="lg:sticky lg:top-22 space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <LucideIcons.Eye size={14} />
                <span>Simulação da Bobina ({config.larguraPapel})</span>
              </span>
              <span className="text-[11px] text-slate-400 capitalize">
                Letra {config.tamanhoFonte}
              </span>
            </div>

            <div className="bg-amber-50/40 border border-slate-200/90 rounded-3xl p-5 shadow-inner flex justify-center">
              <div
                className={`bg-white border border-slate-200 shadow-md rounded-xl p-4 font-mono text-slate-800 transition-all duration-300 ${
                  config.larguraPapel === '80mm' ? 'w-full max-w-76' : 'w-full max-w-60'
                } ${config.tamanhoFonte === 'grande' ? 'text-[12px]' : 'text-[11px]'}`}
              >
                <div className="text-center space-y-0.5">
                  <p className="font-bold text-xs uppercase">{nomeEmpresaPreview}</p>
                  {dadosEmpresa?.documento && (
                    <p className="text-[10px] text-slate-500">DOC: {dadosEmpresa.documento}</p>
                  )}
                  {config.cabecalhoPersonalizado && (
                    <p className="text-[10px] text-slate-500">{config.cabecalhoPersonalizado}</p>
                  )}
                </div>

                <div className="border-t border-dashed border-slate-300 my-2.5" />

                <div className="space-y-0.5 text-[10px]">
                  <p>
                    <strong>MESA:</strong> #12 (Cliente Demo)
                  </p>
                  <p>
                    <strong>ATENDENTE:</strong> {garcomLogado?.nome || 'Admin'}
                  </p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2.5" />

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>2x Cerveja 600ml</span>
                    <span>R$ 36,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>1x Camarão Praia</span>
                    <span>R$ 65,00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2.5" />

                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>R$ 101,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Valor Guarda-Sol:</span>
                    <span>+R$ 20,00</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span>Desconto:</span>
                    <span>-R$ 11,00</span>
                  </div>
                  <div className="flex justify-between font-bold text-xs pt-1 text-slate-900">
                    <span>TOTAL:</span>
                    <span>R$ 110,00</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2.5" />

                <p className="text-center text-[10px] text-slate-500">
                  {config.rodapePersonalizado || 'Obrigado pela preferência!'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
