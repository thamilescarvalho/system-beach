// src/utils/validadores.ts

/**
 * Remove todos os caracteres não numéricos de uma string.
 */
export function extrairDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/**
 * Aplica máscara automática de CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00).
 */
export function formatarCpfCnpj(valor: string): string {
  const digitos = extrairDigitos(valor).slice(0, 14);

  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }

  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Valida matematicamente um CPF brasileiro (algoritmo oficial Módulo 11).
 */
export function validarCPF(cpf: string): boolean {
  const limpo = extrairDigitos(cpf);
  if (limpo.length !== 11) return false;

  // Rejeita sequências de dígitos repetidos (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(limpo)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += Number(limpo.charAt(i)) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== Number(limpo.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += Number(limpo.charAt(i)) * (11 - i);
  }
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === Number(limpo.charAt(10));
}

/**
 * Valida matematicamente um CNPJ brasileiro (algoritmo oficial Módulo 11).
 */
export function validarCNPJ(cnpj: string): boolean {
  const limpo = extrairDigitos(cnpj);
  if (limpo.length !== 14) return false;

  // Rejeita sequências repetidas (ex: 00.000.000/0000-00)
  if (/^(\d)\1{13}$/.test(limpo)) return false;

  const calcularDigito = (base: string, pesos: number[]): number => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) {
      soma += Number(base.charAt(i)) * pesos[i];
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const pesosPrimeiro = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const pesosSegundo = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const digito1 = calcularDigito(limpo.slice(0, 12), pesosPrimeiro);
  const digito2 = calcularDigito(limpo.slice(0, 13), pesosSegundo);

  return digito1 === Number(limpo.charAt(12)) && digito2 === Number(limpo.charAt(13));
}

/**
 * Verifica se o documento informado é um CPF ou CNPJ válido no Brasil.
 */
export function validarDocumentoBrasil(valor: string): {
  valido: boolean;
  tipo: 'CPF' | 'CNPJ' | null;
} {
  const digitos = extrairDigitos(valor);
  if (digitos.length === 11) {
    return { valido: validarCPF(digitos), tipo: 'CPF' };
  }
  if (digitos.length === 14) {
    return { valido: validarCNPJ(digitos), tipo: 'CNPJ' };
  }
  return { valido: false, tipo: null };
}

/**
 * Formata telefone brasileiro no padrão (DD) 90000-0000 ou (DD) 0000-0000.
 */
export function formatarTelefoneBR(valor: string): string {
  const digitos = extrairDigitos(valor).slice(0, 11);
  if (digitos.length === 0) return '';
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}

/**
 * Valida telefone brasileiro com DDD válido (11 a 99) + 8 ou 9 dígitos.
 */
export function validarTelefoneBR(valor: string): boolean {
  const digitos = extrairDigitos(valor);
  if (digitos.length !== 10 && digitos.length !== 11) return false;

  const ddd = Number(digitos.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  // Rejeita números repetidos (ex: 85 99999-9999)
  if (/^(\d)\1+$/.test(digitos.slice(2))) return false;

  return true;
}

/**
 * Valida formato de e-mail com domínio completo.
 */
export function validarEmail(email: string): boolean {
  const limpo = email.trim().toLowerCase();
  const regex = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/;
  return regex.test(limpo);
}
