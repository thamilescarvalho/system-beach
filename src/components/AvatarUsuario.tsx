// src/components/AvatarUsuario.tsx
import { useState, useEffect } from 'react';

export function isAvatarImagem(valor?: string | null): boolean {
  if (!valor) return false;
  const v = valor.trim();
  return v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/');
}

interface AvatarUsuarioProps {
  avatar?: string | null;
  nome?: string;
  className?: string;
  emojiClassName?: string;
  fallbackEmoji?: string;
}

export function AvatarUsuario({
  avatar,
  nome,
  className = 'w-9 h-9 rounded-full bg-slate-100',
  emojiClassName = 'text-lg',
  fallbackEmoji = '👤'
}: AvatarUsuarioProps) {
  const [erroImagem, setErroImagem] = useState(false);

  useEffect(() => {
    setErroImagem(false);
  }, [avatar]);

  const mostrarFoto = isAvatarImagem(avatar) && !erroImagem;
  const emojiExibido = avatar && !isAvatarImagem(avatar) ? avatar : fallbackEmoji;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
    >
      {mostrarFoto ? (
        <img
          src={avatar!}
          alt={nome ? `Foto de ${nome}` : 'Foto de perfil'}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setErroImagem(true)}
        />
      ) : (
        <span className={`leading-none ${emojiClassName}`} aria-hidden="true">
          {emojiExibido}
        </span>
      )}
    </span>
  );
}
