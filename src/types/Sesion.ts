export type Sesion = {
    accessToken: string;
    refreshToken: string;
    username: string;
    empresaId: string;
    nombreEmpresa: string | null;
    rol: string | null;
    rolEspecial: string | null;
    isMaster: boolean;
    isImpersonation: boolean;
    impersonatedBy: string | null;
    idDepot: number | null;
    idDepots: number[] | null;
};
