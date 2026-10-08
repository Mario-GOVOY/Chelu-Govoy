const integerFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const decimalFormat = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

// Sin dato, "—".
export const formatInteger = (n?: number) => (n == null ? '—' : integerFormat.format(n));
export const formatDecimal = (n?: number) => (n == null ? '—' : decimalFormat.format(n));
