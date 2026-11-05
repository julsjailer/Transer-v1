export type Amigo = {
  id: number;
  gradiente: string;
  nv: number;
  username?: string;
  displayName?: string;
  avatarData?: string | null;
  isBrother?: boolean;
};

export const AMIGOS_INICIALES: Amigo[] = [];
