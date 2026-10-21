const dayMonthFormat = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });

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
    return dayMonthFormat.format(ms);
}

/** aaaa-mm-dd → dd/mm/aaaa. */
export function formatIsoDate(iso: string): string {
    const [year, month, day] = iso.split('-');
    return day ? `${day}/${month}/${year}` : iso;
}

/** aaaa-mm-dd → Date a las 00:00 de la hora local. */
export function parseIsoDate(iso: string): Date {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/** Date → aaaa-mm-dd con la fecha local. */
export const toIsoDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** HH:MM → Date de hoy a esa hora. */
export function parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
}

/** Date → HH:MM. */
export const toTime = (date: Date) =>
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
