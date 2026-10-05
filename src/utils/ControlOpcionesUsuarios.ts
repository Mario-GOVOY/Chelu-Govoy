import { Sesion } from '@/types/Sesion';

export const CHAT_CHELU = ['1', '92', '101'];
export const CHAT_CHELU_MASTER = ['92', '101'];

const ROLES_CHAT = ['administrador', 'jefeDeOperaciones'];

export const esSesionMaster = (sesion: Sesion) => sesion.isImpersonation && sesion.isMaster;

export const validatorUserHasOption = (opciones: string[], empresaId: string, isMaster = false) => {
    if (isMaster && opciones.includes(`${empresaId}-master`)) return true;
    return opciones.includes(empresaId);
};

export const puedeUsarChat = (sesion: Sesion) => {
    const master = esSesionMaster(sesion);
    const empresaConChat =
        validatorUserHasOption(CHAT_CHELU, sesion.empresaId, master) ||
        (master && validatorUserHasOption(CHAT_CHELU_MASTER, sesion.empresaId, master));
    return empresaConChat && ROLES_CHAT.includes(sesion.rol ?? '');
};

export const esStaffSinSuplantar = (sesion: Sesion) => sesion.isMaster && !sesion.isImpersonation;
