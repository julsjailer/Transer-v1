export type Amigo = {
  id: number;
  gradiente: string;
  nv: number;
  username?: string;
  displayName?: string;
  avatarData?: string | null;
  description?: string;
  secretDescription?: string;
  favorites?: { cardKey: string; slot: number; nombre: string; archivo: string | null }[];
  isBrother?: boolean;
};

export const AMIGOS_INICIALES: Amigo[] = [];
