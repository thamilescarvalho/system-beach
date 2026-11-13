/**
 * Verifica se o valor de avatar armazenado representa uma URL ou imagem base64.
 */
export function isAvatarImagem(valor?: string | null): boolean {
  if (!valor) return false;
  const limpo = valor.trim().toLowerCase();
  return (
    limpo.startsWith('http://') ||
    limpo.startsWith('https://') ||
    limpo.startsWith('data:image/') ||
    limpo.startsWith('/')
  );
}
