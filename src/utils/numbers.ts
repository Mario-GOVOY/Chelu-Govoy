const integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

// Sin dato, "—".
export const formatInteger = (n?: number) => (n == null ? '—' : integerFormat.format(n));
export const formatDecimal = (n?: number) => (n == null ? '—' : decimalFormat.format(n));

// Tamaño de archivo en B, KB o MB; sin dato, vacío.
export function formatBytes(bytes?: number): string {
    if (bytes == null || !Number.isFinite(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    const mb = kb / 1024;
    return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}
