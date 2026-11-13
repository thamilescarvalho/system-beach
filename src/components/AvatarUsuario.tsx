// src/components/AvatarUsuario.tsx
import { useState } from 'react';
import { isAvatarImagem } from '../utils/avatar';

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
  const [urlComErro, setUrlComErro] = useState<string | null>(null);

  const ehImagem = isAvatarImagem(avatar);
  const mostrarFoto = ehImagem && urlComErro !== avatar;
  const emojiExibido = avatar && !ehImagem ? avatar : fallbackEmoji;

  return (
    <span
      className={`relative inline-flex items-center justify-center overflow-hidden shrink-0 select-none ${className}`}
    >
      {mostrarFoto && avatar ? (
        <img
          src={avatar}
          alt={nome ? `Foto de ${nome}` : 'Foto de perfil'}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setUrlComErro(avatar)}
        />
      ) : (
        <span className={`leading-none ${emojiClassName}`} aria-hidden="true">
          {emojiExibido}
        </span>
      )}
    </span>
  );
}
