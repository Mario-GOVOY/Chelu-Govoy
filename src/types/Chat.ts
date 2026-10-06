export type ResumenChat = {
    id: string;
    titulo: string;
    actualizado: number;
};

export type Chat = {
    id: string;
    titulo: string;
    mensajes: Mensaje[];
};

export type Mensaje = {
    id: string;
    rol: 'usuario' | 'chelu';
    texto: string;
    // Turno del back al que pertenece la respuesta; hace falta para duplicar desde ella.
    runId?: string;
    // Solo en la respuesta que se está recibiendo o que se acaba de recibir.
    estado?: 'escribiendo' | 'detenida' | 'error';
    herramientas?: Herramienta[];
    // Preguntas que propone Chelu al acabar la respuesta.
    sugerencias?: string[];
    documentos?: Documento[];
};

// Tarjeta "Consultando…" de la respuesta. Las llamadas iguales se agrupan en una.
export type Herramienta = {
    clave: string;
    etiqueta: string;
    veces: number;
    enCurso: number;
};

// Archivo generado por Chelu (Excel, PDF…).
export type Documento = {
    // Clave de S3: con ella /archivo da un enlace de descarga nuevo.
    fileId: string;
    nombre: string;
    formato: string;
    tamano?: number;
};
