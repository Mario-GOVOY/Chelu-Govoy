// Sin tildes ni mayúsculas, para comparar o buscar: "Optimización" → "optimizacion".
export function normalizeForSearch(text: string) {
    return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
