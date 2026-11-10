// src/utils/impressoraTermica.ts
import type { ItemComanda, Pagamento } from '../types';

export type TipoConexaoImpressora = 'sistema' | 'bluetooth' | 'usb' | 'rede';
export type LarguraBobina = '58mm' | '80mm';
export type TamanhoFonteCupom = 'normal' | 'grande';

export interface ConfiguracaoImpressora {
  ativa: boolean;
  nomeImpressora: string;
  tipoConexao: TipoConexaoImpressora;
  larguraPapel: LarguraBobina;
  ipRede: string;
  portaRede: string;
  imprimirAoFecharConta: boolean;
  imprimirPedidosCozinha: boolean;
  cortarPapelAutomatico: boolean;
  copiasPadrao: 1 | 2;
  tamanhoFonte: TamanhoFonteCupom;
  cabecalhoPersonalizado: string;
  rodapePersonalizado: string;
  dispositivoPareadoNome: string;
}

export interface DadosCupomVenda {
  nomeEstabelecimento: string;
  documentoEstabelecimento?: string;
  telefoneEstabelecimento?: string;
  numeroMesa: number;
  nomeCliente?: string;
  garcomNome: string;
  itens: ItemComanda[];
  subtotal: number;
  taxaGuardaSol: number;
  desconto: number;
  totalFinal: number;
  pagamentos: Pagamento[];
  troco?: number;
  dataHora?: string;
  codigoVenda?: string;
  statusCancelada?: boolean;
  motivoCancelamento?: string;
  isPreConta?: boolean;
}

const STORAGE_IMPRESSORA_KEY = 'tsystem_printer_config_v1';

export const CONFIG_IMPRESSORA_PADRAO: ConfiguracaoImpressora = {
  ativa: true,
  nomeImpressora: 'Térmica Padrão',
  tipoConexao: 'sistema',
  larguraPapel: '58mm',
  ipRede: '192.168.1.100',
  portaRede: '9100',
  imprimirAoFecharConta: false,
  imprimirPedidosCozinha: false,
  cortarPapelAutomatico: true,
  copiasPadrao: 1,
  tamanhoFonte: 'normal',
  cabecalhoPersonalizado: 'Comprovante de Consumo',
  rodapePersonalizado: 'Obrigado pela preferência! Volte sempre.',
  dispositivoPareadoNome: ''
};

// Tipagens seguras para Web Bluetooth e WebUSB (sem uso de any)
interface BluetoothRemoteGATTCharacteristicMinimal {
  writeValue: (value: BufferSource) => Promise<void>;
  writeValueWithoutResponse?: (value: BufferSource) => Promise<void>;
  properties: {
    write: boolean;
    writeWithoutResponse: boolean;
  };
}

interface BluetoothRemoteGATTServiceMinimal {
  getCharacteristics: () => Promise<BluetoothRemoteGATTCharacteristicMinimal[]>;
}

interface BluetoothRemoteGATTServerMinimal {
  connected: boolean;
  connect: () => Promise<BluetoothRemoteGATTServerMinimal>;
  getPrimaryServices: () => Promise<BluetoothRemoteGATTServiceMinimal[]>;
}

interface BluetoothDeviceMinimal {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServerMinimal;
}

interface NavigatorBluetooth {
  bluetooth?: {
    requestDevice: (options: {
      acceptAllDevices?: boolean;
      optionalServices?: string[];
    }) => Promise<BluetoothDeviceMinimal>;
  };
  usb?: {
    requestDevice: (options: { filters: Array<Record<string, number>> }) => Promise<{
      productName?: string;
      manufacturerName?: string;
    }>;
  };
}

let dispositivoBluetoothAtivo: BluetoothDeviceMinimal | null = null;

export function obterConfiguracaoImpressora(): ConfiguracaoImpressora {
  if (typeof window === 'undefined') return CONFIG_IMPRESSORA_PADRAO;
  try {
    const salvo = localStorage.getItem(STORAGE_IMPRESSORA_KEY);
    if (!salvo) return CONFIG_IMPRESSORA_PADRAO;
    const parsed = JSON.parse(salvo) as Partial<ConfiguracaoImpressora>;
    return {
      ...CONFIG_IMPRESSORA_PADRAO,
      ...parsed
    };
  } catch {
    return CONFIG_IMPRESSORA_PADRAO;
  }
}

