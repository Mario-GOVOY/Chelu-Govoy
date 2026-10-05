// Igual que fechaRel del chat web.
export function fechaRelativa(ms: number): string {
    const d = Date.now() - ms;
    const min = 60_000;
    const h = 60 * min;
    const dia = 24 * h;
    if (d < min) return 'ahora';
    if (d < h) return `hace ${Math.floor(d / min)} min`;
    if (d < dia) return `hace ${Math.floor(d / h)} h`;
    if (d < 7 * dia) return `hace ${Math.floor(d / dia)} d`;
    return new Date(ms).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
