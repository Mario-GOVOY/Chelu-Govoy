// Conversión del cuerpo del correo entre el markdown del back y el HTML del editor.
// Se convierten negrita, cursiva, subrayado (viaja como <u>…</u> dentro del markdown) y listas con viñetas;
// el resto del markdown se queda como texto.

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const formatInline = (text: string) =>
    escapeHtml(text)
        .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
        .replace(/\*([^*]+)\*/g, '<i>$1</i>')
        .replace(/&lt;u&gt;(.*?)&lt;\/u&gt;/g, '<u>$1</u>');

// Viñeta: guion o asterisco seguido de espacio al principio de la línea.
const BULLET_REGEX = /^[-*] /;

/** Markdown → HTML del editor: un párrafo por línea, las viñetas seguidas en una lista y las líneas vacías como <br>. */
export function markdownToEditorHtml(markdown: string): string {
    let html = '';
    let inList = false;
    for (const line of markdown.split('\n')) {
        const isBullet = BULLET_REGEX.test(line);
        if (inList && !isBullet) html += '</ul>';
        if (!inList && isBullet) html += '<ul>';
        inList = isBullet;
        if (isBullet) html += `<li>${formatInline(line.slice(2))}</li>`;
        else html += line ? `<p>${formatInline(line)}</p>` : '<br>';
    }
    if (inList) html += '</ul>';
    return `<html>${html}</html>`;
}

// Marcas temporales para que el subrayado no se borre al quitar el resto de etiquetas.
const UNDERLINE_OPEN = '\u0001';
const UNDERLINE_CLOSE = '\u0002';

/** HTML del editor → markdown. Las etiquetas que no son negrita, cursiva o subrayado se quitan dejando su texto. */
export function editorHtmlToMarkdown(html: string): string {
    return html
        .replace(/\n/g, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '- ')
        .replace(/<\/(p|h[1-6]|li)>/gi, '\n')
        .replace(/<\/?(b|strong)>/gi, '**')
        .replace(/<\/?(i|em)>/gi, '*')
        .replace(/<u>/gi, UNDERLINE_OPEN)
        .replace(/<\/u>/gi, UNDERLINE_CLOSE)
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replaceAll(UNDERLINE_OPEN, '<u>')
        .replaceAll(UNDERLINE_CLOSE, '</u>')
        .replace(/\n$/, '');
}