export function salvarConfiguracaoImpressora(config: ConfiguracaoImpressora): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_IMPRESSORA_KEY, JSON.stringify(config));
  } catch {
    // Ignora erro de quota
  }
}

export function verificarSuporteHardwareImpressao(): {
  bluetooth: boolean;
  usb: boolean;
  sistema: boolean;
} {
  if (typeof window === 'undefined') {
    return { bluetooth: false, usb: false, sistema: false };
  }
  const nav = navigator as unknown as NavigatorBluetooth;
  return {
    bluetooth: Boolean(nav.bluetooth),
    usb: Boolean(nav.usb),
    sistema: typeof window.print === 'function'
  };
}

/**
 * Emparelha uma impressora térmica via Web Bluetooth (BLE / GATT) para Android, Windows e macOS
 */
export async function parearImpressoraBluetooth(): Promise<{
  sucesso: boolean;
  nomeDispositivo?: string;
  erro?: string;
}> {
  const nav = navigator as unknown as NavigatorBluetooth;
  if (!nav.bluetooth) {
    return {
      sucesso: false,
      erro: 'Bluetooth direto não disponível neste navegador. Em iPhones (iOS), utilize o modo "Sistema / AirPrint" ou "Rede Wi-Fi".'
    };
  }

  try {
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Padrão POS-58 / MPT-II / Elgin / Bematech
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Impressoras térmicas BLE genéricas
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // Microchip / ISSC Transparent UART
      ]
    });

    dispositivoBluetoothAtivo = device;
    const nome = device.name || `Térmica BT (${device.id.slice(0, 6)})`;
    return { sucesso: true, nomeDispositivo: nome };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Pareamento cancelado.';
    if (msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('canceled')) {
      return { sucesso: false, erro: 'Seleção de dispositivo Bluetooth cancelada.' };
    }
    return { sucesso: false, erro: 'Não foi possível conectar à impressora Bluetooth.' };
  }
}

/**
 * Emparelha uma impressora térmica via cabo USB (WebUSB) em computadores e tablets Android com OTG
 */
export async function parearImpressoraUSB(): Promise<{
  sucesso: boolean;
  nomeDispositivo?: string;
  erro?: string;
}> {
  const nav = navigator as unknown as NavigatorBluetooth;
  if (!nav.usb) {
    return {
      sucesso: false,
      erro: 'Conexão WebUSB não suportada neste navegador. Utilize o Chrome/Edge no computador ou o modo "Sistema / Spooler".'
    };
  }

  try {
    const device = await nav.usb.requestDevice({ filters: [] });
    const nome = device.productName || device.manufacturerName || 'Impressora USB PDV';
    return { sucesso: true, nomeDispositivo: nome };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.toLowerCase().includes('no device selected')) {
      return { sucesso: false, erro: 'Nenhuma impressora USB foi selecionada.' };
    }
    return { sucesso: false, erro: 'Não foi possível comunicar com a porta USB.' };
  }
}

function removerAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function formatarMoedaCupom(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Gera bytes no protocolo térmico ESC/POS para envio direto via Bluetooth GATT ou RawBT
 */
function gerarPayloadEscPos(dados: DadosCupomVenda, config: ConfiguracaoImpressora): Uint8Array {
  const colunas = config.larguraPapel === '80mm' ? 48 : 32;
  const separador = '-'.repeat(colunas) + '\n';
  const encoder = new TextEncoder();
  const partes: number[] = [];

  const pushBytes = (...bytes: number[]) => partes.push(...bytes);
  const pushTexto = (txt: string) => {
    const limpo = removerAcentos(txt);
    const bytes = encoder.encode(limpo);
    bytes.forEach((b) => partes.push(b));
  };

  const qtdTotalItens = dados.itens.reduce((acc, item) => acc + item.quantidade, 0);
  const mesaFormatada = String(dados.numeroMesa).padStart(2, '0');
  const tituloCupom = dados.statusCancelada
    ? 'VENDA CANCELADA / ESTORNADA'
    : dados.isPreConta
      ? 'EXTRATO DE CONFERENCIA DE CONTA'
      : config.cabecalhoPersonalizado.trim() || 'COMPROVANTE DE CONSUMO';

  // ESC @ (Inicializar impressora)
  pushBytes(0x1b, 0x40);
  // Centralizar (ESC a 1)
  pushBytes(0x1b, 0x61, 0x01);
  // Negrito ligado (ESC E 1)
  pushBytes(0x1b, 0x45, 0x01);
  pushTexto(`${dados.nomeEstabelecimento.toUpperCase()}\n`);
  // Negrito desligado
  pushBytes(0x1b, 0x45, 0x00);

  if (dados.documentoEstabelecimento) {
    pushTexto(`CNPJ/CPF: ${dados.documentoEstabelecimento}\n`);
  }
  if (dados.telefoneEstabelecimento) {
    pushTexto(`TEL: ${dados.telefoneEstabelecimento}\n`);
  }
  pushTexto(`${tituloCupom.toUpperCase()}\n`);

  pushTexto(separador);
  // Alinhar à esquerda (ESC a 0)
  pushBytes(0x1b, 0x61, 0x00);

  pushTexto(`MESA / GUARDA-SOL: #${mesaFormatada}\n`);
  pushTexto(`CLIENTE: ${(dados.nomeCliente || 'CONSUMIDOR').toUpperCase()}\n`);
  pushTexto(`ATENDENTE: ${(dados.garcomNome || 'EQUIPE').toUpperCase()}\n`);
  pushTexto(`DATA/HORA: ${dados.dataHora || new Date().toLocaleString('pt-BR')}\n`);
  if (dados.codigoVenda) {
    pushTexto(`CONTROLE: #${dados.codigoVenda.slice(0, 8).toUpperCase()}\n`);
  }
  pushTexto(separador);
  pushBytes(0x1b, 0x45, 0x01);
  pushTexto(`ITEM / DESCRICAO${' '.repeat(Math.max(1, colunas - 22))}TOTAL\n`);
  pushBytes(0x1b, 0x45, 0x00);
  pushTexto(separador);

  dados.itens.forEach((item, idx) => {
    const subtotalItem = item.produto.preco * item.quantidade;
    const numItem = String(idx + 1).padStart(2, '0');
    const nomeLimpo = item.produto.nome.toUpperCase().slice(0, colunas - 5);
    pushTexto(`${numItem}. ${nomeLimpo}\n`);
    const detalheEsq = `   ${item.quantidade}x ${formatarMoedaCupom(item.produto.preco)}`;
    const detalheDir = formatarMoedaCupom(subtotalItem);
    const espacos = Math.max(1, colunas - detalheEsq.length - detalheDir.length);
    pushTexto(`${detalheEsq}${' '.repeat(espacos)}${detalheDir}\n`);
  });

  pushTexto(separador);
  pushTexto(`QTD. TOTAL DE ITENS: ${qtdTotalItens}\n`);
  pushTexto(`SUBTOTAL CONSUMO: ${formatarMoedaCupom(dados.subtotal)}\n`);
  if (dados.taxaGuardaSol > 0) {
    pushTexto(`TAXA GUARDA-SOL: +${formatarMoedaCupom(dados.taxaGuardaSol)}\n`);
  }
  if (dados.desconto > 0) {
    pushTexto(`DESCONTO: -${formatarMoedaCupom(dados.desconto)}\n`);
  }

  pushBytes(0x1b, 0x45, 0x01);
  pushTexto(
    `${dados.isPreConta ? 'TOTAL A PAGAR' : 'VALOR TOTAL'}: ${formatarMoedaCupom(dados.totalFinal)}\n`
  );
  pushBytes(0x1b, 0x45, 0x00);

  if (dados.pagamentos.length > 0) {
    pushTexto(separador);
    pushBytes(0x1b, 0x45, 0x01);
    pushTexto('PAGAMENTOS RECEBIDOS:\n');
    pushBytes(0x1b, 0x45, 0x00);
    dados.pagamentos.forEach((p) => {
      pushTexto(`${p.metodo.toUpperCase()}: ${formatarMoedaCupom(p.valor)}\n`);
    });
    if (dados.troco && dados.troco > 0) {
      pushTexto(`TROCO: ${formatarMoedaCupom(dados.troco)}\n`);
    }
  }

  pushTexto(separador);
  // Centralizar rodapé
  pushBytes(0x1b, 0x61, 0x01);
  if (config.rodapePersonalizado.trim()) {
    pushTexto(`${config.rodapePersonalizado.trim()}\n`);
  }
  pushTexto('Sem valor fiscal - T-System Beach POS\n\n\n');

  if (config.cortarPapelAutomatico) {
    // GS V A 16 (Corte parcial de guilhotina)
    pushBytes(0x1d, 0x56, 0x41, 0x10);
  }

  return new Uint8Array(partes);
}

async function tentarEnvioBluetoothEscPos(payload: Uint8Array): Promise<boolean> {
  if (!dispositivoBluetoothAtivo?.gatt) return false;
  try {
    const server = dispositivoBluetoothAtivo.gatt.connected
      ? dispositivoBluetoothAtivo.gatt
      : await dispositivoBluetoothAtivo.gatt.connect();
    const services = await server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          const tamanhoChunk = 128;
          for (let i = 0; i < payload.length; i += tamanhoChunk) {
            const fatia = payload.slice(i, i + tamanhoChunk);
            if (char.properties.writeWithoutResponse && char.writeValueWithoutResponse) {
              await char.writeValueWithoutResponse(fatia);
            } else {
              await char.writeValue(fatia);
            }
          }
          return true;
        }
      }
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Imprime o cupom térmico (suporta Bluetooth ESC/POS direto ou Spooler Universal 58mm/80mm para Android, iOS e Desktop)
 */
export async function imprimirCupomTermico(
  dados: DadosCupomVenda,
  configOverride?: ConfiguracaoImpressora
): Promise<{ enviado: boolean; metodoUsado: string }> {
  const config = configOverride || obterConfiguracaoImpressora();

  // 1. Se configurado para Bluetooth e houver dispositivo BLE conectado, envia via ESC/POS direto
  if (config.tipoConexao === 'bluetooth' && dispositivoBluetoothAtivo) {
    const payload = gerarPayloadEscPos(dados, config);
    const okBt = await tentarEnvioBluetoothEscPos(payload);
    if (okBt) {
      return { enviado: true, metodoUsado: 'Bluetooth ESC/POS' };
    }
  }

  // 2. Impressão Universal via Iframe Oculto Otimizado para Bobina Térmica 58mm / 80mm (AirPrint, Android Print Service, Windows/Mac Spooler)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { enviado: false, metodoUsado: 'indisponivel' };
  }

  const larguraMm = config.larguraPapel === '80mm' ? '76mm' : '54mm';
  const fontPx = config.tamanhoFonte === 'grande' ? '13px' : '11px';
  const dataFormatada = dados.dataHora || new Date().toLocaleString('pt-BR');
  const mesaFormatada = String(dados.numeroMesa).padStart(2, '0');
  const qtdTotalItens = dados.itens.reduce((acc, item) => acc + item.quantidade, 0);
  const tituloCupom = dados.statusCancelada
    ? 'COMPROVANTE DE ESTORNO'
    : dados.isPreConta
      ? 'CONFERÊNCIA DE CONTA'
      : config.cabecalhoPersonalizado || 'COMPROVANTE DE CONSUMO';

  const linhasItensHtml = dados.itens
    .map((item, idx) => {
      const numItem = String(idx + 1).padStart(2, '0');
      const unitario = item.produto.preco.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const sub = (item.produto.preco * item.quantidade).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return `
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="padding: 3px 0; text-align: left;">
            <div style="font-weight: bold;">${numItem}. ${item.produto.nome.toUpperCase()}</div>
            <div style="font-size: 10px; color: #333;">${item.quantidade} UN x R$ ${unitario}</div>
          </td>
          <td style="padding: 3px 0; text-align: right; vertical-align: bottom; font-weight: bold; white-space: nowrap;">R$ ${sub}</td>
        </tr>
      `;
    })
    .join('');

  const linhasPagamentosHtml = dados.pagamentos
    .map(
      (p) => `
        <div style="display: flex; justify-content: space-between; margin: 2px 0;">
          <span>${p.metodo.toUpperCase()}</span>
          <span style="font-weight: bold;">${formatarMoedaCupom(p.valor)}</span>
        </div>
      `
    )
    .join('');

  const htmlCupom = `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Cupom Mesa #${mesaFormatada}</title>
        <style>
          @page {
            size: ${config.larguraPapel} auto;
            margin: 0mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${larguraMm};
            margin: 0 auto;
            padding: 4mm 2mm;
            font-size: ${fontPx};
            color: #000;
            line-height: 1.35;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider {
            border-top: 1px dashed #000;
            margin: 6px 0;
          }
          .double-divider {
            border-top: 2px solid #000;
            margin: 6px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: ${fontPx};
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
        </style>
      </head>
      <body>
        <div class="center bold" style="font-size: 14px; letter-spacing: 0.5px;">${dados.nomeEstabelecimento.toUpperCase()}</div>
        ${dados.documentoEstabelecimento ? `<div class="center" style="font-size: 10px;">CNPJ/CPF: ${dados.documentoEstabelecimento}</div>` : ''}
        ${dados.telefoneEstabelecimento ? `<div class="center" style="font-size: 10px;">TEL: ${dados.telefoneEstabelecimento}</div>` : ''}
        <div class="divider"></div>
        <div class="center bold" style="font-size: 11px;">${tituloCupom.toUpperCase()}</div>
        <div class="divider"></div>
        <div class="row"><span><strong>MESA / GUARDA-SOL:</strong></span><span><strong>#${mesaFormatada}</strong></span></div>
        <div class="row"><span>CLIENTE:</span><span>${(dados.nomeCliente || 'Consumidor').toUpperCase()}</span></div>
        <div class="row"><span>ATENDENTE:</span><span>${(dados.garcomNome || 'Equipe').toUpperCase()}</span></div>
        <div class="row"><span>DATA/HORA:</span><span>${dataFormatada}</span></div>
        ${dados.codigoVenda ? `<div class="row"><span>CONTROLE:</span><span>#${dados.codigoVenda.slice(0, 8).toUpperCase()}</span></div>` : ''}
        <div class="divider"></div>
        <table>
          <thead>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="text-align: left; padding-bottom: 3px;">ITEM / QTD x UNIT.</th>
              <th style="text-align: right; padding-bottom: 3px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${linhasItensHtml}
          </tbody>
        </table>
        <div class="divider"></div>
        <div class="row" style="font-size: 10px;">
          <span>Qtd. Total de Itens:</span>
          <span>${qtdTotalItens} ${qtdTotalItens === 1 ? 'item' : 'itens'}</span>
        </div>
        <div class="row">
          <span>Subtotal Consumo:</span>
          <span>${formatarMoedaCupom(dados.subtotal)}</span>
        </div>
        ${
          dados.taxaGuardaSol > 0
            ? `<div class="row"><span>Taxa Guarda-Sol:</span><span>+${formatarMoedaCupom(dados.taxaGuardaSol)}</span></div>`
            : ''
        }
        ${
          dados.desconto > 0
            ? `<div class="row"><span>Desconto Concedido:</span><span>-${formatarMoedaCupom(dados.desconto)}</span></div>`
            : ''
        }
        <div class="double-divider"></div>
        <div class="row bold" style="font-size: 14px; margin: 4px 0;">
          <span>${dados.isPreConta ? 'TOTAL A PAGAR:' : 'TOTAL PAGO:'}</span>
          <span>${formatarMoedaCupom(dados.totalFinal)}</span>
        </div>
        ${
          dados.pagamentos.length > 0
            ? `<div class="divider"></div><div class="bold" style="margin-bottom:3px; font-size: 10px;">FORMAS DE PAGAMENTO:</div>${linhasPagamentosHtml}`
            : dados.isPreConta
              ? `<div class="divider"></div><div class="center" style="font-size: 10px;">CONFERÊNCIA DE CONTA - AGUARDANDO PAGAMENTO</div>`
              : ''
        }
        ${
          dados.troco && dados.troco > 0
            ? `<div class="row bold"><span>TROCO:</span><span>${formatarMoedaCupom(dados.troco)}</span></div>`
            : ''
        }
        <div class="divider"></div>
        ${config.rodapePersonalizado ? `<div class="center" style="margin-top: 4px;">${config.rodapePersonalizado}</div>` : ''}
        <div class="center" style="font-size: 9px; margin-top: 4px;">Sem valor fiscal • T-System Beach POS</div>
      </body>
    </html>
  `;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (doc && iframe.contentWindow) {
    doc.open();
    doc.write(htmlCupom);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 250);
  }

  return { enviado: true, metodoUsado: 'Spooler / AirPrint / Sistema' };
}
